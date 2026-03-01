import { Request, Response } from 'express';
import { RealChatService } from '../services/RealChatService';
import { AuthRequest } from '../middlewares/auth';
import Lead from '../models/Lead';
import User from '../models/User';
import Promoteur from '../models/Promoteur';

export class ChatController {
  static async createConversation(req: AuthRequest, res: Response) {
    try {
      const { participants, metadata } = req.body;
      console.log('[CHAT][CTRL] createConversation - received participants:', JSON.stringify(participants), 'metadata:', JSON.stringify(metadata));

      // Resolve participant user ids: ensure they reference real User ids.
      const resolvedParticipants = await Promise.all((participants || []).map(async (p: any) => {
        try {
          if (!p?.user) return p;

          // If user exists in User collection, keep it
          const userDoc = await User.findById(p.user).select('_id').lean();
          if (userDoc) return { ...p, user: String(userDoc._id) };

          // Otherwise, try resolving as a Lead doc -> use lead.client
          const lead = await Lead.findById(p.user).select('client').lean();
          if (lead && lead.client) {
            console.log('[CHAT][CTRL] createConversation - resolved lead', p.user, 'to client', lead.client);
            return { ...p, user: String(lead.client) };
          }
          
          // If lead exists but has NO client, reject the conversation
          if (lead && !lead.client) {
            console.warn('[CHAT][CTRL] createConversation - lead exists but has no client:', p.user);
            throw new Error(`Lead ${p.user} has no authenticated client linked`);
          }
        } catch (err) {
          console.warn('[CHAT][CTRL] createConversation - participant resolution failed for', p, err);
        }
        return p;
      }));

      // Deduplicate participants by user id
      const seen = new Set<string>();
      const dedup = [] as any[];
      for (const p of resolvedParticipants) {
        const uid = p && p.user ? String(p.user) : null;
        if (!uid) continue;
        if (seen.has(uid)) continue;
        seen.add(uid);
        dedup.push(p);
      }

      if (dedup.length < 2) {
        console.warn('[CHAT][CTRL] createConversation - insufficient participants after resolution, dedup:', dedup);
        return res.status(400).json({ message: 'Insufficient participants: the lead may not be linked to a client user.' });
      }

      const conv = await RealChatService.createConversation(dedup, metadata);
      console.log('[CHAT][CTRL] createConversation - conversation created with ID:', conv._id, 'metadata:', conv.metadata);
      res.status(201).json(conv);
    } catch (err: any) {
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

  static async getConversations(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const promoteurId = req.user!.promoteurProfile;

      console.log('[CHAT][CTRL] getConversations - userId:', userId, 'promoteurId:', promoteurId);

      // If user has promoteurProfile (from middleware), check if they're a team member
      let convs: any[] = [];
      if (promoteurId) {
        const promoteur = await Promoteur.findById(promoteurId).select('user teamMembers');
        const isOwner = promoteur?.user.toString() === userId;
        const isTeamMember = promoteur?.teamMembers.some((m: any) => m.userId.toString() === userId);

        if (isOwner || isTeamMember) {
          // Return all conversations from the promoteur's leads
          convs = await RealChatService.getConversationsForPromoter(promoteurId);
          console.log('[CHAT][CTRL] getConversations - team member/owner found', convs.length, 'conversations');
        }
      }

      // Fallback: if not a team member, get conversations where user is a direct participant
      if (convs.length === 0) {
        convs = await RealChatService.getConversationsForUser(userId);
      }

      console.log('[CHAT][CTRL] getConversations - conversations found:', convs.length);
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
      console.log('[CHAT][CTRL] getMessages - conversationId:', id, 'page:', page);
      const msgs = await RealChatService.getMessages(id, page);
      console.log('[CHAT][CTRL] getMessages - retrieved', msgs.length, 'messages');
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
      console.log('[CHAT][CTRL] postMessage - conversationId:', id, 'senderId:', senderId, 'content length:', content?.length);
      const msg = await RealChatService.addMessage(id, senderId, content, type);
      console.log('[CHAT][CTRL] postMessage - message saved:', msg._id);
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
