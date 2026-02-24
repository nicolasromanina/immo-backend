"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const RealChatService_1 = require("../services/RealChatService");
const Lead_1 = __importDefault(require("../models/Lead"));
const User_1 = __importDefault(require("../models/User"));
class ChatController {
    static async createConversation(req, res) {
        try {
            const { participants, metadata } = req.body;
            console.log('[CHAT][CTRL] createConversation - received participants:', JSON.stringify(participants), 'metadata:', JSON.stringify(metadata));
            // Resolve participant user ids: ensure they reference real User ids.
            const resolvedParticipants = await Promise.all((participants || []).map(async (p) => {
                try {
                    if (!p?.user)
                        return p;
                    // If user exists in User collection, keep it
                    const userDoc = await User_1.default.findById(p.user).select('_id').lean();
                    if (userDoc)
                        return { ...p, user: String(userDoc._id) };
                    // Otherwise, try resolving as a Lead doc -> use lead.client
                    const lead = await Lead_1.default.findById(p.user).select('client').lean();
                    if (lead && lead.client) {
                        console.log('[CHAT][CTRL] createConversation - resolved lead', p.user, 'to client', lead.client);
                        return { ...p, user: String(lead.client) };
                    }
                    // If lead exists but has NO client, reject the conversation
                    if (lead && !lead.client) {
                        console.warn('[CHAT][CTRL] createConversation - lead exists but has no client:', p.user);
                        throw new Error(`Lead ${p.user} has no authenticated client linked`);
                    }
                }
                catch (err) {
                    console.warn('[CHAT][CTRL] createConversation - participant resolution failed for', p, err);
                }
                return p;
            }));
            // Deduplicate participants by user id
            const seen = new Set();
            const dedup = [];
            for (const p of resolvedParticipants) {
                const uid = p && p.user ? String(p.user) : null;
                if (!uid)
                    continue;
                if (seen.has(uid))
                    continue;
                seen.add(uid);
                dedup.push(p);
            }
            if (dedup.length < 2) {
                console.warn('[CHAT][CTRL] createConversation - insufficient participants after resolution, dedup:', dedup);
                return res.status(400).json({ message: 'Insufficient participants: the lead may not be linked to a client user.' });
            }
            const conv = await RealChatService_1.RealChatService.createConversation(dedup, metadata);
            console.log('[CHAT][CTRL] createConversation - conversation created with ID:', conv._id, 'metadata:', conv.metadata);
            res.status(201).json(conv);
        }
        catch (err) {
            // Check for lead-without-client error
            if (err.message && err.message.includes('has no authenticated client linked')) {
                console.warn('[CHAT][CTRL] Rejecting conversation: lead not authenticated', err.message);
                return res.status(400).json({
                    code: 'LEAD_NO_CLIENT',
                    message: 'Cannot create conversation with a lead that has no authenticated client account'
                });
            }
            console.error('[CHAT][CTRL] createConversation error', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
    static async getConversations(req, res) {
        try {
            const userId = req.user.id;
            console.log('[CHAT][CTRL] getConversations - userId:', userId);
            const convs = await RealChatService_1.RealChatService.getConversationsForUser(userId);
            console.log('[CHAT][CTRL] getConversations - conversations found:', convs.length);
            res.json({ conversations: convs });
        }
        catch (err) {
            console.error('[CHAT][CTRL] getConversations error', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
    static async getMessages(req, res) {
        try {
            const { id } = req.params;
            const page = req.query.page ? parseInt(req.query.page) : 1;
            console.log('[CHAT][CTRL] getMessages - conversationId:', id, 'page:', page);
            const msgs = await RealChatService_1.RealChatService.getMessages(id, page);
            console.log('[CHAT][CTRL] getMessages - retrieved', msgs.length, 'messages');
            res.json({ messages: msgs });
        }
        catch (err) {
            console.error('[CHAT][CTRL] getMessages error', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
    static async postMessage(req, res) {
        try {
            const { id } = req.params; // conversation id
            const senderId = req.user.id;
            const { content, type } = req.body;
            console.log('[CHAT][CTRL] postMessage - conversationId:', id, 'senderId:', senderId, 'content length:', content?.length);
            const msg = await RealChatService_1.RealChatService.addMessage(id, senderId, content, type);
            console.log('[CHAT][CTRL] postMessage - message saved:', msg._id);
            res.status(201).json(msg);
        }
        catch (err) {
            console.error('[CHAT][CTRL] postMessage error', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
    static async markRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            await RealChatService_1.RealChatService.markRead(id, userId);
            res.json({ success: true });
        }
        catch (err) {
            console.error('[CHAT][CTRL] markRead error', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.ChatController = ChatController;
