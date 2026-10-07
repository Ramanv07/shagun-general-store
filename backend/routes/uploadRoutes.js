import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// This middleware configures Cloudinary with the keys from your .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer to use Cloudinary for storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'shagun_general_store',
    allowedFormats: ['jpg', 'png', 'jpeg', 'webp', 'avif'],
    transformation: [{ width: 800, crop: 'limit' }], // Automatically resize large images
  },
});

const upload = multer({ storage: storage });

// @route   POST /api/upload
// @desc    Upload an image to Cloudinary and get URL
// @access  Private/Admin
router.post('/', protect, adminOnly, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }
  // req.file.path contains the secure Cloudinary URL
  res.json({ imageUrl: req.file.path });
});

export default router;
