const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { AFFILIATE_POLICY, ensureAffiliate, releaseMaturedCommissions } = require('../services/affiliateService');
const { logAudit } = require('./authController');

const pageInfo = (req) => ({ page: Math.max(1, Number(req.query.page) || 1), limit: Math.min(100, Math.max(1, Number(req.query.limit) || 10)) });
const safeName = (user) => user ? (user.fullName || user.username || `Customer #${user.id}`) : '—';
const parseBankDetails = (raw) => {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && (parsed.accountName || parsed.accountNumber || parsed.bankName)) {
      return { accountName: String(parsed.accountName || ''), accountNumber: String(parsed.accountNumber || ''), bankName: String(parsed.bankName || '') };
    }
    return null;
  } catch { return null; }
};
async function balances(affiliateId) {
  const [all, withdrawals] = await Promise.all([prisma.affiliateCommission.findMany({ where: { affiliateId } }), prisma.affiliateWithdrawal.aggregate({ where: { affiliateId, status: { in: ['PENDING', 'APPROVED', 'PAID'] } }, _sum: { amount: true } })]);
  const total = all.filter((c) => c.amount > 0).reduce((n, c) => n + c.amount, 0);
  const pending = all.filter((c) => c.status === 'PENDING').reduce((n, c) => n + c.amount, 0);
  const availableGross = all.filter((c) => c.status === 'AVAILABLE').reduce((n, c) => n + c.amount, 0);
  return { total, pending, available: Math.max(0, availableGross - (withdrawals._sum.amount || 0)), reserved: withdrawals._sum.amount || 0 };
}

const getMyAffiliate = asyncHandler(async (req, res) => {
  await releaseMaturedCommissions();
  const affiliate = await ensureAffiliate(req.user.id);
  const [referralCount, qualifiedCount, recent, balance] = await Promise.all([
    prisma.referral.count({ where: { affiliateId: affiliate.id } }), prisma.referral.count({ where: { affiliateId: affiliate.id, status: { in: ['QUALIFIED', 'COMMISSION_PENDING', 'COMMISSION_AVAILABLE'] } } }),
    prisma.referral.findMany({ where: { affiliateId: affiliate.id }, include: { referredUser: { select: { fullName: true, username: true } }, qualifyingOrder: true, commissions: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, take: 10 }), balances(affiliate.id),
  ]);
  const referralLink = `${req.protocol}://${req.get('host').replace(/:\d+$/, '')}/register?ref=${affiliate.code}`;
  res.json({ success: true, data: { affiliate: { id: affiliate.id, code: affiliate.code, isActive: affiliate.isActive, referralLink, commissionRate: affiliate.commissionRate }, policy: AFFILIATE_POLICY, stats: { totalReferrals: referralCount, qualifiedReferrals: qualifiedCount, ...balance }, referrals: recent.map((r) => ({ id: r.id, name: safeName(r.referredUser), joinedAt: r.createdAt, status: r.status, orderAmount: r.qualifyingOrder?.total || null, commission: r.commissions[0]?.amount || null })) } });
});

const getAffiliateById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid affiliate id');
  await releaseMaturedCommissions();
  const affiliate = await prisma.affiliate.findUnique({ where: { id } });
  if (!affiliate) throw new ApiError(404, 'Affiliate not found');
  const [referralCount, qualifiedCount, recent, balance] = await Promise.all([
    prisma.referral.count({ where: { affiliateId: affiliate.id } }),
    prisma.referral.count({ where: { affiliateId: affiliate.id, status: { in: ['QUALIFIED', 'COMMISSION_PENDING', 'COMMISSION_AVAILABLE'] } } }),
    prisma.referral.findMany({ where: { affiliateId: affiliate.id }, include: { referredUser: { select: { fullName: true, username: true } }, qualifyingOrder: true, commissions: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, take: 10 }),
    balances(affiliate.id),
  ]);
  const referralLink = `${req.protocol}://${req.get('host').replace(/:\d+$/, '')}/register?ref=${affiliate.code}`;
  res.json({ success: true, data: {
    affiliate: { id: affiliate.id, code: affiliate.code, isActive: affiliate.isActive, referralLink, commissionRate: affiliate.commissionRate },
    policy: AFFILIATE_POLICY,
    stats: { totalReferrals: referralCount, qualifiedReferrals: qualifiedCount, ...balance },
    referrals: recent.map((r) => ({ id: r.id, name: safeName(r.referredUser), joinedAt: r.createdAt, status: r.status, orderAmount: r.qualifyingOrder?.total || null, commission: r.commissions[0]?.amount || null })),
  } });
});

