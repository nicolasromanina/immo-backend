"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ---------------------- ChatMessage Schema ----------------------
const ChatMessageSchema = new mongoose_1.Schema({
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
}, {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Virtual pour preview
ChatMessageSchema.virtual('preview').get(function () {
    const content = this.content || '';
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
});
// ---------------------- Conversation Schema ----------------------
const ConversationSchema = new mongoose_1.Schema({
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
            validator: (messages) => messages.length <= 500,
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
}, {
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
});
// ---------------------- Indexes ----------------------
ConversationSchema.index({ userId: 1, assistantType: 1, updatedAt: -1 });
ConversationSchema.index({ userId: 1, isActive: 1 });
ConversationSchema.index({ userId: 1, createdAt: -1 });
ConversationSchema.index({ assistantType: 1, updatedAt: -1 });
// ---------------------- Virtuals ----------------------
ConversationSchema.virtual('lastMessage').get(function () {
    if (this.messages && this.messages.length > 0)
        return this.messages[this.messages.length - 1];
    return null;
});
ConversationSchema.virtual('messageCount').get(function () {
    return this.messages ? this.messages.length : 0;
});
ConversationSchema.virtual('firstUserMessage').get(function () {
    if (this.messages && this.messages.length > 0) {
        const userMsg = this.messages.find((msg) => msg.role === 'user');
        return userMsg ? userMsg.content : null;
    }
    return null;
});
// ---------------------- Middleware pre-save ----------------------
ConversationSchema.pre('save', function (next) {
    const conversation = this;
    if ((!conversation.title || conversation.title === 'Nouvelle conversation') && conversation.messages.length > 0) {
        const firstUserMessage = conversation.messages.find((msg) => msg.role === 'user');
        if (firstUserMessage) {
            const words = firstUserMessage.content.split(' ').slice(0, 8);
            conversation.title = words.join(' ') + (words.length === 8 ? '...' : '');
            if (conversation.title.length > 200)
                conversation.title = conversation.title.substring(0, 197) + '...';
        }
    }
    conversation.updatedAt = new Date();
    next();
});
// ---------------------- Méthodes statiques ----------------------
ConversationSchema.statics.findActiveByUser = function (userId, limit = 20) {
    return this.find({ userId, isActive: true })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select('_id title assistantType updatedAt messages')
        .lean();
};
ConversationSchema.statics.archiveConversation = async function (conversationId, userId) {
    return this.findOneAndUpdate({ _id: conversationId, userId }, { isActive: false, updatedAt: new Date() }, { new: true });
};
ConversationSchema.statics.countTokens = function (messages) {
    let totalChars = 0;
    messages.forEach((msg) => (totalChars += msg.content.length));
    return Math.ceil(totalChars / 4);
};
// ---------------------- Méthodes d’instance ----------------------
ConversationSchema.methods.addMessage = function (role, content) {
    if (!['system', 'user', 'assistant'].includes(role))
        throw new Error('Rôle de message invalide');
    if (!content || content.trim().length === 0)
        throw new Error('Le contenu du message est requis');
    this.messages.push({ role, content: content.trim() });
    if (this.metadata) {
        const staticModel = this.constructor;
        this.metadata.tokens = staticModel.countTokens(this.messages);
    }
    this.updatedAt = new Date();
    return this;
};
ConversationSchema.methods.getRecentMessages = function (limit = 10) {
    return this.messages.slice(-limit);
};
ConversationSchema.methods.cleanupOldMessages = function (maxMessages = 100) {
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
exports.ConversationModel = mongoose_1.default.model('Conversation', ConversationSchema);
