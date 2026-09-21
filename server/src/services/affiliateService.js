const prisma = require('../config/db');

const AFFILIATE_POLICY = { minimumWithdrawal: 5000, holdDays: 7, minimumOrderAmount: 0, maxCommissionPerOrder: 0 };

function newCode() {
  return `REF${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function ensureAffiliate(userId, client = prisma) {
  const existing = await client.affiliate.findUnique({ where: { userId } });
  if (existing) return existing;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try { return await client.affiliate.create({ data: { userId, code: newCode(), commissionRate: 0.01 /* default 1% for every new affiliate */ } }); }
    catch (err) { if (err.code !== 'P2002') throw err; }
  }
  throw new Error('Could not create a unique referral code');
}

async function releaseMaturedCommissions(client = prisma) {
  const now = new Date();
  const commissions = await client.affiliateCommission.findMany({ where: { status: 'PENDING', availableAt: { lte: now } } });
  for (const commission of commissions) {
    await client.$transaction(async (tx) => {
      const changed = await tx.affiliateCommission.updateMany({ where: { id: commission.id, status: 'PENDING' }, data: { status: 'AVAILABLE' } });
      if (!changed.count) return;
      await tx.referral.updateMany({ where: { id: commission.referralId, status: 'COMMISSION_PENDING' }, data: { status: 'COMMISSION_AVAILABLE' } });
      await tx.transaction.create({ data: { userId: (await tx.affiliate.findUnique({ where: { id: commission.affiliateId } })).userId, type: 'AFFILIATE_COMMISSION_AVAILABLE', amount: commission.amount, reference: `AFF_COMM_${commission.id}`, meta: JSON.stringify({ commissionId: commission.id }) } });
    });
  }
}

async function createCommissionForPaidOrder(orderId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { user: true, payment: true } });
    if (!order || order.status !== 'PAID' || order.payment?.status !== 'SUCCESS') return null;
    const referral = await tx.referral.findUnique({ where: { referredUserId: order.userId }, include: { affiliate: true } });
    if (!referral || referral.status === 'DISQUALIFIED' || !referral.affiliate.isActive || referral.affiliate.userId === order.userId) return null;
    if (order.total < AFFILIATE_POLICY.minimumOrderAmount) return null;
    const exists = await tx.affiliateCommission.findFirst({ where: { affiliateId: referral.affiliateId, orderId } });
    if (exists) return exists;
    let amount = order.total * referral.affiliate.commissionRate;
    if (AFFILIATE_POLICY.maxCommissionPerOrder > 0) amount = Math.min(amount, AFFILIATE_POLICY.maxCommissionPerOrder);
    amount = Math.round(amount * 100) / 100;
    if (amount <= 0) return null;
    const availableAt = new Date(Date.now() + AFFILIATE_POLICY.holdDays * 86400000);
    const commission = await tx.affiliateCommission.create({ data: { affiliateId: referral.affiliateId, referralId: referral.id, orderId, orderAmount: order.total, rate: referral.affiliate.commissionRate, amount, availableAt, status: AFFILIATE_POLICY.holdDays ? 'PENDING' : 'AVAILABLE' } });
    await tx.referral.update({ where: { id: referral.id }, data: { status: AFFILIATE_POLICY.holdDays ? 'COMMISSION_PENDING' : 'COMMISSION_AVAILABLE', ...(referral.qualifyingOrderId ? {} : { qualifyingOrderId: order.id, qualifiedAt: new Date() }) } });
    if (!AFFILIATE_POLICY.holdDays) await tx.transaction.create({ data: { userId: referral.affiliate.userId, type: 'AFFILIATE_COMMISSION_AVAILABLE', amount, reference: `AFF_COMM_${commission.id}`, meta: JSON.stringify({ commissionId: commission.id }) } });
    return commission;
  });
}

async function reverseCommissionsForOrder(orderId, reason = 'Order refunded') {
  return prisma.$transaction(async (tx) => {
    const originals = await tx.affiliateCommission.findMany({ where: { orderId, adjustmentOfId: null, status: { in: ['PENDING', 'AVAILABLE'] } }, include: { affiliate: true } });
    for (const original of originals) {
      await tx.affiliateCommission.update({ where: { id: original.id }, data: { status: 'REVERSED', reversedAt: new Date(), reason } });
      await tx.affiliateCommission.create({ data: { affiliateId: original.affiliateId, referralId: original.referralId, orderId, orderAmount: original.orderAmount, rate: original.rate, amount: -original.amount, status: 'REVERSED', availableAt: new Date(), reason, adjustmentOfId: original.id } });
      await tx.transaction.create({ data: { userId: original.affiliate.userId, type: 'AFFILIATE_COMMISSION_REVERSAL', amount: -original.amount, reference: `AFF_REV_${original.id}`, meta: JSON.stringify({ commissionId: original.id, orderId, reason }) } });
      await tx.referral.updateMany({ where: { id: original.referralId }, data: { status: 'DISQUALIFIED', disqualifiedAt: new Date(), disqualificationReason: reason } });
    }
    return originals.length;
  });
}

module.exports = { AFFILIATE_POLICY, ensureAffiliate, releaseMaturedCommissions, createCommissionForPaidOrder, reverseCommissionsForOrder };
