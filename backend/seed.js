import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Product from './models/Product.js';
import User from './models/User.js';
import Order from './models/Order.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const PRODUCTS_DATA = [
    {
        name: "Premium Basmati Rice",
        price: 1250,
        category: "General Use",
        stock: 50,
        description: "Aged perfection, extra long grain aromatic basmati rice. Perfect for Biryani.",
        image: "https://picsum.photos/400/400?random=1",
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
        image: "https://picsum.photos/400/400?random=2",
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
        image: "https://picsum.photos/400/400?random=3",
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
        image: "https://picsum.photos/400/400?random=4",
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
        image: "https://picsum.photos/400/400?random=5",
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
        image: "https://picsum.photos/400/400?random=6",
        rating: 4.8,
        reviews: 90,
        isBestseller: true
    },
    {
        name: "Sandalwood Talcum Powder",
        price: 150,
        category: "Powder",
        stock: 60,
        description: "Refreshing sandalwood talcum powder for all day freshness.",
        image: "https://picsum.photos/400/400?random=7",
        rating: 4.6,
        reviews: 110,
        isBestseller: false
    },
    {
        name: "Lavender Floor Cleaner",
        price: 350,
        category: "General Use",
        stock: 45,
        description: "Disinfectant floor cleaner with long lasting lavender fragrance.",
        image: "https://picsum.photos/400/400?random=8",
        rating: 4.4,
        reviews: 75,
        isBestseller: false
    },
    {
        name: "Aloe Vera Gel",
        price: 180,
        category: "Skin Care",
        stock: 90,
        description: "Pure Aloe Vera gel for soothing skin and hair.",
        image: "https://picsum.photos/400/400?random=9",
        rating: 4.3,
        reviews: 65,
        isBestseller: false
    },
    {
        name: "Exotic Fruit & Nut Mix",
        price: 650,
        category: "General Use",
        stock: 40,
        description: "Premium mix of berries, nuts, and seeds.",
        image: "https://picsum.photos/400/400?random=10",
        rating: 4.9,
        reviews: 150,
        isBestseller: true
    },
    {
        name: "Herbal Shampoo",
        price: 420,
        category: "Personal Care",
        stock: 55,
        description: "Sulphate free herbal shampoo for daily use.",
        image: "https://picsum.photos/400/400?random=11",
        rating: 4.5,
        reviews: 95,
        isBestseller: false
    },
    {
        name: "Face Moisturizing Cream",
        price: 900,
        category: "Cream",
        stock: 25,
        description: "Intense moisturizing cream for dry skin repair.",
        image: "https://picsum.photos/400/400?random=12",
        rating: 4.8,
        reviews: 180,
        isBestseller: false
    }
];

const seedDatabase = async () => {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!');

        // 1. Clear existing collections to start fresh
        await Product.deleteMany({});
        await User.deleteMany({});
        await Order.deleteMany({});
        console.log('Cleared existing products, users, and orders.');

        // 2. Seed Users
        const salt = await bcrypt.genSalt(10);
        const adminPassword = await bcrypt.hash('admin123', salt);
        const userPassword = await bcrypt.hash('user123', salt);

        const adminUser = await User.create({
            name: 'Shagun Admin',
            email: 'admin@shagun.com',
            password: adminPassword,
            phone: '9876543200',
            role: 'admin',
            addresses: [
                {
                    fullName: 'Shagun Store Admin',
                    mobile: '9876543200',
                    houseNo: 'Shop No. 12',
                    street: 'Main Bazaar Road',
                    city: 'New Delhi',
                    state: 'Delhi',
                    pinCode: '110001',
                    isDefault: true
                }
            ]
        });

        const demoUser = await User.create({
            name: 'Demo Customer',
            email: 'user@shagun.com',
            password: userPassword,
            phone: '9876543210',
            role: 'user',
            addresses: [
                {
                    fullName: 'Demo Customer',
                    mobile: '9876543210',
                    houseNo: 'Plot 42',
                    street: 'Main Market Road',
                    city: 'New Delhi',
                    state: 'Delhi',
                    pinCode: '110001',
                    isDefault: true
                }
            ]
        });
        console.log(`Created 2 users: ${adminUser.email} (Admin), ${demoUser.email} (User)`);

        // 3. Seed Products
        const createdProducts = await Product.insertMany(PRODUCTS_DATA);
        console.log(`Inserted ${createdProducts.length} products.`);

        // 4. Seed Sample Order
        const sampleOrder = await Order.create({
            user: demoUser._id,
            items: [
                {
                    product: createdProducts[0]._id,
                    name: createdProducts[0].name,
                    quantity: 2,
                    price: createdProducts[0].price
                },
                {
                    product: createdProducts[1]._id,
                    name: createdProducts[1].name,
                    quantity: 1,
                    price: createdProducts[1].price
                }
            ],
            totalAmount: (createdProducts[0].price * 2) + createdProducts[1].price,
            shippingAddress: {
                fullName: "Demo Customer",
                mobile: "9876543210",
                houseNo: "Plot 42",
                street: "Main Market Road",
                city: "New Delhi",
                state: "Delhi",
                pinCode: "110001"
            },
            status: 'Processing'
        });
        console.log(`Created sample order (${sampleOrder._id}) with total Rs. ${sampleOrder.totalAmount}.`);

        console.log('\n--- SUCCESS! ---');
        console.log('All 3 collections (users, products, orders) are now populated in your MongoDB Atlas database!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
};

seedDatabase();
