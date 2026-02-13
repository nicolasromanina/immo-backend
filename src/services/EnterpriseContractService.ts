import mongoose from 'mongoose';
import EnterpriseContract from '../models/EnterpriseContract';
import Promoteur from '../models/Promoteur';
import { NotificationService } from './NotificationService';
import { AuditLogService } from './AuditLogService';

export class EnterpriseContractService {
  /**
   * Generate contract number
   */
  private static generateContractNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ENT-${year}-${random}`;
  }

  /**
   * Create a new enterprise contract
   */
  static async createContract(data: {
    promoteurId: string;
    name: string;
    pricing: {
      type: 'fixed' | 'custom' | 'volume';
      baseAmount: number;
      currency?: string;
      billingCycle?: 'monthly' | 'quarterly' | 'annual';
      volumeDiscounts?: Array<{
        minProjects: number;
        discountPercent: number;
      }>;
    };
    inclusions: {
      maxProjects?: number;
      maxTeamMembers?: number;
      maxLeadsPerMonth?: number;
      dedicatedSupport?: boolean;
      customBranding?: boolean;
      apiAccess?: boolean;
      priorityListing?: boolean;
      customReports?: boolean;
    };
    sla?: {
      supportResponseTimeHours?: number;
      uptimeGuarantee?: number;
      dedicatedAccountManager?: boolean;
      accountManagerId?: string;
    };
    terms: {
      startDate: Date;
      endDate: Date;
      autoRenew?: boolean;
      noticePeriodDays?: number;
      terminationClause?: string;
    };
    createdBy: string;
  }) {
    const contract = new EnterpriseContract({
      promoteur: data.promoteurId,
      contractNumber: this.generateContractNumber(),
      name: data.name,
      pricing: {
        type: data.pricing.type,
        baseAmount: data.pricing.baseAmount,
        currency: data.pricing.currency || 'EUR',
        billingCycle: data.pricing.billingCycle || 'annual',
        volumeDiscounts: data.pricing.volumeDiscounts,
      },
      inclusions: {
        maxProjects: data.inclusions.maxProjects ?? -1,
        maxTeamMembers: data.inclusions.maxTeamMembers ?? 10,
        maxLeadsPerMonth: data.inclusions.maxLeadsPerMonth ?? -1,
        dedicatedSupport: data.inclusions.dedicatedSupport ?? true,
        customBranding: data.inclusions.customBranding ?? false,
        apiAccess: data.inclusions.apiAccess ?? false,
        priorityListing: data.inclusions.priorityListing ?? true,
        customReports: data.inclusions.customReports ?? false,
      },
      sla: {
        supportResponseTimeHours: data.sla?.supportResponseTimeHours ?? 4,
        uptimeGuarantee: data.sla?.uptimeGuarantee ?? 99.9,
        dedicatedAccountManager: data.sla?.dedicatedAccountManager ?? true,
        accountManagerId: data.sla?.accountManagerId,
      },
      terms: data.terms,
      status: 'draft',
      createdBy: data.createdBy,
    });

    await contract.save();

    await AuditLogService.log({
      userId: data.createdBy,
      action: 'create_enterprise_contract',
      category: 'business',
      description: `Created enterprise contract ${contract.contractNumber}`,
      severity: 'low',
      targetModel: 'EnterpriseContract',
      targetId: contract._id.toString(),
    });

    return contract;
  }

  /**
   * Submit contract for approval
   */
  static async submitForApproval(contractId: string) {
    const contract = await EnterpriseContract.findByIdAndUpdate(
      contractId,
      { status: 'pending_approval' },
      { new: true }
    );

    if (contract) {
      // Notify promoteur
      const promoteur = await Promoteur.findById(contract.promoteur).populate('user');
      if (promoteur?.user) {
        await NotificationService.create({
          recipient: (promoteur.user as any)._id.toString(),
          type: 'system',
          title: 'Contrat en attente de signature',
          message: `Le contrat ${contract.contractNumber} est en attente de votre signature`,
          priority: 'high',
          channels: { inApp: true, email: true },
        });
      }
    }

    return contract;
  }

  /**
   * Sign contract by promoteur
   */
  static async signByPromoteur(contractId: string, promoteurId: string) {
    const contract = await EnterpriseContract.findOne({
      _id: contractId,
      promoteur: promoteurId,
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    contract.signedByPromoteur = true;
    contract.signedByPromoteurAt = new Date();

    // If both parties signed, activate
    if (contract.signedByAdmin) {
      contract.status = 'active';
      
      // Update promoteur type
      await Promoteur.findByIdAndUpdate(promoteurId, {
        organizationType: 'enterprise',
        plan: 'premium',
      });
    }

    await contract.save();

    // Notify admin
    await NotificationService.create({
      recipient: 'admin',
      type: 'system',
      title: 'Contrat signé par promoteur',
      message: `Le contrat ${contract.contractNumber} a été signé par le promoteur`,
      priority: 'medium',
      channels: { inApp: true, email: true },
    });

    return contract;
  }

  /**
   * Sign contract by admin
   */
  static async signByAdmin(contractId: string, adminId: string) {
    const contract = await EnterpriseContract.findById(contractId);

    if (!contract) {
      throw new Error('Contract not found');
    }

    contract.signedByAdmin = true;
    contract.signedByAdminAt = new Date();
    contract.signedByAdminUserId = adminId as any;

    // If both parties signed, activate
    if (contract.signedByPromoteur) {
      contract.status = 'active';
      
      // Update promoteur type
      await Promoteur.findByIdAndUpdate(contract.promoteur, {
        organizationType: 'enterprise',
        plan: 'premium',
      });
    }

    await contract.save();

    // Notify promoteur
    const promoteur = await Promoteur.findById(contract.promoteur).populate('user');
    if (promoteur?.user) {
      await NotificationService.create({
        recipient: (promoteur.user as any)._id.toString(),
        type: 'system',
        title: 'Contrat signé par la plateforme',
        message: `Le contrat ${contract.contractNumber} a été validé${contract.status === 'active' ? ' et est maintenant actif' : ''}`,
        priority: 'high',
        channels: { inApp: true, email: true },
      });
    }

    return contract;
  }

  /**
   * Add amendment to contract
   */
  static async addAmendment(
    contractId: string,
    amendment: {
      description: string;
      documentUrl?: string;
      effectiveDate: Date;
    }
  ) {
    return EnterpriseContract.findByIdAndUpdate(
      contractId,
      {
        $push: {
          amendments: {
            ...amendment,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );
  }

  /**
   * Terminate contract
   */
  static async terminateContract(contractId: string, reason: string, adminId: string) {
    const contract = await EnterpriseContract.findByIdAndUpdate(
      contractId,
      {
        status: 'terminated',
        $push: {
          notes: {
            content: `Terminated: ${reason}`,
            addedBy: adminId,
            addedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (contract) {
      // Revert promoteur to standard plan
      await Promoteur.findByIdAndUpdate(contract.promoteur, {
        organizationType: 'established',
        plan: 'standard',
      });

      // Notify promoteur
      const promoteur = await Promoteur.findById(contract.promoteur).populate('user');
      if (promoteur?.user) {
        await NotificationService.create({
          recipient: (promoteur.user as any)._id.toString(),
          type: 'warning',
          title: 'Contrat résilié',
          message: `Le contrat ${contract.contractNumber} a été résilié`,
          priority: 'urgent',
          channels: { inApp: true, email: true },
        });
      }
    }

    return contract;
  }

  /**
   * Renew contract
   */
  static async renewContract(contractId: string, newEndDate: Date, adminId: string) {
    const contract = await EnterpriseContract.findById(contractId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    contract.terms.endDate = newEndDate;
    contract.status = 'active';
    contract.notes.push({
      content: `Contract renewed until ${newEndDate.toISOString()}`,
      addedBy: new mongoose.Types.ObjectId(adminId),
      addedAt: new Date(),
    });

    await contract.save();

    return contract;
  }

  /**
   * Get contract by ID
   */
  static async getContract(contractId: string) {
    return EnterpriseContract.findById(contractId)
      .populate('promoteur', 'organizationName user')
      .populate('sla.accountManagerId', 'email firstName lastName')
      .populate('signedByAdminUserId', 'email')
      .populate('createdBy', 'email');
  }

  /**
   * Get contracts for a promoteur
   */
  static async getPromoteurContracts(promoteurId: string) {
    return EnterpriseContract.find({ promoteur: promoteurId })
      .sort({ createdAt: -1 });
  }

  /**
   * Get all contracts (admin)
   */
  static async getAllContracts(filters: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    if (filters.status) query.status = filters.status;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const contracts = await EnterpriseContract.find(query)
      .populate('promoteur', 'organizationName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await EnterpriseContract.countDocuments(query);

    return {
      contracts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  /**
   * Check expiring contracts
   */
  static async checkExpiringContracts(daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const expiringContracts = await EnterpriseContract.find({
      status: 'active',
      'terms.endDate': { $lte: futureDate },
    }).populate('promoteur');

    for (const contract of expiringContracts) {
      const daysLeft = Math.ceil(
        (contract.terms.endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      const promoteur = contract.promoteur as any;
      if (promoteur?.user) {
        await NotificationService.create({
          recipient: promoteur.user.toString(),
          type: 'warning',
          title: 'Contrat expire bientôt',
          message: `Votre contrat entreprise expire dans ${daysLeft} jours`,
          priority: daysLeft <= 7 ? 'urgent' : 'high',
          channels: { inApp: true, email: true },
        });
      }

      // Notify admin
      await NotificationService.create({
        recipient: 'admin',
        type: 'system',
        title: 'Contrat expire bientôt',
        message: `Le contrat ${contract.contractNumber} expire dans ${daysLeft} jours`,
        priority: 'medium',
        channels: { inApp: true },
      });
    }

    return expiringContracts.length;
  }
}
