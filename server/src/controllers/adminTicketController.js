const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const listAdminTickets = asyncHandler(async (req, res) => {
  const { status, category, search } = req.query;
  const tickets = await prisma.supportTicket.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(search ? { OR: [{ subject: { contains: search } }, { user: { fullName: { contains: search } } }, { user: { email: { contains: search } } }] } : {}),
    },
    include: { user: { select: { id: true, fullName: true, email: true } }, order: true, messages: { orderBy: { createdAt: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ success: true, data: { tickets } });
});

const updateAdminTicket = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status, priority, assignedTo } = req.body;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  const data = {};
  if (status) data.status = status;
  if (priority) data.priority = priority;
  if (assignedTo !== undefined) data.assignedTo = assignedTo ? Number(assignedTo) : null;
  const updated = await prisma.supportTicket.update({ where: { id }, data, include: { user: true, order: true } });
  if (status && status !== ticket.status && ticket.userId) {
    await prisma.notification.create({ data: { userId: ticket.userId, type: 'SUPPORT_STATUS', title: 'Support ticket updated', message: `Ticket #${ticket.id} is now ${status}.`, ticketId: ticket.id } });
  }
  res.json({ success: true, data: { ticket: updated } });
});

const replyAsAdmin = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { message, isInternal } = req.body;
  if (!message?.trim()) throw new ApiError(400, 'message is required');
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  const internal = isInternal === true;
  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.ticketMessage.create({ data: { ticketId: id, senderId: req.user.id, message: message.trim(), isInternal: internal } });
    await tx.supportTicket.update({ where: { id }, data: { updatedAt: new Date(), status: internal ? ticket.status : 'WAITING_FOR_USER' } });
    if (!internal && ticket.userId) await tx.notification.create({ data: { userId: ticket.userId, type: 'SUPPORT_REPLY', title: 'Support replied', message: `Support replied to Ticket #${ticket.id}.`, ticketId: ticket.id } });
    return created;
  });
  res.status(201).json({ success: true, data: { message: result } });
});

module.exports = { listAdminTickets, updateAdminTicket, replyAsAdmin };
