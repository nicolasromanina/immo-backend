import Template from '../models/Template';
import { AuditLogService } from './AuditLogService';
import mongoose from 'mongoose';

/**
 * Service for managing templates (WhatsApp, Email, etc.)
 */
export class TemplateManagementService {
  /**
   * Create a template
   */
  static async createTemplate(params: {
    name: string;
    type: 'whatsapp' | 'email' | 'sms' | 'brochure' | 'faq';
    category: string;
    subject?: string;
    content: string;
    variables?: string[];
    targetAudience?: 'client' | 'promoteur' | 'both';
    language?: 'fr' | 'en';
    tags?: string[];
    description?: string;
    createdBy: string;
    whatsappType?: string;
    mediaUrl?: string;
    buttons?: any[];
  }) {
    const slug = params.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Extract variables from content
    const variables = params.variables || this.extractVariables(params.content);

    const template = new Template({
      ...params,
      slug,
      variables,
      isActive: true,
      isPublic: false,
      usageCount: 0,
    });

    await template.save();

    // Audit log
    await AuditLogService.log({
      actor: params.createdBy,
      actorRole: 'admin',
      action: 'template-created',
      category: 'system',
      targetType: 'Template',
      targetId: template._id.toString(),
      description: `Template created: ${params.name}`,
      metadata: params,
    });

    return template;
  }

  /**
   * Extract variables from template content
   * Variables are in format ${variableName}
   */
  private static extractVariables(content: string): string[] {
    const regex = /\$\{([^}]+)\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Render template with data
   */
  static renderTemplate(templateContent: string, data: Record<string, any>): string {
    let rendered = templateContent;

    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }

    return rendered;
  }

  /**
   * Get template by slug
   */
  static async getTemplateBySlug(slug: string) {
    return await Template.findOne({ slug, isActive: true });
  }

  /**
   * Get templates by type and category
   */
  static async getTemplates(params: {
    type?: string;
    category?: string;
    isPublic?: boolean;
    language?: string;
    tags?: string[];
  }) {
    const query: any = { isActive: true };

    if (params.type) query.type = params.type;
    if (params.category) query.category = params.category;
    if (params.isPublic !== undefined) query.isPublic = params.isPublic;
    if (params.language) query.language = params.language;
    if (params.tags && params.tags.length > 0) {
      query.tags = { $in: params.tags };
    }

    return await Template.find(query).sort({ usageCount: -1, createdAt: -1 });
  }

  /**
   * Update template
   */
  static async updateTemplate(templateId: string, updates: any, updatedBy: string) {
    const template = await Template.findById(templateId);
    if (!template) throw new Error('Template not found');

    const oldData = template.toObject();

    // Update content and re-extract variables if content changed
    if (updates.content) {
      updates.variables = this.extractVariables(updates.content);
    }

    Object.assign(template, updates);
    await template.save();

    // Audit log
    await AuditLogService.log({
      actor: updatedBy,
      actorRole: 'admin',
      action: 'template-updated',
      category: 'system',
      targetType: 'Template',
      targetId: templateId,
      description: `Template updated: ${template.name}`,
      metadata: { before: oldData, after: updates },
    });

    return template;
  }

  /**
   * Delete/deactivate template
   */
  static async deleteTemplate(templateId: string, deletedBy: string) {
    const template = await Template.findById(templateId);
    if (!template) throw new Error('Template not found');

    template.isActive = false;
    await template.save();

    // Audit log
    await AuditLogService.log({
      actor: deletedBy,
      actorRole: 'admin',
      action: 'template-deleted',
      category: 'system',
      targetType: 'Template',
      targetId: templateId,
      description: `Template deleted: ${template.name}`,
      metadata: { isActive: false },
    });

    return template;
  }

  /**
   * Increment usage count
   */
  static async incrementUsage(templateId: string) {
    await Template.findByIdAndUpdate(templateId, {
      $inc: { usageCount: 1 },
    });
  }

