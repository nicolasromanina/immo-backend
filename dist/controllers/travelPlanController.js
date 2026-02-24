"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelPlanController = void 0;
const TravelPlanService_1 = require("../services/TravelPlanService");
const TravelPlan_1 = __importDefault(require("../models/TravelPlan"));
/**
 * Controller for travel plan (diaspora mode) endpoints
 */
class TravelPlanController {
    /**
     * Create a new travel plan
     */
    static async createPlan(req, res) {
        try {
            const { tripName, destination, arrivalDate, departureDate, accommodation, preferences, notes } = req.body;
            if (!tripName || !destination?.country || !destination?.city || !arrivalDate || !departureDate) {
                return res.status(400).json({
                    message: 'Trip name, destination (country, city), arrival and departure dates are required',
                });
            }
            const plan = await TravelPlanService_1.TravelPlanService.createPlan({
                userId: req.user.id,
                tripName,
                destination,
                arrivalDate: new Date(arrivalDate),
                departureDate: new Date(departureDate),
                accommodation,
                preferences,
                notes,
            });
            res.status(201).json({ plan });
        }
        catch (error) {
            console.error('Error creating travel plan:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Get user's travel plans
     */
    static async getMyPlans(req, res) {
        try {
            const { status } = req.query;
            const plans = await TravelPlanService_1.TravelPlanService.getUserPlans(req.user.id, status);
            res.json({ plans });
        }
        catch (error) {
            console.error('Error getting travel plans:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get single travel plan
     */
    static async getPlan(req, res) {
        try {
            const { id } = req.params;
            const plan = await TravelPlan_1.default.findById(id)
                .populate('visits.project', 'title slug media priceFrom coordinates city area')
                .populate('visits.promoteur', 'organizationName companyPhone');
            if (!plan) {
                return res.status(404).json({ message: 'Travel plan not found' });
            }
            // Check access
            if (plan.user.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to view this plan' });
            }
            res.json({ plan });
        }
        catch (error) {
            console.error('Error getting travel plan:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Update travel plan
     */
    static async updatePlan(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const plan = await TravelPlan_1.default.findById(id);
            if (!plan) {
                return res.status(404).json({ message: 'Travel plan not found' });
            }
            if (plan.user.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to modify this plan' });
            }
            // Allowed updates
            const allowedFields = ['tripName', 'destination', 'arrivalDate', 'departureDate', 'accommodation', 'preferences', 'notes'];
            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    plan[field] = updates[field];
                }
            }
            await plan.save();
            res.json({ plan });
        }
        catch (error) {
            console.error('Error updating travel plan:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Delete travel plan
     */
    static async deletePlan(req, res) {
        try {
            const { id } = req.params;
            const plan = await TravelPlan_1.default.findById(id);
            if (!plan) {
                return res.status(404).json({ message: 'Travel plan not found' });
            }
            if (plan.user.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to delete this plan' });
            }
            await TravelPlan_1.default.findByIdAndDelete(id);
            res.json({ message: 'Travel plan deleted' });
        }
        catch (error) {
            console.error('Error deleting travel plan:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Add visit to travel plan
     */
    static async addVisit(req, res) {
        try {
            const { id } = req.params;
            const { projectId, scheduledDate, scheduledTime, duration, type, notes } = req.body;
            if (!projectId || !scheduledDate || !scheduledTime) {
                return res.status(400).json({
                    message: 'Project ID, scheduled date and time are required',
                });
            }
            const plan = await TravelPlanService_1.TravelPlanService.addVisit(id, req.user.id, {
                projectId,
                scheduledDate: new Date(scheduledDate),
                scheduledTime,
                duration,
                type,
                notes,
            });
            res.json({ plan });
        }
        catch (error) {
            console.error('Error adding visit:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Remove visit from travel plan
     */
    static async removeVisit(req, res) {
        try {
            const { id, visitIndex } = req.params;
            const plan = await TravelPlanService_1.TravelPlanService.removeVisit(id, parseInt(visitIndex), req.user.id);
            res.json({ plan });
        }
        catch (error) {
            console.error('Error removing visit:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Confirm visit (promoteur)
     */
    static async confirmVisit(req, res) {
        try {
            const { id, visitIndex } = req.params;
            const { contactPerson, contactPhone, meetingPoint } = req.body;
            const plan = await TravelPlanService_1.TravelPlanService.confirmVisit(id, parseInt(visitIndex), req.user.id, { contactPerson, contactPhone, meetingPoint });
            res.json({ plan });
        }
        catch (error) {
            console.error('Error confirming visit:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Complete visit with feedback
     */
    static async completeVisit(req, res) {
        try {
            const { id, visitIndex } = req.params;
            const { rating, comment, wouldRecommend } = req.body;
            const feedback = rating ? { rating, comment, wouldRecommend } : undefined;
            const plan = await TravelPlanService_1.TravelPlanService.completeVisit(id, parseInt(visitIndex), req.user.id, feedback);
            res.json({ plan });
        }
        catch (error) {
            console.error('Error completing visit:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Get suggested projects for destination
     */
    static async getSuggestedProjects(req, res) {
        try {
            const { country, city, areas } = req.query;
            if (!country || !city) {
                return res.status(400).json({ message: 'Country and city are required' });
            }
            const projects = await TravelPlanService_1.TravelPlanService.getSuggestedProjects({
                country: country,
                city: city,
                areas: areas ? areas.split(',') : undefined,
            });
            res.json({ projects });
        }
        catch (error) {
            console.error('Error getting suggested projects:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Optimize itinerary
     */
    static async optimizeItinerary(req, res) {
        try {
            const { id } = req.params;
            const plan = await TravelPlanService_1.TravelPlanService.optimizeItinerary(id, req.user.id);
            res.json({ plan });
        }
        catch (error) {
            console.error('Error optimizing itinerary:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Generate share link
     */
    static async generateShareLink(req, res) {
        try {
            const { id } = req.params;
            const shareLink = await TravelPlanService_1.TravelPlanService.generateShareLink(id, req.user.id);
            res.json({ shareLink });
        }
        catch (error) {
            console.error('Error generating share link:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Get shared plan (public)
     */
    static async getSharedPlan(req, res) {
        try {
            const { token } = req.params;
            const plan = await TravelPlanService_1.TravelPlanService.getPlanByShareToken(token);
            if (!plan) {
                return res.status(404).json({ message: 'Plan not found or link expired' });
            }
            // Return limited info for shared plans
            res.json({
                plan: {
                    tripName: plan.tripName,
                    destination: plan.destination,
                    arrivalDate: plan.arrivalDate,
                    departureDate: plan.departureDate,
                    visits: plan.visits.map(v => ({
                        project: v.project,
                        scheduledDate: v.scheduledDate,
                        scheduledTime: v.scheduledTime,
                        type: v.type,
                        status: v.status,
                    })),
                    optimizedItinerary: plan.optimizedItinerary,
                },
            });
        }
        catch (error) {
            console.error('Error getting shared plan:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Share plan with someone
     */
    static async sharePlan(req, res) {
        try {
            const { id } = req.params;
            const { email, name } = req.body;
            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }
            const plan = await TravelPlanService_1.TravelPlanService.sharePlan(id, req.user.id, { email, name });
            res.json({ plan, shareLink: `/travel-plans/shared/${plan.shareToken}` });
        }
        catch (error) {
            console.error('Error sharing plan:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Update plan status
     */
    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const validStatuses = ['planning', 'confirmed', 'in-progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }
            const plan = await TravelPlanService_1.TravelPlanService.updateStatus(id, req.user.id, status);
            res.json({ plan });
        }
        catch (error) {
            console.error('Error updating status:', error);
            res.status(400).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Get upcoming visits for promoteur
     */
    static async getPromoteurUpcomingVisits(req, res) {
        try {
            const promoteurId = req.user.promoteurProfile;
            if (!promoteurId) {
                return res.status(403).json({ message: 'Only promoteurs can access this endpoint' });
            }
            const visits = await TravelPlanService_1.TravelPlanService.getPromoteurUpcomingVisits(promoteurId);
            res.json({ visits });
        }
        catch (error) {
            console.error('Error getting upcoming visits:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.TravelPlanController = TravelPlanController;
