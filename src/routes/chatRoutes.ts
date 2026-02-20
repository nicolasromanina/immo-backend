import { Router, Request, Response } from 'express';
import { ChatService } from '../services/ChatService';
import { ChatController } from '../controllers/chatController';
import { authenticateJWT, authorizeRoles, AuthRequest } from '../middlewares/auth';
import { ChatRequest } from '../assistants/types/chat.types';
import { Role } from '../config/roles';

const router = Router();
const chatService = new ChatService();

// CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Chat endpoint (streaming)
router.post('/chat', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const request: ChatRequest = {
      ...req.body,
      userId: req.user?.id, // Utilisation de 'id' au lieu de 'userId'
    };

    const stream = await chatService.handleChat(request, true);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Pipe the stream to response
    (stream as NodeJS.ReadableStream).pipe(res);
    
  } catch (error: any) {
    console.error('Streaming chat error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Chat endpoint (non-streaming)
router.post('/chat/sync', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const request: ChatRequest = {
      ...req.body,
      userId: req.user?.id,
    };

    const response = await chatService.handleChat(request, false);
    res.json(response);
  } catch (error: any) {
    console.error('Sync chat error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get user conversations
router.get('/conversations', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { assistantType, limit = 20, page = 1 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await chatService.getUserConversations(
      userId,
      assistantType as string,
      parseInt(limit as string),
      parseInt(page as string)
    );

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Delete conversation
router.delete('/conversations/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const deleted = await chatService.deleteConversation(id, userId);
    
    if (deleted) {
      res.json({ success: true, message: 'Conversation deleted' });
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Route spécifique pour acheteurs (accessible par tous les utilisateurs authentifiés)
router.post('/chat/buyer', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const request: ChatRequest = {
      ...req.body,
      assistantType: 'buyer',
      userId: req.user?.id,
    };

    const response = await chatService.handleChat(request, false);
    res.json(response);
  } catch (error: any) {
    console.error('Buyer chat error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Route spécifique pour promoteurs (authentifiée avec rôle promoteur ou admin)
router.post('/chat/promoter', 
  authenticateJWT, 
  authorizeRoles(Role.PROMOTEUR, Role.ADMIN), 
  async (req: AuthRequest, res: Response) => {
    try {
      const request: ChatRequest = {
        ...req.body,
        assistantType: 'promoter',
        userId: req.user?.id,
      };

      const response = await chatService.handleChat(request, false);
      res.json(response);
    } catch (error: any) {
      console.error('Promoter chat error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Route spécifique pour admins (authentifiée avec rôle admin seulement)
router.post('/chat/admin', 
  authenticateJWT, 
  authorizeRoles(Role.ADMIN), 
  async (req: AuthRequest, res: Response) => {
    try {
      const request: ChatRequest = {
        ...req.body,
        assistantType: 'admin',
        userId: req.user?.id,
      };

      const response = await chatService.handleChat(request, false);
      res.json(response);
    } catch (error: any) {
      console.error('Admin chat error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Route publique pour les visiteurs (non authentifiés) - acheteurs seulement
router.post('/chat/public/buyer', async (req: Request, res: Response) => {
  try {
    const request: ChatRequest = {
      ...req.body,
      assistantType: 'buyer',
      // Pas de userId pour les utilisateurs non authentifiés
    };

    const response = await chatService.handleChat(request, false);
    res.json(response);
  } catch (error: any) {
    console.error('Public buyer chat error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Route pour les managers
router.post('/chat/manager', 
  authenticateJWT, 
  authorizeRoles(Role.MANAGER, Role.ADMIN), 
  async (req: AuthRequest, res: Response) => {
    try {
      const request: ChatRequest = {
        ...req.body,
        assistantType: 'admin', // Les managers utilisent l'assistant admin
        userId: req.user?.id,
      };

      const response = await chatService.handleChat(request, false);
      res.json(response);
    } catch (error: any) {
      console.error('Manager chat error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Route pour les auditors
router.post('/chat/auditor', 
  authenticateJWT, 
  authorizeRoles(Role.AUDITOR, Role.ADMIN), 
  async (req: AuthRequest, res: Response) => {
    try {
      const request: ChatRequest = {
        ...req.body,
        assistantType: 'admin', // Les auditors utilisent l'assistant admin
        userId: req.user?.id,
      };

      const response = await chatService.handleChat(request, false);
      res.json(response);
    } catch (error: any) {
      console.error('Auditor chat error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Route pour le support
router.post('/chat/support', 
  authenticateJWT, 
  authorizeRoles(Role.SUPPORT, Role.ADMIN), 
  async (req: AuthRequest, res: Response) => {
    try {
      const request: ChatRequest = {
        ...req.body,
        assistantType: 'admin', // Le support utilise l'assistant admin
        userId: req.user?.id,
      };

      const response = await chatService.handleChat(request, false);
      res.json(response);
    } catch (error: any) {
      console.error('Support chat error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

// Real-time chat REST endpoints (conversations/messages)
router.post('/rt/conversations', authenticateJWT, ChatController.createConversation);
router.get('/rt/conversations', authenticateJWT, ChatController.getConversations);
router.get('/rt/conversations/:id/messages', authenticateJWT, ChatController.getMessages);
router.post('/rt/conversations/:id/messages', authenticateJWT, ChatController.postMessage);
router.patch('/rt/conversations/:id/read', authenticateJWT, ChatController.markRead);

export default router;