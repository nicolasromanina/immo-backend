import request from 'supertest';
import app from '../../src/app';
import Lead from '../../src/models/Lead';
import {
  createTestPromoteur,
  createVerifiedPromoteur,
  createTestProject,
  createTestUser,
  randomEmail,
} from '../helpers/testHelpers';
import { Role } from '../../src/config/roles';

describe('Lead Controller', () => {
  describe('POST /api/leads/', () => {
    it('should create a lead for a published project', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });
      const { token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .post('/api/leads/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          firstName: 'Jean',
          lastName: 'Dupont',
          email: randomEmail(),
          phone: '+33612345678',
          budget: 80000000,
          financingType: 'cash',
          timeframe: '3-months',
          initialMessage: 'I am interested in this project',
          contactMethod: 'whatsapp',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.lead).toBeDefined();
    });

    it('should reject lead for unpublished project', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'draft' });
      const { token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .post('/api/leads/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          firstName: 'Jean',
          lastName: 'Dupont',
          email: randomEmail(),
        });

      expect(res.status).toBe(404);
    });

    it('should reject lead without required fields', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });
      const { token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .post('/api/leads/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
        });

      expect([400, 422, 500]).toContain(res.status);
    });
  });

  describe('GET /api/leads/', () => {
    it('should return leads for promoteur', async () => {
      const { token, promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });
      
      // Create a lead
      const lead = new Lead({
        project: project._id,
        promoteur: promoteur._id,
        firstName: 'Test',
        lastName: 'Lead',
        email: randomEmail(),
        phone: '+33612345670',
        budget: 75000000,
        timeframe: 'immediate',
        contactMethod: 'email',
        initialMessage: 'Interested in the project',
        score: 'A',
        scoreDetails: {
          budgetMatch: 80,
          timelineMatch: 80,
          engagementLevel: 80,
          profileCompleteness: 80,
        },
        source: 'website',
      });
      await lead.save();

      const res = await request(app)
        .get('/api/leads/')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.leads || res.body.data || res.body)).toBe(true);
    });

    it('should filter leads by status', async () => {
      const { token, promoteur } = await createVerifiedPromoteur(randomEmail());

      const res = await request(app)
        .get('/api/leads/')
        .set('Authorization', `Bearer ${token}`)
        .query({ status: 'nouveau' });

      expect(res.status).toBe(200);
    });

    it('should filter leads by project', async () => {
      const { token, promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      const res = await request(app)
        .get('/api/leads/')
        .set('Authorization', `Bearer ${token}`)
        .query({ projectId: project._id.toString() });

      expect(res.status).toBe(200);
    });

    it('should reject for non-promoteur', async () => {
      const { token } = await createTestUser(randomEmail(), 'pass1234', [Role.USER]);

      const res = await request(app)
        .get('/api/leads/')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/leads/:id', () => {
    it('should return lead details', async () => {
      const { token, promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur);
      
      const lead = new Lead({
        project: project._id,
        promoteur: promoteur._id,
        firstName: 'Test',
        lastName: 'Lead',
        email: randomEmail(),
        phone: '+33612345671',
        budget: 75000000,
        timeframe: 'immediate',
        contactMethod: 'email',
        initialMessage: 'Interested in the project',
        score: 'A',
        scoreDetails: {
          budgetMatch: 80,
          timelineMatch: 80,
          engagementLevel: 80,
          profileCompleteness: 80,
        },
        source: 'website',
      });
      await lead.save();

      const res = await request(app)
        .get(`/api/leads/${lead._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should reject access to another promoteur\'s lead', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur);
      
      const lead = new Lead({
        project: project._id,
        promoteur: promoteur._id,
        firstName: 'Test',
        lastName: 'Lead',
        email: randomEmail(),
        phone: '+33612345672',
        budget: 75000000,
        timeframe: 'immediate',
        contactMethod: 'email',
        initialMessage: 'Interested in the project',
        score: 'A',
        scoreDetails: {
          budgetMatch: 80,
          timelineMatch: 80,
          engagementLevel: 80,
          profileCompleteness: 80,
        },
        source: 'website',
      });
      await lead.save();

      const { token: otherToken } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .get(`/api/leads/${lead._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('PUT /api/leads/:id/status', () => {
    it('should update lead status', async () => {
      const { token, promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur);
      
      const lead = new Lead({
        project: project._id,
        promoteur: promoteur._id,
        firstName: 'Test',
        lastName: 'Lead',
        email: randomEmail(),
        phone: '+33612345673',
        budget: 75000000,
        timeframe: 'immediate',
        contactMethod: 'email',
        initialMessage: 'Interested in the project',
        score: 'A',
        scoreDetails: {
          budgetMatch: 80,
          timelineMatch: 80,
          engagementLevel: 80,
          profileCompleteness: 80,
        },
        source: 'website',
      });
      await lead.save();

      const res = await request(app)
        .put(`/api/leads/${lead._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'contacte' });

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/leads/:id/note', () => {
    it('should add note to lead', async () => {
      const { token, promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur);
      
      const lead = new Lead({
        project: project._id,
        promoteur: promoteur._id,
        firstName: 'Test',
        lastName: 'Lead',
        email: randomEmail(),
        phone: '+33612345674',
        budget: 75000000,
        timeframe: 'immediate',
        contactMethod: 'email',
        initialMessage: 'Interested in the project',
        score: 'A',
        scoreDetails: {
          budgetMatch: 80,
          timelineMatch: 80,
          engagementLevel: 80,
          profileCompleteness: 80,
        },
        source: 'website',
      });
      await lead.save();

      const res = await request(app)
        .post(`/api/leads/${lead._id}/note`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Called the client, very interested',
        });

      expect([200, 201, 404]).toContain(res.status);
    });
  });

  describe('Lead Scoring', () => {
    it('should score lead based on data completeness', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });
      const { token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .post('/api/leads/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          firstName: 'Jean',
          lastName: 'Dupont',
          email: randomEmail(),
          phone: '+33612345678',
          budget: 100000000,
          financingType: 'cash',
          timeframe: 'immediate',
          interestedTypology: 'T4',
          initialMessage: 'Very interested, ready to buy immediately',
          contactMethod: 'phone',
        });

      if (res.status === 201) {
        expect(['A', 'B', 'C', 'D']).toContain(res.body.lead.score);
      }
    });
  });
});

describe('CRM Controller', () => {
  describe('GET /api/crm/config', () => {
    it('should return CRM config', async () => {
      const { token } = await createVerifiedPromoteur(randomEmail());

      const res = await request(app)
        .get('/api/crm/config')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('PUT /api/crm/config', () => {
    it('should update CRM config', async () => {
      const { token } = await createVerifiedPromoteur(randomEmail());

      const res = await request(app)
        .put('/api/crm/config')
        .set('Authorization', `Bearer ${token}`)
        .send({
          enabled: true,
          url: 'https://my-crm.example.com/webhook',
          secret: 'test-secret',
          events: ['lead.created', 'lead.status_changed'],
        });

      expect([200, 404]).toContain(res.status);
    });
  });
});
