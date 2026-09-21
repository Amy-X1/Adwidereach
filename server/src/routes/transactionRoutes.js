const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { listTransactions } = require('../controllers/transactionController');

router.use(protect);

router.get('/', listTransactions);

module.exports = router;
