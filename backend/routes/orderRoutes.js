
import express from 'express';

const router = express.Router();

// Mock order routes
router.get('/', (req, res) => {
    res.json({ message: 'Get all orders' });
});

router.post('/', (req, res) => {
    res.json({ message: 'Create new order' });
});

export default router;
