"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqService = void 0;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const env_config_1 = require("../config/env.config");
class GroqService {
    constructor() {
        if (!env_config_1.config.groqApiKey) {
            throw new Error('GROQ_API_KEY is not configured');
        }
        this.groq = new groq_sdk_1.default({
            apiKey: env_config_1.config.groqApiKey,
        });
    }
    async createChatCompletion(messages, model = 'llama-3.3-70b-versatile', stream = true) {
        try {
            const response = await this.groq.chat.completions.create({
                model,
                messages,
                stream,
                temperature: 0.7,
                max_tokens: 1000,
            });
            return response;
        }
        catch (error) {
            console.error('Groq API error:', error);
            throw error;
        }
    }
    async createNonStreamingCompletion(messages, model = 'llama-3.3-70b-versatile') {
        try {
            const response = await this.groq.chat.completions.create({
                model,
                messages,
                stream: false,
                temperature: 0.7,
                max_tokens: 1000,
            });
            return response.choices[0].message.content;
        }
        catch (error) {
            console.error('Groq API error:', error);
            throw error;
        }
    }
}
exports.GroqService = GroqService;
