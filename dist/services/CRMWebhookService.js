"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRMWebhookService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const CRMWebhook_1 = __importDefault(require("../models/CRMWebhook"));
class CRMWebhookService {
    static async pushEvent(params) {
        const config = await CRMWebhook_1.default.findOne({ promoteur: params.promoteurId, enabled: true });
        if (!config)
            return;
        if (config.events && config.events.length > 0 && !config.events.includes(params.event)) {
            return;
        }
        const body = JSON.stringify({
            event: params.event,
            timestamp: new Date().toISOString(),
            data: params.payload,
        });
        const headers = {
            'Content-Type': 'application/json',
        };
        if (config.secret) {
            const signature = crypto_1.default.createHmac('sha256', config.secret).update(body).digest('hex');
            headers['X-CRM-Signature'] = signature;
        }
        try {
            const response = await fetch(config.url, {
                method: 'POST',
                headers,
                body,
            });
            if (!response.ok) {
                const text = await response.text();
                await CRMWebhook_1.default.findByIdAndUpdate(config._id, { lastError: text });
                return;
            }
            await CRMWebhook_1.default.findByIdAndUpdate(config._id, { lastSuccessAt: new Date(), lastError: undefined });
        }
        catch (error) {
            await CRMWebhook_1.default.findByIdAndUpdate(config._id, { lastError: error.message || 'Webhook failed' });
        }
    }
}
exports.CRMWebhookService = CRMWebhookService;
