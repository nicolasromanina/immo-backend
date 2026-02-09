import { connectDB } from './config/db';
import { BadgeService } from './services/BadgeService';
import User from './models/User';
import { Role } from './config/roles';
import bcrypt from 'bcrypt';

/**
 * Initialize database with default data
 */
async function initializeDatabase() {
  console.log('🔄 Initializing database...');

  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // 1. Initialize default badges
    console.log('📛 Creating default badges...');
    await BadgeService.initializeDefaultBadges();
    console.log('✅ Default badges created');

    // 2. Create default admin user (if not exists)
    console.log('👤 Creating default admin user...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = new User({
        email: adminEmail,
        password: hashedPassword,
        roles: [Role.ADMIN],
        firstName: 'Admin',
        lastName: 'User',
        emailVerified: true,
        status: 'active',
        preferences: {
          language: 'fr',
          currency: 'XOF',
          notifications: {
            email: true,
            whatsapp: false,
            projectUpdates: true,
            newLeads: true,
          },
        },
      });

      await admin.save();
      console.log(`✅ Admin user created: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('   ⚠️  Please change the password after first login!');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // 3. Create default support user (if not exists)
    console.log('👤 Creating default support user...');
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com';
    const supportPassword = process.env.SUPPORT_PASSWORD || 'Support123!';

    const existingSupport = await User.findOne({ email: supportEmail });

    if (!existingSupport) {
      const hashedPassword = await bcrypt.hash(supportPassword, 10);
      const support = new User({
        email: supportEmail,
        password: hashedPassword,
        roles: [Role.SUPPORT],
        firstName: 'Support',
        lastName: 'Team',
        emailVerified: true,
        status: 'active',
        preferences: {
          language: 'fr',
          currency: 'XOF',
          notifications: {
            email: true,
            whatsapp: false,
            projectUpdates: false,
            newLeads: false,
          },
        },
      });

      await support.save();
      console.log(`✅ Support user created: ${supportEmail}`);
      console.log(`   Password: ${supportPassword}`);
    } else {
      console.log('ℹ️  Support user already exists');
    }

    console.log('\n✅ Database initialization complete!\n');
    console.log('📋 Summary:');
    console.log('   - Default badges created');
    console.log('   - Admin user ready');
    console.log('   - Support user ready');
    console.log('\n🚀 You can now start the server with: npm run dev\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();
