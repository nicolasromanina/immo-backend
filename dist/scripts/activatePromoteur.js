"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Script ponctuel: active manuellement un utilisateur comme promoteur
 * Usage: npx ts-node src/scripts/activatePromoteur.ts
 */
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const EMAIL = process.argv[2] || 'promoteur@test.com';
async function main() {
    await mongoose_1.default.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    const user = await User_1.default.findOne({ email: EMAIL });
    if (!user) {
        console.error(`User ${EMAIL} not found`);
        process.exit(1);
    }
    console.log('User ID:', user._id);
    console.log('Current roles:', user.roles);
    // Check if already promoteur
    const existing = await Promoteur_1.default.findOne({ user: user._id });
    if (existing) {
        console.log('Promoteur profile already exists:', existing._id);
    }
    else {
        // Create Promoteur profile
        const promoteur = await Promoteur_1.default.create({
            user: user._id,
            organizationName: 'Test Promoteur',
            organizationType: 'individual',
            plan: 'basique',
            subscriptionStatus: 'active',
            subscriptionStartDate: new Date(),
            kycStatus: 'pending',
            onboardingCompleted: false,
            onboardingProgress: 0,
            complianceStatus: 'publie',
            financialProofLevel: 'none',
            trustScore: 10,
            totalProjects: 0,
            activeProjects: 0,
            completedProjects: 0,
            totalLeadsReceived: 0,
            paymentHistory: [{
                    amount: 2000,
                    type: 'onboarding',
                    status: 'paid',
                    date: new Date(),
                }],
        });
        console.log('Promoteur created:', promoteur._id);
        // Link to user
        user.promoteurProfile = promoteur._id;
        if (!user.roles.includes('promoteur')) {
            user.roles.push('promoteur');
        }
        await user.save();
        console.log('User updated — roles:', user.roles);
    }
    // Ensure role is set even if profile already existed
    if (!user.roles.includes('promoteur')) {
        user.roles.push('promoteur');
        await user.save();
        console.log('Added promoteur role');
    }
    const updated = await User_1.default.findById(user._id).lean();
    console.log('Final roles:', updated?.roles);
    console.log('promoteurProfile:', updated?.promoteurProfile);
    await mongoose_1.default.disconnect();
    console.log('Done');
}
main().catch(console.error);
