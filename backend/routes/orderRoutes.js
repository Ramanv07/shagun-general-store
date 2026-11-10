import StoreSetting from '../models/StoreSetting.js';
import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import CouponRedemption from '../models/CouponRedemption.js';
import { validateCouponHelper } from './couponRoutes.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { sendAdminOrderNotification, sendCustomerOrderNotification } from '../services/notificationService.js';
import { logAuditEvent } from '../services/auditService.js';
import { withTimeout } from '../utils/asyncHelper.js';
import { getPaymentProvider } from '../services/paymentProvider.js';

export async function checkAndExpireOrder(orderOrId) {
    if (!orderOrId) return false;
    const id = typeof orderOrId === 'object' && orderOrId !== null ? (orderOrId._id || orderOrId.id) : orderOrId;
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) return false;
    const expiredDoc = await Order.findOneAndUpdate(
        {
            _id: id,
            paymentMethod: 'UPI',
            paymentStatus: 'pending',
            paymentExpiresAt: { $lt: new Date() }
        },
        {
            $set: {
                paymentStatus: 'expired',
                status: 'Cancelled',
                rejectionReason: 'Payment window expired'
            }
        },
        { new: false, runValidators: true }
    );

    if (expiredDoc) {
        if (expiredDoc.items && expiredDoc.items.length > 0) {
            for (const item of expiredDoc.items) {
                const prodId = item.product?._id || item.product;
                if (prodId) {
                    await Product.findByIdAndUpdate(prodId, { $inc: { stock: item.quantity } }).catch(() => {});
                }
            }
        }

        if (expiredDoc.couponCode) {
            await CouponRedemption.deleteOne({ order: expiredDoc._id }).catch(() => {});
            await Coupon.findOneAndUpdate({ code: expiredDoc.couponCode.toUpperCase() }, { $inc: { usedCount: -1 } }).catch(() => {});
        }
        return true;
    }
    return false;
}

const router = express.Router();

