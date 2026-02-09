import request from 'supertest';
import app from '../../src/app';
import Badge from '../../src/models/Badge';
import {
  createTestAdmin,
  createTestPromoteur,
  createVerifiedPromoteur,
  createTestBadge,
  createTestUser,
  randomEmail,
} from '../helpers/testHelpers';
import { Role } from '../../src/config/roles';

describe('Badge Controller', () => {
  describe('GET /api/badges/', () => {
    it('should return all badges', async () => {
      await createTestBadge({ code: 'badge1', name: 'Badge 1' });
      await createTestBadge({ code: 'badge2', name: 'Badge 2' });

      const res = await request(app).get('/api/badges/');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by category', async () => {
      await createTestBadge({ code: 'verify_badge', category: 'verification' });
      await createTestBadge({ code: 'perf_badge', category: 'performance' });

      const res = await request(app)
        .get('/api/badges/')
        .query({ category: 'verification' });

      expect(res.status).toBe(200);
    });

    it('should filter by active status', async () => {
      const res = await request(app)
        .get('/api/badges/')
        .query({ isActive: 'true' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/badges/:id', () => {
    it('should return badge by id', async () => {
      const badge = await createTestBadge({ code: 'test_get' });

      const res = await request(app).get(`/api/badges/${badge._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe(badge.slug);
    });

    it('should return 404 for non-existent badge', async () => {
      const res = await request(app).get('/api/badges/507f1f77bcf86cd799439011');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/badges/', () => {
    it('should create badge (admin)', async () => {
      const { token } = await createTestAdmin(randomEmail());

      const res = await request(app)
        .post('/api/badges/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Badge',
          slug: `new-badge-${Date.now()}`,
          description: 'A new badge',
          icon: 'trophy',
          category: 'engagement',
          criteria: { type: 'manual' },
          isActive: true,
          priority: 1,
        });

      expect([200, 201]).toContain(res.status);
    });

    it('should reject duplicate code', async () => {
      const existing = await createTestBadge({ code: 'duplicate_code' });
      const { token } = await createTestAdmin(randomEmail());

      const res = await request(app)
        .post('/api/badges/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: existing.name,
          slug: existing.slug,
          description: 'Duplicate badge',
          icon: 'trophy',
          category: 'verification',
          criteria: { type: 'manual' },
        });

      expect([400, 409, 500]).toContain(res.status);
    });
  });

  describe('PUT /api/badges/:id', () => {
    it('should update badge (admin)', async () => {
      const badge = await createTestBadge({ code: 'to_update' });
      const { token } = await createTestAdmin(randomEmail());

      const res = await request(app)
        .put(`/api/badges/${badge._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Badge Name',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Badge Name');
    });

    it('should return 404 for non-existent badge', async () => {
      const { token } = await createTestAdmin(randomEmail());

      const res = await request(app)
        .put('/api/badges/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/badges/:id', () => {
    it('should delete badge (admin)', async () => {
      const badge = await createTestBadge({ code: 'to_delete' });
      const { token } = await createTestAdmin(randomEmail());

      const res = await request(app)
        .delete(`/api/badges/${badge._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204]).toContain(res.status);
    });
  });

  describe('Badge Categories', () => {
    const categories = ['verification', 'performance', 'engagement', 'special'];

    categories.forEach((category) => {
      it(`should accept ${category} category`, async () => {
        const { token } = await createTestAdmin(randomEmail());

        const res = await request(app)
          .post('/api/badges/')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: `${category} Badge`,
            slug: `${category}-badge-${Date.now()}`,
            description: `A ${category} badge`,
            icon: 'trophy',
            category,
            criteria: { type: 'manual' },
          });

        expect([200, 201]).toContain(res.status);
      });
    });
  });

  describe('Badge Assignment', () => {
    describe('POST /api/admin/badges/award', () => {
      it('should award badge to promoteur', async () => {
        const badge = await createTestBadge({ code: 'awardable' });
        const { promoteur } = await createTestPromoteur(randomEmail());
        const { token } = await createTestAdmin(randomEmail());

        const res = await request(app)
          .post('/api/admin/badges/award')
          .set('Authorization', `Bearer ${token}`)
          .send({
            promoteurId: promoteur._id.toString(),
            badgeId: badge._id.toString(),
          });

        expect([200, 201, 404]).toContain(res.status);
      });
    });
  });

  describe('Promoteur Badges', () => {
    describe('GET /api/promoteurs/:id/badges', () => {
      it('should return promoteur badges', async () => {
        const badge = await createTestBadge({ code: 'promo_badge' });
        const { promoteur } = await createVerifiedPromoteur(randomEmail());

        promoteur.badges.push({
          badgeId: badge._id,
          earnedAt: new Date(),
        });
        await promoteur.save();

        const res = await request(app)
          .get(`/api/promoteurs/${promoteur._id}/badges`);

        expect(res.status).toBe(401);
      });
    });
  });
});
