import { ChatMessage } from './types/chat.types';
import { BuyerAssistant } from './buyers.assistant';
import { PromoterAssistant } from './promoters.assistant';
import { AdminAssistant } from './admins.assistant';

export type AssistantType = 'buyer' | 'promoter' | 'admin';

export class AssistantFactory {
  static getAssistant(type: AssistantType) {
    switch (type) {
      case 'buyer':
        return new BuyerAssistant();
      case 'promoter':
        return new PromoterAssistant();
      case 'admin':
        return new AdminAssistant();
      default:
        throw new Error(`Unknown assistant type: ${type}`);
    }
  }

  static prepareMessages(type: AssistantType, userMessages: ChatMessage[]): ChatMessage[] {
    const assistant = this.getAssistant(type);
    return assistant.prepareMessages(userMessages);
  }
}