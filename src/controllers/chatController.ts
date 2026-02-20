import { Request, Response } from 'express';
import { RealChatService } from '../services/RealChatService';
import { AuthRequest } from '../middlewares/auth';

export class ChatController {
  static async createConversation(req: AuthRequest, res: Response) {
    try {
      const { participants } = req.body;
      const conv = await RealChatService.createConversation(participants);
      res.status(201).json(conv);
    } catch (err) {
      console.error('[CHAT][CTRL] createConversation error', err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getConversations(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const convs = await RealChatService.getConversationsForUser(userId);
      res.json({ conversations: convs });
    } catch (err) {
      console.error('[CHAT][CTRL] getConversations error', err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getMessages(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const msgs = await RealChatService.getMessages(id, page);
      res.json({ messages: msgs });
    } catch (err) {
      console.error('[CHAT][CTRL] getMessages error', err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async postMessage(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params; // conversation id
      const senderId = req.user!.id;
      const { content, type } = req.body;
      const msg = await RealChatService.addMessage(id, senderId, content, type);
      res.status(201).json(msg);
    } catch (err) {
      console.error('[CHAT][CTRL] postMessage error', err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async markRead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      await RealChatService.markRead(id, userId);
      res.json({ success: true });
    } catch (err) {
      console.error('[CHAT][CTRL] markRead error', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
}
