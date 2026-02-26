"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BECOME_PROMOTEUR_PRICES = exports.BOOST_PRICES = exports.SETUP_FEES = exports.SUBSCRIPTION_PRICES = exports.BILLING_INTERVAL = exports.PLATFORM_CURRENCY = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}
exports.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia', // Forcer la version
});
// Devise de la plateforme
exports.PLATFORM_CURRENCY = (process.env.PLATFORM_CURRENCY || 'eur').toLowerCase();
// Intervalle de facturation : annuel
exports.BILLING_INTERVAL = 'year';
// Prix des plans d'abonnement annuels (en centimes EUR)
exports.SUBSCRIPTION_PRICES = {
    starter: Number(process.env.PRICE_STARTER) || 60000, // 600€/an
    publie: Number(process.env.PRICE_PUBLIE) || 150000, // 1 500€/an
    verifie: Number(process.env.PRICE_VERIFIE) || 420000, // 4 200€/an
    partenaire: Number(process.env.PRICE_PARTENAIRE) || 720000, // 7 200€/an
    enterprise: 0, // Sur devis
};
// Frais de setup one-shot facturés à la première facture (en centimes EUR)
exports.SETUP_FEES = {
    starter: 0,
    publie: 0,
    verifie: 80000, // 800€
    partenaire: 250000, // 2 500€
    enterprise: 0,
};
// Prix des boosts (en centimes EUR)
exports.BOOST_PRICES = {
    basic: Number(process.env.PRICE_BOOST_BASIC) || 3000, // 30€
    premium: Number(process.env.PRICE_BOOST_PREMIUM) || 6000, // 60€
    enterprise: Number(process.env.PRICE_BOOST_ENTERPRISE) || 12000, // 120€
};
// Prix pour devenir promoteur - abonnements annuels (en centimes EUR)
exports.BECOME_PROMOTEUR_PRICES = {
    starter: Number(process.env.PRICE_STARTER) || 60000,
    publie: Number(process.env.PRICE_PUBLIE) || 150000,
    verifie: Number(process.env.PRICE_VERIFIE) || 420000,
    partenaire: Number(process.env.PRICE_PARTENAIRE) || 720000,
    enterprise: 0,
};
