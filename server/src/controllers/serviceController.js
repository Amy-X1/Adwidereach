const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/services
const listServices = asyncHandler(async (req, res) => {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: { packages: { where: { isActive: true }, orderBy: { price: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: { services } });
});

// GET /api/services/:id
const getService = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw new ApiError(400, 'Invalid service id');
  const service = await prisma.service.findFirst({
    where: { id, isActive: true },
    include: { packages: { where: { isActive: true }, orderBy: { price: 'asc' } } },
  });
  if (!service) throw new ApiError(404, 'Service not found');
  res.json({ success: true, data: { service } });
});

module.exports = { listServices, getService };
