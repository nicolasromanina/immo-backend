import { TemplateManagementService } from './TemplateManagementService';

const apiVersion = process.env.WHATSAPP_API_VERSION || 'v19.0';
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';

export class WhatsAppService {
  static async sendTextMessage(to: string, message: string) {
    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp API credentials are not configured');
    }

    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`WhatsApp send failed: ${body}`);
    }

    return response.json();
  }

  static async sendTemplateMessage(params: {
    to: string;
    templateSlug: string;
    data: Record<string, any>;
  }) {
    const template = await TemplateManagementService.getTemplateBySlug(params.templateSlug);
    if (!template) {
      throw new Error('Template not found');
    }

    const rendered = TemplateManagementService.renderTemplate(template.content, params.data);
    return this.sendTextMessage(params.to, rendered);
  }
}
