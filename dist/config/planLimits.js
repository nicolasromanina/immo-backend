"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_LIMITS = void 0;
exports.PLAN_LIMITS = {
    basique: {
        maxProjects: 1,
        maxActiveProjects: 1,
        maxTeamMembers: 0,
        maxUpdatesPerMonth: 4
    },
    standard: {
        maxProjects: 5,
        maxActiveProjects: 3,
        maxTeamMembers: 2,
        maxUpdatesPerMonth: 20
    },
    premium: {
        maxProjects: -1, // unlimited
        maxActiveProjects: -1,
        maxTeamMembers: -1, // unlimited
        maxUpdatesPerMonth: -1
    }
};
