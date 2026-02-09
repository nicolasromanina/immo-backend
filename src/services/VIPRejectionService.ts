import Promoteur from '../models/Promoteur';
import { NotificationService } from './NotificationService';
import User from '../models/User';

interface VIPRejectionRequest {
  promoteurId: string;
  requestedBy: string;
  reason: string;
  actionType: 'bypass-verification' | 'override-score' | 'force-featured' | 'remove-sanction' | 'upgrade-plan';
  details?: Record<string, any>;
}

interface VIPRejectionDecision {
  requestId: string;
  decision: 'approved' | 'rejected';
  decidedBy: string;
  justification: string;
}

// In-memory store (in production, use a model)
const pendingRequests: Map<string, VIPRejectionRequest & { id: string; status: string; createdAt: Date }> = new Map();
let counter = 0;

export class VIPRejectionService {
  /**
   * Submit a VIP bypass request
   */
  static async submitBypassRequest(data: VIPRejectionRequest) {
    counter++;
    const requestId = `VIP-${Date.now()}-${counter}`;

    const request = {
      ...data,
      id: requestId,
      status: 'pending',
      createdAt: new Date(),
    };

    pendingRequests.set(requestId, request);

    // Notify senior admins
    const seniorAdmins = await User.find({ role: 'admin', isActive: true });
    for (const admin of seniorAdmins) {
      await NotificationService.create({
        recipient: admin._id.toString(),
        type: 'warning',
        title: 'Demande VIP de bypass',
        message: `Demande ${data.actionType} pour promoteur — Raison: ${data.reason}`,
        priority: 'high',
        channels: { inApp: true, email: true },
        actionUrl: `/admin/vip-requests/${requestId}`,
      });
    }

    return request;
  }

  /**
   * Process VIP rejection decision
   */
  static async processDecision(decision: VIPRejectionDecision) {
    const request = pendingRequests.get(decision.requestId);
    if (!request) throw new Error('Demande non trouvée');
    if (request.status !== 'pending') throw new Error('Demande déjà traitée');

    request.status = decision.decision;

    if (decision.decision === 'approved') {
      // Execute the bypass action
      await this.executeBypass(request);
    }

    // Notify the requester
    await NotificationService.create({
      recipient: request.requestedBy,
      type: 'system',
      title: `Demande VIP ${decision.decision === 'approved' ? 'approuvée' : 'refusée'}`,
      message: `Votre demande ${request.actionType} a été ${
        decision.decision === 'approved' ? 'approuvée' : 'refusée'
      }. ${decision.justification}`,
      priority: 'high',
      channels: { inApp: true, email: true },
    });

    return { request, decision };
  }

  /**
   * Execute the bypass action
   */
  private static async executeBypass(request: VIPRejectionRequest & { id: string }) {
    const promoteur = await Promoteur.findById(request.promoteurId);
    if (!promoteur) return;

    switch (request.actionType) {
      case 'bypass-verification':
        promoteur.set('kycStatus', 'verified');
        await promoteur.save();
        break;

      case 'override-score':
        // Force trust score override
        if (request.details?.newScore) {
          promoteur.set('trustScore', request.details.newScore);
          await promoteur.save();
        }
        break;

      case 'remove-sanction':
        promoteur.set('sanctionLevel', 'none');
        promoteur.set('restrictions', []);
        await promoteur.save();
        break;

      case 'upgrade-plan':
        if (request.details?.plan) {
          promoteur.set('plan', request.details.plan);
          await promoteur.save();
        }
        break;

      case 'force-featured':
        // This would connect to FeaturedService
        break;
    }
  }

  /**
   * Get pending requests
   */
  static async getPendingRequests() {
    return Array.from(pendingRequests.values())
      .filter(r => r.status === 'pending')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get all requests
   */
  static async getAllRequests(filters?: { status?: string }) {
    let requests = Array.from(pendingRequests.values());
    if (filters?.status) {
      requests = requests.filter(r => r.status === filters.status);
    }
    return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get request by ID
   */
  static async getRequestById(requestId: string) {
    return pendingRequests.get(requestId) || null;
  }
}
