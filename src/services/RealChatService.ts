import Conversation from '../models/Conversation';
import Message from '../models/Message';

export class RealChatService {
  static async createConversation(participants: { user: string; role?: string }[]) {
    const conv = new Conversation({ participants });
    await conv.save();
    return conv;
  }

  static async getConversationsForUser(userId: string) {
    const convs = await Conversation.find({ 'participants.user': userId })
      .sort({ updatedAt: -1 })
      .populate('participants.user', 'email name');
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
