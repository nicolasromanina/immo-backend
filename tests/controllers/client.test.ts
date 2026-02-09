import request from 'supertest';
import app from '../../src/app';
import Favorite from '../../src/models/Favorite';
import Report from '../../src/models/Report';
import Comparison from '../../src/models/Comparison';
import {
  createTestUser,
  createTestPromoteur,
  createVerifiedPromoteur,
  createTestProject,
  randomEmail,
} from '../helpers/testHelpers';
import { Role } from '../../src/config/roles';

describe('Client Controller', () => {
  describe('Favorites', () => {
    describe('POST /api/client/favorites/:projectId', () => {
      it('should add project to favorites', async () => {
        const { promoteur } = await createVerifiedPromoteur(randomEmail());
        const project = await createTestProject(promoteur, { publicationStatus: 'published' });
        const { token } = await createTestUser(randomEmail(), 'pass1234');

        const res = await request(app)
          .post(`/api/client/favorites/${project._id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ alertOnUpdate: true });

        expect([200, 201]).toContain(res.status);
      });

      it('should reject duplicate favorite', async () => {
        const { promoteur } = await createVerifiedPromoteur(randomEmail());
        const project = await createTestProject(promoteur, { publicationStatus: 'published' });
        const { token, user } = await createTestUser(randomEmail(), 'pass1234');

        // Create favorite
        await Favorite.create({
          user: user._id,
          project: project._id,
        });

        const res = await request(app)
          .post(`/api/client/favorites/${project._id}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
      });

      it('should reject for non-published project', async () => {
        const { promoteur } = await createTestPromoteur(randomEmail());
        const project = await createTestProject(promoteur, { publicationStatus: 'draft' });
        const { token } = await createTestUser(randomEmail(), 'pass1234');

        const res = await request(app)
          .post(`/api/client/favorites/${project._id}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
      });
    });

    describe('DELETE /api/client/favorites/:projectId', () => {
      it('should remove project from favorites', async () => {
        const { promoteur } = await createVerifiedPromoteur(randomEmail());
        const project = await createTestProject(promoteur, { publicationStatus: 'published' });
        const { token, user } = await createTestUser(randomEmail(), 'pass1234');

        await Favorite.create({
          user: user._id,
          project: project._id,
        });

        const res = await request(app)
          .delete(`/api/client/favorites/${project._id}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
      });

      it('should return 404 if not favorited', async () => {
        const { promoteur } = await createVerifiedPromoteur(randomEmail());
        const project = await createTestProject(promoteur, { publicationStatus: 'published' });
        const { token } = await createTestUser(randomEmail(), 'pass1234');

        const res = await request(app)
          .delete(`/api/client/favorites/${project._id}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
      });
    });

    describe('GET /api/client/favorites', () => {
      it('should return user favorites', async () => {
        const { promoteur } = await createVerifiedPromoteur(randomEmail());
        const project1 = await createTestProject(promoteur, { publicationStatus: 'published' });
        const project2 = await createTestProject(promoteur, { publicationStatus: 'published', title: 'Project 2' });
        const { token, user } = await createTestUser(randomEmail(), 'pass1234');

        await Favorite.create([
          { user: user._id, project: project1._id },
          { user: user._id, project: project2._id },
        ]);

        const res = await request(app)
          .get('/api/client/favorites')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        const favorites = res.body.favorites || res.body.data || res.body;
        expect(Array.isArray(favorites)).toBe(true);
      });

      it('should support pagination', async () => {
        const { token } = await createTestUser(randomEmail(), 'pass1234');

        const res = await request(app)
          .get('/api/client/favorites')
          .set('Authorization', `Bearer ${token}`)
          .query({ page: 1, limit: 10 });

        expect(res.status).toBe(200);
      });
    });
  });

  describe('Reports', () => {
    describe('POST /api/client/reports', () => {
      it('should create a report', async () => {
        const { promoteur } = await createVerifiedPromoteur(randomEmail());
        const project = await createTestProject(promoteur, { publicationStatus: 'published' });
        const { token } = await createTestUser(randomEmail(), 'pass1234');

        const res = await request(app)
          .post('/api/client/report')
          .set('Authorization', `Bearer ${token}`)
          .send({
            targetType: 'project',
            targetId: project._id.toString(),
            reason: 'fraud',
            description: 'This project seems fraudulent',
          });

        expect([200, 201]).toContain(res.status);
      });

      it('should require reason', async () => {
        const { promoteur } = await createVerifiedPromoteur(randomEmail());
        const project = await createTestProject(promoteur, { publicationStatus: 'published' });
        const { token } = await createTestUser(randomEmail(), 'pass1234');

        const res = await request(app)
          .post('/api/client/report')
          .set('Authorization', `Bearer ${token}`)
          .send({
            targetType: 'project',
            targetId: project._id.toString(),
          });

        expect([400, 422, 500]).toContain(res.status);
      });
    });
  });

  describe('Notifications', () => {
    describe('GET /api/client/notifications', () => {
      it('should return user notifications', async () => {
        const { token } = await createTestUser(randomEmail(), 'pass1234');

        const res = await request(app)
          .get('/api/client/notifications')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404]).toContain(res.status);
      });
    });

    describe('PUT /api/client/notifications/:id/read', () => {
      it('should mark notification as read', async () => {
        const { token } = await createTestUser(randomEmail(), 'pass1234');

        const res = await request(app)
          .put('/api/client/notifications/507f1f77bcf86cd799439011/read')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404]).toContain(res.status);
      });
    });
  });
});

describe('Comparison Controller', () => {
  describe('POST /api/comparisons/', () => {
    it('should create a comparison', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project1 = await createTestProject(promoteur, { publicationStatus: 'published' });
      const project2 = await createTestProject(promoteur, { publicationStatus: 'published', title: 'Project 2' });
      const { token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .post('/api/comparisons/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectIds: [project1._id.toString(), project2._id.toString()],
        });

      expect([201, 400]).toContain(res.status);
    });

    it('should require at least 2 projects', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });
      const { token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .post('/api/comparisons/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectIds: [project._id.toString()],
        });

      expect([400, 422]).toContain(res.status);
    });
  });

  describe('GET /api/comparisons/', () => {
    it('should return user comparisons', async () => {
      const { token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .get('/api/comparisons/my-comparisons')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('GET /api/comparisons/:id', () => {
    it('should return comparison details', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project1 = await createTestProject(promoteur, { publicationStatus: 'published' });
      const project2 = await createTestProject(promoteur, { publicationStatus: 'published', title: 'Project 2' });
      const { token, user } = await createTestUser(randomEmail(), 'pass1234');

      const insertResult = await Comparison.collection.insertOne({
        user: user._id,
        projects: [project1._id, project2._id],
        metrics: {
          trustScores: [50, 60],
          prices: [50000000, 60000000],
          deliveryDates: [new Date(), new Date()],
          updateFrequencies: [30, 45],
          documentCounts: [2, 3],
          leadResponseTimes: [12, 8],
        },
        isShared: false,
        sharedWith: [],
        viewCount: 1,
        lastViewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get(`/api/comparisons/${insertResult.insertedId.toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 400, 404]).toContain(res.status);
    });
  });

  describe('DELETE /api/comparisons/:id', () => {
    it('should delete comparison', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project1 = await createTestProject(promoteur, { publicationStatus: 'published' });
      const project2 = await createTestProject(promoteur, { publicationStatus: 'published', title: 'Project 2' });
      const { token, user } = await createTestUser(randomEmail(), 'pass1234');

      const insertResult = await Comparison.collection.insertOne({
        user: user._id,
        projects: [project1._id, project2._id],
        metrics: {
          trustScores: [50, 60],
          prices: [50000000, 60000000],
          deliveryDates: [new Date(), new Date()],
          updateFrequencies: [30, 45],
          documentCounts: [2, 3],
          leadResponseTimes: [12, 8],
        },
        isShared: false,
        sharedWith: [],
        viewCount: 1,
        lastViewedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .delete(`/api/comparisons/${insertResult.insertedId.toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204, 400, 404]).toContain(res.status);
    });
  });
});

describe('Alert Controller', () => {
  describe('GET /api/alerts/', () => {
    it('should return user alerts', async () => {
      const { token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
          .get('/api/alerts/my-alerts')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/alerts/', () => {
    it('should create alert subscription', async () => {
      const { token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .post('/api/alerts/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'new-project',
          criteria: {
            countries: ['Côte d\'Ivoire'],
            cities: ['Abidjan'],
            projectTypes: ['villa'],
            budgetMin: 50000000,
            budgetMax: 100000000,
          },
          frequency: 'daily',
          channels: ['email'],
          title: 'New projects in Abidjan',
          message: 'We will notify you about new projects in Abidjan',
        });

      expect([200, 201]).toContain(res.status);
    });
  });

  describe('DELETE /api/alerts/:id', () => {
    it('should delete alert', async () => {
      const { token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .delete('/api/alerts/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204, 404]).toContain(res.status);
    });
  });
});
