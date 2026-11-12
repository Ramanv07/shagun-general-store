import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configure Cloudinary with credentials from environment
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer to use memoryStorage only (stateless for serverless execution)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 4 * 1024 * 1024, // Strict 4 MB server limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and AVIF are permitted.'));
    }
  }
});

// Wrapper middleware for clear Multer error messages
const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum allowed size is 4 MB.' });
      }
      return res.status(400).json({ message: err.message || 'Image upload failed' });
    }
    next();
  });
};

// @route   POST /api/upload
// @desc    Upload an image buffer to Cloudinary and get URL (multipart/form-data)
// @access  Private/Admin
router.post('/', protect, adminOnly, handleUpload, async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  try {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const cleanName = (req.file.originalname || 'asset')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'shagun_general_store',
          public_id: `${cleanName}_${timestamp}_${randomStr}`,
          resource_type: 'image',
          transformation: [{ width: 1600, crop: 'limit' }]
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    res.json({ imageUrl: uploadResult.secure_url, url: uploadResult.secure_url });
  } catch (error) {
    console.error('Cloudinary stream error:', error.message || error);
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[DEV UPLOAD] Cloudinary upload failed in local environment; using fallback demo image.');
      return res.json({
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        fallback: true
      });
    }
    res.status(500).json({ message: 'Failed to upload image to cloud storage' });
  }
});

// @route   POST /api/upload/base64
// @desc    Upload a base64 image string directly to Cloudinary
// @access  Private/Admin
router.post('/base64', protect, adminOnly, async (req, res) => {
  const { image } = req.body || {};
  if (!image) {
    return res.status(400).json({ message: 'No image provided' });
  }

  try {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'shagun_general_store',
      public_id: `prod_${timestamp}_${randomStr}`,
      transformation: [{ width: 1600, crop: 'limit' }],
    });

    res.json({ imageUrl: uploadResponse.secure_url });
  } catch (error) {
    console.error('Base64 Cloudinary upload error:', error.message || error);
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[DEV UPLOAD] Cloudinary base64 upload failed in local environment; returning uploaded base64 data URI.');
      return res.json({
        imageUrl: image,
        fallback: true
      });
    }
    res.status(500).json({ message: 'Failed to upload base64 image' });
  }
});

export default router;
