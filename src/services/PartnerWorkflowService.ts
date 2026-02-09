import Partner from '../models/Partner';
import ServiceRequest from '../models/ServiceRequest';
import Lead from '../models/Lead';
import { NotificationService } from './NotificationService';
import { AppointmentService } from './AppointmentService';

/**
 * Courtier pre-qualification — validates leads before passing to promoteur
 */
export class CourtierWorkflowService {
  /**
   * Pre-qualify a lead via a courtier
   */
  static async preQualifyLead(data: {
    courtierId: string;
    leadId: string;
    qualificationData: {
      budget: number;
      financingReady: boolean;
      financingType?: 'cash' | 'bank-loan' | 'employer-loan' | 'mixed';
      bankName?: string;
      preApprovalAmount?: number;
      preApprovalDate?: Date;
      employmentStatus: 'employed' | 'self-employed' | 'retired' | 'other';
      monthlyIncome?: number;
      notes?: string;
    };
  }) {
    const lead = await Lead.findById(data.leadId);
    if (!lead) throw new Error('Lead non trouvé');

    const courtier = await Partner.findOne({ _id: data.courtierId, type: 'courtier', status: 'active' });
    if (!courtier) throw new Error('Courtier non trouvé ou inactif');

    // Calculate qualification score
    const score = this.calculateQualificationScore(data.qualificationData);

    // Update lead with pre-qualification data
    const updateData: any = {
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

    const updatedLead = await Lead.findByIdAndUpdate(data.leadId, updateData, { new: true });

    // Notify promoteur if lead is qualified
    if (score >= 70 && updatedLead) {
      await NotificationService.create({
        recipient: (updatedLead as any).promoteur?.toString() || 'admin',
        type: 'lead',
        title: 'Lead pré-qualifié par courtier',
        message: `Lead qualifié (score: ${score}/100) — Budget: ${new Intl.NumberFormat('fr-FR').format(data.qualificationData.budget)} FCFA`,
        priority: 'high',
        channels: { inApp: true, email: true },
      });
    }

    // Update courtier stats
    await Partner.findByIdAndUpdate(data.courtierId, {
      $inc: { totalRequests: 1, ...(score >= 70 ? { completedRequests: 1 } : {}) },
    });

    return { lead: updatedLead, qualificationScore: score };
  }

  /**
   * Calculate qualification score
   */
  private static calculateQualificationScore(data: any): number {
    let score = 0;

    // Financing ready (40 points)
    if (data.financingReady) score += 40;
    else if (data.financingType) score += 15;

    // Pre-approval (25 points)
    if (data.preApprovalAmount > 0) score += 25;

    // Employment (20 points)
    if (data.employmentStatus === 'employed') score += 20;
    else if (data.employmentStatus === 'self-employed') score += 15;
    else if (data.employmentStatus === 'retired') score += 10;

    // Monthly income indicated (15 points)
    if (data.monthlyIncome > 0) score += 15;

    return Math.min(100, score);
  }

  /**
   * Get courtier performance stats
   */
  static async getCourtierStats(courtierId: string) {
    const courtier = await Partner.findById(courtierId);
    if (!courtier) throw new Error('Courtier non trouvé');

    const requests = await ServiceRequest.find({ partner: courtierId });
    const qualified = requests.filter((r: any) => r.status === 'completed').length;
    const conversionRate = requests.length > 0 ? (qualified / requests.length) * 100 : 0;

    return {
      totalLeadsProcessed: courtier.totalRequests,
      qualifiedLeads: courtier.completedRequests,
      conversionRate: Math.round(conversionRate * 10) / 10,
      averageRating: courtier.averageRating,
    };
  }
}

/**
 * Architect/BET portfolio and quoting workflow
 */
export class ArchitectWorkflowService {
  /**
   * Submit architect portfolio
   */
  static async submitPortfolio(partnerId: string, portfolio: {
    specializations: string[];
    completedProjects: {
      name: string;
      location: string;
      year: number;
      type: string;
      images?: string[];
      description?: string;
    }[];
    certifications: {
      name: string;
      issuedBy: string;
      year: number;
      documentUrl?: string;
    }[];
    teamSize?: number;
    yearsExperience?: number;
  }) {
    const partner = await Partner.findOne({ _id: partnerId, type: { $in: ['architecte'] }, status: { $ne: 'suspended' } });
    if (!partner) throw new Error('Partenaire architecte non trouvé');

    // Store portfolio in partner metadata
    const updateData: any = {
      'metadata.portfolio': portfolio,
      'metadata.portfolioUpdatedAt': new Date(),
    };

    if (portfolio.specializations?.length) {
      updateData['metadata.specializations'] = portfolio.specializations;
    }

    return Partner.findByIdAndUpdate(partnerId, { $set: updateData }, { new: true });
  }

