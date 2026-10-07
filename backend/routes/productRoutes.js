import express from 'express';
import Product from '../models/Product.js';
import { protect, adminOnly, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products (with optional category query)
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = {};

        if (category && category !== 'All') {
            query.category = category;
        }

        if (search) {
            // M2: Escape regex special chars to prevent ReDoS
            const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.name = { $regex: escaped, $options: 'i' };
        }

        let products = await Product.find(query).sort({ createdAt: -1 });

        // If store is completely empty, automatically seed initial products with reliable images
        if (products.length === 0 && (!category || category === 'All') && !search) {
            const count = await Product.countDocuments();
            if (count === 0) {
                const initialSeed = [
                    {
                        name: "Premium Basmati Rice",
                        price: 1250,
                        category: "General Use",
                        stock: 50,
                        description: "Aged perfection, extra long grain aromatic basmati rice. Perfect for Biryani.",
                        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800",
                        rating: 4.8,
                        reviews: 120,
                        isBestseller: true
                    },
                    {
                        name: "Luxury Skin Cream",
                        price: 450,
                        category: "Skin Care",
                        stock: 100,
                        description: "Hydrating skin cream with vitamin E for a radiant glow.",
                        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
                        rating: 4.5,
                        reviews: 85,
                        isBestseller: true
                    },
                    {
                        name: "Dark Chocolate Cookies",
                        price: 120,
                        category: "General Use",
                        stock: 200,
                        description: "Decadent dark chocolate cookies with melted chips inside.",
                        image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=800",
                        rating: 4.9,
                        reviews: 210,
                        isBestseller: false
                    },
                    {
                        name: "Cold Pressed Almond Oil",
                        price: 890,
                        category: "Personal Care",
                        stock: 30,
                        description: "100% pure almond oil for hair and skin. No additives.",
                        image: "https://images.unsplash.com/photo-1608248597359-54378f8449fa?auto=format&fit=crop&q=80&w=800",
                        rating: 4.7,
                        reviews: 55,
                        isBestseller: false
                    },
                    {
                        name: "Educational Robot Toy",
                        price: 1500,
                        category: "Toy",
                        stock: 15,
                        description: "Interactive educational robot for kids aged 5+.",
                        image: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&q=80&w=800",
                        rating: 4.2,
                        reviews: 300,
                        isBestseller: false
                    },
                    {
                        name: "Gold Plated Bangle Set",
                        price: 2100,
                        category: "Bangle",
                        stock: 80,
                        description: "Traditional gold plated bangle set with intricate design.",
                        image: "https://images.unsplash.com/photo-1611591475819-79b8b730ab8c?auto=format&fit=crop&q=80&w=800",
                        rating: 4.8,
                        reviews: 90,
                        isBestseller: true
                    }
                ];
                try {
                    products = await Product.insertMany(initialSeed);
                } catch (seedErr) {
                    console.error("Auto-seed error:", seedErr.message);
                }
            }
        }

        const formatted = products.map(p => {
            const doc = p.toObject ? p.toObject() : { ...p };
            if (!doc.mrp || doc.mrp <= doc.price) {
                doc.mrp = Math.round(doc.price * 1.25);
            }
            return doc;
        });

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Failed to fetch products' });
    }
});

// @route   GET /api/products/:id
// @desc    Get single product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const doc = product.toObject ? product.toObject() : { ...product };
        if (!doc.mrp || doc.mrp <= doc.price) {
            doc.mrp = Math.round(doc.price * 1.25);
        }
        res.json(doc);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: 'Invalid product ID or server error' });
    }
});

// @route   POST /api/products
// @desc    Create a new product (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { name, price, mrp, category, stock, description, image, images, rating, reviews, isBestseller } = req.body;

        if (!name || price === undefined || !category || stock === undefined || !description || !image) {
            return res.status(400).json({ message: 'Please provide all required product fields' });
        }

        const product = new Product({
            name,
            price: Number(price),
            mrp: mrp ? Number(mrp) : undefined,
            category,
            stock: Math.max(0, Number(stock) || 0),
            description,
            image,
            images: images || [],
            rating: rating ? Number(rating) : 0,
            reviews: reviews ? Number(reviews) : 0,
            isBestseller: Boolean(isBestseller)
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Failed to create product' });
    }
});

// @route   PUT /api/products/:id
// @desc    Update a product (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const updateData = { ...req.body };
        if (updateData.stock !== undefined) {
            updateData.stock = Math.max(0, Number(updateData.stock) || 0);
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.json(updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Failed to update product' });
    }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product removed successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Failed to delete product' });
    }
});


// @route   POST /api/products/:id/rate
// @desc    Rate a product
router.post('/:id/rate', optionalAuth, async (req, res) => {
    try {
        const { rating } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Calculate new average rating
        const currentTotal = (product.rating || 0) * (product.reviews || 0);
        const newReviewsCount = (product.reviews || 0) + 1;
        const newRating = (currentTotal + rating) / newReviewsCount;

        product.rating = parseFloat(newRating.toFixed(1));
        product.reviews = newReviewsCount;
        await product.save();

        res.json({ message: 'Rating submitted successfully', rating: product.rating, reviews: product.reviews });
    } catch (error) {
        console.error('Error rating product:', error);
        res.status(500).json({ message: 'Failed to rate product' });
    }
});

export default router;
