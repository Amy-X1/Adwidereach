const express = require('express');
const router = express.Router();
const { getPaymentSettings } = require('../controllers/settingController');

// Public: users need the admin's transfer details to fund wallets / pay orders
router.get('/payment', getPaymentSettings);

module.exports = router;