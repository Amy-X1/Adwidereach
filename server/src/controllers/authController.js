const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { signAccessToken } = require('../utils/jwt');
const { sendMail, resetCodeEmail, verifyCodeEmail } = require('../utils/mailer');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

// ---- Email verification (signup code flow) ----
// Stored in the existing Setting KV table so no migration is needed:
// key = `EMAIL_VERIFY:<email>`, value = JSON { codeHash, expiresAt, attempts }.
const VERIFY_CODE_TTL_MS = 30 * 60 * 1000;
const VERIFY_MAX_ATTEMPTS = 5;

function verifyKey(email) {
  return `EMAIL_VERIFY:${String(email).toLowerCase()}`;
}

function hashVerifyCode(code, email) {
  return crypto.createHash('sha256').update(`verify:${String(email).toLowerCase()}:${code}`).digest('hex');
}

async function sendVerificationCode(email, userId, req) {
  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = Date.now() + VERIFY_CODE_TTL_MS;
  await prisma.setting.upsert({
    where: { key: verifyKey(email) },
    update: { value: JSON.stringify({ codeHash: hashVerifyCode(code, email), expiresAt, attempts: 0 }) },
    create: {
      key: verifyKey(email),
      value: JSON.stringify({ codeHash: hashVerifyCode(code, email), expiresAt, attempts: 0 }),
      description: 'Email verification code (auto-managed, expires in 30 minutes)',
    },
  });
  const { text, html } = verifyCodeEmail(code);
  const result = await sendMail({ to: email, subject: 'Verify your email — AdWideReach', text, html });
  await logAudit(prisma, { userId: userId || null, action: 'EMAIL_VERIFICATION_SENT', details: email, req }).catch(() => {});
  // Dev fallback: expose the code when SMTP is off so signup stays testable locally.
  if (!result.delivered && process.env.NODE_ENV !== 'production') return code;
  return null;
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

async function logAudit(prismaClient, { userId, action, details, req }) {
  await prismaClient.auditLog.create({
    data: {
      userId: userId || null,
      action,
      details: details || null,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    },
  });
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const {
    fullName, username, email, phone, dob, gender,
    country, state, city, businessName, address, password, referralCode,
  } = req.body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase() }, { username }] },
  });
  if (existing) {
    const field = existing.email === email.toLowerCase() ? 'email' : 'username';
    throw new ApiError(409, `An account with this ${field} already exists`);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // New accounts start INACTIVE until the email is verified, so unverified
  // users cannot log in or use the app. (requireVerified middleware + login
  // check enforce this; see verifyEmail below.)
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: {
      fullName, username, email: email.toLowerCase(), phone,
      dob: new Date(dob), gender, country, state, city,
      businessName: businessName || null, address, passwordHash,
      isActive: false,
    } });
    if (referralCode) {
      const affiliate = await tx.affiliate.findUnique({ where: { code: String(referralCode).trim().toUpperCase() } });
      if (affiliate?.isActive && affiliate.userId !== created.id) {
        await tx.referral.create({ data: { affiliateId: affiliate.id, referredUserId: created.id, status: 'PENDING_QUALIFICATION' } });
      }
    }
    return created;
  });

  await logAudit(prisma, { userId: user.id, action: 'REGISTER', req });

  // Send the 6-digit verification code to the signup email.
  const devCode = await sendVerificationCode(user.email, user.id, req);

  // Do NOT issue a session token yet — the user must verify first.
  const payload = {
    success: true,
    message: 'Account created — verify your email to activate it',
    data: { email: user.email, requiresVerification: true },
  };
  if (devCode) payload.devCode = devCode;
  res.status(201).json(payload);
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] },
  });

  if (!user) throw new ApiError(401, 'Invalid credentials');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    await logAudit(prisma, { userId: user.id, action: 'LOGIN_FAILED', req });
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    // Unverified signups land here (isActive=false until email verified).
    // Deactivated-by-admin accounts are also inactive, but they never have a
    // pending verification code, so tell the two cases apart.
    const pending = await prisma.setting.findUnique({ where: { key: verifyKey(user.email) } }).catch(() => null);
    if (pending) {
      throw new ApiError(403, 'Please verify your email before logging in', [], { code: 'EMAIL_NOT_VERIFIED', email: user.email });
    }
    throw new ApiError(403, 'This account has been deactivated');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit(prisma, { userId: user.id, action: 'LOGIN', req });

  const token = signAccessToken({ id: user.id, role: user.role });

  res.json({
    success: true,
    message: 'Login successful',
    data: { user: sanitizeUser(user), token },
  });
});

// ---- Forgot password (email code flow) ----
// Stores hashed 6-digit codes in the existing Setting KV table so no
// migration is needed: key = `PWD_RESET:<email>`, value = JSON
// { codeHash, expiresAt, attempts }.

const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;

function resetKey(email) {
  return `PWD_RESET:${String(email).toLowerCase()}`;
}

function hashCode(code, email) {
  return crypto.createHash('sha256').update(`${String(email).toLowerCase()}:${code}`).digest('hex');
}