// @route   GET /api/orders
// @desc    Get all orders (admin) or user's own orders (customer)
router.get('/', protect, async (req, res) => {
    try {
        // Automatically mark COD payment as Completed in background without blocking GET request
        Order.updateMany(
            { status: 'Delivered', paymentStatus: 'Pending' },
            { $set: { paymentStatus: 'Completed' } },
            { runValidators: true }
        ).catch(err => console.warn('COD status sync error:', err.message));

        let query = {};
        if (req.user.role !== 'admin') {
            query = {
                $or: [
                    { user: req.user._id },
                    { legacyUserId: req.user._id.toString() }
                ]
            };
        }
        const orders = await Order.find(query)
            .populate('user', 'name email phone role')
            .populate('items.product', 'name price image images category')
            .sort({ createdAt: -1 })
            .lean();
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// @route   GET /api/orders/myorders
// @desc    Get orders of logged-in user
router.get('/myorders', protect, async (req, res) => {
    try {
        // Automatically mark COD payment as Completed if order is already delivered
        await Order.updateMany(
            { status: 'Delivered', paymentStatus: 'Pending' },
            { $set: { paymentStatus: 'Completed' } },
            { runValidators: true }
        );

        const orders = await Order.find({
            $or: [
                { user: req.user._id },
                { legacyUserId: req.user._id.toString() }
            ]
        })
            .populate('user', 'name email phone role')
            .populate('items.product', 'name price image images category')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching my orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// @route   GET /api/orders/user/:userId
// @desc    Get all past orders for a specific user ID
router.get('/user/:userId', protect, async (req, res) => {
    try {
        const { userId } = req.params;
        if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const orders = await Order.find({
            $or: [
                { user: userId },
                { legacyUserId: userId }
            ]
        })
            .populate('user', 'name email phone role')
            .populate('items.product', 'name price image images category')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Failed to fetch user orders' });
    }
});

// @route   POST /api/orders/track
// @desc    Track order publicly
router.post('/track', async (req, res) => {
    try {
        const { orderId, mobile } = req.body;
        if (!orderId || !mobile) {
            return res.status(400).json({ message: 'Order ID and Mobile number are required' });
        }

        const order = await Order.findById(orderId)
            .populate('items.product', 'name price image images category');
            
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const orderMobile = order.shippingAddress?.mobile;
        
        if (orderMobile !== mobile) {
             return res.status(403).json({ message: 'Mobile number does not match the order' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error tracking order:', error);
        res.status(500).json({ message: 'Failed to track order. Please check the Order ID.' });
    }
});

// @route   GET /api/orders/admin/upi-payments
// @desc    Admin: List UPI orders (pending, verifying, paid, expired) with time left
router.get('/admin/upi-payments', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.query;
        const filter = { paymentMethod: 'UPI' };
        if (status) {
            if (status.toLowerCase() === 'pending') {
                filter.paymentStatus = { $in: ['pending', 'Pending'] };
            } else if (status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed') {
                filter.paymentStatus = { $in: ['paid', 'Completed'] };
            } else {
                filter.paymentStatus = status;
            }
        }

        const orders = await Order.find(filter)
            .populate('user', 'name email phone')
            .populate('items.product', 'name price image')
            .sort({ createdAt: -1 });

        const mapped = await Promise.all(orders.map(async (o) => {
            await checkAndExpireOrder(o);
            const expiresAtMs = o.paymentExpiresAt ? new Date(o.paymentExpiresAt).getTime() : 0;
            const minutesLeft = expiresAtMs ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 60000)) : 0;

            return {
                _id: o._id,
                orderNumber: o._id.toString().slice(-8).toUpperCase(),
                totalAmount: o.totalAmount,
                paymentStatus: o.paymentStatus,
                status: o.status,
                upiTxnRef: o.upiTxnRef,
                upiUtr: o.upiUtr,
                upiUtrAttempts: o.upiUtrAttempts || 0,
                upiIntent: o.upiIntent,
                paymentExpiresAt: o.paymentExpiresAt,
                minutesLeft,
                paidAt: o.paidAt,
                verifiedBy: o.verifiedBy,
                rejectionReason: o.rejectionReason,
                createdAt: o.createdAt,
                customer: {
                    name: o.user?.name || o.shippingAddress?.fullName || 'Customer',
                    email: o.user?.email,
                    phone: o.user?.phone || o.shippingAddress?.mobile
                },
                itemCount: o.items?.length || 0
            };
        }));

        res.json(mapped);
    } catch (error) {
        console.error('Error fetching admin UPI payments:', error);
        res.status(500).json({ message: 'Failed to fetch UPI payments' });
    }
});

// @route   POST /api/orders/admin/expire-stale-upi
// @desc    Admin / Cron: Lazily or bulk expire unpaid pending UPI orders
router.post('/admin/expire-stale-upi', protect, adminOnly, async (req, res) => {
    try {
        const staleOrders = await Order.find({
            paymentMethod: 'UPI',
            paymentStatus: 'pending',
            paymentExpiresAt: { $lt: new Date() }
        });

        let expiredCount = 0;
        for (const order of staleOrders) {
            const didExpire = await checkAndExpireOrder(order);
            if (didExpire) expiredCount++;
        }

        res.json({ success: true, expiredCount, message: `Expired ${expiredCount} stale UPI orders.` });
    } catch (error) {
        console.error('Error expiring stale UPI orders:', error);
        res.status(500).json({ message: 'Failed to expire stale orders' });
    }
});

// @route   GET /api/orders/:id
// @desc    Get single order by ID
router.get('/:id', protect, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ message: 'Order not found' });
        }
        await checkAndExpireOrder(req.params.id);

        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone role')
            .populate('items.product', 'name price image images category');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const isOwner = order.user && (
            (order.user._id && order.user._id.toString() === req.user._id.toString()) ||
            order.user.toString() === req.user._id.toString() ||
            order.legacyUserId === req.user._id.toString()
        );

        if (req.user.role !== 'admin' && !isOwner) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (order.status === 'Delivered' && order.paymentStatus === 'Pending') {
            order.paymentStatus = 'Completed';
            await order.save();
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Failed to fetch order' });
    }
});

// @route   POST /api/orders/:id/upi-utr
// @desc    Customer: Submit 12-digit bank UTR reference for verification
router.post('/:id/upi-utr', protect, async (req, res) => {
    try {
        const { utr } = req.body;
        const cleanUtr = String(utr || '').trim();

        if (!/^\d{12}$/.test(cleanUtr)) {
            return res.status(400).json({ message: 'UTR must be exactly 12 numeric digits' });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const isOwner = order.user && (
            (order.user._id && order.user._id.toString() === req.user._id.toString()) ||
            order.user.toString() === req.user._id.toString() ||
            order.legacyUserId === req.user._id.toString()
        );

        if (req.user.role !== 'admin' && !isOwner) {
            return res.status(403).json({ message: 'Access denied: You can only submit UTR for your own orders' });
        }

        if (order.paymentMethod !== 'UPI') {
            return res.status(400).json({ message: 'UTR submission is only allowed for UPI orders' });
        }

        if (order.paymentStatus === 'paid') {
            return res.status(400).json({ message: 'This order is already verified as paid' });
        }

        // Max 5 attempts
        if ((order.upiUtrAttempts || 0) >= 5) {
            return res.status(400).json({ message: 'Maximum UTR submission attempts (5) exceeded. Please contact store support.' });
        }

        // Check if UTR was already submitted on another order
        const duplicateOrder = await Order.findOne({ upiUtr: cleanUtr, _id: { $ne: order._id } });
        if (duplicateOrder) {
            return res.status(400).json({ message: 'This UTR has already been submitted for another order. Please check your bank transaction.' });
        }

        // Check if payment window has passed
        let isExpired = order.paymentStatus === 'expired';
        if (!isExpired && order.paymentExpiresAt && Date.now() > new Date(order.paymentExpiresAt).getTime()) {
            await checkAndExpireOrder(order._id);
            isExpired = true;
        }

        const newPaymentStatus = isExpired ? 'late_payment' : 'verifying';
        order.upiUtr = cleanUtr;
        order.paymentStatus = newPaymentStatus;
        order.upiUtrAttempts = (order.upiUtrAttempts || 0) + 1;
        await order.save();

        const populatedOrder = await Order.findById(order._id)
            .populate('user', 'name email phone')
            .populate('items.product', 'name price image');

        // Alert store owner NOW (upon UTR submission, not order creation)
        await withTimeout(
            sendAdminOrderNotification(populatedOrder || order, isExpired ? 'Late UPI Payment Submitted' : 'UPI UTR Submitted'),
            5000,
            'sendAdminOrderNotification'
        );

        // Notify customer
        const customerMsg = isExpired 
            ? 'Payment submitted after window expired. Store management is checking item availability.' 
            : 'UTR submitted successfully. Store owner is verifying your payment.';

        await withTimeout(
            sendCustomerOrderNotification(populatedOrder || order, isExpired ? 'Late Payment Received' : 'Payment Under Verification'),
            5000,
            'sendCustomerOrderNotification'
        );

        res.json({
            success: true,
            message: customerMsg,
            order
        });
    } catch (error) {
        console.error('Error submitting UTR:', error);
        res.status(500).json({ message: 'Failed to submit UTR' });
    }
});

// @route   POST /api/orders/:id/upi-approve
// @desc    Admin: Approve UPI payment (marks order paid & confirmed). Atomic with precondition.
router.post('/:id/upi-approve', protect, adminOnly, async (req, res) => {
    try {
        const order = await Order.findOneAndUpdate(
            {
                _id: req.params.id,
                paymentMethod: 'UPI',
                paymentStatus: { $in: ['pending', 'verifying', 'late_payment-reinstated'] },
                status: { $nin: ['Cancelled'] }
            },
            {
                $set: {
                    paymentStatus: 'paid',
                    paidAt: new Date(),
                    verifiedBy: req.user._id,
                    status: 'Processing'
                }
            },
            { new: true, runValidators: true }
        ).populate('user', 'name email phone');

        if (!order) {
            const check = await Order.findById(req.params.id);
            if (check && check.paymentStatus === 'paid') {
                return res.json({ success: true, message: 'Order was already approved and marked as paid', order: check });
            }
            return res.status(400).json({
                message: 'Cannot approve: Order must be in "verifying" or reinstated status, and cannot be COD, cancelled, or expired.'
            });
        }

        // Audit log without PII
        await withTimeout(
            logAuditEvent(req.user._id, 'UPI_PAYMENT_APPROVED', 'Order', order._id, {
                totalAmount: order.totalAmount,
                utr: order.upiUtr,
                paidAt: order.paidAt
            }),
            5000,
            'logAuditEvent'
        );

        // Notify customer
        await withTimeout(
            sendCustomerOrderNotification(order, 'Payment Verified'),
            5000,
            'sendCustomerOrderNotification'
        );

        res.json({ success: true, message: 'Payment approved successfully. Order confirmed.', order });
    } catch (error) {
        console.error('Error approving UPI payment:', error);
        res.status(500).json({ message: 'Failed to approve payment' });
    }
});

// @route   POST /api/orders/:id/upi-reinstate
// @desc    Admin: Reinstate late payment order if stock is available
router.post('/:id/upi-reinstate', protect, adminOnly, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.paymentStatus !== 'late_payment') {
            return res.status(400).json({ message: 'Only orders in late_payment status can be reinstated' });
        }

        // Verify inventory availability for all items
        for (const item of order.items) {
            const prod = await Product.findById(item.product);
            if (!prod || prod.stock < item.quantity) {
                return res.status(400).json({
                    message: `Cannot reinstate: "${item.name}" has insufficient stock (${prod ? prod.stock : 0} left). Please issue refund.`
                });
            }
        }

        // Re-reserve stock
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
        }

        // Re-link coupon if present
        if (order.couponCode) {
            await Coupon.findOneAndUpdate({ code: order.couponCode.toUpperCase() }, { $inc: { usedCount: 1 } });
            await CouponRedemption.create({
                coupon: order.couponCode,
                user: order.user,
                order: order._id,
                amount: order.discountAmount || 0
            }).catch(() => {});
        }

        order.paymentStatus = 'verifying';
        order.status = 'Processing';
        order.rejectionReason = null;
        await order.save();

        await withTimeout(
            logAuditEvent(req.user._id, 'UPI_LATE_PAYMENT_REINSTATED', 'Order', order._id, {
                totalAmount: order.totalAmount,
                utr: order.upiUtr
            }),
            5000,
            'logAuditEvent'
        );

        await withTimeout(
            sendCustomerOrderNotification(order, 'Order Reinstated'),
            5000,
            'sendCustomerOrderNotification'
        );

        res.json({ success: true, message: 'Order reinstated with inventory re-reserved. You can now approve payment.', order });
    } catch (err) {
        console.error('Error reinstating order:', err);
        res.status(500).json({ message: 'Failed to reinstate order' });
    }
});

