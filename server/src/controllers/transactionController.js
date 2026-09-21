const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/transactions
const listTransactions = asyncHandler(async (req, res) => {
  const include = { payment: true, user: { select: { id: true, email: true, fullName: true } } };
  if (req.user.role === 'ADMIN' && req.query.all === '1') {
    const tx = await prisma.transaction.findMany({ include, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { transactions: tx } });
  }
  const tx = await prisma.transaction.findMany({ where: { userId: req.user.id }, include, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: { transactions: tx } });
});

module.exports = { listTransactions };
