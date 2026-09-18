const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createOrder, getOrder, listOrders } = require('../controllers/orderController');

router.use(protect);

router.post('/', createOrder);
router.get('/', listOrders);
router.get('/:id', getOrder);

module.exports = router;
