import crypto from 'crypto';
import CRMWebhook from '../models/CRMWebhook';

export class CRMWebhookService {
  static async pushEvent(params: {
    promoteurId: string;
    event: string;
    payload: Record<string, any>;
  }) {
    const config = await CRMWebhook.findOne({ promoteur: params.promoteurId, enabled: true });
    if (!config) return;

    if (config.events && config.events.length > 0 && !config.events.includes(params.event)) {
      return;
    }

    const body = JSON.stringify({
      event: params.event,
      timestamp: new Date().toISOString(),
      data: params.payload,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.secret) {
      const signature = crypto.createHmac('sha256', config.secret).update(body).digest('hex');
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
        await CRMWebhook.findByIdAndUpdate(config._id, { lastError: text });
        return;
      }

      await CRMWebhook.findByIdAndUpdate(config._id, { lastSuccessAt: new Date(), lastError: undefined });
    } catch (error: any) {
      await CRMWebhook.findByIdAndUpdate(config._id, { lastError: error.message || 'Webhook failed' });
    }
  }
}
