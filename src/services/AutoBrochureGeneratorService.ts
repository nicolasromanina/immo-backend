import Project, { IProject } from '../models/Project';
import Promoteur from '../models/Promoteur';
import Update from '../models/Update';
import Document from '../models/Document';

/**
 * Service for automatic brochure generation from project data
 * Generates structured brochure content that can be rendered in various formats
 */

export interface BrochureSection {
  type: 'header' | 'hero' | 'description' | 'typologies' | 'features' | 'timeline' | 'gallery' | 'promoteur' | 'contact' | 'updates' | 'location' | 'documents' | 'footer';
  title?: string;
  content: any;
}

export interface GeneratedBrochure {
  projectId: string;
  projectTitle: string;
  generatedAt: Date;
  version: string;
  language: 'fr' | 'en';
  sections: BrochureSection[];
  metadata: {
    totalPages: number;
    wordCount: number;
    hasImages: boolean;
    hasPricing: boolean;
  };
}

export class AutoBrochureGeneratorService {
  /**
   * Generate a complete brochure for a project
   */
  static async generateBrochure(
    projectId: string,
    options: {
      language?: 'fr' | 'en';
      includePricing?: boolean;
      includeUpdates?: boolean;
      includeDocuments?: boolean;
      template?: 'standard' | 'premium' | 'minimal';
    } = {}
  ): Promise<GeneratedBrochure> {
    const project = await Project.findById(projectId)
      .populate('promoteur', 'organizationName logo description companyPhone companyEmail website trustScore badges');
    
    if (!project) {
      throw new Error('Project not found');
    }

    const language = options.language || 'fr';
    const sections: BrochureSection[] = [];

    // 1. Header section
    sections.push(this.generateHeader(project, language));

    // 2. Hero section with cover image
    sections.push(this.generateHero(project));

    // 3. Description section
    sections.push(this.generateDescription(project, language));

    // 4. Location section
    sections.push(this.generateLocation(project, language));

    // 5. Typologies section (if pricing enabled)
    if (options.includePricing !== false) {
      sections.push(this.generateTypologies(project, language));
    }

    // 6. Features & Amenities
    sections.push(this.generateFeatures(project, language));

    // 7. Timeline section
    sections.push(this.generateTimeline(project, language));

    // 8. Gallery section
    sections.push(this.generateGallery(project));

    // 9. Updates section (optional)
    if (options.includeUpdates) {
      const updatesSection = await this.generateUpdates(projectId, language);
      sections.push(updatesSection);
    }

    // 10. Documents section (optional)
    if (options.includeDocuments) {
      const documentsSection = await this.generateDocuments(projectId, language);
      sections.push(documentsSection);
    }

    // 11. Promoteur section
    sections.push(this.generatePromoteurSection(project.promoteur as any, language));

    // 12. Contact section
    sections.push(this.generateContact(project, language));

    // 13. Footer
    sections.push(this.generateFooter(language));

    // Calculate metadata
    const wordCount = this.calculateWordCount(sections);
    const hasImages = sections.some(s => 
      s.type === 'gallery' || s.type === 'hero' || 
      (s.type === 'updates' && s.content?.updates?.length > 0)
    );

    return {
      projectId: project._id.toString(),
      projectTitle: project.title,
      generatedAt: new Date(),
      version: '1.0',
      language,
      sections,
      metadata: {
        totalPages: Math.ceil(sections.length / 2), // Estimate
        wordCount,
        hasImages,
        hasPricing: options.includePricing !== false,
      },
    };
  }

  /**
   * Generate header section
   */
  private static generateHeader(project: IProject, language: 'fr' | 'en'): BrochureSection {
    return {
      type: 'header',
      content: {
        projectTitle: project.title,
        projectType: project.projectType,
        status: project.status,
        promoteurName: (project.promoteur as any)?.organizationName || '',
        promoteurLogo: (project.promoteur as any)?.logo || null,
      },
    };
  }

  /**
   * Generate hero section
   */
  private static generateHero(project: IProject): BrochureSection {
    return {
      type: 'hero',
      content: {
        coverImage: project.media?.coverImage || (project.media?.renderings?.[0] as any)?.url || project.media?.renderings?.[0] || null,
        tagline: project.title,
        location: `${project.area}, ${project.city}`,
        priceFrom: project.priceFrom,
        currency: project.currency,
      },
    };
  }

  /**
   * Generate description section
   */
  private static generateDescription(project: IProject, language: 'fr' | 'en'): BrochureSection {
    const titles = {
      fr: 'Présentation du projet',
      en: 'Project Overview',
    };

    // Generate summary if description is too long
    let description = project.description;
    let summary = '';
    if (description.length > 500) {
      summary = description.substring(0, 300) + '...';
    }

    return {
      type: 'description',
      title: titles[language],
      content: {
        description,
        summary,
        highlights: this.extractHighlights(project, language),
      },
    };
  }

