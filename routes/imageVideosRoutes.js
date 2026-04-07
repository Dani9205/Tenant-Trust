const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// =====================
// Create Upload Directories
// =====================
const uploadRoot = path.join(__dirname, '..', 'uploads');
const imageDir = uploadRoot;
const videoDir = path.join(uploadRoot, 'videos');

[uploadRoot, videoDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// =====================
// Multer Storage
// =====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'image' || file.mimetype.startsWith('image/')) {
      cb(null, imageDir);
    } else if (file.fieldname === 'video' || file.mimetype.startsWith('video/')) {
      cb(null, videoDir);
    } else {
      cb(new Error('Only image and video files are allowed!'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const prefix = file.fieldname === 'video' ? 'vid' : 'img';
    cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// =====================
// Accept Image & Video
// =====================
const upload = multer({ storage }).fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]);

// =====================
// Upload Route
// =====================
router.post('/upload', (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    const files = {};

    // 🔐 FORCE HTTPS (IMPORTANT FOR iOS)
    const baseUrl = `https://${req.get('host')}`;

    if (req.files?.image?.length) {
      const image = req.files.image[0];
      files.image = `uploads/${image.filename}`;
    }

    if (req.files?.video?.length) {
      const video = req.files.video[0];
      files.video = `uploads/videos/${video.filename}`;
    }

    if (!Object.keys(files).length) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Files uploaded successfully',
      data: files
    });
  });
});

module.exports = router;