const myCommissions = asyncHandler(async (req, res) => {
  await releaseMaturedCommissions(); const affiliate = await ensureAffiliate(req.user.id); const { page, limit } = pageInfo(req); const where = { affiliateId: affiliate.id };
  if (req.query.status) where.status = req.query.status;
  const [total, rows] = await Promise.all([prisma.affiliateCommission.count({ where }), prisma.affiliateCommission.findMany({ where, include: { order: true, referral: { include: { referredUser: { select: { fullName: true, username: true } } } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit })]);
  res.json({ success: true, data: { commissions: rows.map((c) => ({ ...c, referredCustomer: safeName(c.referral.referredUser) })), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } } });
});

const requestWithdrawal = asyncHandler(async (req, res) => {
  await releaseMaturedCommissions();
  const amount = Number(req.body.amount);
  const accountName = String(req.body.accountName || '').trim();
  const accountNumber = String(req.body.accountNumber || '').trim();
  const bankName = String(req.body.bankName || '').trim();
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, 'A valid withdrawal amount is required');
  if (!accountName || !accountNumber || !bankName) throw new ApiError(400, 'Account name, account number and bank are required');
  const affiliate = await ensureAffiliate(req.user.id); if (!affiliate.isActive) throw new ApiError(403, 'Affiliate withdrawals are currently unavailable');
  const balance = await balances(affiliate.id); if (amount < AFFILIATE_POLICY.minimumWithdrawal) throw new ApiError(400, `Minimum withdrawal is ₦${AFFILIATE_POLICY.minimumWithdrawal.toLocaleString()}`); if (amount > balance.available) throw new ApiError(400, 'Amount exceeds your available affiliate balance');
  const paymentDetails = JSON.stringify({ accountName, accountNumber, bankName });
  const withdrawal = await prisma.affiliateWithdrawal.create({ data: { affiliateId: affiliate.id, amount, paymentMethod: 'Bank transfer', paymentDetails } });
  await prisma.transaction.create({ data: { userId: req.user.id, type: 'AFFILIATE_WITHDRAWAL_REQUEST', amount: -amount, reference: `AFF_WD_${withdrawal.id}`, meta: JSON.stringify({ withdrawalId: withdrawal.id }) } });
  // Notify all admins of the new withdrawal request
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  if (admins.length > 0) {
    await Promise.all(admins.map((a) => prisma.notification.create({ data: { userId: a.id, type: 'AFFILIATE_WITHDRAWAL_REQUEST', title: 'New withdrawal request', message: `${req.user.fullName || req.user.email} requested a ₦${amount.toLocaleString()} withdrawal` } })));
  }
  res.status(201).json({ success: true, data: { withdrawal } });
});
const myWithdrawals = asyncHandler(async (req, res) => { const affiliate = await ensureAffiliate(req.user.id); const withdrawals = await prisma.affiliateWithdrawal.findMany({ where: { affiliateId: affiliate.id }, orderBy: { requestedAt: 'desc' } }); res.json({ success: true, data: { withdrawals: withdrawals.map((w) => ({ ...w, bankDetails: parseBankDetails(w.paymentDetails) })) } }); });

