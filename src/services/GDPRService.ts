import GDPRRequest from '../models/GDPRRequest';
import Consent from '../models/Consent';
import User from '../models/User';
import Promoteur from '../models/Promoteur';
import Lead from '../models/Lead';
import Favorite from '../models/Favorite';
import { NotificationService } from './NotificationService';
import { AuditLogService } from './AuditLogService';
import mongoose from 'mongoose';

export class GDPRService {
  /**
   * Create a new GDPR request
   */
  static async createRequest(
    userId: string,
    type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection',
    description?: string
  ) {
    // GDPR requires response within 30 days
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    const request = new GDPRRequest({
      user: userId,
      type,
      description,
      deadline,
      status: 'pending',
    });

    await request.save();

    // Notify admins
    await NotificationService.create({
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
  static async getUserData(userId: string) {
    const user = await User.findById(userId).select('-password');
    const promoteur = await Promoteur.findOne({ user: userId });
    const leads = await Lead.find({ client: userId });
    const favorites = await Favorite.find({ user: userId }).populate('project', 'title');
    const consents = await Consent.findOne({ user: userId });

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
  static async processErasureRequest(requestId: string, adminId: string) {
    const request = await GDPRRequest.findById(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    const userId = request.user.toString();

    // Anonymize user data instead of hard delete (for legal compliance)
    const anonymizedEmail = `deleted_${userId}@anonymized.local`;
    const anonymizedName = 'Utilisateur supprimé';

    // Update user
    await User.findByIdAndUpdate(userId, {
      email: anonymizedEmail,
      firstName: anonymizedName,
      lastName: '',
      phone: '',
      isDeleted: true,
      deletedAt: new Date(),
    });

    // Anonymize leads
    await Lead.updateMany(
      { client: userId },
      {
        firstName: anonymizedName,
        lastName: '',
        email: anonymizedEmail,
        phone: '',
        whatsapp: '',
      }
    );

    // Delete favorites
    await Favorite.deleteMany({ user: userId });

    // Delete consents
    await Consent.deleteOne({ user: userId });

    // Update request
    request.status = 'completed';
    request.processedBy = new mongoose.Types.ObjectId(adminId);
    request.processedAt = new Date();
    request.processingNotes = 'User data anonymized as per GDPR Article 17';
    await request.save();

    // Log the action
    await AuditLogService.log({
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
  static async updateConsent(
    userId: string,
    consentType: string,
    granted: boolean,
    ipAddress?: string,
    userAgent?: string
  ) {
    let consent = await Consent.findOne({ user: userId });

    if (!consent) {
      consent = new Consent({
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
      } else {
        existingConsent.revokedAt = new Date();
      }
      existingConsent.ipAddress = ipAddress;
      existingConsent.userAgent = userAgent;
    } else {
      consent.consents.push({
        type: consentType as any,
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
  static async getUserConsents(userId: string) {
    const consent = await Consent.findOne({ user: userId });
    return consent;
  }

  /**
   * Update cookie preferences
   */
  static async updateCookiePreferences(
    userId: string,
    preferences: {
      analytics?: boolean;
      marketing?: boolean;
      functional?: boolean;
    }
  ) {
    let consent = await Consent.findOne({ user: userId });

    if (!consent) {
      consent = new Consent({
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

    const nearingDeadline = await GDPRRequest.find({
      status: { $in: ['pending', 'in-progress'] },
      deadline: { $lte: threeDaysFromNow },
    });

    for (const request of nearingDeadline) {
      const daysLeft = Math.ceil(
        (request.deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      await NotificationService.create({
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
  static async exportToJSON(userId: string): Promise<string> {
    const data = await this.getUserData(userId);
    const jsonContent = JSON.stringify(data, null, 2);
    
    // In production, this would save to cloud storage and return URL
    // For now, return base64 encoded data
    return Buffer.from(jsonContent).toString('base64');
  }

  /**
   * Get all GDPR requests (for admin)
   */
  static async getRequests(filters: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const query: any = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const requests = await GDPRRequest.find(query)
      .populate('user', 'email firstName lastName')
      .populate('processedBy', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await GDPRRequest.countDocuments(query);

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
