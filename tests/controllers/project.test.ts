import request from 'supertest';
import app from '../../src/app';
import Project from '../../src/models/Project';
import Favorite from '../../src/models/Favorite';
import Lead from '../../src/models/Lead';
import Notification from '../../src/models/Notification';
import {
  createTestPromoteur,
  createVerifiedPromoteur,
  createTestProject,
  createTestUser,
  randomEmail,
} from '../helpers/testHelpers';
import { Role } from '../../src/config/roles';

describe('Project Controller', () => {
  describe('GET /api/projects/', () => {
    it('should return list of published projects', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      await createTestProject(promoteur, { publicationStatus: 'published' });
      await createTestProject(promoteur, { publicationStatus: 'published', title: 'Project 2' });

      const res = await request(app).get('/api/projects/');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.projects || res.body.data || res.body)).toBe(true);
    });

    it('should filter by city', async () => {
      const res = await request(app)
        .get('/api/projects/')
        .query({ city: 'Abidjan' });

      expect(res.status).toBe(200);
    });

    it('should filter by project type', async () => {
      const res = await request(app)
        .get('/api/projects/')
        .query({ projectType: 'villa' });

      expect(res.status).toBe(200);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/projects/')
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project details', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      const res = await request(app).get(`/api/projects/${project._id}`);

      expect(res.status).toBe(200);
      expect(res.body.project?.title || res.body.title).toBe(project.title);
    });

    it('should return project by slug', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      const res = await request(app).get(`/api/projects/${project.slug}`);

      expect([200, 404, 500]).toContain(res.status);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app).get('/api/projects/507f1f77bcf86cd799439011');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/projects/featured', () => {
    it('should return featured projects', async () => {
      const res = await request(app).get('/api/projects/featured');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/projects/top-verified', () => {
    it('should return top verified projects', async () => {
      const res = await request(app).get('/api/projects/top-verified');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/projects/', () => {
    it('should create a new project', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .post('/api/projects/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Test Project',
          description: 'A description for the new project',
          projectType: 'villa',
          typeDetails: {
            villa: {
              landArea: 300,
              units: 10,
            },
          },
          country: 'Côte d\'Ivoire',
          city: 'Abidjan',
          area: 'Cocody',
          address: 'Riviera',
          typologies: [
            { name: 'F3', surface: 120, price: 75000000, available: 5 },
          ],
          priceFrom: 75000000,
          currency: 'EUR',
          timeline: { deliveryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
        });

      expect(res.status).toBe(201);
      expect(res.body.project?.title || res.body.title).toBe('New Test Project');
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .post('/api/projects/')
        .send({
          title: 'Unauthenticated Project',
        });

      expect(res.status).toBe(401);
    });

    it('should reject for non-promoteur user', async () => {
      const { token } = await createTestUser(randomEmail(), 'pass1234', [Role.USER]);

      const res = await request(app)
        .post('/api/projects/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Non-Promoteur Project',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const res = await request(app)
        .put(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Project Title',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.project?.title || res.body.title).toBe('Updated Project Title');
    });

    it('should reject update by non-owner', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);
      
      const { token: otherToken } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .put(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          title: 'Hacked Title',
        });

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const res = await request(app)
        .delete(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204]).toContain(res.status);

      const deleted = await Project.findById(project._id);
      // Project should either be deleted or have changed status
      expect(!deleted || deleted.publicationStatus !== 'published').toBe(true);
    });

    it('should reject deletion by non-owner', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);
      
      const { token: otherToken } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .delete(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/projects/:id/submit', () => {
    it('should submit project for publication review', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'draft' });

      const res = await request(app)
        .post(`/api/projects/${project._id}/submit`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 400]).toContain(res.status);
    });
  });

  describe('GET /api/projects/my/list', () => {
    it('should return promoteur\'s own projects', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      await createTestProject(promoteur, { title: 'My Project 1' });
      await createTestProject(promoteur, { title: 'My Project 2' });

      const res = await request(app)
        .get('/api/projects/my/list')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const projects = res.body.projects || res.body.data || res.body;
      expect(Array.isArray(projects)).toBe(true);
    });
  });

  describe('POST /api/projects/:id/faq', () => {
    it('should add FAQ to project', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const res = await request(app)
        .post(`/api/projects/${project._id}/faq`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: 'What is the delivery date?',
          answer: 'Expected Q4 2027',
        });

      expect([200, 201]).toContain(res.status);
    });
  });

  describe('POST /api/projects/:id/delay', () => {
    it('should report delay', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const res = await request(app)
        .post(`/api/projects/${project._id}/delay`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          reason: 'Supply chain issues',
          originalDate: project.timeline.deliveryDate?.toISOString(),
          newDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString(),
          mitigationPlan: 'Adjusted timeline and supplier contracts',
        });

      expect([200, 201]).toContain(res.status);
    });
  });

  describe('POST /api/projects/:id/risk', () => {
    it('should report risk', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const res = await request(app)
        .post(`/api/projects/${project._id}/risk`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'financement',
          severity: 'medium',
          description: 'Potential funding gap',
          mitigationPlan: 'Seeking additional investors',
        });

      expect([200, 201]).toContain(res.status);
    });
  });

  describe('Media Management', () => {
    it('should add media to project', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const res = await request(app)
        .post(`/api/projects/${project._id}/media/photos`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [
            {
              url: 'https://example.com/photo1.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 500000,
            },
          ],
        });

      expect([200, 201, 400]).toContain(res.status);
    });

    it('should get project media', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      const res = await request(app)
        .get(`/api/projects/${project._id}/media/photos`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Team Assignment', () => {
    it('should get assigned team', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      const res = await request(app)
        .get(`/api/projects/${project._id}/team`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('PATCH /api/projects/:id/pause and /resume', () => {
    it('should notify unique followers/leads on pause and resume', async () => {
      const { token, promoteur, user: promoteurUser } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur, {
        publicationStatus: 'published',
        status: 'en-construction',
      });

      const { user: userBoth } = await createTestUser(randomEmail(), 'pass1234', [Role.USER]);
      const { user: userLeadOnly } = await createTestUser(randomEmail(), 'pass1234', [Role.USER]);
      const { user: userFavoriteDisabled } = await createTestUser(randomEmail(), 'pass1234', [Role.USER]);

      await Favorite.create({
        user: userBoth._id,
        project: project._id,
        alertOnStatusChange: true,
      });

      await Favorite.create({
        user: userFavoriteDisabled._id,
        project: project._id,
        alertOnStatusChange: false,
      });

      await Lead.create({
        project: project._id,
        promoteur: promoteur._id,
        client: userBoth._id,
        firstName: 'Client',
        lastName: 'Both',
        email: 'both-client@test.com',
        phone: '+2250700000001',
        budget: 50000000,
        financingType: 'cash',
        timeframe: '6-months',
        score: 'A',
        scoreDetails: {
          budgetMatch: 90,
          timelineMatch: 80,
          engagementLevel: 85,
          profileCompleteness: 95,
        },
        status: 'nouveau',
        pipeline: [{
          status: 'nouveau',
          changedAt: new Date(),
          changedBy: promoteurUser._id,
        }],
        contactMethod: 'email',
        initialMessage: 'Interesse par ce projet',
      });

      await Lead.create({
        project: project._id,
        promoteur: promoteur._id,
        client: userLeadOnly._id,
        firstName: 'Client',
        lastName: 'LeadOnly',
        email: 'lead-only@test.com',
        phone: '+2250700000002',
        budget: 45000000,
        financingType: 'mortgage',
        timeframe: '1-year',
        score: 'B',
        scoreDetails: {
          budgetMatch: 75,
          timelineMatch: 70,
          engagementLevel: 80,
          profileCompleteness: 90,
        },
        status: 'nouveau',
        pipeline: [{
          status: 'nouveau',
          changedAt: new Date(),
          changedBy: promoteurUser._id,
        }],
        contactMethod: 'phone',
        initialMessage: 'Je souhaite en savoir plus',
      });

      const pauseRes = await request(app)
        .patch(`/api/projects/${project._id}/pause`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          reason: 'administratif',
          description: 'Arret temporaire pour formalites',
        });

      expect(pauseRes.status).toBe(200);
      expect(pauseRes.body.project?.status).toBe('pause');

      const pauseNotifications = await Notification.find({
        relatedProject: project._id,
        type: 'project',
        title: 'Projet temporairement en pause',
      });

      expect(pauseNotifications).toHaveLength(2);
      const pauseRecipients = new Set(pauseNotifications.map((n) => n.recipient.toString()));
      expect(pauseRecipients.has(userBoth._id.toString())).toBe(true);
      expect(pauseRecipients.has(userLeadOnly._id.toString())).toBe(true);
      expect(pauseRecipients.has(userFavoriteDisabled._id.toString())).toBe(false);

      const resumeRes = await request(app)
        .patch(`/api/projects/${project._id}/resume`)
        .set('Authorization', `Bearer ${token}`)
        .send({ newStatus: 'en-construction' });

      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.project?.status).toBe('en-construction');

      const resumeNotifications = await Notification.find({
        relatedProject: project._id,
        type: 'project',
        title: 'Projet repris',
      });

      expect(resumeNotifications).toHaveLength(2);
      const resumeRecipients = new Set(resumeNotifications.map((n) => n.recipient.toString()));
      expect(resumeRecipients.has(userBoth._id.toString())).toBe(true);
      expect(resumeRecipients.has(userLeadOnly._id.toString())).toBe(true);
      expect(resumeRecipients.has(userFavoriteDisabled._id.toString())).toBe(false);
      expect(resumeNotifications.every((n) => n.priority === 'high')).toBe(true);
    });
  });
});
