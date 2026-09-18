const router = require('express').Router();
const { register, login } = require('../controllers/authController');
const validate = require('../middleware/validate');
const { registerValidation, loginValidation } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);

module.exports = router;
