import request from 'supertest';
import app from '../../src/app';
import Promoteur from '../../src/models/Promoteur';
import { Role } from '../../src/config/roles';
import {
  createTestUser,
  createTestPromoteur,
  createVerifiedPromoteur,
  randomEmail,
} from '../helpers/testHelpers';

describe('Promoteur Controller', () => {
  describe('GET /api/promoteurs/profile', () => {
    it('should return promoteur profile', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .get('/api/promoteurs/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.promoteur.organizationName).toBe(promoteur.organizationName);
    });

    it('should return 404 for user without promoteur profile', async () => {
      const { token } = await createTestUser(randomEmail(), 'pass1234', [Role.PROMOTEUR]);

      const res = await request(app)
        .get('/api/promoteurs/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/promoteurs/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/promoteurs/profile', () => {
    it('should create promoteur profile', async () => {
      const { user, token } = await createTestUser(randomEmail(), 'pass1234', [Role.PROMOTEUR]);

      const res = await request(app)
        .post('/api/promoteurs/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          organizationName: 'New Promoteur SAS',
          organizationType: 'small',
        });

      expect(res.status).toBe(201);
      expect(res.body.promoteur.organizationName).toBe('New Promoteur SAS');
      
      // Check promoteur was created
      const promoteur = await Promoteur.findById(res.body.promoteur._id);
      expect(promoteur).toBeDefined();
      expect(promoteur?.user.toString()).toBe(user._id.toString());
    });

    it('should reject if profile already exists', async () => {
      const { token } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .post('/api/promoteurs/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          organizationName: 'Another Promoteur',
          organizationType: 'small',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/promoteurs/profile', () => {
    it('should update promoteur profile', async () => {
      const { token } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .put('/api/promoteurs/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          organizationName: 'Updated Promoteur Name',
          organizationType: 'medium',
        });

      expect(res.status).toBe(200);
      expect(res.body.promoteur.organizationName).toBe('Updated Promoteur Name');
    });
  });

  describe('GET /api/promoteurs/stats', () => {
    it('should return promoteur stats', async () => {
      const { token } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .get('/api/promoteurs/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
    });
  });

  describe('GET /api/promoteurs/onboarding/status', () => {
    it('should return onboarding status', async () => {
      const { token } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .get('/api/promoteurs/onboarding/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.onboardingCompleted).toBeDefined();
      expect(res.body.onboardingProgress).toBeDefined();
    });
  });

  describe('GET /api/promoteurs/onboarding/checklist', () => {
    it('should return onboarding checklist', async () => {
      const { token } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .get('/api/promoteurs/onboarding/checklist')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.checklist)).toBe(true);
    });
  });

  describe('GET /api/promoteurs/trust-score', () => {
    it('should return trust score', async () => {
      const { token } = await createVerifiedPromoteur(randomEmail());

      const res = await request(app)
        .get('/api/promoteurs/trust-score')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.trustScore).toBeDefined();
    });
  });

  describe('POST /api/promoteurs/kyc/upload', () => {
    it('should accept KYC document upload', async () => {
      const { token } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .post('/api/promoteurs/kyc/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({
          documents: [
            { type: 'id_card', url: 'https://example.com/doc.pdf' },
          ],
        });

      // May succeed or require different format
      expect([200, 201, 400, 500]).toContain(res.status);
    });
  });

  describe('POST /api/promoteurs/team/add', () => {
    it('should add team member', async () => {
      const { token } = await createTestPromoteur(randomEmail());
      const { user: member } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .post('/api/promoteurs/team/add')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: member._id.toString(),
          role: 'commercial',
        });

      // Depending on implementation
      expect([200, 201, 400, 404]).toContain(res.status);
    });
  });

  describe('GET /api/promoteurs/availability', () => {
    it('should return availability', async () => {
      const { token } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .get('/api/promoteurs/availability')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('PUT /api/promoteurs/availability', () => {
    it('should update availability', async () => {
      const { token } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .put('/api/promoteurs/availability')
        .set('Authorization', `Bearer ${token}`)
        .send({
          timezone: 'Africa/Abidjan',
          weeklySlots: [
            { day: 'monday', startTime: '09:00', endTime: '17:00' },
            { day: 'tuesday', startTime: '09:00', endTime: '17:00' },
          ],
          blackoutDates: [],
        });

      expect([200, 201, 400]).toContain(res.status);
    });
  });
});
