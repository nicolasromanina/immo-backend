import Conversation from '../models/Conversation';
import Message from '../models/Message';
import Lead from '../models/Lead';

export class RealChatService {
  static async createConversation(participants: { user: string; role?: string }[], metadata?: { type?: string; leadName?: string }) {
    console.log('[RealChatService] createConversation - participants:', JSON.stringify(participants), 'metadata:', JSON.stringify(metadata));
    const conv = new Conversation({ participants, metadata });
    await conv.save();
    console.log('[RealChatService] createConversation - saved with ID:', conv._id, 'metadata:', conv.metadata);
    return conv;
  }

  static async getConversationsForUser(userId: string) {
    console.log('[RealChatService] getConversationsForUser - userId:', userId);
    const convs = await Conversation.find({ 'participants.user': userId })
      .sort({ updatedAt: -1 })
      .populate('participants.user', 'email name firstName');
    console.log('[RealChatService] getConversationsForUser - found', convs.length, 'conversations with metadata:', convs.map(c => ({ _id: c._id, metadata: c.metadata })));
    return convs;
  }

  static async getConversationsForPromoter(promoteurId: string) {
    console.log('[RealChatService] getConversationsForPromoter - promoteurId:', promoteurId);
    // Get all leads for this promoteur
    const leads = await Lead.find({ promoteur: promoteurId }).select('_id client').lean();
    const clientIds = leads.filter(l => l.client).map(l => l.client.toString());

    // Get conversations involving these clients
    const convs = await Conversation.find({ 'participants.user': { $in: clientIds } })
      .sort({ updatedAt: -1 })
      .populate('participants.user', 'email name firstName');

    console.log('[RealChatService] getConversationsForPromoter - found', convs.length, 'conversations');
    return convs;
  }

  static async getMessages(conversationId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'email name')
      .populate('readBy', '_id');
    return messages.reverse();
  }

  static async addMessage(conversationId: string, senderId: string, content: string, type: 'text' | 'image' | 'file' = 'text') {
    const msg = new Message({ conversation: conversationId, sender: senderId, content, type, readBy: [senderId] });
    await msg.save();

    // Populate sender and readBy before returning
    await msg.populate('sender', 'email name firstName lastName');
    await msg.populate('readBy', '_id');

    await Conversation.findByIdAndUpdate(conversationId, { lastMessage: content, updatedAt: new Date() });

    return msg;
  }

  static async markRead(conversationId: string, userId: string) {
    await Message.updateMany({ conversation: conversationId, readBy: { $ne: userId } }, { $push: { readBy: userId } });
  }

  static async canUserAccessConversation(conversationId: string, userId: string): Promise<boolean> {
    const conv = await Conversation.findById(conversationId).select('participants.user').lean();
    if (!conv) return false;

    // Check if user is a direct participant
    const isParticipant = (conv.participants as any[]).some(p => p.user.toString() === userId);
    if (isParticipant) return true;

    // Check if user is a promoteur team member
    // This is implicit through conversation structure, so for now we allow any direct participant
    return false;
  }
}
