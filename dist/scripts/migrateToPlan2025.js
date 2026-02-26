"use strict";
/**
 * Migration script: remplace les 3 plans mensuels par les 5 plans annuels First Immo 2025
 *
 * Mapping:
 *   basique  → publie
 *   standard → verifie
 *   premium  → partenaire
 *
 * Usage:
 *   Dry-run (par défaut) :  ts-node src/scripts/migrateToPlan2025.ts
 *   Exécution réelle     :  ts-node src/scripts/migrateToPlan2025.ts --execute
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MAPPING = {
    basique: 'publie',
    standard: 'verifie',
    premium: 'partenaire',
};
const DRY_RUN = !process.argv.includes('--execute');
async function run() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI / MONGO_URI env var is required');
    }
    console.log(`\n🔍 Mode: ${DRY_RUN ? 'DRY-RUN (aucune donnée modifiée)' : '⚠️  EXECUTE (modifications en base)'}`);
    console.log('Connecting to MongoDB...');
    await mongoose_1.default.connect(mongoUri);
    console.log('Connected.\n');
    const db = mongoose_1.default.connection.db;
    // ─── 1. Promoteur ─────────────────────────────────────────────────────────
    let promoteurUpdated = 0;
    for (const [oldPlan, newPlan] of Object.entries(MAPPING)) {
        const count = await db.collection('promoteurs').countDocuments({ plan: oldPlan });
        console.log(`[Promoteur] plan="${oldPlan}" → "${newPlan}" : ${count} document(s)`);
        if (!DRY_RUN && count > 0) {
            const result = await db.collection('promoteurs').updateMany({ plan: oldPlan }, { $set: { plan: newPlan, isLegacyPlan: true } });
            promoteurUpdated += result.modifiedCount;
        }
    }
    // ─── 2. Subscription ──────────────────────────────────────────────────────
    let subscriptionUpdated = 0;
    for (const [oldPlan, newPlan] of Object.entries(MAPPING)) {
        const count = await db.collection('subscriptions').countDocuments({ plan: oldPlan });
        console.log(`[Subscription] plan="${oldPlan}" → "${newPlan}" : ${count} document(s)`);
        if (!DRY_RUN && count > 0) {
            const result = await db.collection('subscriptions').updateMany({ plan: oldPlan }, { $set: { plan: newPlan, billingInterval: 'year' } });
            subscriptionUpdated += result.modifiedCount;
        }
    }
    // ─── 3. planChangeRequest.requestedPlan ───────────────────────────────────
    let planRequestUpdated = 0;
    for (const [oldPlan, newPlan] of Object.entries(MAPPING)) {
        const count = await db.collection('promoteurs').countDocuments({
            'planChangeRequest.requestedPlan': oldPlan,
        });
        console.log(`[Promoteur.planChangeRequest] requestedPlan="${oldPlan}" → "${newPlan}" : ${count} document(s)`);
        if (!DRY_RUN && count > 0) {
            const result = await db.collection('promoteurs').updateMany({ 'planChangeRequest.requestedPlan': oldPlan }, { $set: { 'planChangeRequest.requestedPlan': newPlan } });
            planRequestUpdated += result.modifiedCount;
        }
    }
    // ─── Résumé ───────────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (DRY_RUN) {
        console.log('✅ Dry-run terminé — aucune modification effectuée.');
        console.log('   Relancez avec --execute pour appliquer la migration.');
    }
    else {
        console.log(`✅ Migration terminée.`);
        console.log(`   Promoteurs mis à jour         : ${promoteurUpdated}`);
        console.log(`   Subscriptions mises à jour    : ${subscriptionUpdated}`);
        console.log(`   planChangeRequests mis à jour : ${planRequestUpdated}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    await mongoose_1.default.disconnect();
}
run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
