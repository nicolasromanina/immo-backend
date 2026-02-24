"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BECOME_PROMOTEUR_PRICES = exports.BOOST_PRICES = exports.SUBSCRIPTION_PRICES = exports.PLATFORM_CURRENCY = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}
exports.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia', // Forcer la version
});
// Devise de la plateforme
exports.PLATFORM_CURRENCY = (process.env.PLATFORM_CURRENCY || 'eur').toLowerCase();
// Prix des plans d'abonnement (en centimes EUR)
exports.SUBSCRIPTION_PRICES = {
    basique: Number(process.env.PRICE_BASIQUE) || 2000, // 20€/mois
    standard: Number(process.env.PRICE_STANDARD) || 10000, // 100€/mois
    premium: Number(process.env.PRICE_PREMIUM) || 25000, // 250€/mois
};
// Prix des boosts (en centimes EUR)
exports.BOOST_PRICES = {
    basic: Number(process.env.PRICE_BOOST_BASIC) || 3000, // 30€
    premium: Number(process.env.PRICE_BOOST_PREMIUM) || 6000, // 60€
    enterprise: Number(process.env.PRICE_BOOST_ENTERPRISE) || 12000, // 120€
};
// Prix pour devenir promoteur - abonnements mensuels (en centimes EUR)
exports.BECOME_PROMOTEUR_PRICES = {
    basique: Number(process.env.PRICE_PROMOTEUR_BASIQUE) || 2000, // 20€
    standard: Number(process.env.PRICE_PROMOTEUR_STANDARD) || 10000, // 100€
    premium: Number(process.env.PRICE_PROMOTEUR_PREMIUM) || 25000, // 250€
};
