require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contactRoutes = require('./routes/contactRoutes');
const affiliateRoutes = require('./routes/affiliateRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const settingRoutes = require('./routes/settingRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust the first proxy hop (needed for correct req.ip behind Nginx/Heroku/etc.)
app.set('trust proxy', 1);

// ---- Security middleware ----
app.use(helmet());
app.use(
  cors({
    // Next.js uses the next available port when 3000 is occupied.
    origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);
// Increase JSON limit to allow base64 image uploads (2MB image ≈ 2.7MB base64)
// NOTE: order videos are NOT sent as JSON — they use multipart upload
// (POST /api/uploads/order-video) so a long video never hits this limit.
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips keys starting with $ or containing . to prevent NoSQL/operator injection
app.use(xss()); // sanitizes user input coming from POST body, GET queries, and url params against XSS
app.use(hpp()); // protects against HTTP parameter pollution

// Note on CSRF: this API is stateless and authenticates every request via a
// JWT Bearer token in the Authorization header rather than cookies, so it is
// not susceptible to classic CSRF attacks (which rely on browsers
// automatically attaching cookies to cross-site requests). If you switch to
// storing the JWT in a cookie, add a CSRF-token middleware (e.g. csrf-csrf)
// guarding all state-changing routes.

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/api/', apiLimiter);

// Serve uploaded files (avatars, etc.)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  setHeaders(res, filePath) {
    // Allow images to be embedded cross-origin (useful during local dev with Next.js on another port)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
}));

// ---- Routes ----
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);

// Prisma/SQL Injection protection: all database queries go through Prisma's
// query builder, which uses parameterized queries under the hood — raw
// string concatenation into SQL is never used anywhere in this codebase.

app.use(notFound);
app.use(errorHandler);

module.exports = app;
