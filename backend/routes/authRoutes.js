
import express from 'express';

const router = express.Router();

// Mock auth routes for demo
router.post('/register', (req, res) => {
    res.json({ message: 'User registered successfully' });
});

router.post('/login', (req, res) => {
    res.json({ message: 'User logged in successfully', token: 'mock-jwt-token' });
});

export default router;
