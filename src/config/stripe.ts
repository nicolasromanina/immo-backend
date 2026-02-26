import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia' as any, // Forcer la version
});

// Devise de la plateforme
export const PLATFORM_CURRENCY = (process.env.PLATFORM_CURRENCY || 'eur').toLowerCase();

// Intervalle de facturation : annuel
export const BILLING_INTERVAL = 'year' as const;

// Prix des plans d'abonnement annuels (en centimes EUR)
export const SUBSCRIPTION_PRICES: Record<string, number> = {
  starter:    Number(process.env.PRICE_STARTER)    || 60000,   // 600€/an
  publie:     Number(process.env.PRICE_PUBLIE)     || 150000,  // 1 500€/an
  verifie:    Number(process.env.PRICE_VERIFIE)    || 420000,  // 4 200€/an
  partenaire: Number(process.env.PRICE_PARTENAIRE) || 720000,  // 7 200€/an
  enterprise: 0, // Sur devis
};

// Frais de setup one-shot facturés à la première facture (en centimes EUR)
export const SETUP_FEES: Record<string, number> = {
  starter:    0,
  publie:     0,
  verifie:    80000,   // 800€
  partenaire: 250000,  // 2 500€
  enterprise: 0,
};

// Prix des boosts (en centimes EUR)
export const BOOST_PRICES: Record<string, number> = {
  basic: Number(process.env.PRICE_BOOST_BASIC) || 3000,         // 30€
  premium: Number(process.env.PRICE_BOOST_PREMIUM) || 6000,     // 60€
  enterprise: Number(process.env.PRICE_BOOST_ENTERPRISE) || 12000, // 120€
};

// Prix pour devenir promoteur - abonnements annuels (en centimes EUR)
export const BECOME_PROMOTEUR_PRICES: Record<string, number> = {
  starter:    Number(process.env.PRICE_STARTER)    || 60000,
  publie:     Number(process.env.PRICE_PUBLIE)     || 150000,
  verifie:    Number(process.env.PRICE_VERIFIE)    || 420000,
  partenaire: Number(process.env.PRICE_PARTENAIRE) || 720000,
  enterprise: 0,
};
