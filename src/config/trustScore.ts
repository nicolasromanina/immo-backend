export type TrustScoreConfig = {
  promoteur: {
    kycVerified: number;
    kycSubmitted: number;
    onboarding: number;
    financial: { none: number; basic: number; medium: number; high: number };
    projectsMax: number;
    updatesMax: number;
    documentsMax: number;
    responseMax: number;
    badgesMax: number;
    restrictionPenalty: number;
  };
  project: {
    infoMax: number;
    updatesMax: number;
    documentsMax: number;
    transparencyMax: number;
    engagementMax: number;
    penalties: { changesLog: number; suspended: number };
    typeThresholds: {
      villa: { minPhotos: number };
      immeuble: { minPhotos: number };
    };
  };
};

const defaults: TrustScoreConfig = {
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

let envConfig: any = {};
if (process.env.TRUST_SCORE_CONFIG) {
  try {
    envConfig = JSON.parse(process.env.TRUST_SCORE_CONFIG);
  } catch {
    envConfig = {};
  }
}

export const trustScoreConfig: TrustScoreConfig = {
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
