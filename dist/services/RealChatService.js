"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealChatService = void 0;
const Conversation_1 = __importDefault(require("../models/Conversation"));
const Message_1 = __importDefault(require("../models/Message"));
class RealChatService {
    static async createConversation(participants, metadata) {
        console.log('[RealChatService] createConversation - participants:', JSON.stringify(participants), 'metadata:', JSON.stringify(metadata));
        const conv = new Conversation_1.default({ participants, metadata });
        await conv.save();
        console.log('[RealChatService] createConversation - saved with ID:', conv._id, 'metadata:', conv.metadata);
        return conv;
    }
    static async getConversationsForUser(userId) {
        console.log('[RealChatService] getConversationsForUser - userId:', userId);
        const convs = await Conversation_1.default.find({ 'participants.user': userId })
            .sort({ updatedAt: -1 })
            .populate('participants.user', 'email name firstName');
        console.log('[RealChatService] getConversationsForUser - found', convs.length, 'conversations with metadata:', convs.map(c => ({ _id: c._id, metadata: c.metadata })));
        return convs;
    }
    static async getMessages(conversationId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const messages = await Message_1.default.find({ conversation: conversationId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'email name');
        return messages.reverse();
    }
    static async addMessage(conversationId, senderId, content, type = 'text') {
        const msg = new Message_1.default({ conversation: conversationId, sender: senderId, content, type, readBy: [senderId] });
        await msg.save();
        await Conversation_1.default.findByIdAndUpdate(conversationId, { lastMessage: content, updatedAt: new Date() });
        return msg;
    }
    static async markRead(conversationId, userId) {
        await Message_1.default.updateMany({ conversation: conversationId, readBy: { $ne: userId } }, { $push: { readBy: userId } });
    }
}
exports.RealChatService = RealChatService;
