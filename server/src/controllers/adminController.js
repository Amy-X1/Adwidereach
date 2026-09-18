const { Parser } = require('json2csv');
const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sanitizeUser, logAudit } = require('./authController');

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, newToday, activeUsers, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.user.count({ where: { isActive: true, lastLoginAt: { gte: sevenDaysAgo } } }),
    prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Build a day-by-day registration trend for the last 30 days
  const trendMap = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    trendMap[key] = 0;
  }
  recentUsers.forEach((u) => {
    const key = u.createdAt.toISOString().slice(0, 10);
    if (trendMap[key] !== undefined) trendMap[key] += 1;
  });
  const registrationTrend = Object.entries(trendMap).map(([date, count]) => ({ date, count }));

  const totalContactMessages = await prisma.contactMessage.count();

  res.json({
    success: true,
    data: {
      totalUsers,
      newUsersToday: newToday,
      activeUsers,
      totalContactMessages,
      registrationTrend,
    },
  });
});

// GET /api/admin/users?search=&country=&gender=&role=&page=&limit=&sortBy=&sortOrder=
const listUsers = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const { search, country, gender, role, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const where = {};
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { username: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }
  if (country) where.country = country;
  if (gender) where.gender = gender;
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const allowedSortFields = ['createdAt', 'fullName', 'email', 'username', 'country'];
  const orderBy = { [allowedSortFields.includes(sortBy) ? sortBy : 'createdAt']: sortOrder === 'asc' ? 'asc' : 'desc' };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      users: users.map(sanitizeUser),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
  });
});

// GET /api/admin/users/:id
const getUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: { user: sanitizeUser(user) } });
});

// PUT /api/admin/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const allowed = [
    'fullName', 'phone', 'dob', 'gender', 'country', 'state', 'city',
    'businessName', 'address', 'role', 'isActive',
  ];
  const data = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = key === 'dob' ? new Date(req.body[key]) : req.body[key];
  }

  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  await logAudit(prisma, { userId: req.user.id, action: 'ADMIN_UPDATE_USER', details: `Updated user #${user.id}`, req });

  res.json({ success: true, message: 'User updated successfully', data: { user: sanitizeUser(user) } });
});

// DELETE /api/admin/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw new ApiError(400, 'You cannot delete your own admin account from here');
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  await logAudit(prisma, { userId: req.user.id, action: 'ADMIN_DELETE_USER', details: `Deleted user #${req.params.id}`, req });
  res.json({ success: true, message: 'User deleted successfully' });
});

// GET /api/admin/users/export/csv
const exportUsersCsv = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  const fields = [
    'id', 'fullName', 'username', 'email', 'phone', 'dob', 'gender',
    'country', 'state', 'city', 'businessName', 'address', 'role',
    'isActive', 'createdAt',
  ];
  const parser = new Parser({ fields });
  const csv = parser.parse(users.map(sanitizeUser));

  res.header('Content-Type', 'text/csv');
  res.attachment(`users-export-${Date.now()}.csv`);
  res.send(csv);
});

// GET /api/admin/contacts
const listContactMessages = asyncHandler(async (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const [messages, total] = await Promise.all([
    prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contactMessage.count(),
  ]);

  res.json({
    success: true,
    data: { messages, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } },
  });
});

// PATCH /api/admin/contacts/:id/reply
const replyToContactMessage = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const reply = String(req.body.reply || '').trim();
  if (!Number.isInteger(id) || !reply) throw new ApiError(400, 'A reply is required');
  const message = await prisma.contactMessage.update({ where: { id }, data: { reply, repliedAt: new Date() } });
  await logAudit(prisma, { userId: req.user.id, action: 'ADMIN_REPLY_CONTACT', details: `Replied to contact message #${id}`, req });
  res.json({ success: true, data: { message } });
});

module.exports = {
  getStats, listUsers, getUser, updateUser, deleteUser, exportUsersCsv, listContactMessages, replyToContactMessage,
};
