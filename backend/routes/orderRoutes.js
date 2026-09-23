import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/orders
// @desc    Get all orders (admin / general)
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'name email phone role')
            .populate('items.product', 'name price image category')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
    }
});

// @route   GET /api/orders/myorders
// @desc    Get orders of logged-in user
router.get('/myorders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('user', 'name email phone role')
            .populate('items.product', 'name price image category')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching my orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
    }
});

// @route   GET /api/orders/user/:userId
// @desc    Get all past orders for a specific user ID
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const orders = await Order.find({ user: userId })
            .populate('user', 'name email phone role')
            .populate('items.product', 'name price image category')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Failed to fetch user orders', error: error.message });
    }
});

// @route   GET /api/orders/:id
// @desc    Get single order by ID
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone role')
            .populate('items.product', 'name price image category');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Failed to fetch order', error: error.message });
    }
});

// @route   POST /api/orders
// @desc    Create a new order & update product inventory
router.post('/', async (req, res) => {
    try {
        const { user, items, totalAmount, shippingAddress, paymentMethod, saveAddressToProfile } = req.body;

        if (!user || !items || items.length === 0 || !totalAmount || !shippingAddress) {
            return res.status(400).json({ message: 'Missing required order fields or empty items' });
        }

        // Validate shipping address required fields
        const { fullName, mobile, houseNo, street, city, state, pinCode } = shippingAddress;
        if (!fullName || !mobile || !houseNo || !street || !city || !state || !pinCode) {
            return res.status(400).json({ message: 'Please provide all shipping address fields' });
        }

        // Decrement stock for purchased products
        for (const item of items) {
            const prodId = item.product || item._id;
            if (prodId) {
                await Product.findByIdAndUpdate(prodId, {
                    $inc: { stock: -(item.quantity || 1) }
                });
            }
        }

        const newOrder = new Order({
            user,
            items: items.map(item => ({
                product: item.product || item._id,
                name: item.name,
                quantity: item.quantity || 1,
                price: item.price
            })),
            totalAmount: Number(totalAmount),
            shippingAddress,
            paymentMethod: paymentMethod || 'COD',
            paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Completed',
            status: 'Processing'
        });

        const savedOrder = await newOrder.save();

        // If requested, or if user has no saved addresses yet, optionally save this address to their profile
        if (saveAddressToProfile && user) {
            try {
                const userDoc = await User.findById(user);
                if (userDoc) {
                    const alreadyExists = userDoc.addresses.some(
                        addr => addr.houseNo === houseNo && addr.pinCode === pinCode
                    );
                    if (!alreadyExists) {
                        const isDefault = userDoc.addresses.length === 0;
                        userDoc.addresses.push({ ...shippingAddress, isDefault });
                        if (!userDoc.phone && mobile) {
                            userDoc.phone = mobile;
                        }
                        await userDoc.save();
                    }
                }
            } catch (addrErr) {
                console.warn('Could not auto-save address to user profile:', addrErr.message);
            }
        }

        const populatedOrder = await Order.findById(savedOrder._id)
            .populate('user', 'name email phone')
            .populate('items.product', 'name price image');

        res.status(201).json(populatedOrder);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Failed to create order', error: error.message });
    }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Processing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const existingOrder = await Order.findById(req.params.id);
        if (!existingOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // If transitioning to Cancelled and was not cancelled before, restore stock
        if (status === 'Cancelled' && existingOrder.status !== 'Cancelled') {
            for (const item of existingOrder.items) {
                if (item.product) {
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { stock: item.quantity }
                    });
                }
            }
        }

        existingOrder.status = status;
        const updatedOrder = await existingOrder.save();

        res.json(updatedOrder);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Failed to update order status', error: error.message });
    }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel an order (if still processing/packed)
router.put('/:id/cancel', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status === 'Delivered') {
            return res.status(400).json({ message: 'Cannot cancel an order that has already been delivered' });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({ message: 'Order is already cancelled' });
        }

        // Restore stock
        for (const item of order.items) {
            if (item.product) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: item.quantity }
                });
            }
        }

        order.status = 'Cancelled';
        const saved = await order.save();
        res.json({ message: 'Order cancelled successfully', order: saved });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Failed to cancel order', error: error.message });
    }
});

// @route   DELETE /api/orders/:id
// @desc    Delete order
router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ message: 'Failed to delete order', error: error.message });
    }
});

export default router;

