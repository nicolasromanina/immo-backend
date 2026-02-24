"use strict";
/**
 * i18n Service — Multi-language support (FR/EN)
 * Uses JSON translation dictionaries. Default: FR.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.I18nService = void 0;
const translations = {
    fr: {
        // Common
        'common.save': 'Enregistrer',
        'common.cancel': 'Annuler',
        'common.delete': 'Supprimer',
        'common.edit': 'Modifier',
        'common.create': 'Créer',
        'common.search': 'Rechercher',
        'common.loading': 'Chargement…',
        'common.error': 'Erreur',
        'common.success': 'Succès',
        'common.confirm': 'Confirmer',
        'common.back': 'Retour',
        'common.next': 'Suivant',
        'common.previous': 'Précédent',
        // Auth
        'auth.login': 'Connexion',
        'auth.register': 'Inscription',
        'auth.logout': 'Déconnexion',
        'auth.email': 'Adresse email',
        'auth.password': 'Mot de passe',
        'auth.forgot_password': 'Mot de passe oublié ?',
        'auth.invalid_credentials': 'Identifiants invalides',
        'auth.token_expired': 'Session expirée, veuillez vous reconnecter',
        // Notifications
        'notification.new_lead': 'Nouveau lead reçu',
        'notification.new_update': 'Nouvelle mise à jour',
        'notification.badge_earned': 'Badge obtenu !',
        'notification.warning': 'Avertissement',
        'notification.appointment_reminder': 'Rappel de rendez-vous',
        'notification.invoice_due': 'Facture à payer',
        // Projects
        'project.title': 'Titre du projet',
        'project.description': 'Description',
        'project.status.pre-commercialisation': 'Pré-commercialisation',
        'project.status.en-construction': 'En construction',
        'project.status.gros-oeuvre': 'Gros œuvre',
        'project.status.livre': 'Livré',
        'project.status.pause': 'En pause',
        'project.status.archive': 'Archivé',
        // Leads
        'lead.score.A': 'Lead chaud',
        'lead.score.B': 'Lead qualifié',
        'lead.score.C': 'Lead tiède',
        'lead.score.D': 'Lead froid',
        'lead.status.nouveau': 'Nouveau',
        'lead.status.contacte': 'Contacté',
        'lead.status.rdv-planifie': 'RDV planifié',
        'lead.status.visite-effectuee': 'Visite effectuée',
        'lead.status.gagne': 'Gagné',
        'lead.status.perdu': 'Perdu',
        // Trust
        'trust.score': 'Score de confiance',
        'trust.verified': 'Vérifié',
        'trust.badge': 'Badge',
        // Support
        'support.ticket': 'Ticket de support',
        'support.create_ticket': 'Créer un ticket',
        'support.resolved': 'Résolu',
        // GDPR
        'gdpr.request': 'Demande RGPD',
        'gdpr.access': 'Droit d\'accès',
        'gdpr.erasure': 'Droit à l\'effacement',
        'gdpr.portability': 'Droit à la portabilité',
        // Errors
        'error.not_found': 'Ressource non trouvée',
        'error.unauthorized': 'Non autorisé',
        'error.forbidden': 'Accès refusé',
        'error.validation': 'Erreur de validation',
        'error.server': 'Erreur interne du serveur',
    },
    en: {
        // Common
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.create': 'Create',
        'common.search': 'Search',
        'common.loading': 'Loading…',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.confirm': 'Confirm',
        'common.back': 'Back',
        'common.next': 'Next',
        'common.previous': 'Previous',
        // Auth
        'auth.login': 'Login',
        'auth.register': 'Register',
        'auth.logout': 'Logout',
        'auth.email': 'Email address',
        'auth.password': 'Password',
        'auth.forgot_password': 'Forgot password?',
        'auth.invalid_credentials': 'Invalid credentials',
        'auth.token_expired': 'Session expired, please log in again',
        // Notifications
        'notification.new_lead': 'New lead received',
        'notification.new_update': 'New update',
        'notification.badge_earned': 'Badge earned!',
        'notification.warning': 'Warning',
        'notification.appointment_reminder': 'Appointment reminder',
        'notification.invoice_due': 'Invoice due',
        // Projects
        'project.title': 'Project title',
        'project.description': 'Description',
        'project.status.pre-commercialisation': 'Pre-marketing',
        'project.status.en-construction': 'Under construction',
        'project.status.gros-oeuvre': 'Structural phase',
        'project.status.livre': 'Delivered',
        'project.status.pause': 'Paused',
        'project.status.archive': 'Archived',
        // Leads
        'lead.score.A': 'Hot lead',
        'lead.score.B': 'Qualified lead',
        'lead.score.C': 'Warm lead',
        'lead.score.D': 'Cold lead',
        'lead.status.nouveau': 'New',
        'lead.status.contacte': 'Contacted',
        'lead.status.rdv-planifie': 'Meeting planned',
        'lead.status.visite-effectuee': 'Visit done',
        'lead.status.gagne': 'Won',
        'lead.status.perdu': 'Lost',
        // Trust
        'trust.score': 'Trust score',
        'trust.verified': 'Verified',
        'trust.badge': 'Badge',
        // Support
        'support.ticket': 'Support ticket',
        'support.create_ticket': 'Create a ticket',
        'support.resolved': 'Resolved',
        // GDPR
        'gdpr.request': 'GDPR request',
        'gdpr.access': 'Right to access',
        'gdpr.erasure': 'Right to erasure',
        'gdpr.portability': 'Right to portability',
        // Errors
        'error.not_found': 'Resource not found',
        'error.unauthorized': 'Unauthorized',
        'error.forbidden': 'Forbidden',
        'error.validation': 'Validation error',
        'error.server': 'Internal server error',
    },
};
class I18nService {
    /**
     * Translate a key for a given locale
     */
    static t(key, locale, params) {
        const lang = locale || this.defaultLocale;
        let text = translations[lang]?.[key] || translations[this.defaultLocale]?.[key] || key;
        // Replace {{param}} placeholders
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
            }
        }
        return text;
    }
    /**
     * Get all translations for a locale
     */
    static getTranslations(locale) {
        return translations[locale] || translations[this.defaultLocale];
    }
    /**
     * Get available locales
     */
    static getAvailableLocales() {
        return Object.keys(translations);
    }
    /**
     * Add or update translations for a locale
     */
    static addTranslations(locale, newTranslations) {
        if (!translations[locale]) {
            translations[locale] = {};
        }
        Object.assign(translations[locale], newTranslations);
    }
}
exports.I18nService = I18nService;
I18nService.defaultLocale = 'fr';
