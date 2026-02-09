import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { BadgeService } from './services/BadgeService';
import { TemplateManagementService } from './services/TemplateManagementService';

dotenv.config();

/**
 * Initialize platform with default data
 * Run this after fresh database setup
 */
async function initializePlatform() {
  try {
    console.log('🚀 Starting platform initialization...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate-platform');
    console.log('✅ Connected to MongoDB');

    // Initialize default badges
    console.log('📛 Initializing default badges...');
    await BadgeService.initializeDefaultBadges();
    console.log('✅ Badges initialized');

    // Initialize default templates
    console.log('📧 Initializing default templates...');
    await TemplateManagementService.initializeDefaultTemplates();
    console.log('✅ Templates initialized');

    console.log('🎉 Platform initialization complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Initialization error:', error);
    process.exit(1);
  }
}

initializePlatform();
