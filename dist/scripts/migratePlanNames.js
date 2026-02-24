"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const Subscription_1 = __importDefault(require("../models/Subscription"));
const User_1 = __importDefault(require("../models/User"));
const db_1 = require("../config/db");
/**
 * Migration: Rename plan values
 *   publie  → basique
 *   verifie → standard
 *
 * Also updates planChangeRequest.requestedPlan if present.
 */
async function migratePlanNames() {
    await (0, db_1.connectDB)();
    console.log('=== Migration des noms de plans ===\n');
    // 1. Promoteur.plan
    const promo1 = await Promoteur_1.default.updateMany({ plan: 'publie' }, { $set: { plan: 'basique' } });
    console.log(`Promoteur plan publie → basique : ${promo1.modifiedCount}`);
    const promo2 = await Promoteur_1.default.updateMany({ plan: 'verifie' }, { $set: { plan: 'standard' } });
    console.log(`Promoteur plan verifie → standard : ${promo2.modifiedCount}`);
    // 2. Promoteur.planChangeRequest.requestedPlan
    const pcr1 = await Promoteur_1.default.updateMany({ 'planChangeRequest.requestedPlan': 'publie' }, { $set: { 'planChangeRequest.requestedPlan': 'basique' } });
    console.log(`PlanChangeRequest publie → basique : ${pcr1.modifiedCount}`);
    const pcr2 = await Promoteur_1.default.updateMany({ 'planChangeRequest.requestedPlan': 'verifie' }, { $set: { 'planChangeRequest.requestedPlan': 'standard' } });
    console.log(`PlanChangeRequest verifie → standard : ${pcr2.modifiedCount}`);
    // 3. Subscription.plan
    const sub1 = await Subscription_1.default.updateMany({ plan: 'publie' }, { $set: { plan: 'basique' } });
    console.log(`Subscription plan publie → basique : ${sub1.modifiedCount}`);
    const sub2 = await Subscription_1.default.updateMany({ plan: 'verifie' }, { $set: { plan: 'standard' } });
    console.log(`Subscription plan verifie → standard : ${sub2.modifiedCount}`);
    // 4. Show summary for specific user if email arg provided
    const email = process.argv[2];
    if (email) {
        const user = await User_1.default.findOne({ email }).populate('promoteurProfile');
        if (user) {
            const promoteur = await Promoteur_1.default.findOne({ user: user._id });
            console.log(`\n--- Utilisateur: ${email} ---`);
            console.log(`  Roles: ${user.roles}`);
            console.log(`  Promoteur: ${promoteur ? 'oui' : 'non'}`);
            if (promoteur) {
                console.log(`  Plan: ${promoteur.plan}`);
                console.log(`  Status: ${promoteur.subscriptionStatus}`);
                console.log(`  Compliance: ${promoteur.complianceStatus}`);
            }
        }
        else {
            console.log(`\nUtilisateur ${email} non trouvé.`);
        }
    }
    console.log('\n=== Migration terminée ===');
}
migratePlanNames()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error('Erreur migration:', err);
    process.exit(1);
});
