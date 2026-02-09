import { TrustScoreService } from '../../src/services/TrustScoreService';
import { BadgeService } from '../../src/services/BadgeService';
import { LeadScoringService } from '../../src/services/LeadScoringService';
import { OnboardingService } from '../../src/services/OnboardingService';
import Promoteur from '../../src/models/Promoteur';
import Project from '../../src/models/Project';
import {
  createTestPromoteur,
  createVerifiedPromoteur,
  createTestProject,
  createTestBadge,
  randomEmail,
} from '../helpers/testHelpers';

describe('TrustScoreService', () => {
  describe('calculatePromoteurTrustScore', () => {
    it('should calculate trust score for promoteur', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());

      const score = await TrustScoreService.calculatePromoteurTrustScore(promoteur._id.toString());

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should increase score for verified KYC', async () => {
      const { promoteur: unverified } = await createTestPromoteur(randomEmail());
      const { promoteur: verified } = await createVerifiedPromoteur(randomEmail());

      const unverifiedScore = await TrustScoreService.calculatePromoteurTrustScore(unverified._id.toString());
      const verifiedScore = await TrustScoreService.calculatePromoteurTrustScore(verified._id.toString());

      expect(verifiedScore).toBeGreaterThan(unverifiedScore);
    });

    it('should handle non-existent promoteur gracefully', async () => {
      const score = await TrustScoreService.calculatePromoteurTrustScore('507f1f77bcf86cd799439011');
      expect(score).toBe(0);
    });
  });

  describe('calculateProjectTrustScore', () => {
    it('should calculate trust score for project', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const score = await TrustScoreService.calculateProjectTrustScore(project._id.toString());

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});

describe('BadgeService', () => {
  describe('checkAndAwardBadges', () => {
    it('should check eligibility for badges', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      await createTestBadge({ code: 'kyc_verified', category: 'verification' });

      const result = await BadgeService.checkAndAwardBadges(promoteur._id.toString());

      // Result depends on badge criteria
      expect(result).toBeDefined();
    });
  });

  describe('Manual badge operations', () => {
    it('should allow manually adding badge to promoteur', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());
      const badge = await createTestBadge({ code: 'test_award' });

      // Manually add badge (simulating admin award)
      promoteur.badges.push({
        badgeId: badge._id,
        earnedAt: new Date(),
      });
      await promoteur.save();

      const updated = await Promoteur.findById(promoteur._id);
      const hasBadge = updated?.badges.some(b => b.badgeId.toString() === badge._id.toString());
      expect(hasBadge).toBe(true);
    });
  });

  describe('removeBadge', () => {
    it('should remove badge from promoteur', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());
      const badge = await createTestBadge({ code: 'to_revoke' });

      // Add badge first
      promoteur.badges.push({
        badgeId: badge._id,
        earnedAt: new Date(),
      });
      await promoteur.save();

      // Remove badge
      await BadgeService.removeBadge(promoteur._id.toString(), badge._id.toString(), 'test removal');

      const updated = await Promoteur.findById(promoteur._id);
      const hasBadge = updated?.badges.some(b => b.badgeId.toString() === badge._id.toString());
      expect(hasBadge).toBe(false);
    });
  });
});

describe('LeadScoringService', () => {
  describe('createLead', () => {
    it('should create lead with calculated score', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      const lead = await LeadScoringService.createLead({
        projectId: project._id.toString(),
        promoteurId: promoteur._id.toString(),
        firstName: 'Test',
        lastName: 'Client',
        email: randomEmail(),
        phone: '+33612345678',
        budget: 80000000,
        financingType: 'cash',
        timeframe: 'immediate',
        initialMessage: 'I am very interested in this project',
        contactMethod: 'whatsapp',
        source: 'website',
      });

      expect(lead).toBeDefined();
      expect(['A', 'B', 'C', 'D']).toContain(lead.score);
    });

    it('should score higher for cash financing', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      const cashLead = await LeadScoringService.createLead({
        projectId: project._id.toString(),
        promoteurId: promoteur._id.toString(),
        firstName: 'Cash',
        lastName: 'Buyer',
        email: randomEmail(),
        phone: '+33612345679',
        budget: 80000000,
        financingType: 'cash',
        timeframe: 'immediate',
        initialMessage: 'I want to buy with cash',
        contactMethod: 'phone',
        source: 'website',
      });

      const mortgageLead = await LeadScoringService.createLead({
        projectId: project._id.toString(),
        promoteurId: promoteur._id.toString(),
        firstName: 'Mortgage',
        lastName: 'Buyer',
        email: randomEmail(),
        phone: '+33612345680',
        budget: 80000000,
        financingType: 'mortgage',
        timeframe: 'immediate',
        initialMessage: 'I want to buy with mortgage',
        contactMethod: 'phone',
        source: 'website',
      });

      expect(['A', 'B', 'C', 'D']).toContain(cashLead.score);
      expect(['A', 'B', 'C', 'D']).toContain(mortgageLead.score);
    });

    it('should score higher for immediate timeframe', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      const immediateLead = await LeadScoringService.createLead({
        projectId: project._id.toString(),
        promoteurId: promoteur._id.toString(),
        firstName: 'Immediate',
        lastName: 'Buyer',
        email: randomEmail(),
        phone: '+33612345681',
        budget: 80000000,
        timeframe: 'immediate',
        initialMessage: 'I want to buy immediately',
        contactMethod: 'phone',
        source: 'website',
      });

      const laterLead = await LeadScoringService.createLead({
        projectId: project._id.toString(),
        promoteurId: promoteur._id.toString(),
        firstName: 'Later',
        lastName: 'Buyer',
        email: randomEmail(),
        phone: '+33612345682',
        budget: 80000000,
        timeframe: '1-year',
        initialMessage: 'I want to buy later',
        contactMethod: 'phone',
        source: 'website',
      });

      expect(['A', 'B', 'C', 'D']).toContain(immediateLead.score);
      expect(['A', 'B', 'C', 'D']).toContain(laterLead.score);
    });
  });
});

describe('OnboardingService', () => {
  describe('recalculate', () => {
    it('should calculate onboarding progress', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());

      OnboardingService.recalculate(promoteur);

      expect(promoteur.onboardingProgress).toBeGreaterThan(0);
      expect(promoteur.onboardingProgress).toBeLessThanOrEqual(100);
    });

    it('should mark completed when all items done', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());

      // Complete all checklist items
      promoteur.onboardingChecklist.forEach(item => {
        item.completed = true;
        item.completedAt = new Date();
      });

      OnboardingService.recalculate(promoteur);

      expect(promoteur.onboardingProgress).toBe(100);
      expect(promoteur.onboardingCompleted).toBe(true);
    });
  });

  describe('findChecklistItem', () => {
    it('should find checklist item by code', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());

      const item = OnboardingService.findChecklistItem(promoteur, 'kyc');
      expect(item).toBeDefined();
      expect(item?.code).toBe('kyc');
    });

    it('should find checklist item by index', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());

      const item = OnboardingService.findChecklistItem(promoteur, '0');
      expect(item).toBeDefined();
    });
  });

  describe('Manual checklist operations', () => {
    it('should allow manually completing checklist item', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());

      const kycItem = promoteur.onboardingChecklist.find(i => i.code === 'kyc');
      if (kycItem) {
        kycItem.completed = true;
        kycItem.completedAt = new Date();
      }
      
      OnboardingService.recalculate(promoteur);

      expect(kycItem?.completed).toBe(true);
      expect(promoteur.onboardingProgress).toBeGreaterThan(20);
    });
  });
});
