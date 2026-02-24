"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocket = initWebSocket;
exports.getIO = getIO;
exports.emitToUser = emitToUser;
exports.emitToRole = emitToRole;
exports.emitToAll = emitToAll;
exports.emitToProject = emitToProject;
exports.isUserOnline = isUserOnline;
exports.getOnlineUsersCount = getOnlineUsersCount;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Notification_1 = __importDefault(require("../models/Notification"));
const RealChatService_1 = require("../services/RealChatService");
const jwt_1 = require("./jwt");
let io = null;
const mask = (s) => (s && s.length > 12 ? `${s.slice(0, 6)}...${s.slice(-6)}` : s);
// Map userId -> Set of socket IDs
const userSockets = new Map();
function initWebSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        const handshakeAuthPreview = socket.handshake.auth ? { ...socket.handshake.auth } : undefined;
        if (handshakeAuthPreview && handshakeAuthPreview.token)
            handshakeAuthPreview.token = mask(handshakeAuthPreview.token);
        console.debug('[WS] auth middleware handshake', {
            id: socket.id,
            auth: socket.handshake.auth ? 'present' : 'none',
            query: Object.keys(socket.handshake.query || {}).length ? socket.handshake.query : undefined,
            address: socket.handshake.address || socket.handshake.address,
            authPreview: handshakeAuthPreview,
        });
        if (!token) {
            console.warn('[WS] Authentication required - no token provided', { socketId: socket.id });
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, (0, jwt_1.getJwtSecret)());
            socket.userId = decoded.id || decoded.userId;
            socket.roles = decoded.roles || [];
            console.debug('[WS] token decoded', { socketId: socket.id, userId: socket.userId, roles: socket.roles });
            next();
        }
        catch (err) {
            console.warn('[WS] Invalid token during handshake', { socketId: socket.id, err: err.message });
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.userId;
        if (!userId)
            return;
        // Track user sockets
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);
        // Join user-specific room
        socket.join(`user:${userId}`);
        // Join role-based rooms
        const roles = socket.roles || [];
        roles.forEach((role) => socket.join(`role:${role}`));
        console.log(`[WS] User ${userId} connected (${socket.id})`);
        const connAuthPreview = socket.handshake.auth ? { ...socket.handshake.auth } : undefined;
        if (connAuthPreview && connAuthPreview.token)
            connAuthPreview.token = mask(connAuthPreview.token);
        console.debug('[WS] connection details', {
            socketId: socket.id,
            userId,
            roles: socket.roles,
            rooms: Array.from(socket.rooms),
            handshakeQuery: socket.handshake.query,
            handshakeAuth: connAuthPreview,
        });
        // Handle joining project-specific rooms
        socket.on('join:project', (projectId) => {
            console.debug('[WS] join:project', { userId, socketId: socket.id, projectId });
            socket.join(`project:${projectId}`);
        });
        socket.on('leave:project', (projectId) => {
            console.debug('[WS] leave:project', { userId, socketId: socket.id, projectId });
            socket.leave(`project:${projectId}`);
        });
        // Chat rooms: join/leave conversation rooms
        socket.on('chat:join', (conversationId) => {
            console.debug('[WS] chat:join', { userId, socketId: socket.id, conversationId });
            socket.join(`conversation:${conversationId}`);
        });
        socket.on('chat:leave', (conversationId) => {
            console.debug('[WS] chat:leave', { userId, socketId: socket.id, conversationId });
            socket.leave(`conversation:${conversationId}`);
        });
        // Incoming chat message via WS
        socket.on('chat:message', async (data) => {
            try {
                console.debug('[WS] chat:message received', { userId, socketId: socket.id, conversationId: data.conversationId });
                const msg = await RealChatService_1.RealChatService.addMessage(data.conversationId, userId, data.content, data.type || 'text');
                const payload = {
                    _id: msg._id,
                    conversation: msg.conversation,
                    sender: msg.sender,
                    content: msg.content,
                    type: msg.type,
                    createdAt: msg.createdAt,
                };
                io?.to(`conversation:${data.conversationId}`).emit('chat:message', payload);
            }
            catch (err) {
                console.error('[WS] chat:message error', err);
                socket.emit('chat:error', { message: 'Failed to send message' });
            }
        });
        // Handle typing indicators
        socket.on('typing', (data) => {
            socket.to(`conversation:${data.conversationId}`).emit('user:typing', {
                userId,
                conversationId: data.conversationId,
            });
        });
        // Mark notification as read via WS
        socket.on('notification:markRead', async (data) => {
            try {
                await Notification_1.default.findOneAndUpdate({ _id: data.notificationId, recipient: userId }, { read: true, readAt: new Date() });
                io?.to(`user:${userId}`).emit('notification:read', { notificationId: data.notificationId });
            }
            catch (err) {
                console.error('[WS] Error marking notification as read:', err);
            }
        });
        // Mark all notifications as read
        socket.on('notification:markAllRead', async () => {
            try {
                await Notification_1.default.updateMany({ recipient: userId, read: false }, { read: true, readAt: new Date() });
                io?.to(`user:${userId}`).emit('notification:allRead');
            }
            catch (err) {
                console.error('[WS] Error marking all notifications as read:', err);
            }
        });
        socket.on('disconnect', () => {
            const sockets = userSockets.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0)
                    userSockets.delete(userId);
            }
            console.log(`[WS] User ${userId} disconnected (${socket.id})`);
            console.debug('[WS] disconnect details', { userId, socketId: socket.id, remainingSockets: userSockets.get(userId)?.size || 0 });
        });
    });
    return io;
}
function getIO() {
    return io;
}
// Emit to a specific user
function emitToUser(userId, event, data) {
    if (io)
        io.to(`user:${userId}`).emit(event, data);
}
// Emit to all users with a specific role
function emitToRole(role, event, data) {
    if (io)
        io.to(`role:${role}`).emit(event, data);
}
// Emit to all connected clients
function emitToAll(event, data) {
    if (io)
        io.emit(event, data);
}
// Emit to a project room
function emitToProject(projectId, event, data) {
    if (io)
        io.to(`project:${projectId}`).emit(event, data);
}
// Check if user is online
function isUserOnline(userId) {
    return userSockets.has(userId) && userSockets.get(userId).size > 0;
}
// Get online users count
function getOnlineUsersCount() {
    return userSockets.size;
}