// POST /api/auth/forgot-password { email }
const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) throw new ApiError(422, 'Email is required');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(404, 'No account with this email');

  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = Date.now() + RESET_CODE_TTL_MS;
  await prisma.setting.upsert({
    where: { key: resetKey(email) },
    update: { value: JSON.stringify({ codeHash: hashCode(code, email), expiresAt, attempts: 0 }) },
    create: {
      key: resetKey(email),
      value: JSON.stringify({ codeHash: hashCode(code, email), expiresAt, attempts: 0 }),
      description: 'Password reset code (auto-managed, expires in 10 minutes)',
    },
  });

  const { text, html } = resetCodeEmail(code);
  const result = await sendMail({ to: email, subject: 'Your password reset code', text, html });
  await logAudit(prisma, { userId: user.id, action: 'PASSWORD_RESET_REQUESTED', req });

  const payload = { success: true, message: 'Reset code sent to your email' };
  // Dev fallback: when SMTP isn't configured the code is logged server-side;
  // also return it so the flow stays testable locally. Never do this in prod.
  if (!result.delivered && process.env.NODE_ENV !== 'production') {
    payload.devCode = code;
  }
  res.json(payload);
});

// POST /api/auth/reset-password { email, code, newPassword, confirmNewPassword }
const resetPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const { newPassword, confirmNewPassword } = req.body;
  if (!email || !code) throw new ApiError(422, 'Email and code are required');
  if (!newPassword || newPassword !== confirmNewPassword) {
    throw new ApiError(422, 'Passwords do not match');
  }

  const row = await prisma.setting.findUnique({ where: { key: resetKey(email) } });
  if (!row) throw new ApiError(400, 'Invalid or expired code');
  let record;
  try { record = JSON.parse(row.value); } catch (e) { record = null; }
  if (!record?.codeHash || !record?.expiresAt) throw new ApiError(400, 'Invalid or expired code');
  if (Date.now() > Number(record.expiresAt)) {
    await prisma.setting.delete({ where: { key: resetKey(email) } }).catch(() => {});
    throw new ApiError(400, 'Code has expired, request a new one');
  }
  if (Number(record.attempts || 0) >= RESET_MAX_ATTEMPTS) {
    await prisma.setting.delete({ where: { key: resetKey(email) } }).catch(() => {});
    throw new ApiError(429, 'Too many wrong attempts, request a new code');
  }

  const ok = crypto.timingSafeEqual(
    Buffer.from(hashCode(code, email)),
    Buffer.from(String(record.codeHash)),
  );
  if (!ok) {
    await prisma.setting.update({
      where: { key: resetKey(email) },
      data: { value: JSON.stringify({ ...record, attempts: Number(record.attempts || 0) + 1 }) },
    }).catch(() => {});
    throw new ApiError(400, 'Invalid code');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(404, 'No account with this email');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await prisma.setting.delete({ where: { key: resetKey(email) } }).catch(() => {});
  await logAudit(prisma, { userId: user.id, action: 'PASSWORD_RESET_COMPLETED', req });

  res.json({ success: true, message: 'Password reset successful, you can now log in' });
});

// POST /api/auth/verify-email { email, code }
const verifyEmail = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  if (!email || !code) throw new ApiError(422, 'Email and code are required');

  const row = await prisma.setting.findUnique({ where: { key: verifyKey(email) } });
  if (!row) throw new ApiError(400, 'Invalid or expired code — request a new one');
  let record;
  try { record = JSON.parse(row.value); } catch (e) { record = null; }
  if (!record?.codeHash || !record?.expiresAt) throw new ApiError(400, 'Invalid or expired code — request a new one');
  if (Date.now() > Number(record.expiresAt)) {
    await prisma.setting.delete({ where: { key: verifyKey(email) } }).catch(() => {});
    throw new ApiError(400, 'Code has expired — request a new one');
  }
  if (Number(record.attempts || 0) >= VERIFY_MAX_ATTEMPTS) {
    await prisma.setting.delete({ where: { key: verifyKey(email) } }).catch(() => {});
    throw new ApiError(429, 'Too many wrong attempts — request a new code');
  }
  const ok = crypto.timingSafeEqual(
    Buffer.from(hashVerifyCode(code, email)),
    Buffer.from(String(record.codeHash)),
  );
  if (!ok) {
    await prisma.setting.update({
      where: { key: verifyKey(email) },
      data: { value: JSON.stringify({ ...record, attempts: Number(record.attempts || 0) + 1 }) },
    }).catch(() => {});
    throw new ApiError(400, 'Invalid code — check your email and try again');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(404, 'No account with this email');

  const updated = await prisma.user.update({ where: { id: user.id }, data: { isActive: true, lastLoginAt: new Date() } });
  await prisma.setting.delete({ where: { key: verifyKey(email) } }).catch(() => {});
  await logAudit(prisma, { userId: user.id, action: 'EMAIL_VERIFIED', req });

  const token = signAccessToken({ id: updated.id, role: updated.role });
  res.json({
    success: true,
    message: 'Email verified — welcome!',
    data: { user: sanitizeUser(updated), token },
  });
});

// POST /api/auth/resend-verification { email }
const resendVerification = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) throw new ApiError(422, 'Email is required');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(404, 'No account with this email');
  if (user.isActive) throw new ApiError(400, 'This email is already verified — you can log in');
  const devCode = await sendVerificationCode(email, user.id, req);
  const payload = { success: true, message: 'Verification code sent — check your email' };
  if (devCode) payload.devCode = devCode;
  res.json(payload);
});

module.exports = { register, login, verifyEmail, resendVerification, forgotPassword, resetPassword, sanitizeUser, logAudit };
