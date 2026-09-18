const express = require('express');
const { protect } = require('../middleware/auth');
const { getMyAffiliate, myCommissions, requestWithdrawal, myWithdrawals } = require('../controllers/affiliateController');
const router = express.Router();

router.use(protect);
router.get('/me', getMyAffiliate);
router.get('/commissions', myCommissions);
router.get('/withdrawals', myWithdrawals);
router.post('/withdrawals', requestWithdrawal);

module.exports = router;