const adminStats = asyncHandler(async (req, res) => {
  await releaseMaturedCommissions(); const [totalAffiliates, totalReferrals, commissions, withdrawals] = await Promise.all([prisma.affiliate.count(), prisma.referral.count(), prisma.affiliateCommission.findMany(), prisma.affiliateWithdrawal.findMany()]); const sum = (items) => items.reduce((n, x) => n + x.amount, 0);
  res.json({ success: true, data: { totalAffiliates, totalReferrals, totalCommissions: sum(commissions.filter((c) => c.amount > 0)), pendingCommissions: sum(commissions.filter((c) => c.status === 'PENDING')), availableCommissions: sum(commissions.filter((c) => c.status === 'AVAILABLE')), pendingWithdrawals: withdrawals.filter((w) => w.status === 'PENDING').length, totalPaidWithdrawals: sum(withdrawals.filter((w) => w.status === 'PAID')) } });
});
const listAdminAffiliates = asyncHandler(async (req, res) => {
  await releaseMaturedCommissions(); const affiliates = await prisma.affiliate.findMany({ include: { user: { select: { fullName: true, username: true, email: true } }, referrals: true }, orderBy: { createdAt: 'desc' } });
  const data = await Promise.all(affiliates.map(async (a) => ({ id: a.id, code: a.code, isActive: a.isActive, createdAt: a.createdAt, user: a.user, referrals: a.referrals.length, qualifiedReferrals: a.referrals.filter((r) => ['QUALIFIED', 'COMMISSION_PENDING', 'COMMISSION_AVAILABLE'].includes(r.status)).length, ...(await balances(a.id)) }))); res.json({ success: true, data: { affiliates: data } });
});
const updateAffiliate = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid affiliate id');
  const updateData = {};
  if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) updateData.isActive = Boolean(req.body.isActive);
  if (Object.prototype.hasOwnProperty.call(req.body, 'commissionRate')) {
    const cr = Number(req.body.commissionRate);
    if (!Number.isFinite(cr) || cr < 0) throw new ApiError(400, 'Invalid commissionRate');
    updateData.commissionRate = cr;
  }
  if (!Object.keys(updateData).length) throw new ApiError(400, 'No valid fields to update');
  const affiliate = await prisma.affiliate.update({ where: { id }, data: updateData });
  const action = updateData.isActive !== undefined ? (affiliate.isActive ? 'AFFILIATE_ACTIVATED' : 'AFFILIATE_SUSPENDED') : (Object.prototype.hasOwnProperty.call(updateData, 'commissionRate') ? 'AFFILIATE_COMMISSION_UPDATED' : 'AFFILIATE_UPDATED');
  await logAudit(prisma, { userId: req.user.id, action, details: JSON.stringify({ affiliateId: id, updateData }), req });
  res.json({ success: true, data: { affiliate } });
});
const adminReferrals = asyncHandler(async (req, res) => {
  const { page, limit } = pageInfo(req);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.affiliateId) where.affiliateId = Number(req.query.affiliateId);
  const [total, referrals] = await Promise.all([
    prisma.referral.count({ where }),
    prisma.referral.findMany({ where, include: { affiliate: { include: { user: { select: { fullName: true, email: true } } } }, referredUser: { select: { fullName: true, email: true } }, qualifyingOrder: true, commissions: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
  ]);
  res.json({ success: true, data: { referrals, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } } });
});
const adminCommissions = asyncHandler(async (req, res) => {
  const { page, limit } = pageInfo(req);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.affiliateId) where.affiliateId = Number(req.query.affiliateId);
  const [total, commissions] = await Promise.all([
    prisma.affiliateCommission.count({ where }),
    prisma.affiliateCommission.findMany({ where, include: { affiliate: { include: { user: { select: { fullName: true, email: true } } } }, referral: { include: { referredUser: { select: { fullName: true, email: true } } } }, order: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
  ]);
  res.json({ success: true, data: { commissions, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } } });
});
const adminWithdrawals = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.affiliateId) where.affiliateId = Number(req.query.affiliateId);
  const withdrawals = await prisma.affiliateWithdrawal.findMany({ where, include: { affiliate: { include: { user: { select: { fullName: true, email: true } } } } }, orderBy: { requestedAt: 'desc' } });
  res.json({ success: true, data: { withdrawals: withdrawals.map((w) => ({ ...w, bankDetails: parseBankDetails(w.paymentDetails) })) } });
});
const getWithdrawalById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid withdrawal id');
  const withdrawal = await prisma.affiliateWithdrawal.findUnique({ where: { id }, include: { affiliate: { include: { user: { select: { id: true, fullName: true, username: true, email: true, phone: true, createdAt: true } } } } } });
  if (!withdrawal) throw new ApiError(404, 'Withdrawal not found');
  res.json({ success: true, data: { withdrawal: { ...withdrawal, bankDetails: parseBankDetails(withdrawal.paymentDetails) } } });
});
const processWithdrawal = asyncHandler(async (req, res) => { const id = Number(req.params.id); const status = req.body.status; if (!['APPROVED', 'REJECTED', 'PAID', 'CANCELLED'].includes(status)) throw new ApiError(400, 'Invalid withdrawal status'); const withdrawal = await prisma.affiliateWithdrawal.findUnique({ where: { id }, include: { affiliate: true } }); if (!withdrawal) throw new ApiError(404, 'Withdrawal not found'); if (withdrawal.status === 'PAID' || withdrawal.status === 'REJECTED' || withdrawal.status === 'CANCELLED') throw new ApiError(409, 'This withdrawal is already final'); if (status === 'REJECTED' && !String(req.body.reason || '').trim()) throw new ApiError(400, 'A rejection reason is required'); if (status === 'PAID' && withdrawal.status !== 'APPROVED') throw new ApiError(400, 'Approve the withdrawal before marking it paid'); const updated = await prisma.affiliateWithdrawal.update({ where: { id }, data: { status, reason: req.body.reason || withdrawal.reason, processedAt: ['REJECTED', 'PAID', 'CANCELLED'].includes(status) ? new Date() : null, processedById: req.user.id } });
  if ((status === 'APPROVED' || status === 'REJECTED') && withdrawal.affiliate.userId) {
    const accepted = status === 'APPROVED';
    await prisma.notification.create({ data: { userId: withdrawal.affiliate.userId, type: accepted ? 'AFFILIATE_WITHDRAWAL_APPROVED' : 'AFFILIATE_WITHDRAWAL_REJECTED', title: accepted ? 'Withdrawal approved' : 'Withdrawal rejected', message: accepted ? `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} has been approved.` : `Your withdrawal of ₦${withdrawal.amount.toLocaleString()} was rejected${req.body.reason ? `: ${req.body.reason}` : '.'}` } });
  }
  await prisma.transaction.create({ data: { userId: withdrawal.affiliate.userId, type: `AFFILIATE_WITHDRAWAL_${status}`, amount: status === 'REJECTED' || status === 'CANCELLED' ? withdrawal.amount : 0, reference: `AFF_WD_${id}`, meta: JSON.stringify({ withdrawalId: id, reason: req.body.reason || null }) } }); await logAudit(prisma, { userId: req.user.id, action: `AFFILIATE_WITHDRAWAL_${status}`, details: JSON.stringify({ withdrawalId: id }), req }); res.json({ success: true, data: { withdrawal: updated } }); });

module.exports = { getMyAffiliate, getAffiliateById, myCommissions, requestWithdrawal, myWithdrawals, adminStats, listAdminAffiliates, updateAffiliate, adminReferrals, adminCommissions, adminWithdrawals, getWithdrawalById, processWithdrawal };
