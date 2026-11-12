import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const uri = process.env.STAGING_MONGODB_URI || 'mongodb://127.0.0.1:27017/shagun-staging';

if (uri.includes('mongodb.net') || uri.includes('atlas')) {
    console.error('FATAL SAFETY TRIGGER: create_test_user refuses to connect to Atlas.');
    process.exit(1);
}

async function seedTestUsers() {
    try {
        await mongoose.connect(uri);
        const dbName = mongoose.connection.name;
        if (dbName !== 'shagun-staging') {
            await mongoose.disconnect();
            console.error(`FATAL SAFETY TRIGGER: Target database is "${dbName}", expected "shagun-staging".`);
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const userPasswordHash = await bcrypt.hash('Password123!', salt);
        const adminPasswordHash = await bcrypt.hash('AdminPassword123!', salt);

        // 1. Regular Test User
        const testUserEmail = 'testuser@shagunmart.com';
        let testUser = await User.findOne({ email: testUserEmail });
        if (!testUser) {
            testUser = new User({
                name: 'Test Customer',
                email: testUserEmail,
                password: userPasswordHash,
                phone: '9876543210',
                role: 'user',
                addresses: [{
                    fullName: 'Test Customer',
                    mobile: '9876543210',
                    houseNo: 'Shop 12',
                    street: 'Main Market',
                    city: 'Bamitha',
                    state: 'Madhya Pradesh',
                    pinCode: '471105',
                    isDefault: true
                }]
            });
            await testUser.save();
            console.log(`[STAGING] Created test user: ${testUserEmail} (Password: Password123!)`);
        } else {
            testUser.password = userPasswordHash;
            testUser.phone = '9876543210';
            if (!testUser.addresses || testUser.addresses.length === 0) {
                testUser.addresses = [{
                    fullName: 'Test Customer',
                    mobile: '9876543210',
                    houseNo: 'Shop 12',
                    street: 'Main Market',
                    city: 'Bamitha',
                    state: 'Madhya Pradesh',
                    pinCode: '471105',
                    isDefault: true
                }];
            }
            await testUser.save();
            console.log(`[STAGING] Updated test user: ${testUserEmail} (Password: Password123!)`);
        }

        // 2. Admin Test User
        const adminEmail = 'admin@shagunmart.com';
        let adminUser = await User.findOne({ email: adminEmail });
        if (!adminUser) {
            adminUser = new User({
                name: 'Store Admin',
                email: adminEmail,
                password: adminPasswordHash,
                phone: '9876543211',
                role: 'admin',
                addresses: []
            });
            await adminUser.save();
            console.log(`[STAGING] Created admin user: ${adminEmail} (Password: AdminPassword123!)`);
        } else {
            adminUser.password = adminPasswordHash;
            adminUser.role = 'admin';
            await adminUser.save();
            console.log(`[STAGING] Updated admin user: ${adminEmail} (Password: AdminPassword123!)`);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Error creating test user:', err.message);
        process.exit(1);
    }
}

seedTestUsers();

