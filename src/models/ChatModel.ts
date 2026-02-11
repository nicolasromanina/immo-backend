import mongoose, { Schema, Document, Model } from 'mongoose';
import { Conversation, ChatMessage as ImportedChatMessage } from '../assistants/types/chat.types';

// Extend ChatMessage to include timestamp for Mongoose schema
export interface ChatMessage extends ImportedChatMessage {
  timestamp?: Date;
}

// Type pour les rôles de message
type MessageRole = 'system' | 'user' | 'assistant';

// Méthodes d’instance
export interface IConversationMethods {
  addMessage(role: MessageRole, content: string): IConversation;
  getRecentMessages(limit?: number): ChatMessage[];
  cleanupOldMessages(maxMessages?: number): IConversation;
}

// Méthodes statiques
export interface ConversationModelStatic extends Model<IConversation, {}, IConversationMethods> {
  findActiveByUser(userId: string, limit?: number): Promise<IConversation[]>;
  archiveConversation(conversationId: string, userId: string): Promise<IConversation | null>;
  countTokens(messages: ChatMessage[]): number;
}

// Interface principale étendue
export interface IConversation extends Document, Omit<Conversation, '_id'>, IConversationMethods {
  title?: string;
  isActive?: boolean;
  metadata?: {
    language?: string;
    model?: string;
    tokens?: number;
    device?: string;
  };
  lastMessage?: ChatMessage | null;
  messageCount?: number;
  firstUserMessage?: string | null;
}

// ---------------------- ChatMessage Schema ----------------------
const ChatMessageSchema = new Schema<ChatMessage>(
  {
    role: {
      type: String,
      enum: ['system', 'user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 10000,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual pour preview
ChatMessageSchema.virtual('preview').get(function (this: { content?: string }) {
  const content = this.content || '';
  return content.length > 100 ? content.substring(0, 100) + '...' : content;
});

// ---------------------- Conversation Schema ----------------------
const ConversationSchema = new Schema<IConversation, ConversationModelStatic, IConversationMethods>(
  {
    userId: { type: String, required: true, index: true },
    assistantType: {
      type: String,
      enum: ['buyer', 'promoter', 'admin'],
      required: true,
      index: true,
    },
    title: { type: String, default: 'Nouvelle conversation', trim: true, maxlength: 200 },
    messages: {
      type: [ChatMessageSchema],
      default: [],
      validate: {
        validator: (messages: ChatMessage[]) => messages.length <= 500,
        message: 'Une conversation ne peut pas contenir plus de 500 messages',
      },
    },
    isActive: { type: Boolean, default: true, index: true },
    metadata: {
      language: { type: String, default: 'fr', enum: ['fr', 'en', 'es', 'pt'] },
      model: { type: String, default: 'llama-3.3-70b-versatile' },
      tokens: { type: Number, default: 0, min: 0 },
      device: { type: String, default: 'web', enum: ['web', 'mobile', 'tablet', 'desktop'] },
    },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ---------------------- Indexes ----------------------
ConversationSchema.index({ userId: 1, assistantType: 1, updatedAt: -1 });
ConversationSchema.index({ userId: 1, isActive: 1 });
ConversationSchema.index({ userId: 1, createdAt: -1 });
ConversationSchema.index({ assistantType: 1, updatedAt: -1 });

// ---------------------- Virtuals ----------------------
ConversationSchema.virtual('lastMessage').get(function (this: IConversation) {
  if (this.messages && this.messages.length > 0) return this.messages[this.messages.length - 1];
  return null;
});

ConversationSchema.virtual('messageCount').get(function (this: IConversation) {
  return this.messages ? this.messages.length : 0;
});

ConversationSchema.virtual('firstUserMessage').get(function (this: IConversation) {
  if (this.messages && this.messages.length > 0) {
    const userMsg = this.messages.find((msg) => msg.role === 'user');
    return userMsg ? userMsg.content : null;
  }
  return null;
});

// ---------------------- Middleware pre-save ----------------------
ConversationSchema.pre('save', function (next) {
  const conversation = this as IConversation;

  if ((!conversation.title || conversation.title === 'Nouvelle conversation') && conversation.messages.length > 0) {
    const firstUserMessage = conversation.messages.find((msg) => msg.role === 'user');
    if (firstUserMessage) {
      const words = firstUserMessage.content.split(' ').slice(0, 8);
      conversation.title = words.join(' ') + (words.length === 8 ? '...' : '');
      if (conversation.title.length > 200) conversation.title = conversation.title.substring(0, 197) + '...';
    }
  }

  conversation.updatedAt = new Date();
  next();
});

// ---------------------- Méthodes statiques ----------------------
ConversationSchema.statics.findActiveByUser = function (userId: string, limit = 20) {
  return this.find({ userId, isActive: true })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('_id title assistantType updatedAt messages')
    .lean();
};

ConversationSchema.statics.archiveConversation = async function (conversationId: string, userId: string) {
  return this.findOneAndUpdate(
    { _id: conversationId, userId },
    { isActive: false, updatedAt: new Date() },
    { new: true }
  );
};

ConversationSchema.statics.countTokens = function (messages: ChatMessage[]): number {
  let totalChars = 0;
  messages.forEach((msg) => (totalChars += msg.content.length));
  return Math.ceil(totalChars / 4);
};

// ---------------------- Méthodes d’instance ----------------------
ConversationSchema.methods.addMessage = function (
  this: IConversation,
  role: MessageRole,
  content: string
): IConversation {
  if (!['system', 'user', 'assistant'].includes(role)) throw new Error('Rôle de message invalide');
  if (!content || content.trim().length === 0) throw new Error('Le contenu du message est requis');

  this.messages.push({ role, content: content.trim() });
  if (this.metadata) {
    const staticModel = this.constructor as ConversationModelStatic;
    this.metadata.tokens = staticModel.countTokens(this.messages);
  }

  this.updatedAt = new Date();
  return this;
};

ConversationSchema.methods.getRecentMessages = function (this: IConversation, limit = 10): ChatMessage[] {
  return this.messages.slice(-limit);
};

ConversationSchema.methods.cleanupOldMessages = function (this: IConversation, maxMessages = 100): IConversation {
  if (this.messages.length > maxMessages) {
    const systemMessages = this.messages.filter((msg) => msg.role === 'system');
    const otherMessages = this.messages.filter((msg) => msg.role !== 'system');
    const recentOther = otherMessages.slice(-(maxMessages - systemMessages.length));
    this.messages = [...systemMessages, ...recentOther];
    this.updatedAt = new Date();
  }
  return this;
};

// ---------------------- Export ----------------------
export const ConversationModel = mongoose.model<IConversation, ConversationModelStatic>(
  'Conversation',
  ConversationSchema
);
