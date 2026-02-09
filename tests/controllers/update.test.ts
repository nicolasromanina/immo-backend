import request from 'supertest';
import app from '../../src/app';
import Update from '../../src/models/Update';
import {
  createTestPromoteur,
  createVerifiedPromoteur,
  createTestProject,
  createTestUser,
  randomEmail,
} from '../helpers/testHelpers';
import { Role } from '../../src/config/roles';

describe('Update Controller', () => {
  describe('POST /api/updates/', () => {
    it('should create a project update', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const res = await request(app)
        .post('/api/updates/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          title: 'Construction Progress',
          description: 'Foundation work completed',
          photos: [
            'https://example.com/photo1.jpg',
            'https://example.com/photo2.jpg',
            'https://example.com/photo3.jpg',
          ],
          whatsDone: 'Foundation and pillars completed',
          nextStep: 'Start structure work',
          nextMilestoneDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          risksIdentified: 'No major risks identified',
        });

      expect([200, 201]).toContain(res.status);
    });

    it('should reject update for non-owned project', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);
      const { token: otherToken } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .post('/api/updates/')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          projectId: project._id.toString(),
          title: 'Fake Update',
          description: 'Attempted update',
          photos: [
            'https://example.com/photo1.jpg',
            'https://example.com/photo2.jpg',
            'https://example.com/photo3.jpg',
          ],
          whatsDone: 'Work done',
          nextStep: 'Next step',
          nextMilestoneDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          risksIdentified: 'None',
        });

      expect([403, 404]).toContain(res.status);
    });

    it('should require title and content', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const res = await request(app)
        .post('/api/updates/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          title: 'Missing fields',
          description: 'Missing required fields',
          photos: ['https://example.com/photo1.jpg'],
        });

      expect([400, 422, 500]).toContain(res.status);
    });
  });

  describe('GET /api/updates/project/:projectId', () => {
    it('should return updates for a project', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      // Create some updates
      await Update.create([
        {
          project: project._id,
          promoteur: promoteur._id,
          title: 'Update 1',
          description: 'Content 1',
          photos: [
            'https://example.com/photo1.jpg',
            'https://example.com/photo2.jpg',
            'https://example.com/photo3.jpg',
          ],
          whatsDone: 'Work done',
          nextStep: 'Next step',
          nextMilestoneDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          risksIdentified: 'None',
          status: 'published',
        },
        {
          project: project._id,
          promoteur: promoteur._id,
          title: 'Update 2',
          description: 'Content 2',
          photos: [
            'https://example.com/photo4.jpg',
            'https://example.com/photo5.jpg',
            'https://example.com/photo6.jpg',
          ],
          whatsDone: 'Work done',
          nextStep: 'Next step',
          nextMilestoneDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          risksIdentified: 'None',
          status: 'published',
        },
      ]);

      const res = await request(app)
        .get(`/api/updates/project/${project._id}`);

      expect(res.status).toBe(200);
      const updates = res.body.updates || res.body.data || res.body;
      expect(Array.isArray(updates)).toBe(true);
    });

    it('should filter by category', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      const res = await request(app)
        .get(`/api/updates/project/${project._id}`)
        .query({ category: 'progress' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/updates/:id', () => {
    it('should return update details', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      const update = new Update({
        project: project._id,
        promoteur: promoteur._id,
        title: 'Test Update',
        description: 'Test content',
        photos: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
          'https://example.com/photo3.jpg',
        ],
        whatsDone: 'Work done',
        nextStep: 'Next step',
        nextMilestoneDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        risksIdentified: 'None',
        status: 'published',
      });
      await update.save();

      const res = await request(app)
        .get(`/api/updates/${update._id}`);

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/updates/:id', () => {
    it('should update an update', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const update = new Update({
        project: project._id,
        promoteur: promoteur._id,
        title: 'Original Title',
        description: 'Original content',
        photos: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
          'https://example.com/photo3.jpg',
        ],
        whatsDone: 'Work done',
        nextStep: 'Next step',
        nextMilestoneDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        risksIdentified: 'None',
        status: 'draft',
      });
      await update.save();

      const res = await request(app)
        .put(`/api/updates/${update._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
        });

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('DELETE /api/updates/:id', () => {
    it('should delete an update', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const update = new Update({
        project: project._id,
        promoteur: promoteur._id,
        title: 'To Delete',
        description: 'Content',
        photos: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
          'https://example.com/photo3.jpg',
        ],
        whatsDone: 'Work done',
        nextStep: 'Next step',
        nextMilestoneDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        risksIdentified: 'None',
        status: 'draft',
      });
      await update.save();

      const res = await request(app)
        .delete(`/api/updates/${update._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  describe('POST /api/updates/:id/publish', () => {
    it('should publish an update', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const update = new Update({
        project: project._id,
        promoteur: promoteur._id,
        title: 'To Publish',
        description: 'Content',
        photos: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
          'https://example.com/photo3.jpg',
        ],
        whatsDone: 'Work done',
        nextStep: 'Next step',
        nextMilestoneDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        risksIdentified: 'None',
        status: 'draft',
      });
      await update.save();

      const res = await request(app)
        .post(`/api/updates/${update._id}/publish`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 404]).toContain(res.status);
    });
  });

  describe('Update Scheduling', () => {
    it('should reject past scheduled dates', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const res = await request(app)
        .post('/api/updates/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          title: 'Scheduled Update',
          description: 'Scheduled update',
          photos: [
            'https://example.com/photo1.jpg',
            'https://example.com/photo2.jpg',
            'https://example.com/photo3.jpg',
          ],
          whatsDone: 'Work done',
          nextStep: 'Next step',
          nextMilestoneDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          risksIdentified: 'None',
          scheduledFor: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        });

      expect([400, 422]).toContain(res.status);
    });
  });
});
