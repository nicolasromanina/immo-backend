import mongoose from 'mongoose';
import { config } from './env.config';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});