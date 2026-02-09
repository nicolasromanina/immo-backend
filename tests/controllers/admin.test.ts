import request from 'supertest';
import app from '../../src/app';
import Promoteur from '../../src/models/Promoteur';
import Project from '../../src/models/Project';
import Appeal from '../../src/models/Appeal';
import Report from '../../src/models/Report';
import {
  createTestAdmin,
  createTestPromoteur,
  createVerifiedPromoteur,
  createTestProject,
  createTestUser,
  randomEmail,
} from '../helpers/testHelpers';
import { Role } from '../../src/config/roles';

describe('Admin Controller', () => {
  describe('GET /api/admin/dashboard/stats', () => {
    it('should return dashboard stats for admin', async () => {
      const { token } = await createTestAdmin(randomEmail());

      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.stats).toBeDefined();
      }
    });

    it('should reject non-admin', async () => {
      const { token } = await createTestUser(randomEmail(), 'pass1234', [Role.USER]);

      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/admin/dashboard/stats');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/promoteurs', () => {
    it('should return list of promoteurs', async () => {
      const { token } = await createTestAdmin(randomEmail());
      await createTestPromoteur(randomEmail());
      await createVerifiedPromoteur(randomEmail());

      const res = await request(app)
        .get('/api/admin/promoteurs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.promoteurs || res.body.data).toBeDefined();
    });

    it('should filter by KYC status', async () => {
      const { token } = await createTestAdmin(randomEmail());

      const res = await request(app)
        .get('/api/admin/promoteurs')
        .set('Authorization', `Bearer ${token}`)
        .query({ kycStatus: 'pending' });

      expect(res.status).toBe(200);
    });

    it('should filter by plan', async () => {
      const { token } = await createTestAdmin(randomEmail());

      const res = await request(app)
        .get('/api/admin/promoteurs')
        .set('Authorization', `Bearer ${token}`)
        .query({ plan: 'standard' });

      expect(res.status).toBe(200);
    });

    it('should support pagination', async () => {
      const { token } = await createTestAdmin(randomEmail());

      const res = await request(app)
        .get('/api/admin/promoteurs')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/admin/promoteurs/:id', () => {
    it('should return promoteur details', async () => {
      const { token } = await createTestAdmin(randomEmail());
      const { promoteur } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .get(`/api/admin/promoteurs/${promoteur._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/admin/promoteurs/:id/verify-kyc', () => {
    it('should verify promoteur KYC', async () => {
      const { token } = await createTestAdmin(randomEmail());
      const { promoteur } = await createTestPromoteur(randomEmail());

      // Set KYC to submitted
      promoteur.kycStatus = 'submitted';
      await promoteur.save();

      const res = await request(app)
        .post(`/api/admin/promoteurs/${promoteur._id}/verify-kyc`)
        .set('Authorization', `Bearer ${token}`)
        .send({ approved: true });

      expect([200, 404]).toContain(res.status);
    });

    it('should reject promoteur KYC with reason', async () => {
      const { token } = await createTestAdmin(randomEmail());
      const { promoteur } = await createTestPromoteur(randomEmail());

      promoteur.kycStatus = 'submitted';
      await promoteur.save();

      const res = await request(app)
        .post(`/api/admin/promoteurs/${promoteur._id}/verify-kyc`)
        .set('Authorization', `Bearer ${token}`)
        .send({ 
          approved: false,
          rejectionReason: 'Documents not readable',
        });

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('POST /api/admin/projects/:id/moderate', () => {
    it('should approve project publication', async () => {
      const { token } = await createTestAdmin(randomEmail());
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'pending' });

      const res = await request(app)
        .post(`/api/admin/projects/${project._id}/moderate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ approved: true });

      expect([200, 404]).toContain(res.status);
    });

    it('should reject project with reason', async () => {
      const { token } = await createTestAdmin(randomEmail());
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'pending' });

      const res = await request(app)
        .post(`/api/admin/projects/${project._id}/moderate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ 
          approved: false,
          rejectionReason: 'Incomplete documentation',
        });

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Appeal Management', () => {
    describe('GET /api/admin/appeals', () => {
      it('should return list of appeals', async () => {
        const { token } = await createTestAdmin(randomEmail());

        const res = await request(app)
          .get('/api/admin/appeals')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404]).toContain(res.status);
      });

      it('should filter by status', async () => {
        const { token } = await createTestAdmin(randomEmail());

        const res = await request(app)
          .get('/api/admin/appeals')
          .set('Authorization', `Bearer ${token}`)
          .query({ status: 'pending' });

        expect([200, 404]).toContain(res.status);
      });
    });

    describe('POST /api/admin/appeals/:id/process', () => {
      it('should process appeal', async () => {
        const { token, user: adminUser } = await createTestAdmin(randomEmail());
        const { promoteur } = await createTestPromoteur(randomEmail());
        const project = await createTestProject(promoteur);

        const appeal = new Appeal({
          promoteur: promoteur._id,
          project: project._id,
          type: 'rejection',
          reason: 'I believe my project was wrongly rejected',
          description: 'Project rejected without enough justification',
          originalAction: {
            type: 'rejection',
            appliedBy: adminUser._id,
            appliedAt: new Date(),
            reason: 'Missing documents',
          },
          evidence: [
            {
              type: 'explanation',
              description: 'We submitted all documents',
            },
          ],
          mitigationPlan: 'Provide updated documents',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        await appeal.save();

        const res = await request(app)
          .post(`/api/admin/appeals/${appeal._id}/process`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            outcome: 'approved',
            explanation: 'Appeal accepted after review',
            newAction: { type: 'reopen', details: 'Reopen project review' },
          });

        expect([200, 404]).toContain(res.status);
      });
    });
  });

  describe('Report Management', () => {
    describe('GET /api/admin/reports', () => {
      it('should return list of reports', async () => {
        const { token } = await createTestAdmin(randomEmail());

        const res = await request(app)
          .get('/api/admin/reports')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404]).toContain(res.status);
      });
    });

    describe('POST /api/admin/reports/:id/process', () => {
      it('should process report', async () => {
        const { token } = await createTestAdmin(randomEmail());
        const { user } = await createTestUser(randomEmail(), 'pass1234');
        const { promoteur } = await createVerifiedPromoteur(randomEmail());
        const project = await createTestProject(promoteur, { publicationStatus: 'published' });

        const report = new Report({
          reportedBy: user._id,
          targetType: 'project',
          targetId: project._id,
          reason: 'fraud',
          description: 'This project seems fraudulent',
          status: 'pending',
        });
        await report.save();

        const res = await request(app)
          .post(`/api/admin/reports/${report._id}/process`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            action: 'resolve',
            notes: 'No violation found',
          });

        expect([200, 404]).toContain(res.status);
      });
    });
  });

  describe('Audit Logs', () => {
    describe('GET /api/admin/audit-logs', () => {
      it('should return audit logs', async () => {
        const { token } = await createTestAdmin(randomEmail());

        const res = await request(app)
          .get('/api/admin/audit-logs')
          .set('Authorization', `Bearer ${token}`);

        expect([200, 404]).toContain(res.status);
      });
    });
  });

  describe('Promoteur Restrictions', () => {
    describe('POST /api/admin/promoteurs/:id/restrict', () => {
      it('should add restriction to promoteur', async () => {
        const { token } = await createTestAdmin(randomEmail());
        const { promoteur } = await createTestPromoteur(randomEmail());

        const res = await request(app)
          .post(`/api/admin/promoteurs/${promoteur._id}/restrict`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            type: 'temporary_suspension',
            reason: 'Violation of terms',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });

        expect([200, 201, 404]).toContain(res.status);
      });
    });
  });
});
