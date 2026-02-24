"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotaireWorkflowService = exports.ArchitectWorkflowService = exports.CourtierWorkflowService = void 0;
const Partner_1 = __importDefault(require("../models/Partner"));
const ServiceRequest_1 = __importDefault(require("../models/ServiceRequest"));
const Lead_1 = __importDefault(require("../models/Lead"));
const NotificationService_1 = require("./NotificationService");
const AppointmentService_1 = require("./AppointmentService");
/**
 * Courtier pre-qualification — validates leads before passing to promoteur
 */
class CourtierWorkflowService {
    /**
     * Pre-qualify a lead via a courtier
     */
    static async preQualifyLead(data) {
        const lead = await Lead_1.default.findById(data.leadId);
        if (!lead)
            throw new Error('Lead non trouvé');
        const courtier = await Partner_1.default.findOne({ _id: data.courtierId, type: 'courtier', status: 'active' });
        if (!courtier)
            throw new Error('Courtier non trouvé ou inactif');
        // Calculate qualification score
        const score = this.calculateQualificationScore(data.qualificationData);
        // Update lead with pre-qualification data
        const updateData = {
            preQualification: {
                courtier: data.courtierId,
                qualifiedAt: new Date(),
                score,
                financingReady: data.qualificationData.financingReady,
                financingType: data.qualificationData.financingType,
                budgetConfirmed: data.qualificationData.budget,
                preApprovalAmount: data.qualificationData.preApprovalAmount,
                notes: data.qualificationData.notes,
            },
            status: score >= 70 ? 'qualified' : 'unqualified',
        };
        const updatedLead = await Lead_1.default.findByIdAndUpdate(data.leadId, updateData, { new: true });
        // Notify promoteur if lead is qualified
        if (score >= 70 && updatedLead) {
            await NotificationService_1.NotificationService.create({
                recipient: updatedLead.promoteur?.toString() || 'admin',
                type: 'lead',
                title: 'Lead pré-qualifié par courtier',
                message: `Lead qualifié (score: ${score}/100) — Budget: ${new Intl.NumberFormat('fr-FR').format(data.qualificationData.budget)} FCFA`,
                priority: 'high',
                channels: { inApp: true, email: true },
            });
        }
        // Update courtier stats
        await Partner_1.default.findByIdAndUpdate(data.courtierId, {
            $inc: { totalRequests: 1, ...(score >= 70 ? { completedRequests: 1 } : {}) },
        });
        return { lead: updatedLead, qualificationScore: score };
    }
    /**
     * Calculate qualification score
     */
    static calculateQualificationScore(data) {
        let score = 0;
        // Financing ready (40 points)
        if (data.financingReady)
            score += 40;
        else if (data.financingType)
            score += 15;
        // Pre-approval (25 points)
        if (data.preApprovalAmount > 0)
            score += 25;
        // Employment (20 points)
        if (data.employmentStatus === 'employed')
            score += 20;
        else if (data.employmentStatus === 'self-employed')
            score += 15;
        else if (data.employmentStatus === 'retired')
            score += 10;
        // Monthly income indicated (15 points)
        if (data.monthlyIncome > 0)
            score += 15;
        return Math.min(100, score);
    }
    /**
     * Get courtier performance stats
     */
    static async getCourtierStats(courtierId) {
        const courtier = await Partner_1.default.findById(courtierId);
        if (!courtier)
            throw new Error('Courtier non trouvé');
        const requests = await ServiceRequest_1.default.find({ partner: courtierId });
        const qualified = requests.filter((r) => r.status === 'completed').length;
        const conversionRate = requests.length > 0 ? (qualified / requests.length) * 100 : 0;
        return {
            totalLeadsProcessed: courtier.totalRequests,
            qualifiedLeads: courtier.completedRequests,
            conversionRate: Math.round(conversionRate * 10) / 10,
            averageRating: courtier.averageRating,
        };
    }
}
exports.CourtierWorkflowService = CourtierWorkflowService;
/**
 * Architect/BET portfolio and quoting workflow
 */
