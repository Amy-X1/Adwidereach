const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/admin/settings
const getSettings = asyncHandler(async (req, res) => {
  const settings = await prisma.setting.findMany();
  res.json({ success: true, data: { settings } });
});

// PUT /api/admin/settings
const updateSettings = asyncHandler(async (req, res) => {
  const updates = req.body.settings || [];
  if (!Array.isArray(updates)) throw new ApiError(400, 'Invalid payload');
  const results = [];
  for (const s of updates) {
    if (!s.key) continue;
    const existing = await prisma.setting.findUnique({ where: { key: s.key } });
    if (existing) {
      const u = await prisma.setting.update({ where: { key: s.key }, data: { value: s.value, description: s.description || existing.description } });
      results.push(u);
    } else {
      const u = await prisma.setting.create({ data: { key: s.key, value: s.value, description: s.description || null } });
      results.push(u);
    }
  }
  res.json({ success: true, data: { settings: results } });
});

// GET /api/settings/payment — public: bank transfer details shown to users
const PAYMENT_KEYS = ['BANK_NAME', 'ACCOUNT_NUMBER', 'ACCOUNT_NAME'];
const getPaymentSettings = asyncHandler(async (req, res) => {
  const rows = await prisma.setting.findMany({ where: { key: { in: PAYMENT_KEYS } } });
  const map = {};
  for (const key of PAYMENT_KEYS) {
    const row = rows.find((r) => r.key === key);
    map[key] = row?.value || '';
  }
  res.json({ success: true, data: { settings: map } });
});

module.exports = { getSettings, updateSettings, getPaymentSettings };
