
import express from 'express';

const router = express.Router();

// Mock product routes
router.get('/', (req, res) => {
    res.json({ message: 'Get all products' });
});

router.get('/:id', (req, res) => {
    res.json({ message: `Get product ${req.params.id}` });
});

router.post('/', (req, res) => {
    res.json({ message: 'Create new product' });
});

export default router;
