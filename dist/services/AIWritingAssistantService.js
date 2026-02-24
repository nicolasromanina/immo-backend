"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIWritingAssistantService = void 0;
const axios_1 = __importDefault(require("axios"));
class AIWritingAssistantService {
    /**
     * Generate text using Groq AI
     */
    static async generateText(request) {
        if (!this.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY is not configured');
        }
        const systemPrompt = this.buildSystemPrompt(request);
        const userPrompt = this.buildUserPrompt(request);
        try {
            const response = await axios_1.default.post(this.GROQ_API_URL, {
                model: this.MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: request.maxLength || 500,
                temperature: 0.7,
                top_p: 0.9,
            }, {
                headers: {
                    'Authorization': `Bearer ${this.GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            });
            const text = response.data.choices[0]?.message?.content || '';
            const tokensUsed = response.data.usage?.total_tokens || 0;
            return { text: text.trim(), tokensUsed };
        }
        catch (error) {
            console.error('Groq API error:', error.response?.data || error.message);
            throw new Error(`Erreur AI: ${error.response?.data?.error?.message || error.message}`);
        }
    }
    /**
     * Generate multiple alternatives
     */
    static async generateWithAlternatives(request, count = 3) {
        const results = await Promise.all(Array.from({ length: count }, () => this.generateText(request)));
        return {
            text: results[0].text,
            alternatives: results.slice(1).map(r => r.text),
            tokensUsed: results.reduce((sum, r) => sum + r.tokensUsed, 0),
        };
    }
    /**
     * Improve existing text
     */
    static async improveText(text, instructions) {
        if (!this.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY is not configured');
        }
        const response = await axios_1.default.post(this.GROQ_API_URL, {
            model: this.MODEL,
            messages: [
                {
                    role: 'system',
                    content: `Tu es un expert en rédaction immobilière opérant en Afrique de l’Ouest, en Europe (notamment en France), en Afrique de l’Est et en Asie.
Améliore le texte fourni afin de le rendre plus professionnel, clair, fluide et attractif, tout en respectant le contexte local et les standards du marché immobilier concerné.
Intègre, le cas échéant, les instructions supplémentaires suivantes : ${instructions}.
Réponds exclusivement avec la version améliorée du texte, sans ajout de commentaires, d’explications ou de métadonnées.`,
                },
                { role: 'user', content: text },
            ],
            max_tokens: 800,
            temperature: 0.6,
        }, {
            headers: {
                'Authorization': `Bearer ${this.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        return {
            text: response.data.choices[0]?.message?.content?.trim() || text,
            tokensUsed: response.data.usage?.total_tokens || 0,
        };
    }
    /**
     * Generate project description
     */
    static async generateProjectDescription(data) {
        return this.generateText({
            type: 'project-description',
            context: {
                projectName: data.projectName,
                city: data.city,
                price: data.price,
                features: data.features,
                additionalContext: `${data.numberOfUnits ? `${data.numberOfUnits} unités` : ''} ${data.projectType || ''}`,
                tone: 'professional',
                language: 'fr',
            },
            maxLength: 600,
        });
    }
    /**
     * Generate update text for project
     */
    static async generateUpdateText(data) {
        return this.generateText({
            type: 'update-text',
            context: {
                projectName: data.projectName,
                additionalContext: `Type de mise à jour: ${data.updateType}. ${data.progress ? `Avancement: ${data.progress}%` : ''} ${data.details || ''}`,
                tone: 'professional',
                language: 'fr',
            },
            maxLength: 300,
        });
    }
    /**
     * Generate lead response
     */
    static async generateLeadResponse(data) {
        return this.generateText({
            type: 'lead-response',
            context: {
                projectName: data.projectName,
                additionalContext: `Nom du prospect: ${data.leadName}. ${data.inquiry ? `Demande: ${data.inquiry}` : ''}`,
                tone: 'professional',
                language: 'fr',
            },
            maxLength: 400,
        });
    }
    static buildSystemPrompt(request) {
        const lang = request.context.language === 'en' ? 'English' : 'French';
        const toneMap = {
            professional: 'professionnel et confiant',
            casual: 'décontracté et accessible',
            luxury: 'luxueux et exclusif',
            urgent: 'urgent et percutant',
        };
        const tone = toneMap[request.context.tone || 'professional'];
        return `Tu es un expert en rédaction immobilière pour des promoteurs en Afrique de l'Ouest.
Tu écris en ${lang} avec un ton ${tone}.
Tu connais le marché immobilier en Côte d'Ivoire, au Sénégal, au Cameroun et dans toute la région UEMOA.
La devise utilisée est le Franc CFA (FCFA / XOF).
Tes textes sont concis, accrocheurs et adaptés à la cible.
Tu ne dois JAMAIS inventer de faux chiffres ou de fausses certifications.
Réponds uniquement avec le texte demandé, sans commentaire ni explication.`;
    }
    static buildUserPrompt(request) {
        const ctx = request.context;
        switch (request.type) {
            case 'project-description':
                return `Rédige une description attractive pour le projet immobilier "${ctx.projectName}" situé à ${ctx.city || 'N/A'}.
${ctx.price ? `Prix à partir de ${new Intl.NumberFormat('fr-FR').format(ctx.price)} FCFA.` : ''}
${ctx.features?.length ? `Caractéristiques: ${ctx.features.join(', ')}.` : ''}
${ctx.additionalContext || ''}
La description doit faire entre 100 et 200 mots.`;
            case 'update-text':
                return `Rédige un texte de mise à jour pour le projet "${ctx.projectName}".
${ctx.additionalContext || ''}
Le texte doit être informatif et rassurer les acheteurs potentiels. Maximum 100 mots.`;
            case 'lead-response':
                return `Rédige une réponse professionnelle à un prospect intéressé par le projet "${ctx.projectName}".
${ctx.additionalContext || ''}
La réponse doit être chaleureuse, informative et inciter à prendre rendez-vous. Maximum 150 mots.`;
            case 'announcement':
                return `Rédige une annonce pour le projet "${ctx.projectName}" à ${ctx.city || 'N/A'}.
${ctx.additionalContext || ''}
L'annonce doit capter l'attention et donner envie d'en savoir plus. Maximum 80 mots.`;
            case 'ad-copy':
                return `Rédige un texte publicitaire court pour le projet "${ctx.projectName}".
${ctx.price ? `Prix: ${new Intl.NumberFormat('fr-FR').format(ctx.price)} FCFA` : ''}
${ctx.targetAudience ? `Cible: ${ctx.targetAudience}` : ''}
${ctx.additionalContext || ''}
Le texte doit être percutant et inclure un appel à l'action. Maximum 50 mots.`;
            default:
                return ctx.additionalContext || 'Rédige un texte immobilier professionnel.';
        }
    }
}
exports.AIWritingAssistantService = AIWritingAssistantService;
AIWritingAssistantService.GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
AIWritingAssistantService.GROQ_API_KEY = process.env.GROQ_API_KEY;
AIWritingAssistantService.MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
