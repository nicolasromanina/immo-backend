"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ChatService_1 = require("../services/ChatService");
const chatController_1 = require("../controllers/chatController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
const chatService = new ChatService_1.ChatService();
// CORS middleware
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
// Chat endpoint (streaming)
router.post('/chat', auth_1.authenticateJWT, async (req, res) => {
    try {
        const request = {
            ...req.body,
            userId: req.user?.id, // Utilisation de 'id' au lieu de 'userId'
        };
        const stream = await chatService.handleChat(request, true);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // Pipe the stream to response
        stream.pipe(res);
    }
    catch (error) {
        console.error('Streaming chat error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Chat endpoint (non-streaming)
router.post('/chat/sync', auth_1.authenticateJWT, async (req, res) => {
    try {
        const request = {
            ...req.body,
            userId: req.user?.id,
        };
        const response = await chatService.handleChat(request, false);
        res.json(response);
    }
    catch (error) {
        console.error('Sync chat error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Get user conversations
router.get('/conversations', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { assistantType, limit = 20, page = 1 } = req.query;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const result = await chatService.getUserConversations(userId, assistantType, parseInt(limit), parseInt(page));
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Delete conversation
router.delete('/conversations/:id', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const deleted = await chatService.deleteConversation(id, userId);
        if (deleted) {
            res.json({ success: true, message: 'Conversation deleted' });
        }
        else {
            res.status(404).json({ error: 'Conversation not found' });
        }
    }
    catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Route spécifique pour acheteurs (accessible par tous les utilisateurs authentifiés)
router.post('/chat/buyer', auth_1.authenticateJWT, async (req, res) => {
    try {
        const request = {
            ...req.body,
            assistantType: 'buyer',
            userId: req.user?.id,
        };
        const response = await chatService.handleChat(request, false);
        res.json(response);
    }
    catch (error) {
        console.error('Buyer chat error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Route spécifique pour promoteurs (authentifiée avec rôle promoteur ou admin)
router.post('/chat/promoter', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.PROMOTEUR, roles_1.Role.ADMIN), async (req, res) => {
    try {
        const request = {
            ...req.body,
            assistantType: 'promoter',
            userId: req.user?.id,
        };
        const response = await chatService.handleChat(request, false);
        res.json(response);
    }
    catch (error) {
        console.error('Promoter chat error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Route spécifique pour admins (authentifiée avec rôle admin seulement)
router.post('/chat/admin', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), async (req, res) => {
    try {
        const request = {
            ...req.body,
            assistantType: 'admin',
            userId: req.user?.id,
        };
        const response = await chatService.handleChat(request, false);
        res.json(response);
    }
    catch (error) {
        console.error('Admin chat error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Route publique pour les visiteurs (non authentifiés) - acheteurs seulement
router.post('/chat/public/buyer', async (req, res) => {
    try {
        const request = {
            ...req.body,
            assistantType: 'buyer',
            // Pas de userId pour les utilisateurs non authentifiés
        };
        const response = await chatService.handleChat(request, false);
        res.json(response);
    }
    catch (error) {
        console.error('Public buyer chat error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Route pour les managers
router.post('/chat/manager', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.MANAGER, roles_1.Role.ADMIN), async (req, res) => {
    try {
        const request = {
            ...req.body,
            assistantType: 'admin', // Les managers utilisent l'assistant admin
            userId: req.user?.id,
        };
        const response = await chatService.handleChat(request, false);
        res.json(response);
    }
    catch (error) {
        console.error('Manager chat error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Route pour les auditors
router.post('/chat/auditor', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.AUDITOR, roles_1.Role.ADMIN), async (req, res) => {
    try {
        const request = {
            ...req.body,
            assistantType: 'admin', // Les auditors utilisent l'assistant admin
            userId: req.user?.id,
        };
        const response = await chatService.handleChat(request, false);
        res.json(response);
    }
    catch (error) {
        console.error('Auditor chat error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Route pour le support
router.post('/chat/support', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.SUPPORT, roles_1.Role.ADMIN), async (req, res) => {
    try {
        const request = {
            ...req.body,
            assistantType: 'admin', // Le support utilise l'assistant admin
            userId: req.user?.id,
        };
        const response = await chatService.handleChat(request, false);
        res.json(response);
    }
    catch (error) {
        console.error('Support chat error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Real-time chat REST endpoints (conversations/messages)
router.post('/rt/conversations', auth_1.authenticateJWT, chatController_1.ChatController.createConversation);
router.get('/rt/conversations', auth_1.authenticateJWT, chatController_1.ChatController.getConversations);
router.get('/rt/conversations/:id/messages', auth_1.authenticateJWT, chatController_1.ChatController.getMessages);
router.post('/rt/conversations/:id/messages', auth_1.authenticateJWT, chatController_1.ChatController.postMessage);
router.patch('/rt/conversations/:id/read', auth_1.authenticateJWT, chatController_1.ChatController.markRead);
exports.default = router;
