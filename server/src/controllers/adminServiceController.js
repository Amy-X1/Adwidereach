const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

async function saveImageFromDataUrl(dataUrl, folder = 'services') {
  const matches = String(dataUrl || '').match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!matches) return null;
  const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
  const buf = Buffer.from(matches[3], 'base64');
  // limit: 2MB
  const MAX_BYTES = 2 * 1024 * 1024;
  if (buf.length > MAX_BYTES) {
    const ApiError = require('../utils/ApiError');
    throw new ApiError(400, 'Image too large. Max 2MB');
  }
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads', folder);
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = `${folder}_${Date.now()}.${ext}`;
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, buf);
  // build public url
  // note: caller must provide req to build host; we'll return relative path
  return `/uploads/${folder}/${filename}`;
}

// GET /api/admin/services
const listServicesAdmin = asyncHandler(async (req, res) => {
  const services = await prisma.service.findMany({ include: { packages: true }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: { services } });
});

// POST /api/admin/services
const createService = asyncHandler(async (req, res) => {
  const { platform, name, description, category, isActive, requirements } = req.body;
  if (!platform || !name) throw new ApiError(400, 'Platform and name are required');

  const imageDataUrl = req.body.imageDataUrl;
  let imageUrl = req.body.imageUrl || null;
  if (imageDataUrl) {
    const rel = await saveImageFromDataUrl(imageDataUrl, 'services');
    if (rel) imageUrl = `${req.protocol}://${req.get('host')}${rel}`;
  }

  const svc = await prisma.service.create({ data: {
    platform,
    name,
    description: description || '',
    imageUrl: imageUrl || null,
    category: category || null,
    requirements: requirements ? JSON.stringify(requirements) : null,
    isActive: isActive !== false,
  } });

  res.status(201).json({ success: true, message: 'Service created', data: { service: svc } });
});

// GET /api/admin/services/:id
const getServiceAdmin = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw new ApiError(400, 'Invalid id');
  const service = await prisma.service.findUnique({ where: { id }, include: { packages: true } });
  if (!service) throw new ApiError(404, 'Service not found');
  res.json({ success: true, data: { service } });
});

// PATCH /api/admin/services/:id
const updateService = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw new ApiError(400, 'Invalid id');
  const { platform, name, description, isActive, category, requirements } = req.body;
  const data = {};
  if (platform !== undefined) data.platform = platform;
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (isActive !== undefined) data.isActive = isActive;
  if (category !== undefined) data.category = category;
  if (requirements !== undefined) data.requirements = requirements ? JSON.stringify(requirements) : null;

  // handle image data url
  const imageDataUrl = req.body.imageDataUrl;
  if (imageDataUrl) {
    const rel = await saveImageFromDataUrl(imageDataUrl, 'services');
    if (rel) data.imageUrl = `${req.protocol}://${req.get('host')}${rel}`;
  }

  const updated = await prisma.service.update({ where: { id }, data });
  res.json({ success: true, message: 'Service updated', data: { service: updated } });
});

// PATCH /api/admin/services/:id/disable
const disableService = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw new ApiError(400, 'Invalid id');
  await prisma.service.update({ where: { id }, data: { isActive: false } });
  res.json({ success: true, message: 'Service disabled' });
});

// DELETE /api/admin/services/:id
// DELETE /api/admin/services/:id — permanently deletes the service and its plans
const deleteService = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw new ApiError(400, 'Invalid id');
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw new ApiError(404, 'Service not found');
  // Hard delete: packages cascade with the service. Order line items referencing
  // those packages are removed first (they are FK-restricted) — the orders
  // themselves and all other history remain untouched.
  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { servicePackage: { serviceId: id } } }),
    prisma.service.delete({ where: { id } }),
  ]);
  res.json({ success: true, message: 'Service deleted' });
});

// POST /api/admin/services/:id/packages
const createPackage = asyncHandler(async (req, res) => {
  const serviceId = parseInt(req.params.id, 10);
  if (Number.isNaN(serviceId)) throw new ApiError(400, 'Invalid service id');
  const { name, price, deliveryDays, details, features, isActive, category, requirements } = req.body;
  if (!name || price === undefined) throw new ApiError(400, 'Plan name and price are required');
  if (price < 0) throw new ApiError(400, 'Invalid price');

  // handle image data url for package
  const imageDataUrl = req.body.imageDataUrl;
  let imageUrl = req.body.imageUrl || null;
  if (imageDataUrl) {
    const rel = await saveImageFromDataUrl(imageDataUrl, 'services');
    if (rel) imageUrl = `${req.protocol}://${req.get('host')}${rel}`;
  }

  const pkg = await prisma.servicePackage.create({ data: {
    serviceId,
    name,
    imageUrl: imageUrl || null,
    category: category || null,
    requirements: requirements ? JSON.stringify(requirements) : null,
    price: parseFloat(price),
    deliveryDays: parseInt(deliveryDays || 1, 10),
    details: details || '',
    isActive: isActive !== false,
    features: features ? JSON.stringify(features) : null,
  } });
  res.status(201).json({ success: true, message: 'Plan created', data: { package: pkg } });
});

// PATCH /api/admin/packages/:id
const updatePackage = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw new ApiError(400, 'Invalid id');
  const { name, price, deliveryDays, details, features, isActive, category, requirements } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (price !== undefined) data.price = parseFloat(price);
  if (deliveryDays !== undefined) data.deliveryDays = parseInt(deliveryDays, 10);
  if (details !== undefined) data.details = details;
  if (isActive !== undefined) data.isActive = isActive;
  if (category !== undefined) data.category = category;
  if (requirements !== undefined) data.requirements = requirements ? JSON.stringify(requirements) : null;
  if (features !== undefined) data.features = features ? JSON.stringify(features) : null;

  // handle image data url for package
  const imageDataUrl = req.body.imageDataUrl;
  if (imageDataUrl) {
    const rel = await saveImageFromDataUrl(imageDataUrl, 'services');
    if (rel) data.imageUrl = `${req.protocol}://${req.get('host')}${rel}`;
  }

  const updated = await prisma.servicePackage.update({ where: { id }, data });
  res.json({ success: true, message: 'Plan updated', data: { package: updated } });
});

// DELETE /api/admin/packages/:id
const deletePackage = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw new ApiError(400, 'Invalid id');
  await prisma.servicePackage.delete({ where: { id } });
  res.json({ success: true, message: 'Plan deleted' });
});

module.exports = {
  listServicesAdmin,
  createService,
  getServiceAdmin,
  updateService,
  disableService,
  deleteService,
  createPackage,
  updatePackage,
  deletePackage,
};
