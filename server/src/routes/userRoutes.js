const router = require('express').Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateProfileValidation, changePasswordValidation } = require('../utils/validators');
const {
  getProfile, updateProfile, changePassword, deleteAccount,
} = require('../controllers/userController');

router.use(protect);
router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, validate, updateProfile);
router.put('/change-password', changePasswordValidation, validate, changePassword);
router.delete('/account', deleteAccount);

module.exports = router;
