import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia' as any, // Forcer la version
});

// Devise de la plateforme
export const PLATFORM_CURRENCY = (process.env.PLATFORM_CURRENCY || 'eur').toLowerCase();

// Prix des plans d'abonnement (en centimes EUR)
export const SUBSCRIPTION_PRICES: Record<string, number> = {
  basique: Number(process.env.PRICE_BASIQUE) || 2000,      // 20€/mois
  standard: Number(process.env.PRICE_STANDARD) || 10000,   // 100€/mois
  premium: Number(process.env.PRICE_PREMIUM) || 25000,     // 250€/mois
};

// Prix des boosts (en centimes EUR)
export const BOOST_PRICES: Record<string, number> = {
  basic: Number(process.env.PRICE_BOOST_BASIC) || 3000,         // 30€
  premium: Number(process.env.PRICE_BOOST_PREMIUM) || 6000,     // 60€
  enterprise: Number(process.env.PRICE_BOOST_ENTERPRISE) || 12000, // 120€
};

// Prix pour devenir promoteur - abonnements mensuels (en centimes EUR)
export const BECOME_PROMOTEUR_PRICES: Record<string, number> = {
  basique: Number(process.env.PRICE_PROMOTEUR_BASIQUE) || 2000,    // 20€
  standard: Number(process.env.PRICE_PROMOTEUR_STANDARD) || 10000, // 100€
  premium: Number(process.env.PRICE_PROMOTEUR_PREMIUM) || 25000,   // 250€
};
