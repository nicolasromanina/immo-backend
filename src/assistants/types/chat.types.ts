export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  assistantType?: 'buyer' | 'promoter' | 'admin';
  userId?: string;
  conversationId?: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    content: string;
    conversationId: string;
    messageId: string;
    timestamp?: string;
  };
  error?: string;
  stream?: boolean;
}

export interface Conversation {
  _id?: string;
  userId: string;
  assistantType: 'buyer' | 'promoter' | 'admin';
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}