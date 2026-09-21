const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  res.json({ success: true, data: { notifications, unreadCount } });
});

const markRead = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(400, 'Invalid notification id');
  const notification = await prisma.notification.updateMany({ where: { id, userId: req.user.id }, data: { isRead: true, readAt: new Date() } });
  if (!notification.count) throw new ApiError(404, 'Notification not found');
  res.json({ success: true });
});

const markAllRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
  res.json({ success: true });
});

module.exports = { listNotifications, markRead, markAllRead };