  /**
   * Generate location section
   */
  private static generateLocation(project: IProject, language: 'fr' | 'en'): BrochureSection {
    const titles = {
      fr: 'Localisation',
      en: 'Location',
    };

    return {
      type: 'location',
      title: titles[language],
      content: {
        country: project.country,
        city: project.city,
        area: project.area,
        address: project.address,
        coordinates: project.coordinates,
        mapEmbedUrl: project.coordinates
          ? `https://www.google.com/maps/embed/v1/place?q=${project.coordinates.lat},${project.coordinates.lng}`
          : null,
      },
    };
  }

  /**
   * Generate typologies section
   */
  private static generateTypologies(project: IProject, language: 'fr' | 'en'): BrochureSection {
    const titles = {
      fr: 'Types de logements',
      en: 'Property Types',
    };

    const labels = {
      fr: {
        surface: 'Surface',
        price: 'Prix',
        available: 'Disponible',
        units: 'unités',
      },
      en: {
        surface: 'Surface',
        price: 'Price',
        available: 'Available',
        units: 'units',
      },
    };

    return {
      type: 'typologies',
      title: titles[language],
      content: {
        typologies: project.typologies.map(t => ({
          name: t.name,
          surface: t.surface,
          surfaceLabel: `${t.surface} m²`,
          price: t.price,
          priceFormatted: this.formatPrice(t.price, project.currency),
          pricePerSqm: Math.round(t.price / t.surface),
          available: t.available,
          availableLabel: `${t.available} ${labels[language].units}`,
        })),
        priceFrom: project.priceFrom,
        priceFromFormatted: this.formatPrice(project.priceFrom, project.currency),
        currency: project.currency,
        labels: labels[language],
      },
    };
  }

  /**
   * Generate features section
   */
  private static generateFeatures(project: IProject, language: 'fr' | 'en'): BrochureSection {
    const titles = {
      fr: 'Caractéristiques et équipements',
      en: 'Features and Amenities',
    };

    return {
      type: 'features',
      title: titles[language],
      content: {
        features: project.features || [],
        amenities: project.amenities || [],
        typeDetails: project.typeDetails,
        projectType: project.projectType,
      },
    };
  }

  /**
   * Generate timeline section
   */
  private static generateTimeline(project: IProject, language: 'fr' | 'en'): BrochureSection {
    const titles = {
      fr: 'Calendrier du projet',
      en: 'Project Timeline',
    };

    const labels = {
      fr: {
        preCommercialisation: 'Pré-commercialisation',
        constructionStart: 'Début des travaux',
        delivery: 'Livraison prévue',
      },
      en: {
        preCommercialisation: 'Pre-sale',
        constructionStart: 'Construction start',
        delivery: 'Expected delivery',
      },
    };

    const milestones = [];
    if (project.timeline?.preCommercializationDate) {
      milestones.push({
        label: labels[language].preCommercialisation,
        date: project.timeline.preCommercializationDate,
        status: new Date() >= project.timeline.preCommercializationDate ? 'completed' : 'upcoming',
      });
    }
    if (project.timeline?.constructionStartDate) {
      milestones.push({
        label: labels[language].constructionStart,
        date: project.timeline.constructionStartDate,
        status: new Date() >= project.timeline.constructionStartDate ? 'completed' : 'upcoming',
      });
    }
    if (project.timeline?.deliveryDate) {
      milestones.push({
        label: labels[language].delivery,
        date: project.timeline.deliveryDate,
        status: new Date() >= project.timeline.deliveryDate ? 'completed' : 'upcoming',
      });
    }

    return {
      type: 'timeline',
      title: titles[language],
      content: {
        currentStatus: project.status,
        milestones,
        delays: project.delays?.length || 0,
      },
    };
  }

  /**
   * Generate gallery section
   */
  private static generateGallery(project: IProject): BrochureSection {
    const normalizeMedia = (items: any[]): string[] => {
      return (items || []).map(item => 
        typeof item === 'string' ? item : item?.url || ''
      ).filter(Boolean);
    };

    return {
      type: 'gallery',
      content: {
        renderings: normalizeMedia(project.media?.renderings || []),
        photos: normalizeMedia(project.media?.photos || []),
        floorPlans: normalizeMedia(project.media?.floorPlans || []),
        videos: normalizeMedia(project.media?.videos || []),
      },
    };
  }

