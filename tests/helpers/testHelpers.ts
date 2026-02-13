import { createUser } from '../../src/services/userService';
import User from '../../src/models/User';
import Promoteur from '../../src/models/Promoteur';
import Project from '../../src/models/Project';
import Badge from '../../src/models/Badge';
import { Role } from '../../src/config/roles';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

/**
 * Create a test user and return token
 */
export async function createTestUser(
  email: string,
  password: string,
  roles: Role[] = [Role.USER],
  additionalData: Partial<{ firstName: string; lastName: string }> = {}
) {
  const user = await createUser(email, password, roles);
  if (additionalData.firstName) user.firstName = additionalData.firstName;
  if (additionalData.lastName) user.lastName = additionalData.lastName;
  await user.save();

  const token = jwt.sign(
    { id: user._id.toString(), userId: user._id.toString(), roles: user.roles },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return { user, token };
}

/**
 * Create a test promoteur with profile
 */
export async function createTestPromoteur(
  email: string = 'promoteur@test.com',
  password: string = 'pass1234',
  organizationName: string = 'Test Promoteur SAS'
) {
  const { user, token } = await createTestUser(email, password, [Role.USER, Role.PROMOTEUR]);

  const promoteur = new Promoteur({
    user: user._id,
    organizationName,
    organizationType: 'small',
    plan: 'basique',
    subscriptionStatus: 'trial',
    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    kycStatus: 'pending',
    onboardingCompleted: false,
    onboardingProgress: 20,
    onboardingChecklist: [
      { code: 'org_info', item: 'Compléter les informations', completed: true, completedAt: new Date() },
      { code: 'kyc', item: 'Vérifier l\'identité (KYC)', completed: false },
      { code: 'company_docs', item: 'Uploader les documents', completed: false },
      { code: 'financial_proof', item: 'Prouver la capacité financière', completed: false },
      { code: 'first_project', item: 'Créer le premier projet', completed: false },
    ],
    complianceStatus: 'publie',
    hasAgrement: false,
    trustScore: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalLeadsReceived: 0,
  });

  await promoteur.save();

  user.promoteurProfile = promoteur._id as any;
  await user.save();

  return { user, promoteur, token };
}

/**
 * Create a verified promoteur
 */
export async function createVerifiedPromoteur(
  email: string = 'verified@test.com',
  organizationName: string = 'Verified Promoteur SAS'
) {
  const { user, promoteur, token } = await createTestPromoteur(email, 'pass1234', organizationName);

  promoteur.kycStatus = 'verified';
  promoteur.plan = 'standard';
  promoteur.onboardingCompleted = true;
  promoteur.onboardingProgress = 100;
  promoteur.trustScore = 75;
  await promoteur.save();

  return { user, promoteur, token };
}

/**
 * Create a test admin
 */
export async function createTestAdmin(
  email: string = 'admin@test.com',
  password: string = 'admin1234'
) {
  return createTestUser(email, password, [Role.ADMIN]);
}

/**
 * Create a test project
 */
export async function createTestProject(
  promoteur: any,
  overrides: Partial<{
    title: string;
    publicationStatus: string;
    projectType: string;
    status: string;
  }> = {}
) {
  const project = new Project({
    promoteur: promoteur._id,
    title: overrides.title || 'Test Project',
    slug: `test-project-${Date.now()}`,
    description: 'A test project description',
    projectType: overrides.projectType || 'villa',
    status: overrides.status || 'pre-commercialisation',
    publicationStatus: overrides.publicationStatus || 'draft',
    country: 'Côte d\'Ivoire',
    city: 'Abidjan',
    area: 'Cocody',
    address: 'Riviera Golf',
    priceFrom: 50000000,
    currency: 'EUR',
    typologies: [{
      name: 'F3',
      surface: 120,
      price: 50000000,
      available: 5,
    }],
    timeline: {
      deliveryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    media: {
      renderings: [],
      photos: [],
      videos: [],
      floorPlans: [],
    },
    features: [],
    amenities: [],
    updateFrequency: 0,
    totalUpdates: 0,
    changesLog: [],
    delays: [],
    risks: [],
    trustScore: 0,
    views: 0,
    favorites: 0,
    shares: 0,
  });

  await project.save();
  return project;
}

/**
 * Create a test badge
 */
export async function createTestBadge(
  overrides: Partial<{
    code: string;
    name: string;
    category: string;
  }> = {}
) {
  const code = overrides.code || `test_badge_${Date.now()}`;
  const name = overrides.name || `Test Badge ${code}`;
  const badge = new Badge({
    code,
    slug: code.replace(/_/g, '-').toLowerCase(),
    name,
    description: 'A test badge',
    icon: 'trophy',
    category: overrides.category || 'verification',
    criteria: {
      type: 'manual',
    },
    isActive: true,
    isPublic: true,
    priority: 1,
    trustScoreBonus: 1,
    totalEarned: 0,
    activeCount: 0,
  });

  await badge.save();
  return badge;
}

/**
 * Generate random email
 */
export function randomEmail() {
  return `test${Date.now()}${Math.random().toString(36).substring(7)}@test.com`;
}
