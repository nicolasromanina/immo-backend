import request from 'supertest';
import app from '../../src/app';
import Promoteur from '../../src/models/Promoteur';
import {
  createTestPromoteur,
  randomEmail,
} from '../helpers/testHelpers';

// Configure stripe mocks at runtime (avoid interfering with other tests)
const setupStripeMocks = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const stripeModule = require('../../src/config/stripe');

  // Ensure checkout.sessions.create exists
  if (!stripeModule.stripe.checkout) stripeModule.stripe.checkout = {};
  if (!stripeModule.stripe.checkout.sessions) stripeModule.stripe.checkout.sessions = {};
  stripeModule.stripe.checkout.sessions.create = jest.fn(async (opts: any) => ({ id: 'cs_test_123', url: 'https://checkout.test/session/cs_test_123' }));

  // Mock customers.create to avoid real Stripe calls
  stripeModule.stripe.customers = stripeModule.stripe.customers || {};
  stripeModule.stripe.customers.create = jest.fn(async (data: any) => ({ id: 'cus_test_123' }));

  // Mock subscriptions.retrieve
  stripeModule.stripe.subscriptions = stripeModule.stripe.subscriptions || {};
  stripeModule.stripe.subscriptions.retrieve = jest.fn(async (id: string) => ({
    id: 'sub_123',
    status: 'active',
    items: { data: [{ price: { id: 'price_1' } }] },
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
  }));

  // Mock webhooks.constructEvent to simply return the parsed body
  stripeModule.stripe.webhooks = stripeModule.stripe.webhooks || {};
  stripeModule.stripe.webhooks.constructEvent = jest.fn((rawBody: any) => JSON.parse(rawBody.toString()));

  // Ensure price constants exist
  stripeModule.SUBSCRIPTION_PRICES = stripeModule.SUBSCRIPTION_PRICES || { basique: 2000, standard: 10000, premium: 25000 };
};

describe('Promoteur plan change (upgrade) integration', () => {
  beforeEach(() => {
    setupStripeMocks();
  });
  it('POST /api/promoteurs/upgrade should return checkout url', async () => {
    const { token, promoteur } = await createTestPromoteur(randomEmail());

    const res = await request(app)
      .post('/api/promoteurs/upgrade')
      .set('Authorization', `Bearer ${token}`)
      .send({ newPlan: 'standard' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(typeof res.body.url).toBe('string');
  });

  it('Webhook checkout.session.completed should apply upgrade', async () => {
    // Create promoteur in DB
    const { token, promoteur } = await createTestPromoteur(randomEmail());

    const fakeEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          amount_total: 10000,
          currency: 'eur',
          payment_intent: 'pi_123',
          metadata: {
            paymentType: 'upgrade',
            userId: promoteur.user.toString(),
            promoteurId: promoteur._id.toString(),
            upgradeFrom: promoteur.plan || 'basique',
            upgradeTo: 'standard',
          },
        },
      },
    };

    process.env.STRIPE_WEBHOOK_SECRET = 'test_secret';

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=123,v1=signature')
      .send(JSON.stringify(fakeEvent));

    expect([200, 201]).toContain(res.status);

    // Verify promoteur plan updated
    const updated = await Promoteur.findById(promoteur._id);
    expect(updated).not.toBeNull();
    expect(updated!.plan).toBe('standard');
    expect(updated!.subscriptionStatus).toBe('active');
  });

  it('POST /api/promoteurs/plan/downgrade should create a plan change request and admin can apply it', async () => {
    const { token, promoteur } = await createTestPromoteur(randomEmail());

    // Request downgrade
    const res = await request(app)
      .post('/api/promoteurs/plan/downgrade')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetPlan: 'basique' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('planChangeRequest');
    expect(res.body.planChangeRequest.requestType).toBe('downgrade');
    expect(res.body.planChangeRequest.requestedPlan).toBe('basique');

    // Admin applies the change
    const admin = await (await import('../helpers/testHelpers')).createTestAdmin();
    const applyRes = await request(app)
      .post(`/api/admin/promoteurs/${promoteur._id}/apply-plan-change`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ approve: true });

    expect(applyRes.status).toBe(200);
    expect(applyRes.body.promoteur.plan).toBe('basique');
    expect(applyRes.body.promoteur.planChangeRequest.status).toBe('approved');
  });
});
