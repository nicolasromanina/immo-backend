import Groq from 'groq-sdk';
import { ChatMessage } from '../assistants/types/chat.types';
import { config } from '../config/env.config';

export class GroqService {
  private groq: Groq;

  constructor() {
    if (!config.groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }
    this.groq = new Groq({
      apiKey: config.groqApiKey,
    });
  }
  
  async createChatCompletion(
    messages: ChatMessage[],
    model: string = 'llama-3.3-70b-versatile',
    stream: boolean = true
  ) {
    try {
      const response = await this.groq.chat.completions.create({
        model,
        messages,
        stream,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response;
    } catch (error) {
      console.error('Groq API error:', error);
      throw error;
    }
  }

  async createNonStreamingCompletion(
    messages: ChatMessage[],
    model: string = 'llama-3.3-70b-versatile'
  ) {
    try {
      const response = await this.groq.chat.completions.create({
        model,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Groq API error:', error);
      throw error;
    }
  }
}