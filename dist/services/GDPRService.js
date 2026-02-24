"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDPRService = void 0;
const GDPRRequest_1 = __importDefault(require("../models/GDPRRequest"));
const Consent_1 = __importDefault(require("../models/Consent"));
const User_1 = __importDefault(require("../models/User"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const Lead_1 = __importDefault(require("../models/Lead"));
const Favorite_1 = __importDefault(require("../models/Favorite"));
const NotificationService_1 = require("./NotificationService");
const AuditLogService_1 = require("./AuditLogService");
const mongoose_1 = __importDefault(require("mongoose"));
class GDPRService {
    /**
     * Create a new GDPR request
     */
    static async createRequest(userId, type, description) {
        // GDPR requires response within 30 days
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 30);
        const request = new GDPRRequest_1.default({
            user: userId,
            type,
            description,
            deadline,
            status: 'pending',
        });
        await request.save();
        // Notify admins
        await NotificationService_1.NotificationService.create({
            recipient: 'admin',
            type: 'system',
            title: 'Nouvelle demande RGPD',
            message: `Une demande de type "${type}" a été soumise`,
            priority: 'high',
            channels: { inApp: true, email: true },
            data: { requestId: request._id },
        });
        return request;
    }
    /**
     * Get all user data for portability/access request
     */
    static async getUserData(userId) {
        const user = await User_1.default.findById(userId).select('-password');
        const promoteur = await Promoteur_1.default.findOne({ user: userId });
        const leads = await Lead_1.default.find({ client: userId });
        const favorites = await Favorite_1.default.find({ user: userId }).populate('project', 'title');
        const consents = await Consent_1.default.findOne({ user: userId });
        return {
            user: user?.toObject(),
            promoteur: promoteur?.toObject(),
            leads: leads.map(l => l.toObject()),
            favorites: favorites.map(f => f.toObject()),
            consents: consents?.toObject(),
            exportedAt: new Date().toISOString(),
        };
    }
    /**
     * Process erasure request (right to be forgotten)
     */
    static async processErasureRequest(requestId, adminId) {
        const request = await GDPRRequest_1.default.findById(requestId);
        if (!request) {
            throw new Error('Request not found');
        }
        const userId = request.user.toString();
        // Anonymize user data instead of hard delete (for legal compliance)
        const anonymizedEmail = `deleted_${userId}@anonymized.local`;
        const anonymizedName = 'Utilisateur supprimé';
        // Update user
        await User_1.default.findByIdAndUpdate(userId, {
            email: anonymizedEmail,
            firstName: anonymizedName,
            lastName: '',
            phone: '',
            isDeleted: true,
            deletedAt: new Date(),
        });
        // Anonymize leads
        await Lead_1.default.updateMany({ client: userId }, {
            firstName: anonymizedName,
            lastName: '',
            email: anonymizedEmail,
            phone: '',
            whatsapp: '',
        });
        // Delete favorites
        await Favorite_1.default.deleteMany({ user: userId });
        // Delete consents
        await Consent_1.default.deleteOne({ user: userId });
        // Update request
        request.status = 'completed';
        request.processedBy = new mongoose_1.default.Types.ObjectId(adminId);
        request.processedAt = new Date();
        request.processingNotes = 'User data anonymized as per GDPR Article 17';
        await request.save();
        // Log the action
        await AuditLogService_1.AuditLogService.log({
            userId: adminId,
            action: 'gdpr_erasure',
            category: 'security',
            description: `Processed erasure request for user ${userId}`,
            severity: 'high',
            targetModel: 'User',
            targetId: userId,
        });
        return request;
    }
    /**
     * Update consent
     */
    static async updateConsent(userId, consentType, granted, ipAddress, userAgent) {
        let consent = await Consent_1.default.findOne({ user: userId });
        if (!consent) {
            consent = new Consent_1.default({
                user: userId,
                consents: [],
                history: [],
            });
        }
        const existingConsent = consent.consents.find(c => c.type === consentType);
        if (existingConsent) {
            existingConsent.granted = granted;
            if (granted) {
                existingConsent.grantedAt = new Date();
                existingConsent.revokedAt = undefined;
            }
            else {
                existingConsent.revokedAt = new Date();
            }
            existingConsent.ipAddress = ipAddress;
            existingConsent.userAgent = userAgent;
        }
        else {
            consent.consents.push({
                type: consentType,
                granted,
                grantedAt: granted ? new Date() : undefined,
                revokedAt: granted ? undefined : new Date(),
                ipAddress,
                userAgent,
            });
        }
        // Add to history
        consent.history.push({
            action: granted ? 'grant' : 'revoke',
            type: consentType,
            timestamp: new Date(),
            ipAddress,
        });
        await consent.save();
        return consent;
    }
    /**
     * Get user consents
     */
    static async getUserConsents(userId) {
        const consent = await Consent_1.default.findOne({ user: userId });
        return consent;
    }
    /**
     * Update cookie preferences
     */
    static async updateCookiePreferences(userId, preferences) {
        let consent = await Consent_1.default.findOne({ user: userId });
        if (!consent) {
            consent = new Consent_1.default({
                user: userId,
                consents: [],
                cookiePreferences: {
                    essential: true,
                    analytics: false,
                    marketing: false,
                    functional: true,
                },
                history: [],
            });
        }
        if (preferences.analytics !== undefined) {
            consent.cookiePreferences.analytics = preferences.analytics;
        }
        if (preferences.marketing !== undefined) {
            consent.cookiePreferences.marketing = preferences.marketing;
        }
        if (preferences.functional !== undefined) {
            consent.cookiePreferences.functional = preferences.functional;
        }
        consent.history.push({
            action: 'update',
            type: 'cookie_preferences',
            timestamp: new Date(),
        });
        await consent.save();
        return consent;
    }
    /**
     * Check pending requests nearing deadline
     */
    static async checkDeadlines() {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const nearingDeadline = await GDPRRequest_1.default.find({
            status: { $in: ['pending', 'in-progress'] },
            deadline: { $lte: threeDaysFromNow },
        });
        for (const request of nearingDeadline) {
            const daysLeft = Math.ceil((request.deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            await NotificationService_1.NotificationService.create({
                recipient: 'admin',
                type: 'warning',
                title: 'Demande RGPD urgente',
                message: `Une demande RGPD expire dans ${daysLeft} jour(s)`,
                priority: 'urgent',
                channels: { inApp: true, email: true },
                data: { requestId: request._id },
            });
        }
        return nearingDeadline.length;
    }
    /**
     * Export data to JSON file
     */
    static async exportToJSON(userId) {
        const data = await this.getUserData(userId);
        const jsonContent = JSON.stringify(data, null, 2);
        // In production, this would save to cloud storage and return URL
        // For now, return base64 encoded data
        return Buffer.from(jsonContent).toString('base64');
    }
    /**
     * Get all GDPR requests (for admin)
     */
    static async getRequests(filters) {
        const query = {};
        if (filters.status)
            query.status = filters.status;
        if (filters.type)
            query.type = filters.type;
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const requests = await GDPRRequest_1.default.find(query)
            .populate('user', 'email firstName lastName')
            .populate('processedBy', 'email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await GDPRRequest_1.default.countDocuments(query);
        return {
            requests,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit,
            },
        };
    }
}
exports.GDPRService = GDPRService;
