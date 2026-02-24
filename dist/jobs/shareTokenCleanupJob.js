"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startShareTokenCleanupJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const startShareTokenCleanupJob = () => {
    if (process.env.SHARE_TOKEN_CLEANUP_CRON_ENABLED === 'false') {
        return;
    }
    const schedule = process.env.SHARE_TOKEN_CLEANUP_CRON || '0 3 * * *'; // Daily at 3 AM
    node_cron_1.default.schedule(schedule, async () => {
        try {
            await shareTokenCleanupJob();
        }
        catch (error) {
            console.error('Error in share token cleanup job:', error);
        }
    });
};
exports.startShareTokenCleanupJob = startShareTokenCleanupJob;
const shareTokenCleanupJob = async () => {
    const { default: DocumentShareToken } = await Promise.resolve().then(() => __importStar(require('../models/DocumentShareToken')));
    const expiredTokens = await DocumentShareToken.updateMany({
        status: 'active',
        expiresAt: { $lt: new Date() }
    }, {
        status: 'expired'
    });
    console.log(`Expired ${expiredTokens.modifiedCount} share tokens`);
};