  /**
   * Generate updates section
   */
  private static async generateUpdates(projectId: string, language: 'fr' | 'en'): Promise<BrochureSection> {
    const titles = {
      fr: 'Avancement des travaux',
      en: 'Construction Progress',
    };

    const updates = await Update.find({
      project: projectId,
      status: 'published',
    })
      .sort({ publishedAt: -1 })
      .limit(5);

    return {
      type: 'updates',
      title: titles[language],
      content: {
        updates: updates.map(u => ({
          title: u.title,
          description: u.description,
          whatsDone: u.whatsDone,
          nextStep: u.nextStep,
          photos: u.photos.slice(0, 3),
          milestone: u.milestone,
          publishedAt: u.publishedAt,
        })),
        totalUpdates: await Update.countDocuments({ project: projectId, status: 'published' }),
      },
    };
  }

  /**
   * Generate documents section
   */
  private static async generateDocuments(projectId: string, language: 'fr' | 'en'): Promise<BrochureSection> {
    const titles = {
      fr: 'Documents disponibles',
      en: 'Available Documents',
    };

    const documents = await Document.find({
      project: projectId,
      visibility: 'public',
      status: 'fourni',
    });

    return {
      type: 'documents',
      title: titles[language],
      content: {
        documents: documents.map(d => ({
          name: d.name,
          category: d.category,
          verified: d.verified,
        })),
        categories: [...new Set(documents.map(d => d.category))],
      },
    };
  }

  /**
   * Generate promoteur section
   */
  private static generatePromoteurSection(promoteur: any, language: 'fr' | 'en'): BrochureSection {
    const titles = {
      fr: 'À propos du promoteur',
      en: 'About the Developer',
    };

    return {
      type: 'promoteur',
      title: titles[language],
      content: {
        name: promoteur?.organizationName || '',
        logo: promoteur?.logo || null,
        description: promoteur?.description || '',
        trustScore: promoteur?.trustScore || 0,
        badges: promoteur?.badges?.map((b: any) => b.badgeId?.name || b.name) || [],
        website: promoteur?.website || null,
      },
    };
  }

  /**
   * Generate contact section
   */
  private static generateContact(project: IProject, language: 'fr' | 'en'): BrochureSection {
    const titles = {
      fr: 'Nous contacter',
      en: 'Contact Us',
    };

    const promoteur = project.promoteur as any;

    return {
      type: 'contact',
      title: titles[language],
      content: {
        phone: promoteur?.companyPhone || null,
        email: promoteur?.companyEmail || null,
        website: promoteur?.website || null,
        projectUrl: `/projects/${project.slug}`,
        cta: language === 'fr' ? 'Demander plus d\'informations' : 'Request more information',
      },
    };
  }

  /**
   * Generate footer
   */
  private static generateFooter(language: 'fr' | 'en'): BrochureSection {
    const content = {
      fr: {
        disclaimer: 'Les prix et disponibilités sont donnés à titre indicatif et peuvent varier. Pour des informations actualisées, veuillez nous contacter directement.',
        generatedBy: 'Brochure générée automatiquement',
      },
      en: {
        disclaimer: 'Prices and availability are indicative and may vary. For updated information, please contact us directly.',
        generatedBy: 'Brochure automatically generated',
      },
    };

    return {
      type: 'footer',
      content: {
        disclaimer: content[language].disclaimer,
        generatedBy: content[language].generatedBy,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Extract key highlights from project
   */
  private static extractHighlights(project: IProject, language: 'fr' | 'en'): string[] {
    const highlights: string[] = [];

    if (project.projectType === 'villa' && project.typeDetails?.villa) {
      const villa = project.typeDetails.villa;
      if (villa.landArea) {
        highlights.push(language === 'fr' 
          ? `Terrain de ${villa.landArea} m²` 
          : `${villa.landArea} m² land`);
      }
      if (villa.bedrooms) {
        highlights.push(language === 'fr'
          ? `${villa.bedrooms} chambres`
          : `${villa.bedrooms} bedrooms`);
      }
    }

    if (project.projectType === 'immeuble' && project.typeDetails?.immeuble) {
      const immeuble = project.typeDetails.immeuble;
      if (immeuble.floors) {
        highlights.push(language === 'fr'
          ? `${immeuble.floors} étages`
          : `${immeuble.floors} floors`);
      }
      if (immeuble.totalUnits) {
        highlights.push(language === 'fr'
          ? `${immeuble.totalUnits} appartements`
          : `${immeuble.totalUnits} apartments`);
      }
      if (immeuble.elevators && immeuble.elevators > 0) {
        highlights.push(language === 'fr' ? 'Ascenseur' : 'Elevator');
      }
      if (immeuble.parkingSpaces && immeuble.parkingSpaces > 0) {
        highlights.push(language === 'fr'
          ? `${immeuble.parkingSpaces} places de parking`
          : `${immeuble.parkingSpaces} parking spaces`);
      }
    }

    // Add general highlights
    if (project.typologies.length > 0) {
      highlights.push(language === 'fr'
        ? `${project.typologies.length} types de logements`
        : `${project.typologies.length} property types`);
    }

    return highlights.slice(0, 5); // Max 5 highlights
  }

  /**
   * Format price with currency
   */
  private static formatPrice(price: number, currency: string): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'XOF' ? 'XOF' : currency,
      maximumFractionDigits: 0,
    }).format(price);
  }

