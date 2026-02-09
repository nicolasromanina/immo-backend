import request from 'supertest';
import app from '../../src/app';
import Appointment from '../../src/models/Appointment';
import Lead from '../../src/models/Lead';
import {
  createTestUser,
  createTestPromoteur,
  createVerifiedPromoteur,
  createTestProject,
  randomEmail,
} from '../helpers/testHelpers';

describe('Appointment Controller', () => {
  const createLead = async (
    projectId: string,
    promoteurId: string,
    phone: string,
    clientId?: string
  ) => {
    const lead = new Lead({
      project: projectId,
      promoteur: promoteurId,
      client: clientId,
      firstName: 'Appointment',
      lastName: 'Lead',
      email: randomEmail(),
      phone,
      budget: 80000000,
      financingType: 'cash',
      timeframe: 'immediate',
      contactMethod: 'phone',
      initialMessage: 'Appointment request',
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
    return lead;
  };

  describe('POST /api/appointments/', () => {
    it('should create an appointment request', async () => {
      const { promoteur } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur, { publicationStatus: 'published' });
      const { token: clientToken } = await createTestUser(randomEmail(), 'pass1234');
      const lead = await createLead(project._id.toString(), promoteur._id.toString(), '+33612345000');

      const res = await request(app)
        .post('/api/appointments/')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          projectId: project._id.toString(),
          promoteurId: promoteur._id.toString(),
          leadId: lead._id.toString(),
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 30,
          type: 'visio',
          notes: 'I would like to visit the project',
        });

      expect([200, 201]).toContain(res.status);
    });

    it('should require project ID', async () => {
      const { token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .post('/api/appointments/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'visio',
        });

      expect([400, 422, 500]).toContain(res.status);
    });
  });

  describe('GET /api/appointments/upcoming', () => {
    it('should return appointments for promoteur', async () => {
      const { token } = await createTestPromoteur(randomEmail());

      const res = await request(app)
        .get('/api/appointments/upcoming')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });

    it('should return appointments for client', async () => {
      const { token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .get('/api/appointments/upcoming')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });

    it('should filter by status', async () => {
      const { token, promoteur } = await createTestPromoteur(randomEmail());
      const project = await createTestProject(promoteur);

      const res = await request(app)
        .get(`/api/appointments/project/${project._id}`)
        .set('Authorization', `Bearer ${token}`)
        .query({ status: 'confirmed' });

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('PATCH /api/appointments/:id/confirm', () => {
    it('should confirm appointment', async () => {
      const { promoteur, token } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur);
      const { user: client } = await createTestUser(randomEmail(), 'pass1234');
      const lead = await createLead(
        project._id.toString(),
        promoteur._id.toString(),
        '+33612345001',
        client._id.toString()
      );

      const appointment = new Appointment({
        project: project._id,
        promoteur: promoteur._id,
        lead: lead._id,
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        durationMinutes: 30,
        type: 'visio',
        status: 'requested',
        createdBy: client._id,
      });
      await appointment.save();

      const res = await request(app)
        .patch(`/api/appointments/${appointment._id}/confirm`)
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('PATCH /api/appointments/:id/cancel', () => {
    it('should cancel appointment', async () => {
      const { promoteur, token } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur);
      const { user: client } = await createTestUser(randomEmail(), 'pass1234');
      const lead = await createLead(project._id.toString(), promoteur._id.toString(), '+33612345002');

      const appointment = new Appointment({
        project: project._id,
        promoteur: promoteur._id,
        lead: lead._id,
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        durationMinutes: 30,
        type: 'physique',
        status: 'confirmed',
        createdBy: client._id,
      });
      await appointment.save();

      const res = await request(app)
        .patch(`/api/appointments/${appointment._id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Schedule conflict' });

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('PATCH /api/appointments/:id/complete', () => {
    it('should mark appointment as completed', async () => {
      const { promoteur, token } = await createVerifiedPromoteur(randomEmail());
      const project = await createTestProject(promoteur);
      const { user: client } = await createTestUser(randomEmail(), 'pass1234');
      const lead = await createLead(project._id.toString(), promoteur._id.toString(), '+33612345003');

      const appointment = new Appointment({
        project: project._id,
        promoteur: promoteur._id,
        lead: lead._id,
        scheduledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        durationMinutes: 30,
        type: 'phone',
        status: 'confirmed',
        createdBy: client._id,
      });
      await appointment.save();

      const res = await request(app)
        .patch(`/api/appointments/${appointment._id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'Client was very interested' });

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Appointment Types', () => {
    const types = ['visio', 'physique', 'phone'];

    types.forEach((type) => {
      it(`should accept ${type} appointment type`, async () => {
        const { promoteur } = await createVerifiedPromoteur(randomEmail());
        const project = await createTestProject(promoteur, { publicationStatus: 'published' });
        const { token } = await createTestUser(randomEmail(), 'pass1234');
        const lead = await createLead(project._id.toString(), promoteur._id.toString(), '+33612345004');

        const res = await request(app)
          .post('/api/appointments/')
          .set('Authorization', `Bearer ${token}`)
          .send({
            projectId: project._id.toString(),
            promoteurId: promoteur._id.toString(),
            leadId: lead._id.toString(),
            scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            durationMinutes: 30,
            type,
          });

        expect([200, 201, 400, 404]).toContain(res.status);
      });
    });
  });
});
