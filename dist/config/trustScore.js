"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trustScoreConfig = void 0;
const defaults = {
    promoteur: {
        kycVerified: 20,
        kycSubmitted: 10,
        onboarding: 10,
        financial: { none: 0, basic: 5, medium: 10, high: 15 },
        projectsMax: 10,
        updatesMax: 10,
        documentsMax: 15,
        responseMax: 10,
        badgesMax: 10,
        restrictionPenalty: 5,
    },
    project: {
        infoMax: 20,
        updatesMax: 30,
        documentsMax: 25,
        transparencyMax: 15,
        engagementMax: 10,
        penalties: { changesLog: 5, suspended: 30 },
        typeThresholds: {
            villa: { minPhotos: 3 },
            immeuble: { minPhotos: 3 },
        },
    },
};
let envConfig = {};
if (process.env.TRUST_SCORE_CONFIG) {
    try {
        envConfig = JSON.parse(process.env.TRUST_SCORE_CONFIG);
    }
    catch {
        envConfig = {};
    }
}
exports.trustScoreConfig = {
    ...defaults,
    ...envConfig,
    promoteur: { ...defaults.promoteur, ...(envConfig.promoteur || {}) },
    project: {
        ...defaults.project,
        ...(envConfig.project || {}),
        penalties: { ...defaults.project.penalties, ...((envConfig.project || {}).penalties || {}) },
        typeThresholds: { ...defaults.project.typeThresholds, ...((envConfig.project || {}).typeThresholds || {}) },
    },
};
