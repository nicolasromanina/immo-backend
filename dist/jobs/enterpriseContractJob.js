"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startEnterpriseContractJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const EnterpriseContractService_1 = require("../services/EnterpriseContractService");
const startEnterpriseContractJob = () => {
    if (process.env.ENTERPRISE_CONTRACT_CRON_ENABLED === 'false') {
        return;
    }
    const schedule = process.env.ENTERPRISE_CONTRACT_CRON || '0 9 * * *';
    node_cron_1.default.schedule(schedule, async () => {
        try {
            console.log('[Job] Enterprise contract renewal check running...');
            const expiring = await EnterpriseContractService_1.EnterpriseContractService.checkExpiringContracts(30);
            console.log(`[Job] Enterprise contracts expiring within 30 days: ${expiring}`);
        }
        catch (error) {
            console.error('Enterprise contract job failed:', error);
        }
    });
};
exports.startEnterpriseContractJob = startEnterpriseContractJob;
