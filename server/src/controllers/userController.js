const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sanitizeUser, logAudit } = require('./authController');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

// GET /api/users/profile
const getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: sanitizeUser(req.user) } });
});

// PUT /api/users/profile
const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['fullName', 'phone', 'dob', 'gender', 'country', 'state', 'city', 'businessName', 'address'];
  const data = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = key === 'dob' ? new Date(req.body[key]) : req.body[key];
  }

  // Handle avatar upload via data URL (client sends base64 dataURI)
  if (req.body.avatarDataUrl) {
    const matches = req.body.avatarDataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/);
    if (!matches) throw new ApiError(400, 'Invalid avatar data');
    const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
    const buf = Buffer.from(matches[3], 'base64');
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = `avatar_${req.user.id}_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buf);
    // build a public URL for the avatar
    const host = `${req.protocol}://${req.get('host')}`;
    data.avatarUrl = `${host}/uploads/avatars/${filename}`;
  }

  // Handle explicit avatar removal
  if (req.body.avatarAction === 'remove') {
    // delete previous avatar file if it belongs to uploads/avatars
    if (req.user.avatarUrl) {
      try {
        const fs = require('fs');
        const path = require('path');
        const url = req.user.avatarUrl;
        const parsed = new URL(url);
        const pathname = parsed.pathname; // /uploads/avatars/filename
        const filepath = path.join(__dirname, '..', '..', pathname);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      } catch (e) {
        // ignore errors
      }
    }
    data.avatarUrl = null;
  }

  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  await logAudit(prisma, { userId: user.id, action: 'PROFILE_UPDATE', req });

  res.json({ success: true, message: 'Profile updated successfully', data: { user: sanitizeUser(user) } });
});

// PUT /api/users/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const match = await bcrypt.compare(currentPassword, req.user.passwordHash);
  if (!match) throw new ApiError(401, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
  await logAudit(prisma, { userId: req.user.id, action: 'PASSWORD_CHANGE', req });

  res.json({ success: true, message: 'Password changed successfully' });
});

// DELETE /api/users/account
const deleteAccount = asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: req.user.id } });
  res.json({ success: true, message: 'Account deleted successfully' });
});

module.exports = { getProfile, updateProfile, changePassword, deleteAccount };