  /**
   * Initialize default templates
   */
  static async initializeDefaultTemplates() {
    const defaultTemplates = [
      // WhatsApp Templates for Objections
      {
        name: 'Objection - Distance Géographique',
        type: 'whatsapp',
        category: 'objection-diaspora',
        content: `Bonjour ${'{clientName}'},

Je comprends votre préoccupation concernant la distance. C'est justement pour cela que nous mettons l'accent sur la transparence totale.

Vous bénéficierez de:
✅ Mises à jour régulières avec photos du chantier
✅ Accès aux documents officiels
✅ Possibilité de visite virtuelle
✅ Représentant local pour visites physiques

Notre score de transparence: ${'{trustScore}'}/100

Souhaitez-vous planifier une visio pour discuter du projet ${'{projectName}'}?`,
        variables: ['clientName', 'trustScore', 'projectName'],
        targetAudience: 'promoteur',
        language: 'fr',
        tags: ['diaspora', 'objection', 'distance'],
        description: 'Réponse à l\'objection sur la distance géographique',
        whatsappType: 'text',
      },
      {
        name: 'Objection - Confiance',
        type: 'whatsapp',
        category: 'objection-diaspora',
        content: `Bonjour ${'{clientName}'},

Votre prudence est tout à fait légitime. C'est pourquoi nous sommes sur cette plateforme qui vérifie:

✓ Documents légaux (permis, titre foncier)
✓ Capacité financière du promoteur
✓ Avancement réel des travaux
✓ Historique et réputation

Notre niveau de vérification: ${'{verificationLevel}'}
Badges obtenus: ${'{badges}'}

Tous nos documents sont disponibles en ligne. Voulez-vous que je vous envoie le lien sécurisé?`,
        variables: ['clientName', 'verificationLevel', 'badges'],
        targetAudience: 'promoteur',
        language: 'fr',
        tags: ['diaspora', 'objection', 'confiance'],
        description: 'Réponse à l\'objection sur la confiance',
        whatsappType: 'text',
      },
      {
        name: 'Objection - Prix',
        type: 'whatsapp',
        category: 'objection-diaspora',
        content: `Bonjour ${'{clientName}'},

Le prix de ${'{projectPrice}'} XOF pour ${'{projectType}'} peut sembler élevé, mais voici ce qui est inclus:

📋 ${'{includedItems}'}

De plus:
• Garanties légales complètes
• Accompagnement jusqu'à la livraison
• Possibilité de paiement échelonné

Livraison prévue: ${'{deliveryDate}'}

Je peux vous proposer un plan de paiement adapté à votre situation. Intéressé(e)?`,
        variables: ['clientName', 'projectPrice', 'projectType', 'includedItems', 'deliveryDate'],
        targetAudience: 'promoteur',
        language: 'fr',
        tags: ['diaspora', 'objection', 'prix'],
        description: 'Réponse à l\'objection sur le prix',
        whatsappType: 'text',
      },
      // Welcome Templates
      {
        name: 'Welcome - New Lead',
        type: 'whatsapp',
        category: 'welcome',
        content: `Bonjour ${'{clientName}'} 👋

Merci pour votre intérêt pour ${'{projectName}'}!

Je suis ${'{agentName}'}, votre interlocuteur dédié.

Voici votre brochure: ${'{brochureLink}'}

Points clés:
📍 ${'{location}'}
💰 À partir de ${'{priceFrom}'} XOF
📅 Livraison: ${'{deliveryDate}'}
⭐ Score transparence: ${'{trustScore}'}/100

Quand seriez-vous disponible pour échanger? (Visio/Téléphone)`,
        variables: ['clientName', 'projectName', 'agentName', 'brochureLink', 'location', 'priceFrom', 'deliveryDate', 'trustScore'],
        targetAudience: 'promoteur',
        language: 'fr',
        tags: ['welcome', 'lead', 'first-contact'],
        description: 'Message de bienvenue pour nouveau lead',
        whatsappType: 'text',
      },
      // Follow-up Templates
      {
        name: 'Follow-up - No Response 48h',
        type: 'whatsapp',
        category: 'follow-up',
        content: `Bonjour ${'{clientName}'},

Je me permets de revenir vers vous concernant ${'{projectName}'}.

Avez-vous eu l'occasion de consulter la brochure?

Y a-t-il des questions auxquelles je peux répondre?

Je reste à votre disposition 📞`,
        variables: ['clientName', 'projectName'],
        targetAudience: 'promoteur',
        language: 'fr',
        tags: ['follow-up', 'relance'],
        description: 'Relance après 48h sans réponse',
        whatsappType: 'text',
      },
      // Email Templates
      {
        name: 'Email - Brochure avec détails',
        type: 'email',
        category: 'welcome',
        subject: 'Brochure ${projectName} - Toutes les informations',
        content: `Bonjour ${'{clientName}'},

Suite à votre demande, voici la brochure complète du projet ${'{projectName}'}.

📄 Brochure PDF: ${'{brochureLink}'}
🌐 Page projet: ${'{projectLink}'}

Caractéristiques principales:
- Localisation: ${'{location}'}
- Typologies disponibles: ${'{typologies}'}
- Prix: À partir de ${'{priceFrom}'} XOF
- Livraison: ${'{deliveryDate}'}

Notre engagement transparence:
✓ Mises à jour régulières du chantier
✓ Documents officiels accessibles
✓ Score de confiance: ${'{trustScore}'}/100

Je reste à votre entière disposition pour toute question.

Cordialement,
${'{agentName}'}
${'{agentPhone}'}
${'{agentEmail}'}`,
        variables: ['clientName', 'projectName', 'brochureLink', 'projectLink', 'location', 'typologies', 'priceFrom', 'deliveryDate', 'trustScore', 'agentName', 'agentPhone', 'agentEmail'],
        targetAudience: 'promoteur',
        language: 'fr',
        tags: ['email', 'brochure', 'welcome'],
        description: 'Email d\'envoi de brochure détaillée',
      },
    ];

    for (const templateData of defaultTemplates) {
      const existing = await Template.findOne({ 
        name: templateData.name,
        type: templateData.type
      });

      if (!existing) {
        await Template.create({
          ...templateData,
          slug: templateData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          isActive: true,
          isPublic: true,
          usageCount: 0,
          createdBy: new mongoose.Types.ObjectId('000000000000000000000000'),
        });
      }
    }
  }

  /**
   * Get most used templates
   */
  static async getMostUsedTemplates(limit: number = 10) {
    return await Template.find({ isActive: true })
      .sort({ usageCount: -1 })
      .limit(limit);
  }
}
