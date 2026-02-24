"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenGraphService = void 0;
const Project_1 = __importDefault(require("../models/Project"));
class OpenGraphService {
    /**
     * Generate OG data for a project page
     */
    static async generateProjectOG(projectId) {
        const project = await Project_1.default.findById(projectId)
            .populate('promoteur', 'organizationName');
        if (!project)
            throw new Error('Projet non trouvé');
        const p = project;
        const promoteurName = p.promoteur?.organizationName || '';
        const images = p.images || [];
        const mainImage = images.length > 0 ? images[0] : this.DEFAULT_IMAGE;
        const title = `${p.nom || 'Projet immobilier'} — ${p.city || ''}`;
        const description = this.truncate(p.description ||
            `Découvrez ${p.nom} à ${p.city || 'votre ville'} par ${promoteurName}. ${p.prix ? `À partir de ${this.formatPrice(p.prix)} FCFA.` : ''}`, 160);
        return {
            title,
            description,
            image: mainImage,
            url: `${this.BASE_URL}/projects/${projectId}`,
            type: 'website',
            siteName: this.SITE_NAME,
            locale: 'fr_FR',
            price: p.prix ? this.formatPrice(p.prix) : undefined,
            currency: 'EUR',
            city: p.city,
        };
    }
    /**
     * Generate HTML meta tags for WhatsApp/social sharing
     */
    static async generateMetaTags(projectId) {
        const og = await this.generateProjectOG(projectId);
        return `
<!-- Open Graph / Facebook -->
<meta property="og:type" content="${og.type}" />
<meta property="og:url" content="${og.url}" />
<meta property="og:title" content="${this.escapeHtml(og.title)}" />
<meta property="og:description" content="${this.escapeHtml(og.description)}" />
<meta property="og:image" content="${og.image}" />
<meta property="og:site_name" content="${og.siteName}" />
<meta property="og:locale" content="${og.locale}" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${this.escapeHtml(og.title)}" />
<meta name="twitter:description" content="${this.escapeHtml(og.description)}" />
<meta name="twitter:image" content="${og.image}" />

<!-- WhatsApp -->
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
${og.price ? `<meta property="product:price:amount" content="${og.price}" />\n<meta property="product:price:currency" content="${og.currency}" />` : ''}
`.trim();
    }
    /**
     * Generate shareable link for WhatsApp
     */
    static generateWhatsAppShareLink(projectUrl, text) {
        const message = text
            ? `${text}\n${projectUrl}`
            : projectUrl;
        return `https://wa.me/?text=${encodeURIComponent(message)}`;
    }
    /**
     * Generate share links for multiple platforms
     */
    static generateShareLinks(projectId, title) {
        const url = `${this.BASE_URL}/projects/${projectId}`;
        const encodedUrl = encodeURIComponent(url);
        const encodedTitle = encodeURIComponent(title);
        return {
            whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
            email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
            copy: url,
        };
    }
    static truncate(text, maxLength) {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    static formatPrice(price) {
        return new Intl.NumberFormat('fr-FR').format(price);
    }
    static escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
exports.OpenGraphService = OpenGraphService;
OpenGraphService.SITE_NAME = process.env.OG_SITE_NAME || 'ImmoConnect';
OpenGraphService.BASE_URL = process.env.OG_BASE_URL || 'https://immoconnect.com';
OpenGraphService.DEFAULT_IMAGE = process.env.OG_DEFAULT_IMAGE || `${OpenGraphService.BASE_URL}/og-default.jpg`;