// @route   POST /api/orders/:id/upi-refund-needed
// @desc    Admin: Mark late payment as refund needed when stock cannot be fulfilled
router.post('/:id/upi-refund-needed', protect, adminOnly, async (req, res) => {
    try {
        const { reason } = req.body;
        const cleanReason = String(reason || 'Order expired; item unavailable. Refund required.').trim();

        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, paymentStatus: 'late_payment' },
            {
                $set: {
                    paymentStatus: 'refund_needed',
                    rejectionReason: cleanReason
                }
            },
            { new: true, runValidators: true }
        );

        if (!order) {
            return res.status(400).json({ message: 'Order not found or not in late_payment status' });
        }

        await withTimeout(
            logAuditEvent(req.user._id, 'UPI_REFUND_NEEDED_RECORDED', 'Order', order._id, { reason: cleanReason }),
            5000,
            'logAuditEvent'
        );

        await withTimeout(
            sendCustomerOrderNotification(order, 'Refund In Progress'),
            5000,
            'sendCustomerOrderNotification'
        );

        res.json({ success: true, message: 'Order marked as refund needed', order });
    } catch (err) {
        console.error('Error marking refund needed:', err);
        res.status(500).json({ message: 'Failed to record refund needed' });
    }
});

// @route   POST /api/orders/:id/upi-reject
// @desc    Admin: Reject UPI payment (invalid UTR, unreceived money). Atomic with status check.
router.post('/:id/upi-reject', protect, adminOnly, async (req, res) => {
    try {
        const { reason, releaseStock = true, releaseCoupon = true } = req.body;
        const cleanReason = String(reason || 'Payment was not received in bank account / UTR mismatch').trim();

        const order = await Order.findOneAndUpdate(
            {
                _id: req.params.id,
                paymentMethod: 'UPI',
                paymentStatus: { $in: ['pending', 'verifying', 'late_payment'] },
                status: { $ne: 'Cancelled' }
            },
            {
                $set: {
                    paymentStatus: 'failed',
                    status: 'Cancelled',
                    verifiedBy: req.user._id,
                    rejectionReason: cleanReason
                }
            },
            { new: false, runValidators: true }
        ).populate('user', 'name email phone');

        if (!order) {
            const check = await Order.findById(req.params.id);
            if (check && check.paymentStatus === 'failed') {
                return res.json({ success: true, message: 'Order was already rejected', order: check });
            }
            return res.status(400).json({ message: 'Order cannot be rejected in its current status' });
        }

        // Restore stock if requested (only once, since findOneAndUpdate matched uniquely)
        if (releaseStock && order.items && order.items.length > 0) {
            for (const item of order.items) {
                const prodId = item.product?._id || item.product;
                if (prodId) {
                    await Product.findByIdAndUpdate(prodId, { $inc: { stock: item.quantity } }).catch(() => {});
                }
            }
        }

        // Release coupon if requested
        if (releaseCoupon && order.couponCode) {
            await CouponRedemption.deleteOne({ order: order._id }).catch(() => {});
            await Coupon.findOneAndUpdate({ code: order.couponCode.toUpperCase() }, { $inc: { usedCount: -1 } }).catch(() => {});
        }

        // Audit log without PII
        await withTimeout(
            logAuditEvent(req.user._id, 'UPI_PAYMENT_REJECTED', 'Order', order._id, {
                totalAmount: order.totalAmount,
                utr: order.upiUtr,
                reason: cleanReason,
                releaseStock,
                releaseCoupon
            }),
            5000,
            'logAuditEvent'
        );

        // Notify customer
        await withTimeout(
            sendCustomerOrderNotification(order, 'Payment Rejected'),
            5000,
            'sendCustomerOrderNotification'
        );

        res.json({ success: true, message: 'Payment rejected. Order marked as failed.' });
    } catch (error) {
        console.error('Error rejecting UPI payment:', error);
        res.status(500).json({ message: 'Failed to reject payment' });
    }
});

