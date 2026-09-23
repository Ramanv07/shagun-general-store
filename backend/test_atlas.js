import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

// Manually parsing the URI to avoid @ parsing issues in the string
const MONGO_URI_PARSED = "mongodb+srv://ramanvishwari_db_user:Raman123%40%40%40@cluster1.kurdtfd.mongodb.net/?appName=Cluster1";

console.log('Testing connection with percent-encoded password...');

async function testConnection() {
    try {
        await mongoose.connect(MONGO_URI_PARSED, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('SUCCESS: Connected to MongoDB Atlas');
        process.exit(0);
    } catch (err) {
        console.error('FAILURE: Connection error:');
        console.error('Code:', err.code);
        console.error('Message:', err.message);
        if (err.message.includes('Authentication failed')) {
            console.error('HINT: Check if username and password are correct.');
        } else if (err.message.includes('ERR_CONNECTION_REFUSED' || 'timeout')) {
            console.error('HINT: Check if your IP is whitelisted in MongoDB Atlas.');
        }
        process.exit(1);
    }
}

testConnection();
