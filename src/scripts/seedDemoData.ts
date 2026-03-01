import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Project from '../models/Project';
import Document from '../models/Document';
import Partner from '../models/Partner';
import User from '../models/User';
import Promoteur from '../models/Promoteur';
import Lead from '../models/Lead';

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/realestate-platform';

async function seedDemoData() {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Cleaning up existing demo data...');
    await Project.deleteMany({});
    await Document.deleteMany({});
    await Partner.deleteMany({});
    await Lead.deleteMany({});
    await User.deleteMany({ email: /demo|test/ });
    await Promoteur.deleteMany({ organizationName: /Demo|Test/ });

    // Create demo promoteur user
    const promoteurUser = new User({
      email: 'demo-promoteur@example.com',
      firstName: 'Demo',
      lastName: 'Promoteur',
      password: 'hashedPassword123',
      role: 'promoteur',
    });
    await promoteurUser.save();

    // Create promoteur profile
    const promoteur = new Promoteur({
      user: promoteurUser._id,
      organizationName: 'Demo Real Estate Group',
      registrationNumber: 'DEMO123456',
      contactEmail: 'contact@demo-realestate.com',
      trustScore: 92,
      plan: 'premium',
      verified: true,
      badges: [],
    });
    await promoteur.save();

    // Create demo projects
    const projects = [
      {
        promoteur: promoteur._id,
        title: 'Immeuble Lorem Horizon',
        description: 'Immeuble résidentiel luxe avec vue panoramique',
        location: 'Proche centre ville Haute standing',
        city: 'Paris',
        country: 'France',
        priceFrom: 40000,
        priceTo: 170000,
        area: '250 m²',
        unitCount: 15,
        status: 'gros-oeuvres',
        publicationStatus: 'published',
        trustScore: 92,
        coverImage: 'https://images.unsplash.com/photo-1545324418-cc1b1a7a3c1d?w=800&q=80',
      },
      {
        promoteur: promoteur._id,
        title: 'Residence B',
        description: 'Résidence de standing achevée avec services premium',
        location: 'Proche centre ville Haute standing',
        city: 'Lyon',
        country: 'France',
        priceFrom: 70000,
        priceTo: 200000,
        area: '300 m²',
        unitCount: 20,
        status: 'livraison',
        publicationStatus: 'published',
        trustScore: 88,
        coverImage: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
      },
      {
        promoteur: promoteur._id,
        title: 'Immeuble Libero',
        description: 'Immeuble intergénérationnel avec espaces communs',
        location: 'Proche centre ville Haute standing',
        city: 'Marseille',
        country: 'France',
        priceFrom: 30000,
        priceTo: 150000,
        area: '200 m²',
        unitCount: 12,
        status: 'fondations',
        publicationStatus: 'published',
        trustScore: 85,
        coverImage: 'https://images.unsplash.com/photo-1460317442991-0ec5d0aec359?w=800&q=80',
      },
    ];

    const savedProjects = await Project.insertMany(projects);
    console.log(`✅ Created ${savedProjects.length} demo projects`);

    // Create demo documents
    const documents = [
      {
        project: savedProjects[0]._id,
        title: 'Document Villa Lorem Horizon',
        type: 'pdf',
        url: 'https://example.com/doc1.pdf',
        uploadedBy: promoteurUser._id,
      },
      {
        project: savedProjects[0]._id,
        title: 'Plan Résidence B',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80',
        uploadedBy: promoteurUser._id,
      },
      {
        project: savedProjects[1]._id,
        title: 'Document Résidence B',
        type: 'pdf',
        url: 'https://example.com/doc2.pdf',
        uploadedBy: promoteurUser._id,
      },
    ];

    const savedDocuments = await Document.insertMany(documents);
    console.log(`✅ Created ${savedDocuments.length} demo documents`);

    // Create demo partners
    const partners = [
      {
        name: 'Marie H',
        role: 'Conseille juridique',
        email: 'marie@partners.com',
        phone: '+33 1 23 45 67 89',
        biography: 'Spécialiste en investissement immobilier',
        specialty: 'Droit immobilier',
        location: 'Paris',
        verified: true,
      },
      {
        name: 'Jean Dupont',
        role: 'Avocat',
        email: 'jean@partners.com',
        phone: '+33 1 98 76 54 32',
        biography: 'Expert-comptable immobilier',
        specialty: 'Fiscalité immobilière',
        location: 'Lyon',
        verified: true,
      },
      {
        name: 'Sophie Martin',
        role: 'Notaire',
        email: 'sophie@partners.com',
        phone: '+33 2 45 67 89 01',
        biography: 'Notaire agréé',
        specialty: 'Transactions immobilières',
        location: 'Marseille',
        verified: true,
      },
      {
        name: 'Pierre Etienne',
        role: 'Architecte',
        email: 'pierre@partners.com',
        phone: '+33 3 45 67 89 12',
        biography: 'Architecte confirmé',
        specialty: 'Conception immobilière',
        location: 'Bordeaux',
        verified: true,
      },
    ];

    await Partner.insertMany(partners);
    console.log(`✅ Created ${partners.length} demo partners`);

    // Create demo leads
    const leads = [
      {
        project: savedProjects[0]._id,
        client: null,
        promoter: promoteur._id,
        status: 'nouveau',
        createdAt: new Date(),
      },
      {
        project: savedProjects[1]._id,
        client: null,
        promoter: promoteur._id,
        status: 'contacte',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        project: savedProjects[2]._id,
        client: null,
        promoter: promoteur._id,
        status: 'rdv-planifie',
        meetingScheduled: {
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          type: 'visioconférence',
        },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      },
    ];

    await Lead.insertMany(leads);
    console.log(`✅ Created ${leads.length} demo leads`);

    console.log('\n✅ ✅ ✅ Demo data seeding completed successfully! ✅ ✅ ✅\n');
    console.log('Demo data created:');
    console.log('📁 Projects: 3');
    console.log('📄 Documents: 3');
    console.log('🤝 Partners: 4');
    console.log('📋 Leads: 3');
    console.log('\nYou can now see real data in the dashboard!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding
seedDemoData();
