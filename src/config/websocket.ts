import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Notification from '../models/Notification';
import { RealChatService } from '../services/RealChatService';
import { getJwtSecret } from './jwt';

let io: SocketServer | null = null;

const mask = (s?: string) => (s && s.length > 12 ? `${s.slice(0,6)}...${s.slice(-6)}` : s);

// Map userId -> Set of socket IDs
const userSockets = new Map<string, Set<string>>();

export function initWebSocket(server: HTTPServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const handshakeAuthPreview = socket.handshake.auth ? { ...socket.handshake.auth } : undefined;
    if (handshakeAuthPreview && handshakeAuthPreview.token) handshakeAuthPreview.token = mask(handshakeAuthPreview.token as string);
    console.debug('[WS] auth middleware handshake', {
      id: socket.id,
      auth: socket.handshake.auth ? 'present' : 'none',
      query: Object.keys(socket.handshake.query || {}).length ? socket.handshake.query : undefined,
      address: (socket.handshake as any).address || socket.handshake.address,
      authPreview: handshakeAuthPreview,
    });

    if (!token) {
      console.warn('[WS] Authentication required - no token provided', { socketId: socket.id });
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token as string, getJwtSecret()) as any;
      (socket as any).userId = decoded.id || decoded.userId;
      (socket as any).roles = decoded.roles || [];
      console.debug('[WS] token decoded', { socketId: socket.id, userId: (socket as any).userId, roles: (socket as any).roles });
      next();
    } catch (err) {
      console.warn('[WS] Invalid token during handshake', { socketId: socket.id, err: (err as Error).message });
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    if (!userId) return;

    // Track user sockets
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-based rooms
    const roles = (socket as any).roles || [];
    roles.forEach((role: string) => socket.join(`role:${role}`));

    console.log(`[WS] User ${userId} connected (${socket.id})`);
    const connAuthPreview = socket.handshake.auth ? { ...socket.handshake.auth } : undefined;
    if (connAuthPreview && connAuthPreview.token) connAuthPreview.token = mask(connAuthPreview.token as string);
    console.debug('[WS] connection details', {
      socketId: socket.id,
      userId,
      roles: (socket as any).roles,
      rooms: Array.from(socket.rooms),
      handshakeQuery: socket.handshake.query,
      handshakeAuth: connAuthPreview,
    });

    // Handle joining project-specific rooms
    socket.on('join:project', (projectId: string) => {
      console.debug('[WS] join:project', { userId, socketId: socket.id, projectId });
      socket.join(`project:${projectId}`);
    });

    socket.on('leave:project', (projectId: string) => {
      console.debug('[WS] leave:project', { userId, socketId: socket.id, projectId });
      socket.leave(`project:${projectId}`);
    });

    // Chat rooms: join/leave conversation rooms
    socket.on('chat:join', (conversationId: string) => {
      console.debug('[WS] chat:join', { userId, socketId: socket.id, conversationId });
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('chat:leave', (conversationId: string) => {
      console.debug('[WS] chat:leave', { userId, socketId: socket.id, conversationId });
      socket.leave(`conversation:${conversationId}`);
    });

    // Incoming chat message via WS
    socket.on('chat:message', async (data: { conversationId: string; content: string; type?: string }) => {
      try {
        console.debug('[WS] chat:message received', { userId, socketId: socket.id, conversationId: data.conversationId });
        const msg = await RealChatService.addMessage(data.conversationId, userId, data.content, (data.type as any) || 'text');
        const payload = {
          _id: (msg as any)._id,
          conversation: (msg as any).conversation,
          sender: (msg as any).sender,
          content: (msg as any).content,
          type: (msg as any).type,
          createdAt: (msg as any).createdAt,
        };
        io?.to(`conversation:${data.conversationId}`).emit('chat:message', payload);
      } catch (err) {
        console.error('[WS] chat:message error', err);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user:typing', {
        userId,
        conversationId: data.conversationId,
      });
    });

    // Mark notification as read via WS
    socket.on('notification:markRead', async (data: { notificationId: string }) => {
      try {
        await Notification.findOneAndUpdate(
          { _id: data.notificationId, recipient: userId },
          { read: true, readAt: new Date() }
        );
        io?.to(`user:${userId}`).emit('notification:read', { notificationId: data.notificationId });
      } catch (err) {
        console.error('[WS] Error marking notification as read:', err);
      }
    });

    // Mark all notifications as read
    socket.on('notification:markAllRead', async () => {
      try {
        await Notification.updateMany(
          { recipient: userId, read: false },
          { read: true, readAt: new Date() }
        );
        io?.to(`user:${userId}`).emit('notification:allRead');
      } catch (err) {
        console.error('[WS] Error marking all notifications as read:', err);
      }
    });

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
      console.log(`[WS] User ${userId} disconnected (${socket.id})`);
      console.debug('[WS] disconnect details', { userId, socketId: socket.id, remainingSockets: userSockets.get(userId)?.size || 0 });
    });
  });

  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

// Emit to a specific user
export function emitToUser(userId: string, event: string, data: any) {
  if (io) io.to(`user:${userId}`).emit(event, data);
}

// Emit to all users with a specific role
export function emitToRole(role: string, event: string, data: any) {
  if (io) io.to(`role:${role}`).emit(event, data);
}

// Emit to all connected clients
export function emitToAll(event: string, data: any) {
  if (io) io.emit(event, data);
}

// Emit to a project room
export function emitToProject(projectId: string, event: string, data: any) {
  if (io) io.to(`project:${projectId}`).emit(event, data);
}

// Check if user is online
export function isUserOnline(userId: string): boolean {
  return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
}

// Get online users count
export function getOnlineUsersCount(): number {
  return userSockets.size;
}
