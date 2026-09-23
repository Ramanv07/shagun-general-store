import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/raman/Downloads/shagun-general-store/backend/.env' });

const MONGO_URI = process.env.MONGO_URI;
console.log('Testing MONGO_URI:', MONGO_URI);

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('SUCCESS: Connected to MongoDB');
        process.exit(0);
    })
    .catch(err => {
        console.error('FAILURE: Connection error details:');
        console.error(err);
        process.exit(1);
    });
