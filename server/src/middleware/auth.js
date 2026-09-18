const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/db');

// Verifies the Bearer JWT and attaches the current user to req.user.
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return next(new ApiError(401, 'Not authenticated. Please log in.'));
    }

    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.isActive) {
      return next(new ApiError(401, 'Account not found or has been deactivated'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Restricts a route to one or more roles, e.g. authorize('ADMIN')
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = { protect, authorize };
