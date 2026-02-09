require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');
const Stripe = require('stripe');

async function main() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET missing in .env');
    process.exit(1);
  }

  // Use a test stripe instance (key not required for header generation)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', { apiVersion: '2020-08-27' });

  const session = {
    id: 'cs_test_upgrade_12345',
    object: 'checkout.session',
    customer: 'cus_TwlRvuDSMe890d',
    mode: 'payment',
    payment_status: 'paid',
    amount_total: 10000,
    currency: 'eur',
    payment_intent: 'pi_test_upgrade_12345',
    metadata: {
      userId: '69889ee79994df7b89a7b606',
      promoteurId: '6988b3d6e68ca163a8b7d8ee',
      upgradeFrom: 'basique',
      upgradeTo: 'standard',
      paymentType: 'upgrade'
    }
  };

  const payload = JSON.stringify({ id: 'evt_test_1', object: 'event', type: 'checkout.session.completed', data: { object: session } });

  // Generate a test signature header (uses current time)
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });

  console.log('Sending webhook to http://localhost:5000/api/payments/webhook');
  console.log('Header:', header);

  try {
    const resp = await axios.post('http://localhost:5000/api/payments/webhook', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': header,
      },
      timeout: 10000,
    });
    console.log('Webhook response status:', resp.status);
    console.log('Response data:', resp.data);
  } catch (err) {
    if (err.response) {
      console.error('Webhook POST failed:', err.response.status, err.response.data);
    } else {
      console.error('Webhook POST error:', err.message);
    }
    process.exit(1);
  }
}

main();