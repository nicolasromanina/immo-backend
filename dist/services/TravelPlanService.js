"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelPlanService = void 0;
const TravelPlan_1 = __importDefault(require("../models/TravelPlan"));
const Project_1 = __importDefault(require("../models/Project"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const NotificationService_1 = require("./NotificationService");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Service for managing diaspora travel plans
 * Helps clients plan site visits and optimize itineraries
 */
class TravelPlanService {
    /**
     * Create a new travel plan
     */
    static async createPlan(data) {
        // Validate dates
        const arrival = new Date(data.arrivalDate);
        const departure = new Date(data.departureDate);
        if (departure <= arrival) {
            throw new Error('Departure date must be after arrival date');
        }
        const tripDays = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
        if (tripDays > 30) {
            throw new Error('Trip duration cannot exceed 30 days');
        }
        const plan = new TravelPlan_1.default({
            user: data.userId,
            tripName: data.tripName,
            destination: data.destination,
            arrivalDate: arrival,
            departureDate: departure,
            accommodation: data.accommodation,
            preferences: {
                preferredVisitDuration: data.preferences?.preferredVisitDuration || 60,
                preferredStartTime: data.preferences?.preferredStartTime || '09:00',
                preferredEndTime: data.preferences?.preferredEndTime || '18:00',
                breakDuration: data.preferences?.breakDuration || 60,
                maxVisitsPerDay: data.preferences?.maxVisitsPerDay || 4,
                requiresTranslator: data.preferences?.requiresTranslator || false,
                transportMode: data.preferences?.transportMode || 'car',
            },
            notes: data.notes,
            visits: [],
            status: 'planning',
        });
        await plan.save();
        return plan;
    }
    /**
     * Add a visit to the travel plan
     */
    static async addVisit(planId, userId, visit) {
        const plan = await TravelPlan_1.default.findById(planId);
        if (!plan) {
            throw new Error('Travel plan not found');
        }
        if (plan.user.toString() !== userId) {
            throw new Error('Not authorized to modify this plan');
        }
        const project = await Project_1.default.findById(visit.projectId).populate('promoteur');
        if (!project) {
            throw new Error('Project not found');
        }
        const promoteur = await Promoteur_1.default.findById(project.promoteur);
        if (!promoteur) {
            throw new Error('Promoteur not found');
        }
        // Check if visit date is within trip dates
        const visitDate = new Date(visit.scheduledDate);
        if (visitDate < plan.arrivalDate || visitDate > plan.departureDate) {
            throw new Error('Visit date must be within trip dates');
        }
        // Check for scheduling conflicts
        const existingVisits = plan.visits.filter(v => {
            const vDate = new Date(v.scheduledDate).toDateString();
            return vDate === visitDate.toDateString() && v.status !== 'cancelled';
        });
        if (existingVisits.length >= plan.preferences.maxVisitsPerDay) {
            throw new Error(`Maximum ${plan.preferences.maxVisitsPerDay} visits per day allowed`);
        }
        // Check time conflict
        const newStartTime = this.timeToMinutes(visit.scheduledTime);
        const newEndTime = newStartTime + (visit.duration || plan.preferences.preferredVisitDuration);
        for (const existing of existingVisits) {
            const existingStart = this.timeToMinutes(existing.scheduledTime);
            const existingEnd = existingStart + existing.duration;
            if ((newStartTime >= existingStart && newStartTime < existingEnd) ||
                (newEndTime > existingStart && newEndTime <= existingEnd) ||
                (newStartTime <= existingStart && newEndTime >= existingEnd)) {
                throw new Error('Time conflict with existing visit');
            }
        }
        const newVisit = {
            project: visit.projectId,
            promoteur: project.promoteur,
            scheduledDate: visitDate,
            scheduledTime: visit.scheduledTime,
            duration: visit.duration || plan.preferences.preferredVisitDuration,
            type: visit.type || 'site-visit',
            status: 'requested',
            notes: visit.notes,
        };
        plan.visits.push(newVisit);
        await plan.save();
        // Notify promoteur about visit request
        await NotificationService_1.NotificationService.create({
            recipient: promoteur.user.toString(),
            type: 'lead',
            title: 'Demande de visite',
            message: `Un client diaspora souhaite visiter ${project.title} le ${visitDate.toLocaleDateString('fr-FR')}`,
            priority: 'high',
            channels: { inApp: true, email: true },
            data: { planId, projectId: visit.projectId },
        });
        return plan;
    }
    /**
     * Remove a visit from the plan
     */
    static async removeVisit(planId, visitIndex, userId) {
        const plan = await TravelPlan_1.default.findById(planId);
        if (!plan) {
            throw new Error('Travel plan not found');
        }
        if (plan.user.toString() !== userId) {
            throw new Error('Not authorized to modify this plan');
        }
        if (visitIndex < 0 || visitIndex >= plan.visits.length) {
            throw new Error('Invalid visit index');
        }
        plan.visits.splice(visitIndex, 1);
        await plan.save();
        return plan;
    }
    /**
     * Confirm a visit (by promoteur)
     */
    static async confirmVisit(planId, visitIndex, confirmerId, details) {
        const plan = await TravelPlan_1.default.findById(planId);
        if (!plan) {
            throw new Error('Travel plan not found');
        }
        if (visitIndex < 0 || visitIndex >= plan.visits.length) {
            throw new Error('Invalid visit index');
        }
        const visit = plan.visits[visitIndex];
        visit.status = 'confirmed';
        visit.confirmedAt = new Date();
        visit.confirmedBy = confirmerId;
        visit.contactPerson = details.contactPerson;
        visit.contactPhone = details.contactPhone;
        visit.meetingPoint = details.meetingPoint;
        await plan.save();
        // Notify client
        await NotificationService_1.NotificationService.create({
            recipient: plan.user.toString(),
            type: 'system',
            title: 'Visite confirmée',
            message: `Votre visite a été confirmée pour le ${new Date(visit.scheduledDate).toLocaleDateString('fr-FR')}`,
            priority: 'high',
            channels: { inApp: true, email: true },
        });
        return plan;
    }
    /**
     * Complete a visit and add feedback
     */
    static async completeVisit(planId, visitIndex, userId, feedback) {
        const plan = await TravelPlan_1.default.findById(planId);
        if (!plan) {
            throw new Error('Travel plan not found');
        }
        if (plan.user.toString() !== userId) {
            throw new Error('Not authorized to modify this plan');
        }
        if (visitIndex < 0 || visitIndex >= plan.visits.length) {
            throw new Error('Invalid visit index');
        }
        const visit = plan.visits[visitIndex];
        visit.status = 'completed';
        visit.completedAt = new Date();
        if (feedback) {
            visit.feedback = feedback;
        }
        await plan.save();
        return plan;
    }
    /**
     * Get suggested projects for the trip destination
     */
    static async getSuggestedProjects(destination) {
        const query = {
            country: destination.country,
            city: destination.city,
            publicationStatus: 'published',
            status: { $nin: ['archive', 'suspended'] },
        };
        if (destination.areas && destination.areas.length > 0) {
            query.area = { $in: destination.areas };
        }
        const projects = await Project_1.default.find(query)
            .populate('promoteur', 'organizationName trustScore badges')
            .sort({ trustScore: -1, views: -1 })
            .limit(20);
        return projects;
    }
    /**
     * Optimize itinerary based on locations and preferences
     */
    static async optimizeItinerary(planId, userId) {
        const plan = await TravelPlan_1.default.findById(planId).populate('visits.project');
        if (!plan) {
            throw new Error('Travel plan not found');
        }
        if (plan.user.toString() !== userId) {
            throw new Error('Not authorized to modify this plan');
        }
        const confirmedVisits = plan.visits
            .map((visit, index) => ({ visit, index }))
            .filter(v => v.visit.status === 'confirmed' || v.visit.status === 'requested');
        // Group visits by date
        const visitsByDate = new Map();
        for (const v of confirmedVisits) {
            const dateStr = new Date(v.visit.scheduledDate).toISOString().split('T')[0];
            if (!visitsByDate.has(dateStr)) {
                visitsByDate.set(dateStr, []);
            }
            visitsByDate.get(dateStr).push(v);
        }
        const optimizedItinerary = [];
        for (const [dateStr, dayVisits] of visitsByDate) {
            // Sort by scheduled time
            dayVisits.sort((a, b) => this.timeToMinutes(a.visit.scheduledTime) - this.timeToMinutes(b.visit.scheduledTime));
            const dayPlan = {
                date: new Date(dateStr),
                visits: dayVisits.map((v, i) => {
                    const startMinutes = this.timeToMinutes(v.visit.scheduledTime);
                    const endMinutes = startMinutes + v.visit.duration;
                    return {
                        visitIndex: v.index,
                        startTime: v.visit.scheduledTime,
                        endTime: this.minutesToTime(endMinutes),
                        travelTimeFromPrevious: i > 0 ? 30 : undefined, // Estimate 30 min travel by default
                    };
                }),
            };
            optimizedItinerary.push(dayPlan);
        }
        // Sort by date
        optimizedItinerary.sort((a, b) => a.date.getTime() - b.date.getTime());
        plan.optimizedItinerary = optimizedItinerary;
        await plan.save();
        return plan;
    }
    /**
     * Generate shareable link for the travel plan
     */
    static async generateShareLink(planId, userId) {
        const plan = await TravelPlan_1.default.findById(planId);
        if (!plan) {
            throw new Error('Travel plan not found');
        }
        if (plan.user.toString() !== userId) {
            throw new Error('Not authorized to share this plan');
        }
        if (!plan.shareToken) {
            plan.shareToken = crypto_1.default.randomBytes(16).toString('hex');
            await plan.save();
        }
        return `/travel-plans/shared/${plan.shareToken}`;
    }
    /**
     * Get plan by share token
     */
    static async getPlanByShareToken(token) {
        return TravelPlan_1.default.findOne({ shareToken: token })
            .populate('visits.project', 'title slug media priceFrom coordinates')
            .populate('visits.promoteur', 'organizationName');
    }
    /**
     * Share plan with someone via email
     */
    static async sharePlan(planId, userId, shareWith) {
        const plan = await TravelPlan_1.default.findById(planId);
        if (!plan) {
            throw new Error('Travel plan not found');
        }
        if (plan.user.toString() !== userId) {
            throw new Error('Not authorized to share this plan');
        }
        // Generate share token if not exists
        if (!plan.shareToken) {
            plan.shareToken = crypto_1.default.randomBytes(16).toString('hex');
        }
        // Add to shared list
        plan.sharedWith.push({
            email: shareWith.email,
            name: shareWith.name,
            sharedAt: new Date(),
        });
        await plan.save();
        // Send notification email
        await NotificationService_1.NotificationService.create({
            recipient: shareWith.email,
            type: 'system',
            title: 'Plan de voyage partagé',
            message: `Un plan de voyage a été partagé avec vous: ${plan.tripName}`,
            priority: 'medium',
            channels: { email: true },
            data: { shareLink: `/travel-plans/shared/${plan.shareToken}` },
        });
        return plan;
    }
    /**
     * Get user's travel plans
     */
    static async getUserPlans(userId, status) {
        const query = { user: userId };
        if (status) {
            query.status = status;
        }
        return TravelPlan_1.default.find(query)
            .populate('visits.project', 'title slug media priceFrom')
            .sort({ arrivalDate: -1 });
    }
    /**
     * Update plan status
     */
    static async updateStatus(planId, userId, status) {
        const plan = await TravelPlan_1.default.findById(planId);
        if (!plan) {
            throw new Error('Travel plan not found');
        }
        if (plan.user.toString() !== userId) {
            throw new Error('Not authorized to modify this plan');
        }
        plan.status = status;
        await plan.save();
        return plan;
    }
    /**
     * Get upcoming visits for promoteur
     */
    static async getPromoteurUpcomingVisits(promoteurId) {
        const plans = await TravelPlan_1.default.find({
            'visits.promoteur': promoteurId,
            'visits.status': { $in: ['requested', 'confirmed'] },
            'visits.scheduledDate': { $gte: new Date() },
        })
            .populate('user', 'firstName lastName email phone')
            .populate('visits.project', 'title slug');
        const visits = [];
        for (const plan of plans) {
            for (const visit of plan.visits) {
                if (visit.promoteur.toString() === promoteurId &&
                    ['requested', 'confirmed'].includes(visit.status) &&
                    new Date(visit.scheduledDate) >= new Date()) {
                    visits.push({
                        plan: {
                            id: plan._id,
                            tripName: plan.tripName,
                            user: plan.user,
                        },
                        visit,
                    });
                }
            }
        }
        return visits.sort((a, b) => new Date(a.visit.scheduledDate).getTime() - new Date(b.visit.scheduledDate).getTime());
    }
    // Helper: Convert time string to minutes
    static timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }
    // Helper: Convert minutes to time string
    static minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
}
exports.TravelPlanService = TravelPlanService;
