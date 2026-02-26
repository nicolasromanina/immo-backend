"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_HIERARCHY = exports.PLAN_CAPABILITIES = exports.PLAN_LIMITS = void 0;
exports.normalizePlan = normalizePlan;
exports.PLAN_LIMITS = {
    starter: {
        maxProjects: 1,
        maxActiveProjects: 1,
        maxTeamMembers: 1,
        maxUpdatesPerMonth: 4,
        maxMediaPerProject: 5,
        maxDocuments: 3,
        maxVideos: 0,
    },
    publie: {
        maxProjects: 1,
        maxActiveProjects: 1,
        maxTeamMembers: 2,
        maxUpdatesPerMonth: 20,
        maxMediaPerProject: 15,
        maxDocuments: 20,
        maxVideos: 2,
    },
    verifie: {
        maxProjects: 2,
        maxActiveProjects: 2,
        maxTeamMembers: 3,
        maxUpdatesPerMonth: -1, // unlimited
        maxMediaPerProject: -1, // unlimited
        maxDocuments: -1, // unlimited
        maxVideos: -1, // unlimited
    },
    partenaire: {
        maxProjects: 3,
        maxActiveProjects: 3,
        maxTeamMembers: 5,
        maxUpdatesPerMonth: -1,
        maxMediaPerProject: -1,
        maxDocuments: -1,
        maxVideos: -1,
    },
    enterprise: {
        maxProjects: -1, // unlimited
        maxActiveProjects: -1,
        maxTeamMembers: -1,
        maxUpdatesPerMonth: -1,
        maxMediaPerProject: -1,
        maxDocuments: -1,
        maxVideos: -1,
    },
};
exports.PLAN_CAPABILITIES = {
    starter: {
        leadScoring: false,
        leadPipeline: false,
        leadExport: false,
        calendarAppointments: false,
        whatsAppTemplates: false,
        dataRoom: false,
        templateLibrary: false,
        advancedAnalytics: false,
        managedService: false,
        crmIntegration: false,
        abTesting: false,
        adsCampaigns: false,
        featuredPlacement: false,
        brochureAnalytics: false,
        autoBrochure: false,
        enterpriseContracts: false,
        geoVerification: false,
        mediaAccess: true,
        travelPlanning: false,
        promoterAssistant: false,
    },
    publie: {
        leadScoring: false,
        leadPipeline: false,
        leadExport: false,
        calendarAppointments: false,
        whatsAppTemplates: false,
        dataRoom: false,
        templateLibrary: false,
        advancedAnalytics: false,
        managedService: false,
        crmIntegration: false,
        abTesting: false,
        adsCampaigns: false,
        featuredPlacement: false,
        brochureAnalytics: true,
        autoBrochure: true,
        enterpriseContracts: false,
        geoVerification: false,
        mediaAccess: true,
        travelPlanning: false,
        promoterAssistant: true,
    },
    verifie: {
        leadScoring: true,
        leadPipeline: true,
        leadExport: true,
        calendarAppointments: true,
        whatsAppTemplates: true,
        dataRoom: true,
        templateLibrary: true,
        advancedAnalytics: true,
        managedService: false,
        crmIntegration: false,
        abTesting: true,
        adsCampaigns: true,
        featuredPlacement: true,
        brochureAnalytics: true,
        autoBrochure: true,
        enterpriseContracts: false,
        geoVerification: true,
        mediaAccess: true,
        travelPlanning: true,
        promoterAssistant: true,
    },
    partenaire: {
        leadScoring: true,
        leadPipeline: true,
        leadExport: true,
        calendarAppointments: true,
        whatsAppTemplates: true,
        dataRoom: true,
        templateLibrary: true,
        advancedAnalytics: true,
        managedService: true,
        crmIntegration: true,
        abTesting: true,
        adsCampaigns: true,
        featuredPlacement: true,
        brochureAnalytics: true,
        autoBrochure: true,
        enterpriseContracts: true,
        geoVerification: true,
        mediaAccess: true,
        travelPlanning: true,
        promoterAssistant: true,
    },
    enterprise: {
        leadScoring: true,
        leadPipeline: true,
        leadExport: true,
        calendarAppointments: true,
        whatsAppTemplates: true,
        dataRoom: true,
        templateLibrary: true,
        advancedAnalytics: true,
        managedService: true,
        crmIntegration: true,
        abTesting: true,
        adsCampaigns: true,
        featuredPlacement: true,
        brochureAnalytics: true,
        autoBrochure: true,
        enterpriseContracts: true,
        geoVerification: true,
        mediaAccess: true,
        travelPlanning: true,
        promoterAssistant: true,
    },
};
const PLAN_IDS = ['starter', 'publie', 'verifie', 'partenaire', 'enterprise'];
function normalizePlan(plan) {
    if (!plan)
        return 'starter';
    if (PLAN_IDS.includes(plan))
        return plan;
    if (plan === 'standard')
        return 'starter';
    if (plan === 'premium')
        return 'enterprise';
    return 'starter';
}
exports.PLAN_HIERARCHY = {
    starter: 0,
    publie: 1,
    verifie: 2,
    partenaire: 3,
    enterprise: 4,
};
