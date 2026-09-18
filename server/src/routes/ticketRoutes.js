const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createTicket, listTickets, getTicket, replyToTicket } = require('../controllers/ticketController');

router.use(protect);

router.post('/', createTicket);
router.get('/', listTickets);
router.get('/:id', getTicket);
router.post('/:id/messages', replyToTicket);

module.exports = router;
