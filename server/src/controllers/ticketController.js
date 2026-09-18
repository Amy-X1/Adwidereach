const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const ticketInclude = { messages: { where: { isInternal: false }, orderBy: { createdAt: 'asc' } }, order: true };

// POST /api/tickets
const createTicket = asyncHandler(async (req, res) => {
  const { subject, message, category, orderId } = req.body;
  if (!subject || !message) throw new ApiError(400, 'subject and message are required');
  let order = null;
  if (orderId) {
    order = await prisma.order.findFirst({ where: { id: Number(orderId), userId: req.user.id } });
    if (!order) throw new ApiError(400, 'Related order not found');
  }
  const ticket = await prisma.supportTicket.create({ data: { userId: req.user.id, subject, message, category: category || 'OTHER', orderId: order?.id, messages: { create: { senderId: req.user.id, message } } }, include: ticketInclude });
  res.json({ success: true, data: { ticket } });
});

// GET /api/tickets
const listTickets = asyncHandler(async (req, res) => {
  if (req.user.role === 'ADMIN' && req.query.all === '1') {
    const tickets = await prisma.supportTicket.findMany({ include: { user: { select: { id: true, fullName: true, email: true } }, order: true }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: { tickets } });
  }
  const tickets = await prisma.supportTicket.findMany({ where: { userId: req.user.id }, include: ticketInclude, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: { tickets } });
});

const getTicket = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const ticket = await prisma.supportTicket.findFirst({ where: { id, ...(req.user.role === 'ADMIN' ? {} : { userId: req.user.id }) }, include: { ...ticketInclude, user: { select: { id: true, fullName: true, email: true } } } });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  res.json({ success: true, data: { ticket } });
});

const replyToTicket = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { message } = req.body;
  if (!message?.trim()) throw new ApiError(400, 'message is required');
  const ticket = await prisma.supportTicket.findFirst({ where: { id, ...(req.user.role === 'ADMIN' ? {} : { userId: req.user.id }) } });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (['RESOLVED', 'CLOSED'].includes(ticket.status) && req.user.role !== 'ADMIN') throw new ApiError(400, 'This ticket is closed');
  const isInternal = req.user.role === 'ADMIN' && req.body.isInternal === true;
  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.ticketMessage.create({ data: { ticketId: id, senderId: req.user.id, message: message.trim(), isInternal } });
    await tx.supportTicket.update({ where: { id }, data: { updatedAt: new Date(), status: isInternal ? ticket.status : (req.user.role === 'ADMIN' ? 'WAITING_FOR_USER' : 'OPEN') } });
    if (!isInternal && req.user.role === 'ADMIN' && ticket.userId) {
      await tx.notification.create({ data: { userId: ticket.userId, type: 'SUPPORT_REPLY', title: 'Support replied', message: `Support replied to Ticket #${ticket.id}.`, ticketId: ticket.id } });
    }
    return created;
  });
  res.status(201).json({ success: true, data: { message: result } });
});

module.exports = { createTicket, listTickets, getTicket, replyToTicket };
