const router = require('express').Router();
const { register, login, verifyEmail, resendVerification, forgotPassword, resetPassword } = require('../controllers/authController');
const validate = require('../middleware/validate');
const { registerValidation, loginValidation, verifyEmailValidation, resendVerificationValidation, forgotPasswordValidation, resetPasswordValidation } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/verify-email', authLimiter, verifyEmailValidation, validate, verifyEmail);
router.post('/resend-verification', authLimiter, resendVerificationValidation, validate, resendVerification);
router.post('/forgot-password', authLimiter, forgotPasswordValidation, validate, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidation, validate, resetPassword);

module.exports = router;
