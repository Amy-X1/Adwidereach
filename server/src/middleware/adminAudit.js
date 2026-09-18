const { logAudit } = require('../controllers/authController');
const prisma = require('../config/db');

// Middleware to log all admin route accesses (non-blocking)
async function adminAudit(req, res, next) {
  try {
    // log action as PATH (method)
    await logAudit(prisma, { userId: req.user?.id, action: `ADMIN_${req.method}_${req.path}`, req });
  } catch (e) {
    // ignore logging failures
    console.error('adminAudit error', e && e.message);
  }
  next();
}

module.exports = adminAudit;