  /**
   * Calculate word count for metadata
   */
  private static calculateWordCount(sections: BrochureSection[]): number {
    let count = 0;
    
    const countWords = (obj: any): number => {
      if (typeof obj === 'string') {
        return obj.split(/\s+/).filter(Boolean).length;
      }
      if (Array.isArray(obj)) {
        return obj.reduce((sum, item) => sum + countWords(item), 0);
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).reduce((sum: number, val) => sum + countWords(val), 0);
      }
      return 0;
    };

    for (const section of sections) {
      if (section.title) count += section.title.split(/\s+/).length;
      count += countWords(section.content);
    }

    return count;
  }

  /**
   * Generate social media post content from project
   */
  static async generateSocialPost(
    projectId: string,
    platform: 'linkedin' | 'facebook' | 'twitter' | 'instagram',
    language: 'fr' | 'en' = 'fr'
  ): Promise<{
    text: string;
    hashtags: string[];
    imageUrl: string | null;
    characterCount: number;
  }> {
    const project = await Project.findById(projectId)
      .populate('promoteur', 'organizationName');

    if (!project) {
      throw new Error('Project not found');
    }

    const maxLength = {
      linkedin: 3000,
      facebook: 500,
      twitter: 280,
      instagram: 2200,
    };

    const templates = {
      fr: {
        intro: `🏠 Nouveau projet immobilier`,
        location: `📍 ${project.area}, ${project.city}`,
        price: `💰 À partir de ${this.formatPrice(project.priceFrom, project.currency)}`,
        cta: `👉 Découvrez ce projet`,
      },
      en: {
        intro: `🏠 New real estate project`,
        location: `📍 ${project.area}, ${project.city}`,
        price: `💰 Starting from ${this.formatPrice(project.priceFrom, project.currency)}`,
        cta: `👉 Discover this project`,
      },
    };

    const t = templates[language];
    let text = '';

    switch (platform) {
      case 'twitter':
        text = `${t.intro}: ${project.title}\n${t.location}\n${t.price}`;
        break;
      case 'linkedin':
        text = `${t.intro}\n\n**${project.title}**\n\n${project.description.substring(0, 200)}...\n\n${t.location}\n${t.price}\n\n${t.cta}`;
        break;
      case 'facebook':
      case 'instagram':
        text = `${t.intro}\n\n${project.title}\n\n${t.location}\n${t.price}\n\n${project.description.substring(0, 150)}...\n\n${t.cta}`;
        break;
    }

    // Ensure text fits within platform limits
    if (text.length > maxLength[platform] - 50) { // Leave room for hashtags
      text = text.substring(0, maxLength[platform] - 50) + '...';
    }

    const hashtags = [
      '#immobilier',
      `#${project.city.toLowerCase().replace(/\s+/g, '')}`,
      `#${project.projectType}`,
      '#investissement',
    ];

    const coverImage = project.media?.coverImage || 
      (project.media?.renderings?.[0] as any)?.url || 
      project.media?.renderings?.[0] as string || 
      null;

    return {
      text,
      hashtags,
      imageUrl: coverImage,
      characterCount: text.length,
    };
  }

  /**
   * Generate project summary (short description)
   */
  static async generateProjectSummary(
    projectId: string,
    maxLength: number = 200,
    language: 'fr' | 'en' = 'fr'
  ): Promise<string> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const intro = language === 'fr'
      ? `${project.title} est un projet de ${project.projectType} situé à ${project.area}, ${project.city}.`
      : `${project.title} is a ${project.projectType} project located in ${project.area}, ${project.city}.`;

    const pricing = language === 'fr'
      ? `Prix à partir de ${this.formatPrice(project.priceFrom, project.currency)}.`
      : `Starting from ${this.formatPrice(project.priceFrom, project.currency)}.`;

    let summary = `${intro} ${pricing}`;

    // Add type details if available
    if (project.projectType === 'villa' && project.typeDetails?.villa?.units) {
      summary += language === 'fr'
        ? ` ${project.typeDetails.villa.units} villas disponibles.`
        : ` ${project.typeDetails.villa.units} villas available.`;
    }
    if (project.projectType === 'immeuble' && project.typeDetails?.immeuble?.totalUnits) {
      summary += language === 'fr'
        ? ` ${project.typeDetails.immeuble.totalUnits} appartements disponibles.`
        : ` ${project.typeDetails.immeuble.totalUnits} apartments available.`;
    }

    // Truncate if needed
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + '...';
    }

    return summary;
  }
}
