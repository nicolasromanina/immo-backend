"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertController = void 0;
const Alert_1 = __importDefault(require("../models/Alert"));
class AlertController {
    /**
     * Create a new alert
     */
    static async create(req, res) {
        try {
            const userId = req.user.id;
            const alert = new Alert_1.default({
                ...req.body,
                user: userId,
            });
            await alert.save();
            res.status(201).json({
                success: true,
                data: alert,
            });
        }
        catch (error) {
            console.error('[AlertController.create] Error:', error.message, error.errors || '');
            res.status(400).json({
                success: false,
                message: error.message,
                errors: error.errors,
            });
        }
    }
    /**
     * Get user's alerts
     */
    static async getMyAlerts(req, res) {
        try {
            const userId = req.user.id;
            const { isRead } = req.query;
            const query = { user: userId };
            if (isRead !== undefined) {
                query.isRead = isRead === 'true';
            }
            const alerts = await Alert_1.default.find(query).sort({ createdAt: -1 });
            res.json({
                success: true,
                data: alerts,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Get active alert preferences
     */
    static async getActivePreferences(req, res) {
        try {
            const userId = req.user.id;
            const alerts = await Alert_1.default.find({
                user: userId,
                isActive: true,
            }).select('-sentAt -readAt -isRead');
            res.json({
                success: true,
                data: alerts,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Update alert
     */
    static async update(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const alert = await Alert_1.default.findOne({ _id: id, user: userId });
            if (!alert) {
                return res.status(404).json({
                    success: false,
                    error: 'Alert not found',
                });
            }
            Object.assign(alert, req.body);
            await alert.save();
            res.json({
                success: true,
                data: alert,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Mark alert as read
     */
    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const alert = await Alert_1.default.findOne({ _id: id, user: userId });
            if (!alert) {
                return res.status(404).json({
                    success: false,
                    error: 'Alert not found',
                });
            }
            alert.isRead = true;
            alert.readAt = new Date();
            await alert.save();
            res.json({
                success: true,
                data: alert,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Mark all alerts as read
     */
    static async markAllAsRead(req, res) {
        try {
            const userId = req.user.id;
            await Alert_1.default.updateMany({ user: userId, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
            res.json({
                success: true,
                message: 'All alerts marked as read',
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Delete alert
     */
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const alert = await Alert_1.default.findOne({ _id: id, user: userId });
            if (!alert) {
                return res.status(404).json({
                    success: false,
                    error: 'Alert not found',
                });
            }
            await alert.deleteOne();
            res.json({
                success: true,
                message: 'Alert deleted',
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Toggle alert on/off
     */
    static async toggle(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const alert = await Alert_1.default.findOne({ _id: id, user: userId });
            if (!alert) {
                return res.status(404).json({
                    success: false,
                    error: 'Alert not found',
                });
            }
            alert.isActive = !alert.isActive;
            await alert.save();
            res.json({
                success: true,
                data: alert,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message,
            });
        }
    }
}
exports.AlertController = AlertController;
