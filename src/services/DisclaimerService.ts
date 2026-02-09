import Disclaimer from '../models/Disclaimer';

export class DisclaimerService {
  /**
   * Initialize default platform disclaimers
   */
  static async initializeDefaults() {
    const defaults = [
      {
        slug: 'platform-verification',
        category: 'verification',
        title: {
          fr: 'Ce que la plateforme vérifie',
          en: 'What the platform verifies',
        },
        content: {
          fr: `La plateforme effectue les vérifications suivantes :
• Identité du promoteur (KYC) : Vérification des documents d'identité et d'enregistrement société.
• Agrément officiel : Vérification de l'agrément auprès des autorités compétentes (si applicable).
• Documents projet : Vérification de la présence des documents légaux obligatoires (permis de construire, titre foncier, etc.).
• Photos géolocalisées : Validation de la géolocalisation et de l'horodatage des photos de chantier.

La plateforme ne garantit PAS :
• La qualité de la construction.
• Le respect des délais de livraison.
• La solvabilité financière du promoteur au-delà des preuves fournies.
• L'exactitude des prix affichés (les prix sont déclarés par le promoteur).`,
          en: `The platform performs the following verifications:
• Developer identity (KYC): Verification of identity documents and company registration.
• Official accreditation: Verification with relevant authorities (if applicable).
• Project documents: Verification of mandatory legal documents (building permit, land title, etc.).
• Geolocated photos: Validation of geolocation and timestamp of construction site photos.

The platform does NOT guarantee:
• Construction quality.
• Delivery timeline compliance.
• Financial solvency beyond provided proof.
• Accuracy of displayed prices (prices are declared by the developer).`,
        },
      },
      {
        slug: 'payment-disclaimer',
        category: 'payment',
        title: {
          fr: 'Conditions de paiement',
          en: 'Payment conditions',
        },
        content: {
          fr: `Les paiements sur la plateforme sont traités via Stripe. La plateforme ne gère pas directement les transactions entre acheteurs et promoteurs. Les frais de service sont non remboursables une fois le service rendu. La devise de référence est le Franc CFA (XOF).`,
          en: `Payments on the platform are processed through Stripe. The platform does not directly manage transactions between buyers and developers. Service fees are non-refundable once the service is rendered. The reference currency is CFA Franc (XOF).`,
        },
      },
      {
        slug: 'liability-limits',
        category: 'liability',
        title: {
          fr: 'Limites de responsabilité',
          en: 'Liability limits',
        },
        content: {
          fr: `La plateforme agit en tant qu'intermédiaire de mise en relation. Elle ne se substitue pas aux organismes de contrôle et ne peut être tenue responsable des actes des promoteurs. En cas de litige, la plateforme facilite la médiation mais n'est pas partie prenante.`,
          en: `The platform acts as a matchmaking intermediary. It does not replace regulatory bodies and cannot be held responsible for developers' actions. In case of dispute, the platform facilitates mediation but is not a stakeholder.`,
        },
      },
      {
        slug: 'data-privacy',
        category: 'data',
        title: {
          fr: 'Protection des données',
          en: 'Data protection',
        },
        content: {
          fr: `Vos données personnelles sont traitées conformément au RGPD. Vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données. Les données sont hébergées de manière sécurisée et ne sont pas vendues à des tiers.`,
          en: `Your personal data is processed in accordance with GDPR. You have the right to access, rectify, erase and port your data. Data is hosted securely and is not sold to third parties.`,
        },
      },
      {
        slug: 'refusal-reasons',
        category: 'general',
        title: {
          fr: 'Motifs de refus',
          en: 'Refusal reasons',
        },
        content: {
          fr: `La plateforme peut refuser l'inscription ou suspendre un promoteur pour :
• Documents KYC invalides ou frauduleux.
• Absence de mise à jour pendant plus de 90 jours.
• Signalements multiples vérifiés.
• Non-respect des conditions d'utilisation.
• Paiements en souffrance.`,
          en: `The platform may refuse registration or suspend a developer for:
• Invalid or fraudulent KYC documents.
• No updates for more than 90 days.
• Multiple verified reports.
• Non-compliance with terms of use.
• Outstanding payments.`,
        },
      },
    ];

    for (const d of defaults) {
      const existing = await Disclaimer.findOne({ slug: d.slug });
      if (!existing) {
        await Disclaimer.create(d);
      }
    }
  }

  /**
   * Get all active disclaimers
   */
  static async getAll(locale?: string) {
    const disclaimers = await Disclaimer.find({ isActive: true }).sort({ category: 1 });
    if (!locale) return disclaimers;

    return disclaimers.map(d => ({
      slug: d.slug,
      category: d.category,
      title: (d.title as any).get(locale) || (d.title as any).get('fr'),
      content: (d.content as any).get(locale) || (d.content as any).get('fr'),
      version: d.version,
      updatedAt: d.updatedAt,
    }));
  }

  /**
   * Get a single disclaimer
   */
  static async getBySlug(slug: string, locale?: string) {
    const d = await Disclaimer.findOne({ slug, isActive: true });
    if (!d) return null;

    if (!locale) return d;

    return {
      slug: d.slug,
      category: d.category,
      title: (d.title as any).get(locale) || (d.title as any).get('fr'),
      content: (d.content as any).get(locale) || (d.content as any).get('fr'),
      version: d.version,
      updatedAt: d.updatedAt,
    };
  }

  /**
   * Update disclaimer (admin)
   */
  static async update(slug: string, data: { title?: Record<string, string>; content?: Record<string, string>; isActive?: boolean }, adminId: string) {
    const d = await Disclaimer.findOne({ slug });
    if (!d) throw new Error('Disclaimer not found');

    if (data.title) d.title = data.title as any;
    if (data.content) d.content = data.content as any;
    if (data.isActive !== undefined) d.isActive = data.isActive;
    d.version += 1;
    d.lastUpdatedBy = adminId as any;

    await d.save();
    return d;
  }
}
