const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { createCommissionForPaidOrder, reverseCommissionsForOrder } = require('../services/affiliateService');

// GET /api/admin/orders
const listOrdersAdmin = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({ include: { items: { include: { servicePackage: true } }, payment: true, user: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: { orders } });
});

// GET /api/admin/orders/:id
const getOrderAdmin = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw new ApiError(400, 'Invalid id');
  const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { servicePackage: true } }, payment: true, user: true } });
  if (!order) throw new ApiError(404, 'Order not found');
  res.json({ success: true, data: { order } });
});

// PUT /api/admin/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, reason } = req.body;
  if (Number.isNaN(id) || !status) throw new ApiError(400, 'Invalid input');
  const allowed = ['PENDING', 'PAID', 'ACCEPTED', 'PROCESSING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED', 'REFUNDED'];
  if (!allowed.includes(status)) throw new ApiError(400, 'Invalid status');
  const current = await prisma.order.findUnique({ where: { id }, include: { user: true } });
  if (!current) throw new ApiError(404, 'Order not found');
  const changed = await prisma.order.updateMany({ where: { id, status: current.status }, data: { status } });
  if (!changed.count) throw new ApiError(409, 'Order status changed by another request');
  const order = await prisma.order.update({ where: { id }, data: { rejectionReason: status === 'REJECTED' ? (reason || null) : null } });
  await prisma.orderStatusHistory.create({ data: { orderId: id, previousStatus: current.status, newStatus: status, reason: reason || null, changedBy: req.user.id } });
  if (current.userId) await prisma.notification.create({ data: { userId: current.userId, type: `ORDER_${status}`, title: 'Order status updated', message: `Your order #${current.reference} is now ${status}.`, orderId: id } });
  if (status === 'PAID') await createCommissionForPaidOrder(id);
  if (status === 'REFUNDED') await reverseCommissionsForOrder(id, 'Order refunded by administrator');

  // Record a transaction for the user's ledger (completed / failed payment)
  if (status === 'PAID' || status === 'COMPLETED') {
    // Only create a payment transaction if one doesn't already exist for this order
    const existingPaymentTx = await prisma.transaction.findFirst({ where: { reference: current.reference, type: 'ORDER_PAYMENT_COMPLETED' } });
    if (!existingPaymentTx) {
      await prisma.transaction.create({ data: { userId: current.userId, type: 'ORDER_PAYMENT_COMPLETED', amount: current.total, currency: current.currency, reference: current.reference, meta: `Order ${current.reference} payment completed` } });
    }
  } else if (status === 'REJECTED' || status === 'CANCELLED') {
    await prisma.transaction.create({ data: { userId: current.userId, type: 'ORDER_PAYMENT_FAILED', amount: current.total, currency: current.currency, reference: current.reference, meta: `Order ${current.reference} ${status.toLowerCase()}` } });
  } else if (status === 'REFUNDED') {
    await prisma.transaction.create({ data: { userId: current.userId, type: 'ORDER_REFUND', amount: current.total, currency: current.currency, reference: current.reference, meta: `Order ${current.reference} refunded` } });
  }

  res.json({ success: true, data: { order } });
});

// DELETE /api/admin/orders/:id
const deleteOrder = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw new ApiError(400, 'Invalid id');
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new ApiError(404, 'Order not found');
  // Reverse any commissions tied to this order before deleting
  await reverseCommissionsForOrder(id, 'Order deleted by administrator');
  // Delete dependent records first (FK constraints)
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: id } });
  await prisma.affiliateCommission.deleteMany({ where: { orderId: id } });
  await prisma.notification.deleteMany({ where: { orderId: id } });
  await prisma.transaction.deleteMany({ where: { id: { in: (await prisma.transaction.findMany({ where: { reference: order.reference }, select: { id: true } })).map((t) => t.id) } } });
  await prisma.orderItem.deleteMany({ where: { orderId: id } });
  await prisma.payment.deleteMany({ where: { orderId: id } });
  await prisma.order.delete({ where: { id } });
  res.json({ success: true, message: 'Order deleted successfully' });
});

module.exports = { listOrdersAdmin, getOrderAdmin, updateOrderStatus, deleteOrder };