// @route   POST /api/orders
// @desc    Create a new order & update product inventory
router.post('/', protect, async (req, res) => {
    try {
        const { items, totalAmount, shippingAddress, paymentMethod, saveAddressToProfile } = req.body;

        if (!items || items.length === 0 || !totalAmount || !shippingAddress) {
            return res.status(400).json({ message: 'Missing required order fields or empty items' });
        }

        // Validate shipping address required fields
        const { fullName, mobile, houseNo, street, city, state, pinCode } = shippingAddress;
        if (!fullName || !mobile || !houseNo || !street || !city || !state || !pinCode) {
            return res.status(400).json({ message: 'Please provide all shipping address fields' });
        }

        // 1. Verify products & calculate authoritative server-side prices (W1-05)
        const validProdIds = items
            .map(item => item.product || item._id)
            .filter(id => id && mongoose.Types.ObjectId.isValid(id));

        const productsInDb = await Product.find({ _id: { $in: validProdIds } });
        const productMap = new Map(productsInDb.map(p => [p._id.toString(), p]));

        let serverSubtotal = 0;
        const verifiedItems = [];

        for (const item of items) {
            const prodId = (item.product || item._id)?.toString();
            const requestedQty = Number(item.quantity);

            if (!Number.isInteger(requestedQty) || requestedQty <= 0) {
                return res.status(400).json({ message: `Invalid integer quantity for "${item.name || 'item'}"` });
            }

            if (!prodId || !productMap.has(prodId)) {
                return res.status(400).json({ message: `Product not found for item "${item.name || 'item'}"` });
            }

            const product = productMap.get(prodId);
            if (product.stock <= 0) {
                return res.status(400).json({
                    message: `"${product.name}" is currently Out of Stock. Please remove it from your cart to proceed.`
                });
            }
            if (requestedQty > product.stock) {
                return res.status(400).json({
                    message: `Only ${product.stock} unit${product.stock > 1 ? 's' : ''} available for "${product.name}". You requested ${requestedQty}. Please reduce your quantity.`
                });
            }

            const verifiedPrice = Number(product.price);
            serverSubtotal += verifiedPrice * requestedQty;

            verifiedItems.push({
                product: product._id,
                name: product.name,
                image: product.image || item.image || '',
                quantity: requestedQty,
                price: verifiedPrice
            });
        }

        // Fetch dynamic delivery threshold from StoreSetting or defaults
        let freeDeliveryThreshold = 399;
        let standardDeliveryFee = 30;
        try {
            const config = await StoreSetting.findOne({ key: 'delivery_config' }).lean();
            if (config) {
                if (typeof config.freeDeliveryThreshold === 'number') freeDeliveryThreshold = config.freeDeliveryThreshold;
                if (typeof config.deliveryFee === 'number') standardDeliveryFee = config.deliveryFee;
            } else {
                const settings = await StoreSetting.find({ key: { $in: ['freeDeliveryThreshold', 'deliveryFee'] } }).lean();
                for (const s of settings) {
                    if (s.key === 'freeDeliveryThreshold') freeDeliveryThreshold = Number(s.value) || 399;
                    if (s.key === 'deliveryFee') standardDeliveryFee = Number(s.value) || 30;
                }
            }
        } catch (sErr) {}

        // Free delivery threshold checked on items total BEFORE discount
        const serverDeliveryFee = serverSubtotal >= freeDeliveryThreshold ? 0 : standardDeliveryFee;

        // Authoritative coupon re-validation inside order flow
        let appliedCouponCode = null;
        let appliedDiscountAmount = 0;
        let couponDoc = null;

        if (req.body.couponCode) {
            const couponResult = await validateCouponHelper(req.body.couponCode, items, req.user._id);
            if (!couponResult.valid) {
                return res.status(400).json({ message: couponResult.message });
            }
            const updateFilter = { _id: couponResult.coupon._id };
            if (couponResult.coupon.usageLimitTotal) {
                updateFilter.usedCount = { $lt: couponResult.coupon.usageLimitTotal };
            }
            if (couponResult.coupon.usageLimitPerUser === 1) {
                updateFilter.redeemedUsers = { $ne: req.user._id };
            }
            const updateOps = { $inc: { usedCount: 1 } };
            if (couponResult.coupon.usageLimitPerUser === 1) {
                updateOps.$push = { redeemedUsers: req.user._id };
            }
            const updatedCoupon = await Coupon.findOneAndUpdate(
                updateFilter,
                updateOps,
                { new: true }
            );
            if (!updatedCoupon) {
                return res.status(400).json({ message: 'Coupon limit reached or already redeemed by this account.' });
            }
            appliedCouponCode = updatedCoupon.code;
            appliedDiscountAmount = couponResult.discount;
            couponDoc = updatedCoupon;
        }

        const serverGrandTotal = Math.max(0, serverSubtotal - appliedDiscountAmount) + serverDeliveryFee;

        // 2. Decrement stock atomically with rollback on collision (W1-06)
        const decrementedList = [];
        for (const item of verifiedItems) {
            const updated = await Product.findOneAndUpdate(
                { _id: item.product, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                { new: true }
            );

            if (!updated) {
                // Rollback all prior decrements to prevent overselling
                for (const d of decrementedList) {
                    await Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty } });
                }
                if (couponDoc) {
                    await Coupon.findByIdAndUpdate(couponDoc._id, {
                        $inc: { usedCount: -1 },
                        $pull: { redeemedUsers: req.user._id }
                    }).catch(() => {});
                }
                return res.status(409).json({
                    message: `Inventory for "${item.name}" was just reserved by another customer. Please adjust quantity.`
                });
            }

            decrementedList.push({ id: item.product, qty: item.quantity });
        }

        // Normalize payment method to uppercase enum
        let normalizedPayment = 'COD';
        if (paymentMethod) {
            const pmUpper = paymentMethod.toUpperCase();
            if (pmUpper === 'COD') normalizedPayment = 'COD';
            else if (pmUpper === 'UPI') normalizedPayment = 'UPI';
            else if (pmUpper === 'ONLINE' || pmUpper === 'CARD') normalizedPayment = 'Online';
            else normalizedPayment = paymentMethod;
        }

        const isUpi = normalizedPayment === 'UPI';
        let upiConfig = null;

        if (isUpi) {
            const upiSettingDoc = await StoreSetting.findOne({ key: 'upi_config' }).lean();
            upiConfig = upiSettingDoc?.value || upiSettingDoc || {};
            if (!upiConfig.upi_vpa || !upiConfig.upi_name) {
                // Rollback any stock decrement or coupon reservation
                for (const d of decrementedList) {
                    await Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty } }).catch(() => {});
                }
                if (couponDoc) {
                    await Coupon.findByIdAndUpdate(couponDoc._id, {
                        $inc: { usedCount: -1 },
                        $pull: { redeemedUsers: req.user._id }
                    }).catch(() => {});
                }
                return res.status(400).json({ message: 'UPI payments are currently not configured by the store.' });
            }

            // Limit active unpaid pending UPI orders to 2 per user
            const activePendingCount = await Order.countDocuments({
                user: req.user._id,
                paymentMethod: 'UPI',
                paymentStatus: 'pending',
                paymentExpiresAt: { $gt: new Date() }
            });
            if (activePendingCount >= 2) {
                for (const d of decrementedList) {
                    await Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty } }).catch(() => {});
                }
                if (couponDoc) {
                    await Coupon.findByIdAndUpdate(couponDoc._id, {
                        $inc: { usedCount: -1 },
                        $pull: { redeemedUsers: req.user._id }
                    }).catch(() => {});
                }
                return res.status(400).json({
                    message: 'You have 2 pending UPI orders awaiting payment. Please complete or cancel them before placing a new order.'
                });
            }
        }

        const initialPaymentStatus = isUpi ? 'pending' : (normalizedPayment === 'COD' ? 'Pending' : 'Completed');

        const newOrder = new Order({
            user: req.user._id,
            items: verifiedItems,
            totalAmount: serverGrandTotal,
            shippingAddress,
            paymentMethod: normalizedPayment,
            paymentStatus: initialPaymentStatus,
            couponCode: appliedCouponCode,
            discountAmount: appliedDiscountAmount,
            status: 'Processing'
        });

        const savedOrder = await newOrder.save();

        if (isUpi) {
            const timeoutMinutes = Number(upiConfig.timeout_minutes) || 30;
            const provider = getPaymentProvider('UPI_MANUAL');
            const upiIntent = await provider.createPaymentIntent(savedOrder, upiConfig);

            savedOrder.upiTxnRef = upiIntent.tr;
            savedOrder.paymentExpiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
            savedOrder.upiIntent = upiIntent;
            await savedOrder.save();
        }

        if (appliedCouponCode && couponDoc) {
            try {
                await CouponRedemption.create({
                    coupon: couponDoc._id,
                    user: req.user._id,
                    order: savedOrder._id,
                    amount: appliedDiscountAmount
                });
            } catch (rErr) {
                console.error('[CouponRedemption] Record error:', rErr.message);
            }
        }

        if (saveAddressToProfile && req.user._id) {
            try {
                const userDoc = await User.findById(req.user._id);
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

        const alertTarget = populatedOrder || savedOrder;
        if (!isUpi) {
            // For COD and card/online orders: dispatch owner & customer alerts
            await Promise.allSettled([
                withTimeout(sendAdminOrderNotification(alertTarget), 5000, 'sendAdminOrderNotification'),
                withTimeout(sendCustomerOrderNotification(alertTarget, 'Placed'), 5000, 'sendCustomerOrderNotification')
            ]);
        } else {
            // For UPI orders: only notify customer to complete payment. Store owner alert fires when UTR is submitted!
            await withTimeout(sendCustomerOrderNotification(alertTarget, 'Awaiting Payment'), 5000, 'sendCustomerOrderNotification');
        }

        res.status(201).json(populatedOrder);
    } catch (error) {
        if (typeof decrementedList !== 'undefined' && decrementedList.length > 0) {
            for (const d of decrementedList) {
                await Product.findByIdAndUpdate(d.id, { $inc: { stock: d.qty } }).catch(() => {});
            }
        }
        if (typeof couponDoc !== 'undefined' && couponDoc && typeof savedOrder === 'undefined') {
            await Coupon.findByIdAndUpdate(couponDoc._id, {
                $inc: { usedCount: -1 },
                $pull: { redeemedUsers: req.user?._id }
            }).catch(() => {});
        }
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Failed to create order' });
    }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (admin only)
router.put('/:id/status', protect, adminOnly, async (req, res) => {
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
        const beforeSnapshot = existingOrder.toObject ? existingOrder.toObject() : existingOrder;

        // If transitioning to Cancelled and was not cancelled before, restore stock
        if (status === 'Cancelled' && existingOrder.status !== 'Cancelled') {
            for (const item of existingOrder.items) {
                if (item.product) {
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { stock: item.quantity }
                    });
                }
            }
            if (existingOrder.couponCode) {
                try {
                    await CouponRedemption.deleteOne({ order: existingOrder._id });
                    await Coupon.updateOne(
                        { code: existingOrder.couponCode },
                        { 
                            $inc: { usedCount: -1 },
                            $pull: { redeemedUsers: existingOrder.user?._id || existingOrder.user }
                        }
                    );
                } catch (cErr) {
                    console.error('[CouponRedemption] Release error:', cErr.message);
                }
            }
        }

        // If transitioning to Delivered and was not Delivered before:
        if (status === 'Delivered' && existingOrder.status !== 'Delivered') {
            // Fix COD pending payment to Completed
            if (existingOrder.paymentMethod === 'COD' || existingOrder.paymentStatus === 'Pending') {
                existingOrder.paymentStatus = 'Completed';
            }

            // Customer review count increase by 2 for each delivered product
            for (const item of existingOrder.items) {
                const prodId = item.product?._id || item.product;
                if (prodId && mongoose.Types.ObjectId.isValid(prodId)) {
                    await Product.findByIdAndUpdate(prodId, {
                        $inc: { reviews: 2 }
                    });
                }
            }
        }

        existingOrder.status = status;
        const updatedOrder = await existingOrder.save();

        await withTimeout(logAuditEvent(req.user._id, 'ORDER_STATUS_UPDATE', 'Order', existingOrder._id, beforeSnapshot), 5000, 'logAuditEvent');

        // Dispatch status update notification to customer (with 5s timeout, safe failure)
        await withTimeout(sendCustomerOrderNotification(existingOrder, status), 5000, 'sendCustomerOrderNotification');

        res.json(updatedOrder);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Failed to update order status' });
    }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel an order (admin or order owner)
router.put('/:id/cancel', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const isOwner = order.user && (
            (order.user._id && order.user._id.toString() === req.user._id.toString()) ||
            order.user.toString() === req.user._id.toString() ||
            order.legacyUserId === req.user._id.toString()
        );

        if (req.user.role !== 'admin' && !isOwner) {
            return res.status(403).json({ message: 'Access denied: You can only cancel your own orders' });
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
        res.status(500).json({ message: 'Failed to cancel order' });
    }
});

// @route   DELETE /api/orders/:id
// @desc    Delete order (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ message: 'Failed to delete order' });
    }
});

export default router;
