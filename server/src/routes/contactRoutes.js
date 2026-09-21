const router = require('express').Router();
const { submitContactMessage } = require('../controllers/contactController');
const validate = require('../middleware/validate');
const { contactValidation } = require('../utils/validators');
const { apiLimiter } = require('../middleware/rateLimiter');

router.post('/', apiLimiter, contactValidation, validate, submitContactMessage);

module.exports = router;
