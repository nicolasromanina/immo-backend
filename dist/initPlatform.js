"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const BadgeService_1 = require("./services/BadgeService");
const TemplateManagementService_1 = require("./services/TemplateManagementService");
dotenv_1.default.config();
/**
 * Initialize platform with default data
 * Run this after fresh database setup
 */
async function initializePlatform() {
    try {
        console.log('🚀 Starting platform initialization...');
        // Connect to MongoDB
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate-platform');
        console.log('✅ Connected to MongoDB');
        // Initialize default badges
        console.log('📛 Initializing default badges...');
        await BadgeService_1.BadgeService.initializeDefaultBadges();
        console.log('✅ Badges initialized');
        // Initialize default templates
        console.log('📧 Initializing default templates...');
        await TemplateManagementService_1.TemplateManagementService.initializeDefaultTemplates();
        console.log('✅ Templates initialized');
        console.log('🎉 Platform initialization complete!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Initialization error:', error);
        process.exit(1);
    }
}
initializePlatform();
