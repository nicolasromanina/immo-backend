/**
 * Script ponctuel: active manuellement un utilisateur comme promoteur
 * Usage: npx ts-node src/scripts/activatePromoteur.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User';
import Promoteur from '../models/Promoteur';

const EMAIL = process.argv[2] || 'promoteur@test.com';

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log('Connected to MongoDB');

  const user = await User.findOne({ email: EMAIL });
  if (!user) {
    console.error(`User ${EMAIL} not found`);
    process.exit(1);
  }

  console.log('User ID:', user._id);
  console.log('Current roles:', user.roles);

  // Check if already promoteur
  const existing = await Promoteur.findOne({ user: user._id });
  if (existing) {
    console.log('Promoteur profile already exists:', existing._id);
  } else {
    // Create Promoteur profile
    const promoteur = await Promoteur.create({
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
    user.promoteurProfile = promoteur._id as any;
    if (!user.roles.includes('promoteur' as any)) {
      user.roles.push('promoteur' as any);
    }
    await user.save();
    console.log('User updated — roles:', user.roles);
  }

  // Ensure role is set even if profile already existed
  if (!user.roles.includes('promoteur' as any)) {
    user.roles.push('promoteur' as any);
    await user.save();
    console.log('Added promoteur role');
  }

  const updated = await User.findById(user._id).lean();
  console.log('Final roles:', updated?.roles);
  console.log('promoteurProfile:', updated?.promoteurProfile);

  await mongoose.disconnect();
  console.log('Done');
}

main().catch(console.error);
