const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function generateReference() {
  return `ORD_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// POST /api/orders
const createOrder = asyncHandler(async (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'No items provided');

  const packageIds = items.map((it) => it.servicePackageId);
  const packages = await prisma.servicePackage.findMany({
    where: { id: { in: packageIds }, isActive: true, service: { isActive: true } },
    include: { service: true },
  });
  if (packages.length !== packageIds.length) throw new ApiError(400, 'One or more packages not found');

  const orderItems = [];
  let total = 0;

  for (const it of items) {
    const pkg = packages.find((p) => p.id === it.servicePackageId);
    const qty = parseInt(it.quantity || 1, 10);
    if (!Number.isInteger(qty) || qty < 1) throw new ApiError(400, 'Quantity must be at least 1');
    const unitPrice = pkg.price;
    const totalPrice = unitPrice * qty;
    // base checkout info required for every order
    const provided = (it.requirements && typeof it.requirements === 'object' && !Array.isArray(it.requirements)) ? it.requirements : {};
    const baseFields = ['Email', 'Social Media Name', 'Social Media URL'];
    const missingBase = baseFields.filter((f) => !String(provided[f] || '').trim());
    if (missingBase.length > 0) throw new ApiError(400, `Missing required fields: ${missingBase.join(', ')}`);

    // validate package-specific requirements
    const pkgRequirements = pkg.requirements || (pkg.service && pkg.service.requirements) || null;
    if (pkgRequirements) {
      let reqFields = [];
      try { reqFields = Array.isArray(pkgRequirements) ? pkgRequirements : JSON.parse(pkgRequirements); } catch (e) { reqFields = [pkgRequirements]; }
      const missing = [];
      for (const field of reqFields) {
        if (!provided || provided[field] === undefined || provided[field] === null || String(provided[field]).trim() === '') missing.push(field);
      }
      if (missing.length > 0) throw new ApiError(400, `Missing required fields for package ${pkg.name}: ${missing.join(', ')}`);
    }

    total += totalPrice;
    orderItems.push({ servicePackageId: pkg.id, quantity: qty, unitPrice, totalPrice, requirements: JSON.stringify(provided) });
  }

  const reference = generateReference();

  const order = await prisma.order.create({
    data: {
      userId: req.user.id,
      total,
      currency: 'NGN',
      status: 'PENDING',
      reference,
      items: {
        create: orderItems,
      },
    },
    include: { items: true },
  });

  res.json({ success: true, data: { order } });
});

// GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw new ApiError(400, 'Invalid order id');
  const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { servicePackage: true } }, payment: true } });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.userId !== req.user.id && req.user.role !== 'ADMIN') throw new ApiError(403, 'Not authorized');
  res.json({ success: true, data: { order } });
});

// GET /api/orders (user's orders or admin view)
const listOrders = asyncHandler(async (req, res) => {
  if (req.user.role === 'ADMIN' && req.query.all === '1') {
    const orders = await prisma.order.findMany({ include: { items: true, payment: true }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { orders } });
  }
  const orders = await prisma.order.findMany({ where: { userId: req.user.id }, include: { items: true, payment: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: { orders } });
});

module.exports = { createOrder, getOrder, listOrders };
