"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealChatService = void 0;
const Conversation_1 = __importDefault(require("../models/Conversation"));
const Message_1 = __importDefault(require("../models/Message"));
const Lead_1 = __importDefault(require("../models/Lead"));
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
    static async getConversationsForPromoter(promoteurId) {
        console.log('[RealChatService] getConversationsForPromoter - promoteurId:', promoteurId);
        // Get all leads for this promoteur
        const leads = await Lead_1.default.find({ promoteur: promoteurId }).select('_id client').lean();
        const clientIds = leads.filter(l => l.client).map(l => l.client.toString());
        // Get conversations involving these clients
        const convs = await Conversation_1.default.find({ 'participants.user': { $in: clientIds } })
            .sort({ updatedAt: -1 })
            .populate('participants.user', 'email name firstName');
        console.log('[RealChatService] getConversationsForPromoter - found', convs.length, 'conversations');
        return convs;
    }
    static async getMessages(conversationId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const messages = await Message_1.default.find({ conversation: conversationId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'email name')
            .populate('readBy', '_id');
        return messages.reverse();
    }
    static async addMessage(conversationId, senderId, content, type = 'text') {
        const msg = new Message_1.default({ conversation: conversationId, sender: senderId, content, type, readBy: [senderId] });
        await msg.save();
        // Populate sender and readBy before returning
        await msg.populate('sender', 'email name firstName lastName');
        await msg.populate('readBy', '_id');
        await Conversation_1.default.findByIdAndUpdate(conversationId, { lastMessage: content, updatedAt: new Date() });
        return msg;
    }
    static async markRead(conversationId, userId) {
        await Message_1.default.updateMany({ conversation: conversationId, readBy: { $ne: userId } }, { $push: { readBy: userId } });
    }
    static async canUserAccessConversation(conversationId, userId) {
        const conv = await Conversation_1.default.findById(conversationId).select('participants.user').lean();
        if (!conv)
            return false;
        // Check if user is a direct participant
        const isParticipant = conv.participants.some(p => p.user.toString() === userId);
        if (isParticipant)
            return true;
        // Check if user is a promoteur team member
        // This is implicit through conversation structure, so for now we allow any direct participant
        return false;
    }
}
exports.RealChatService = RealChatService;
