"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustScoreConfigController = void 0;
const AdvancedTrustScoreService_1 = require("../services/AdvancedTrustScoreService");
const TrustScoreConfig_1 = __importDefault(require("../models/TrustScoreConfig"));
class TrustScoreConfigController {
    /**
     * Get active config
     */
    static async getActiveConfig(req, res) {
        try {
            const config = await AdvancedTrustScoreService_1.AdvancedTrustScoreService.getActiveConfig();
            res.json({ config });
        }
        catch (error) {
            console.error('Error getting active config:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get all configs
     */
    static async getAllConfigs(req, res) {
        try {
            const configs = await TrustScoreConfig_1.default.find()
                .sort({ createdAt: -1 });
            res.json({ configs });
        }
        catch (error) {
            console.error('Error getting configs:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get config by ID
     */
    static async getConfig(req, res) {
        try {
            const { id } = req.params;
            const config = await TrustScoreConfig_1.default.findById(id);
            if (!config) {
                return res.status(404).json({ message: 'Config not found' });
            }
            res.json({ config });
        }
        catch (error) {
            console.error('Error getting config:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Create or update config
     */
    static async saveConfig(req, res) {
        try {
            const { name, setActive, ...configData } = req.body;
            if (!name) {
                return res.status(400).json({ message: 'Config name is required' });
            }
            const config = await AdvancedTrustScoreService_1.AdvancedTrustScoreService.saveConfig(name, configData, req.user.id, setActive);
            res.json({ config });
        }
        catch (error) {
            console.error('Error saving config:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Activate config
     */
    static async activateConfig(req, res) {
        try {
            const { id } = req.params;
            // Deactivate all
            await TrustScoreConfig_1.default.updateMany({}, { isActive: false });
            // Activate this one
            const config = await TrustScoreConfig_1.default.findByIdAndUpdate(id, { isActive: true }, { new: true });
            if (!config) {
                return res.status(404).json({ message: 'Config not found' });
            }
            res.json({ config });
        }
        catch (error) {
            console.error('Error activating config:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Delete config
     */
    static async deleteConfig(req, res) {
        try {
            const { id } = req.params;
            const config = await TrustScoreConfig_1.default.findById(id);
            if (!config) {
                return res.status(404).json({ message: 'Config not found' });
            }
            if (config.isActive) {
                return res.status(400).json({ message: 'Cannot delete active config' });
            }
            await TrustScoreConfig_1.default.findByIdAndDelete(id);
            res.json({ success: true });
        }
        catch (error) {
            console.error('Error deleting config:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Calculate score for a promoteur
     */
    static async calculateScore(req, res) {
        try {
            const { promoteurId } = req.params;
            const result = await AdvancedTrustScoreService_1.AdvancedTrustScoreService.calculateScore(promoteurId);
            res.json(result);
        }
        catch (error) {
            console.error('Error calculating score:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    }
    /**
     * Recalculate all scores
     */
    static async recalculateAllScores(req, res) {
        try {
            const count = await AdvancedTrustScoreService_1.AdvancedTrustScoreService.recalculateAllScores();
            res.json({ updated: count });
        }
        catch (error) {
            console.error('Error recalculating scores:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get score history
     */
    static async getScoreHistory(req, res) {
        try {
            const { promoteurId } = req.params;
            const { days } = req.query;
            const history = await AdvancedTrustScoreService_1.AdvancedTrustScoreService.getScoreHistory(promoteurId, days ? parseInt(days) : 30);
            res.json({ history });
        }
        catch (error) {
            console.error('Error getting score history:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.TrustScoreConfigController = TrustScoreConfigController;
