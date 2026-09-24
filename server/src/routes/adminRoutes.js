const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const adminAudit = require('../middleware/adminAudit');
const validate = require('../middleware/validate');
const { paginationValidation, idParamValidation, updateProfileValidation, announcementValidation } = require('../utils/validators');

const {
  getStats, listUsers, getUser, updateUser, deleteUser, exportUsersCsv, listContactMessages, replyToContactMessage,
  sendAnnouncement, listAnnouncements,
} = require('../controllers/adminController');
const { listOrdersAdmin, getOrderAdmin, updateOrderStatus, deleteOrder } = require('../controllers/adminOrderController');
const { adminStats: affiliateStats, listAdminAffiliates, updateAffiliate, adminReferrals, adminCommissions, adminWithdrawals, getWithdrawalById, processWithdrawal, getAffiliateById } = require('../controllers/affiliateController');
const { getSettings, updateSettings } = require('../controllers/settingController');
const {
  listServicesAdmin, createService, getServiceAdmin, updateService, disableService, deleteService,
  createPackage, updatePackage, deletePackage,
} = require('../controllers/adminServiceController');
const { listAdminTickets, updateAdminTicket, replyAsAdmin } = require('../controllers/adminTicketController');

const router = express.Router();

router.use(protect);
router.use(authorize('ADMIN'));
router.use(adminAudit);

// Admin overview / users
router.get('/stats', getStats);
router.get('/users', paginationValidation, validate, listUsers);
router.get('/users/export/csv', exportUsersCsv);
router.get('/users/:id', idParamValidation, validate, getUser);
router.put('/users/:id', idParamValidation, updateProfileValidation, validate, updateUser);
router.delete('/users/:id', idParamValidation, validate, deleteUser);
router.get('/contacts', paginationValidation, validate, listContactMessages);
router.patch('/contacts/:id/reply', replyToContactMessage);

// Announcements (broadcast notifications to users)
router.get('/announcements', listAnnouncements);
router.post('/announcements', announcementValidation, validate, sendAnnouncement);

// Support
router.get('/support', listAdminTickets);
router.patch('/support/:id', updateAdminTicket);
router.post('/support/:id/messages', replyAsAdmin);

// Orders
router.get('/orders', listOrdersAdmin);
router.get('/orders/:id', getOrderAdmin);
router.put('/orders/:id/status', updateOrderStatus);
router.delete('/orders/:id', idParamValidation, validate, deleteOrder);

// Affiliate management
router.get('/affiliates/stats', affiliateStats);
router.get('/affiliates/referrals', adminReferrals);
router.get('/affiliates/commissions', adminCommissions);
router.get('/affiliates/withdrawals', adminWithdrawals);
router.get('/affiliates/withdrawals/:id', getWithdrawalById);
router.get('/affiliates/:id', getAffiliateById);
router.patch('/affiliates/withdrawals/:id', processWithdrawal);
router.get('/affiliates', listAdminAffiliates);
router.patch('/affiliates/:id', updateAffiliate);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Services / Plans management
router.get('/services', listServicesAdmin);
router.post('/services', createService);
router.get('/services/:id', getServiceAdmin);
router.patch('/services/:id', updateService);
router.patch('/services/:id/disable', disableService);
router.delete('/services/:id', deleteService);

// Packages
router.post('/services/:id/packages', createPackage);
router.patch('/packages/:id', updatePackage);
router.delete('/packages/:id', deletePackage);

module.exports = router;