class ArchitectWorkflowService {
    /**
     * Submit architect portfolio
     */
    static async submitPortfolio(partnerId, portfolio) {
        const partner = await Partner_1.default.findOne({ _id: partnerId, type: { $in: ['architecte'] }, status: { $ne: 'suspended' } });
        if (!partner)
            throw new Error('Partenaire architecte non trouvé');
        // Store portfolio in partner metadata
        const updateData = {
            'metadata.portfolio': portfolio,
            'metadata.portfolioUpdatedAt': new Date(),
        };
        if (portfolio.specializations?.length) {
            updateData['metadata.specializations'] = portfolio.specializations;
        }
        return Partner_1.default.findByIdAndUpdate(partnerId, { $set: updateData }, { new: true });
    }
    /**
     * Create a quote/devis request for an architect
     */
    static async requestDevis(data) {
        const architect = await Partner_1.default.findOne({ _id: data.architecteId, type: 'architecte', status: 'active' });
        if (!architect)
            throw new Error('Architecte non trouvé ou inactif');
        const request = await ServiceRequest_1.default.create({
            client: data.clientId,
            partner: data.architecteId,
            project: data.projectId,
            type: 'devis-architecte',
            description: data.description,
            status: 'assigned',
            assignedAt: new Date(),
            metadata: {
                specifications: data.specifications,
                devisStatus: 'pending',
            },
        });
        await NotificationService_1.NotificationService.create({
            recipient: 'admin', // In real impl, notify architect user
            type: 'lead',
            title: 'Demande de devis',
            message: `Nouvelle demande de devis pour ${data.specifications.projectType} à ${data.specifications.location}`,
            priority: 'high',
            channels: { inApp: true, email: true },
            data: { requestId: request._id },
        });
        await Partner_1.default.findByIdAndUpdate(data.architecteId, { $inc: { totalRequests: 1 } });
        return request;
    }
    /**
     * Submit devis response
     */
    static async submitDevis(requestId, devis) {
        const request = await ServiceRequest_1.default.findByIdAndUpdate(requestId, {
            'metadata.devis': devis,
            'metadata.devisStatus': 'submitted',
            'metadata.devisSubmittedAt': new Date(),
        }, { new: true });
        if (request) {
            await NotificationService_1.NotificationService.create({
                recipient: request.client.toString(),
                type: 'system',
                title: 'Devis reçu',
                message: `Un architecte a soumis un devis de ${new Intl.NumberFormat('fr-FR').format(devis.amount)} FCFA`,
                priority: 'high',
                channels: { inApp: true, email: true },
            });
        }
        return request;
    }
}
exports.ArchitectWorkflowService = ArchitectWorkflowService;
/**
 * Notaire consultation and appointment workflow
 */
class NotaireWorkflowService {
    /**
     * Request a notaire consultation
     */
    static async requestConsultation(data) {
        const notaire = await Partner_1.default.findOne({ _id: data.notaireId, type: 'notaire', status: 'active' });
        if (!notaire)
            throw new Error('Notaire non trouvé ou inactif');
        // Create service request
        const request = await ServiceRequest_1.default.create({
            client: data.clientId,
            partner: data.notaireId,
            project: data.projectId,
            type: 'consultation-notaire',
            description: data.description,
            status: 'assigned',
            assignedAt: new Date(),
            metadata: {
                consultationType: data.consultationType,
                urgency: data.urgency,
                documents: data.documents || [],
                consultationStatus: 'pending-schedule',
            },
        });
        // Notify notaire
        await NotificationService_1.NotificationService.create({
            recipient: 'admin', // In real impl, notify notaire user
            type: 'lead',
            title: 'Demande de consultation notariale',
            message: `Nouvelle consultation ${data.consultationType} — ${data.urgency === 'urgent' ? 'URGENT' : 'Normal'}`,
            priority: data.urgency === 'urgent' ? 'urgent' : 'high',
            channels: { inApp: true, email: true },
            data: { requestId: request._id },
        });
        await Partner_1.default.findByIdAndUpdate(data.notaireId, { $inc: { totalRequests: 1 } });
        return request;
    }
    /**
     * Schedule notaire appointment
     */
    static async scheduleAppointment(requestId, appointmentData) {
        const request = await ServiceRequest_1.default.findById(requestId);
        if (!request)
            throw new Error('Demande non trouvée');
        // Create appointment
        const appointment = await AppointmentService_1.AppointmentService.createAppointment({
            promoteurId: request.partner?.toString() || '',
            projectId: request.project?.toString() || '',
            leadId: request.client.toString(),
            scheduledAt: appointmentData.date,
            durationMinutes: appointmentData.duration,
            type: appointmentData.type,
            notes: appointmentData.notes,
            createdBy: request.partner?.toString() || '',
        });
        // Update request status
        await ServiceRequest_1.default.findByIdAndUpdate(requestId, {
            'metadata.consultationStatus': 'scheduled',
            'metadata.appointmentId': appointment._id,
        });
        return appointment;
    }
    /**
     * Submit consultation report
     */
    static async submitConsultationReport(requestId, report) {
        const request = await ServiceRequest_1.default.findByIdAndUpdate(requestId, {
            status: 'completed',
            completedAt: new Date(),
            'metadata.consultationStatus': 'completed',
            'metadata.report': report,
        }, { new: true });
        if (request) {
            await Partner_1.default.findByIdAndUpdate(request.partner, { $inc: { completedRequests: 1 } });
            await NotificationService_1.NotificationService.create({
                recipient: request.client.toString(),
                type: 'system',
                title: 'Rapport de consultation notariale',
                message: `Le rapport de votre consultation est disponible. Statut: ${report.legalStatus}`,
                priority: report.riskLevel === 'high' ? 'urgent' : 'high',
                channels: { inApp: true, email: true },
            });
        }
        return request;
    }
    /**
     * Get notaire availability
     */
    static async getNotaireAvailability(notaireId, startDate, endDate) {
        // Get existing appointments for notaire in the date range
        const Appointment = (await Promise.resolve().then(() => __importStar(require('../models/Appointment')))).default;
        const appointments = await Appointment.find({
            promoteur: notaireId,
            date: { $gte: startDate, $lte: endDate },
            status: { $nin: ['cancelled'] },
        }).sort({ date: 1 });
        return {
            notaireId,
            bookedSlots: appointments,
            period: { start: startDate, end: endDate },
        };
    }
}
exports.NotaireWorkflowService = NotaireWorkflowService;
