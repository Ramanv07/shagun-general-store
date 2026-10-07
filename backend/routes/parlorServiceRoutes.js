import express from 'express';
import ParlorService from '../models/ParlorService.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/parlor-services
// @desc    Get all parlor services
router.get('/', async (req, res) => {
    try {
        const services = await ParlorService.find({});
        res.json(services);
    } catch (error) {
        console.error('Error fetching parlor services:', error);
        res.status(500).json({ message: 'Failed to fetch services' });
    }
});

// @route   POST /api/parlor-services
// @desc    Create a new parlor service
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { name, duration, price, desc, badge } = req.body;
        
        const service = new ParlorService({
            name,
            duration,
            price,
            desc,
            badge
        });

        const createdService = await service.save();
        res.status(201).json(createdService);
    } catch (error) {
        console.error('Error creating parlor service:', error);
        res.status(500).json({ message: 'Failed to create service' });
    }
});

// @route   PUT /api/parlor-services/:id
// @desc    Update a parlor service
router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const { name, duration, price, desc, badge } = req.body;

        const service = await ParlorService.findById(req.params.id);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        service.name = name || service.name;
        service.duration = duration || service.duration;
        service.price = price !== undefined ? price : service.price;
        service.desc = desc || service.desc;
        service.badge = badge !== undefined ? badge : service.badge;

        const updatedService = await service.save();
        res.json(updatedService);
    } catch (error) {
        console.error('Error updating parlor service:', error);
        res.status(500).json({ message: 'Failed to update service' });
    }
});

// @route   DELETE /api/parlor-services/:id
// @desc    Delete a parlor service
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const service = await ParlorService.findById(req.params.id);
        
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        await ParlorService.findByIdAndDelete(req.params.id);
        res.json({ message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Error deleting parlor service:', error);
        res.status(500).json({ message: 'Failed to delete service' });
    }
});

export default router;
