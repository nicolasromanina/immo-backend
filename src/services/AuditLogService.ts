import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middlewares/auth';

export class AuditLogService {
  static async log(params: {
    actor?: string;
    actorRole?: string;
    action: string;
    category: 'auth' | 'project' | 'user' | 'promoteur' | 'lead' | 'document' | 'moderation' | 'appeal' | 'system' | 'security' | 'business';
    targetType?: string;
    targetId?: string;
    description: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
    userId?: string;
    severity?: string;
    targetModel?: string;
  }) {
    try {
      const log = new AuditLog({
        actor: params.actor,
        actorRole: params.actorRole,
        action: params.action,
        category: params.category,
        targetType: params.targetType,
        targetId: params.targetId,
        description: params.description,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        success: params.success !== undefined ? params.success : true,
        errorMessage: params.errorMessage,
        timestamp: new Date(),
      });
      
      await log.save();
      return log;
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  static async logFromRequest(
    req: AuthRequest,
    action: string,
    category: 'auth' | 'project' | 'user' | 'promoteur' | 'lead' | 'document' | 'moderation' | 'appeal' | 'system' | 'security' | 'business',
    description: string,
    targetType?: string,
    targetId?: string,
    metadata?: any
  ) {
    if (!req.user) return;
    
    return this.log({
      actor: req.user.id,
      actorRole: req.user.roles.join(','),
      action,
      category,
      targetType,
      targetId,
      description,
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  static async getLogs(filters: {
    actor?: string;
    category?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  }) {
    const query: any = {};
    
    if (filters.actor) query.actor = filters.actor;
    if (filters.category) query.category = filters.category;
    if (filters.action) query.action = filters.action;
    if (filters.targetType) query.targetType = filters.targetType;
    if (filters.targetId) query.targetId = filters.targetId;
    
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }
    
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(filters.limit || 100)
      .skip(filters.skip || 0)
      .populate('actor', 'email firstName lastName');
    
    const total = await AuditLog.countDocuments(query);
    
    return { logs, total };
  }
}
