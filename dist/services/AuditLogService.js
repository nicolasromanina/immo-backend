"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
class AuditLogService {
    static async log(params) {
        try {
            // Handle system actors: "system" is not a valid ObjectId
            const isValidObjectId = params.actor && /^[0-9a-fA-F]{24}$/.test(params.actor);
            const log = new AuditLog_1.default({
                ...(isValidObjectId ? { actor: params.actor } : { actorLabel: params.actor || 'system' }),
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
        }
        catch (error) {
            console.error('Error creating audit log:', error);
            // Don't throw - audit logging should not break the main flow
        }
    }
    static async logFromRequest(req, action, category, description, targetType, targetId, metadata) {
        if (!req.user)
            return;
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
    static async getLogs(filters) {
        const query = {};
        if (filters.actor)
            query.actor = filters.actor;
        if (filters.category)
            query.category = filters.category;
        if (filters.action)
            query.action = filters.action;
        if (filters.targetType)
            query.targetType = filters.targetType;
        if (filters.targetId)
            query.targetId = filters.targetId;
        if (filters.startDate || filters.endDate) {
            query.timestamp = {};
            if (filters.startDate)
                query.timestamp.$gte = filters.startDate;
            if (filters.endDate)
                query.timestamp.$lte = filters.endDate;
        }
        const logs = await AuditLog_1.default.find(query)
            .sort({ timestamp: -1 })
            .limit(filters.limit || 100)
            .skip(filters.skip || 0)
            .populate('actor', 'email firstName lastName');
        const total = await AuditLog_1.default.countDocuments(query);
        return { logs, total };
    }
}
exports.AuditLogService = AuditLogService;
