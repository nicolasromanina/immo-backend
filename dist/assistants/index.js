"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssistantFactory = void 0;
const buyers_assistant_1 = require("./buyers.assistant");
const promoters_assistant_1 = require("./promoters.assistant");
const admins_assistant_1 = require("./admins.assistant");
class AssistantFactory {
    static getAssistant(type) {
        switch (type) {
            case 'buyer':
                return new buyers_assistant_1.BuyerAssistant();
            case 'promoter':
                return new promoters_assistant_1.PromoterAssistant();
            case 'admin':
                return new admins_assistant_1.AdminAssistant();
            default:
                throw new Error(`Unknown assistant type: ${type}`);
        }
    }
    static prepareMessages(type, userMessages) {
        const assistant = this.getAssistant(type);
        return assistant.prepareMessages(userMessages);
    }
}
exports.AssistantFactory = AssistantFactory;
