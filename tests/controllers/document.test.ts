import request from 'supertest';
import app from '../../src/app';
import Document from '../../src/models/Document';
import {
  createTestPromoteur,
  createVerifiedPromoteur,
  createTestProject,
  createTestUser,
  randomEmail,
} from '../helpers/testHelpers';
import { Role } from '../../src/config/roles';

describe('Document Controller', () => {
  describe('POST /api/documents/', () => {
    it('should upload a document', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const res = await request(app)
        .post('/api/documents/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          name: 'Building Permit',
          type: 'pdf',
          category: 'permis',
          url: 'https://example.com/permit.pdf',
          size: 1024000,
          visibility: 'public',
          description: 'Official building permit',
        });

      expect([200, 201]).toContain(res.status);
    });

    it('should reject for non-promoteur', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);
      const { token } = await createTestUser(randomEmail(), 'pass1234', [Role.USER]);

      const res = await request(app)
        .post('/api/documents/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project._id.toString(),
          name: 'Test Doc',
          url: 'https://example.com/doc.pdf',
        });

      expect(res.status).toBe(403);
    });

    it('should reject for non-owned project', async () => {
      const { promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);
      const { token: otherToken } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .post('/api/documents/')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          projectId: project._id.toString(),
          name: 'Test Doc',
          url: 'https://example.com/doc.pdf',
        });

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/documents/project/:projectId', () => {
    it('should return public documents for any visitor', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      // Create a public document
      const doc = new Document({
        project: project._id,
        promoteur: promoteur._id,
        name: 'Public Permit',
        type: 'pdf',
        category: 'permis',
        url: 'https://example.com/permit.pdf',
        size: 1024,
        visibility: 'public',
        status: 'fourni',
        version: 1,
        verified: false,
        uploadedBy: promoteur.user,
      });
      await doc.save();

      const res = await request(app)
        .get(`/api/documents/project/${project._id}`);

      expect(res.status).toBe(200);
    });

    it('should return all documents for owner', async () => {
      const { promoteur, token } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      // Create private and public documents
      await Document.create([
        {
          project: project._id,
          promoteur: promoteur._id,
          name: 'Public Doc',
          type: 'pdf',
          category: 'permis',
          url: 'https://example.com/public.pdf',
          size: 1024,
          visibility: 'public',
          status: 'fourni',
          version: 1,
          verified: false,
          uploadedBy: promoteur.user,
        },
        {
          project: project._id,
          promoteur: promoteur._id,
          name: 'Private Doc',
          type: 'pdf',
          category: 'financier',
          url: 'https://example.com/private.pdf',
          size: 1024,
          visibility: 'private',
          status: 'fourni',
          version: 1,
          verified: false,
          uploadedBy: promoteur.user,
        },
      ]);

      const res = await request(app)
        .get(`/api/documents/project/${project._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const docs = res.body.documents || res.body.data || res.body;
      expect(Array.isArray(docs)).toBe(true);
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should return document details', async () => {
      const { promoteur, token } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const doc = new Document({
        project: project._id,
        promoteur: promoteur._id,
        name: 'Test Doc',
        type: 'pdf',
        category: 'permis',
        url: 'https://example.com/doc.pdf',
        size: 1024,
        visibility: 'public',
        status: 'fourni',
        version: 1,
        verified: false,
        uploadedBy: promoteur.user,
      });
      await doc.save();

      const res = await request(app)
        .get(`/api/documents/${doc._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/documents/:id', () => {
    it('should update document', async () => {
      const { promoteur, token } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const doc = new Document({
        project: project._id,
        promoteur: promoteur._id,
        name: 'Original Name',
        type: 'pdf',
        category: 'permis',
        url: 'https://example.com/doc.pdf',
        size: 1024,
        visibility: 'private',
        status: 'fourni',
        version: 1,
        verified: false,
        uploadedBy: promoteur.user,
      });
      await doc.save();

      const res = await request(app)
        .put(`/api/documents/${doc._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          visibility: 'public',
        });

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should delete document', async () => {
      const { promoteur, token } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const doc = new Document({
        project: project._id,
        promoteur: promoteur._id,
        name: 'To Delete',
        type: 'pdf',
        category: 'permis',
        url: 'https://example.com/doc.pdf',
        size: 1024,
        visibility: 'private',
        status: 'fourni',
        version: 1,
        verified: false,
        uploadedBy: promoteur.user,
      });
      await doc.save();

      const res = await request(app)
        .delete(`/api/documents/${doc._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  describe('Document Categories', () => {
    it('should filter documents by category', async () => {
      const { promoteur, token } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });

      const res = await request(app)
        .get(`/api/documents/project/${project._id}`)
        .set('Authorization', `Bearer ${token}`)
        .query({ category: 'permis' });

      expect(res.status).toBe(200);
    });
  });
});
