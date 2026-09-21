const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { signAccessToken } = require('../utils/jwt');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

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

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: {
      fullName, username, email: email.toLowerCase(), phone,
      dob: new Date(dob), gender, country, state, city,
      businessName: businessName || null, address, passwordHash,
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

  const token = signAccessToken({ id: user.id, role: user.role });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: { user: sanitizeUser(user), token },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] },
  });

  if (!user) throw new ApiError(401, 'Invalid credentials');
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    await logAudit(prisma, { userId: user.id, action: 'LOGIN_FAILED', req });
    throw new ApiError(401, 'Invalid credentials');
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

module.exports = { register, login, sanitizeUser, logAudit };
