import Conversation from '../models/Conversation';
import Message from '../models/Message';

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

  static async getMessages(conversationId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'email name');
    return messages.reverse();
  }

  static async addMessage(conversationId: string, senderId: string, content: string, type: 'text' | 'image' | 'file' = 'text') {
    const msg = new Message({ conversation: conversationId, sender: senderId, content, type, readBy: [senderId] });
    await msg.save();

    await Conversation.findByIdAndUpdate(conversationId, { lastMessage: content, updatedAt: new Date() });

    return msg;
  }

  static async markRead(conversationId: string, userId: string) {
    await Message.updateMany({ conversation: conversationId, readBy: { $ne: userId } }, { $push: { readBy: userId } });
  }
}
