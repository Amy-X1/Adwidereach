const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/contact
const submitContactMessage = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  const record = await prisma.contactMessage.create({
    data: { name, email: email.toLowerCase(), phone: phone || null, subject, message },
  });

  res.status(201).json({
    success: true,
    message: 'Thank you for reaching out! We will get back to you shortly.',
    data: { id: record.id },
  });
});

module.exports = { submitContactMessage };
