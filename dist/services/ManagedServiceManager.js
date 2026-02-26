"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManagedServiceManager = void 0;
const ManagedService_1 = __importDefault(require("../models/ManagedService"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const NotificationService_1 = require("./NotificationService");
const PlanLimitService_1 = require("./PlanLimitService");
class ManagedServiceManager {
    /**
     * Request managed service
     */
    static async requestManagedService(data) {
        const canUseManagedService = await PlanLimitService_1.PlanLimitService.checkCapability(data.promoteurId, 'managedService');
        if (!canUseManagedService) {
            throw new Error('Managed service is not available on this plan');
        }
        const managed = await ManagedService_1.default.create({
            promoteur: data.promoteurId,
            type: data.type,
            scope: {
                updateManagement: data.scope.updateManagement ?? (data.type === 'full' || data.type === 'updates-only'),
                leadManagement: data.scope.leadManagement ?? (data.type === 'full' || data.type === 'leads-only'),
                documentManagement: data.scope.documentManagement ?? (data.type === 'full'),
                communicationManagement: data.scope.communicationManagement ?? (data.type === 'full'),
            },
            monthlyFee: data.monthlyFee,
            startDate: new Date(),
        });
        await NotificationService_1.NotificationService.createAdminNotification({
            type: 'system',
            title: 'Nouvelle demande Managed',
            message: `Un promoteur demande le service géré (${data.type})`,
            priority: 'high',
            link: `/admin/managed/${managed._id}`,
        });
        return managed;
    }
    /**
     * Activate managed service
     */
    static async activate(serviceId, managerId) {
        const service = await ManagedService_1.default.findByIdAndUpdate(serviceId, {
            status: 'active',
            assignedManager: managerId,
        }, { new: true });
        if (service) {
            const promoteur = await Promoteur_1.default.findById(service.promoteur).populate('user');
            if (promoteur?.user) {
                await NotificationService_1.NotificationService.create({
                    recipient: promoteur.user._id.toString(),
                    type: 'system',
                    title: 'Service géré activé',
                    message: 'Votre service de gestion déléguée est maintenant actif.',
                    priority: 'high',
                    channels: { inApp: true, email: true },
                });
            }
        }
        return service;
    }
    /**
     * Log activity
     */
    static async logActivity(serviceId, action, performedBy, details) {
        return ManagedService_1.default.findByIdAndUpdate(serviceId, {
            $push: {
                activityLog: { action, performedBy, performedAt: new Date(), details },
            },
        }, { new: true });
    }
    /**
     * Get managed services for promoteur
     */
    static async getForPromoteur(promoteurId) {
        return ManagedService_1.default.find({ promoteur: promoteurId })
            .populate('assignedManager', 'email firstName lastName')
            .sort({ createdAt: -1 });
    }
    /**
     * Get all managed services (admin)
     */
    static async getAll(filters) {
        const query = {};
        if (filters?.status)
            query.status = filters.status;
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const services = await ManagedService_1.default.find(query)
            .populate('promoteur', 'organizationName')
            .populate('assignedManager', 'email firstName lastName')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        const total = await ManagedService_1.default.countDocuments(query);
        return { services, pagination: { total, page, pages: Math.ceil(total / limit) } };
    }
    /**
     * Terminate managed service
     */
    static async terminate(serviceId, reason) {
        return ManagedService_1.default.findByIdAndUpdate(serviceId, {
            status: 'terminated',
            endDate: new Date(),
            notes: reason,
        }, { new: true });
    }
}
exports.ManagedServiceManager = ManagedServiceManager;
