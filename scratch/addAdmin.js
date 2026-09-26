import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../backend/models/User.js';

dotenv.config({ path: './backend/.env' });

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Atlas');

        const existingAdmin = await User.findOne({ email: 'admin@shagun.com' });
        if (existingAdmin) {
            console.log('Admin user already exists!');
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const adminPassword = await bcrypt.hash('admin123', salt);

        await User.create({
            name: 'Shagun Admin',
            email: 'admin@shagun.com',
            password: adminPassword,
            phone: '9876543200',
            role: 'admin'
        });

        console.log('Admin user successfully created! (admin@shagun.com / admin123)');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createAdmin();
