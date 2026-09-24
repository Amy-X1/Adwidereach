const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const router = express.Router();

// Store order videos on local disk (served via /uploads static route in app.js).
const videosDir = path.join(__dirname, '..', '..', 'uploads', 'order-videos');
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.mp4';
    cb(null, `order_video_${req.user?.id || 'guest'}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max (~fits a compressed ~30 min clip)
  fileFilter: (req, file, cb) => {
    if (String(file.mimetype || '').startsWith('video/')) return cb(null, true);
    cb(new ApiError(400, 'Only video files are allowed'));
  },
});

// POST /api/uploads/order-video (auth required, field name: video)
router.post(
  '/order-video',
  protect,
  (req, res, next) => {
    upload.single('video')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'Video too large. Max 200MB — please compress or trim it.'));
        return next(err);
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'No video file received');
    res.json({
      success: true,
      data: { url: `/uploads/order-videos/${req.file.filename}`, filename: req.file.originalname },
    });
  })
);

module.exports = router;