const { body, query, param } = require('express-validator');

// Reusable, strict validation chains for express-validator.

const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/; // loose E.164-style validation

const registerValidation = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_.]+$/).withMessage('Username may only contain letters, numbers, dots and underscores'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(PHONE_REGEX).withMessage('Invalid phone number, use international format e.g. +15551234567'),
  body('dob')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Date of birth must be a valid date')
    .custom((value) => {
      const age = (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 13) throw new Error('You must be at least 13 years old to register');
      if (age > 120) throw new Error('Please enter a valid date of birth');
      return true;
    }),
  body('gender')
    .trim()
    .notEmpty().withMessage('Gender is required')
    .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female or Other'),
  body('country').trim().notEmpty().withMessage('Country is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('businessName').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body('address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 5, max: 255 }).withMessage('Address must be 5-255 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .matches(STRONG_PASSWORD_REGEX)
    .withMessage('Password must be at least 8 characters and include uppercase, lowercase, a number and a special character'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
];

const loginValidation = [
  body('identifier').trim().notEmpty().withMessage('Email or username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
];

const resetPasswordValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('code').trim().notEmpty().withMessage('Reset code is required').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .matches(STRONG_PASSWORD_REGEX)
    .withMessage('Password must be at least 8 characters and include uppercase, lowercase, a number and a special character'),
  body('confirmNewPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
];

const verifyEmailValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('code').trim().notEmpty().withMessage('Verification code is required').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
];

const resendVerificationValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
];

const announcementValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ min: 3, max: 120 }).withMessage('Title must be 3-120 characters'),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ min: 3, max: 2000 }).withMessage('Message must be 3-2000 characters'),
  body('audience').optional().isIn(['ALL', 'USERS', 'ADMINS']).withMessage('Audience must be ALL, USERS or ADMINS'),
];

const updateProfileValidation = [
  body('fullName').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional().trim().matches(PHONE_REGEX).withMessage('Invalid phone number'),
  body('dob').optional().isISO8601(),
  body('gender').optional().isIn(['Male', 'Female', 'Other']),
  body('country').optional().trim().notEmpty(),
  body('state').optional().trim().notEmpty(),
  body('city').optional().trim().notEmpty(),
  body('businessName').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body('address').optional().trim().isLength({ min: 5, max: 255 }),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .matches(STRONG_PASSWORD_REGEX)
    .withMessage('New password must be at least 8 characters and include uppercase, lowercase, a number and a special character'),
  body('confirmNewPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
];

const contactValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim().matches(PHONE_REGEX).withMessage('Invalid phone number'),
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 150 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ min: 10, max: 2000 }),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

const idParamValidation = [param('id').isInt({ min: 1 }).toInt()];

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailValidation,
  resendVerificationValidation,
  announcementValidation,
  updateProfileValidation,
  changePasswordValidation,
  contactValidation,
  paginationValidation,
  idParamValidation,
};
