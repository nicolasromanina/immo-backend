import mongoose from 'mongoose';
import Invoice from '../models/Invoice';
import Promoteur from '../models/Promoteur';
import User from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/firstimmo-dashboard';

async function seedInvoice() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find or create a promoteur
    let promoteur = await Promoteur.findOne({});

    if (!promoteur) {
      console.log('⚠️  No promoteur found. Creating demo promoteur...');

      // Create demo user
      const user = new User({
        email: 'demo-promoteur@example.com',
        firstName: 'Demo',
        lastName: 'Promoteur',
        password: 'demo123456', // For seed script only
        role: 'promoteur',
      });
      await user.save();

      // Create promoteur profile
      promoteur = new Promoteur({
        user: user._id,
        organizationName: 'Demo Real Estate Group',
        registrationNumber: 'DEMO123456',
        contactEmail: 'contact@demo-realestate.com',
        trustScore: 92,
        plan: 'verifie',
        verified: true,
        badges: [],
      });
      await promoteur.save();
      console.log('✅ Demo promoteur created');
    }

    console.log(`📋 Using promoteur: ${promoteur._id}`);
    console.log(`📋 Promoteur name: ${promoteur.organizationName}`);

    // Get user info for billing
    const user = await mongoose.model('User').findById(promoteur.user).select('email firstName lastName');

    // Create a sample invoice
    const invoice = await Invoice.create({
      promoteur: promoteur._id,
      invoiceNumber: `INV-2025-001`,
      type: 'subscription',
      subtotal: 4200,
      tax: 840,
      taxRate: 20,
      total: 5040,
      currency: 'EUR',
      lineItems: [
        {
          description: 'Abonnement plan "Vérifié" - Annuel',
          quantity: 1,
          unitPrice: 4200,
          total: 4200,
        },
      ],
      status: 'paid',
      issuedAt: new Date('2025-01-01'),
      dueDate: new Date('2025-02-01'),
      paidAt: new Date('2025-01-15'),
      billingInfo: {
        name: promoteur.organizationName || (user?.firstName || '') + ' ' + (user?.lastName || ''),
        email: promoteur.companyEmail || user?.email || 'contact@example.com',
        address: promoteur.companyAddress || '123 Rue de Paris',
        city: 'Paris',
        country: 'France',
        taxId: 'FR12345678900',
      },
      paymentMethod: 'carte-bancaire',
      remindersSent: [],
      notes: 'Merci pour votre confiance. Facture générée automatiquement par First Immo.',
    });

    console.log('✅ Invoice created successfully!');
    console.log(`📄 Invoice ID: ${invoice._id}`);
    console.log(`📄 Invoice Number: ${invoice.invoiceNumber}`);
    console.log(`💰 Amount: ${invoice.total} ${invoice.currency}`);

    // Create another example for pending status
    const pendingInvoice = await Invoice.create({
      promoteur: promoteur._id,
      invoiceNumber: `INV-2025-002`,
      type: 'addon',
      subtotal: 500,
      tax: 100,
      taxRate: 20,
      total: 600,
      currency: 'EUR',
      lineItems: [
        {
          description: 'Service Premium - 1 mois',
          quantity: 1,
          unitPrice: 500,
          total: 500,
        },
      ],
      status: 'pending',
      issuedAt: new Date('2025-02-15'),
      dueDate: new Date('2025-03-15'),
      billingInfo: {
        name: promoteur.organizationName || (user?.firstName || '') + ' ' + (user?.lastName || ''),
        email: promoteur.companyEmail || user?.email || 'contact@example.com',
        address: promoteur.companyAddress || '123 Rue de Paris',
        city: 'Paris',
        country: 'France',
        taxId: 'FR12345678900',
      },
      remindersSent: [],
      notes: 'Merci pour votre confiance. Facture générée automatiquement par First Immo.',
    });

    console.log('\n✅ Pending invoice created successfully!');
    console.log(`📄 Invoice ID: ${pendingInvoice._id}`);
    console.log(`📄 Invoice Number: ${pendingInvoice.invoiceNumber}`);
    console.log(`💰 Amount: ${pendingInvoice.total} ${pendingInvoice.currency}`);

    console.log('\n🎉 All invoices seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding invoice:', error);
    process.exit(1);
  }
}

seedInvoice();