  /**
   * Create a quote/devis request for an architect
   */
  static async requestDevis(data: {
    clientId: string;
    architecteId: string;
    projectId?: string;
    description: string;
    specifications: {
      projectType: string;
      surfaceArea?: number;
      floors?: number;
      location: string;
      budget?: number;
      timeline?: string;
      specificRequirements?: string[];
    };
  }) {
    const architect = await Partner.findOne({ _id: data.architecteId, type: 'architecte', status: 'active' });
    if (!architect) throw new Error('Architecte non trouvé ou inactif');

    const request = await ServiceRequest.create({
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

    await NotificationService.create({
      recipient: 'admin', // In real impl, notify architect user
      type: 'lead',
      title: 'Demande de devis',
      message: `Nouvelle demande de devis pour ${data.specifications.projectType} à ${data.specifications.location}`,
      priority: 'high',
      channels: { inApp: true, email: true },
      data: { requestId: request._id },
    });

    await Partner.findByIdAndUpdate(data.architecteId, { $inc: { totalRequests: 1 } });

    return request;
  }

  /**
   * Submit devis response
   */
  static async submitDevis(requestId: string, devis: {
    amount: number;
    currency?: string;
    validUntil: Date;
    breakdown: { item: string; quantity: number; unitPrice: number; total: number }[];
    timeline: string;
    conditions?: string;
    documentUrl?: string;
  }) {
    const request = await ServiceRequest.findByIdAndUpdate(requestId, {
      'metadata.devis': devis,
      'metadata.devisStatus': 'submitted',
      'metadata.devisSubmittedAt': new Date(),
    }, { new: true });

    if (request) {
      await NotificationService.create({
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

/**
 * Notaire consultation and appointment workflow
 */
export class NotaireWorkflowService {
  /**
   * Request a notaire consultation
   */
  static async requestConsultation(data: {
    clientId: string;
    notaireId: string;
    projectId?: string;
    consultationType: 'title-verification' | 'sale-contract' | 'mortgage' | 'succession' | 'general';
    description: string;
    urgency: 'normal' | 'urgent';
    documents?: string[];
  }) {
    const notaire = await Partner.findOne({ _id: data.notaireId, type: 'notaire', status: 'active' });
    if (!notaire) throw new Error('Notaire non trouvé ou inactif');

    // Create service request
    const request = await ServiceRequest.create({
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
    await NotificationService.create({
      recipient: 'admin', // In real impl, notify notaire user
      type: 'lead',
      title: 'Demande de consultation notariale',
      message: `Nouvelle consultation ${data.consultationType} — ${data.urgency === 'urgent' ? 'URGENT' : 'Normal'}`,
      priority: data.urgency === 'urgent' ? 'urgent' : 'high',
      channels: { inApp: true, email: true },
      data: { requestId: request._id },
    });

    await Partner.findByIdAndUpdate(data.notaireId, { $inc: { totalRequests: 1 } });

    return request;
  }

  /**
   * Schedule notaire appointment
   */
  static async scheduleAppointment(requestId: string, appointmentData: {
    date: Date;
    duration: number;
    location: string;
    type: 'in-person' | 'video' | 'phone';
    notes?: string;
  }) {
    const request = await ServiceRequest.findById(requestId);
    if (!request) throw new Error('Demande non trouvée');

    // Create appointment
    const appointment = await AppointmentService.createAppointment({
      promoteurId: request.partner?.toString() || '',
      projectId: request.project?.toString() || '',
      leadId: request.client.toString(),
      scheduledAt: appointmentData.date,
      durationMinutes: appointmentData.duration,
      type: appointmentData.type as 'visio' | 'physique' | 'phone',
      notes: appointmentData.notes,
      createdBy: request.partner?.toString() || '',
    });

    // Update request status
    await ServiceRequest.findByIdAndUpdate(requestId, {
      'metadata.consultationStatus': 'scheduled',
      'metadata.appointmentId': appointment._id,
    });

    return appointment;
  }

  /**
   * Submit consultation report
   */
  static async submitConsultationReport(requestId: string, report: {
    findings: string;
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
    documentsVerified: string[];
    legalStatus: 'clean' | 'issues-found' | 'requires-action';
    requiredActions?: string[];
    fees: number;
  }) {
    const request = await ServiceRequest.findByIdAndUpdate(requestId, {
      status: 'completed',
      completedAt: new Date(),
      'metadata.consultationStatus': 'completed',
      'metadata.report': report,
    }, { new: true });

    if (request) {
      await Partner.findByIdAndUpdate(request.partner, { $inc: { completedRequests: 1 } });

      await NotificationService.create({
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
  static async getNotaireAvailability(notaireId: string, startDate: Date, endDate: Date) {
    // Get existing appointments for notaire in the date range
    const Appointment = (await import('../models/Appointment')).default;
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
