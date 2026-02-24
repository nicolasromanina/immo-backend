"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTrustScoreRecalculationJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const AdvancedTrustScoreService_1 = require("../services/AdvancedTrustScoreService");
const startTrustScoreRecalculationJob = () => {
    if (process.env.TRUST_SCORE_CRON_ENABLED === 'false') {
        return;
    }
    const schedule = process.env.TRUST_SCORE_CRON || '0 2 * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            console.log('[Job] Trust score recalculation running...');
            const updated = await AdvancedTrustScoreService_1.AdvancedTrustScoreService.recalculateAllScores();
            console.log(`[Job] Trust scores recalculated: ${updated} promoteurs`);
        }
        catch (error) {
            console.error('Trust score recalculation job failed:', error);
        }
    });
};
exports.startTrustScoreRecalculationJob = startTrustScoreRecalculationJob;
