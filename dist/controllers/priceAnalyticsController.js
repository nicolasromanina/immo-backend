"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceAnalyticsController = void 0;
const PriceAnalyticsService_1 = require("../services/PriceAnalyticsService");
/**
 * Controller for price analytics endpoints
 * Provides price per m² comparison by area
 */
class PriceAnalyticsController {
    /**
     * Get price stats for a specific area
     */
    static async getAreaStats(req, res) {
        try {
            const { country, city, area } = req.params;
            const { projectType } = req.query;
            if (!country || !city || !area) {
                return res.status(400).json({ message: 'Country, city, and area are required' });
            }
            const stats = await PriceAnalyticsService_1.PriceAnalyticsService.getAreaStats(country, city, area, projectType);
            res.json({ stats });
        }
        catch (error) {
            console.error('Error getting area stats:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Compare prices across multiple areas
     */
    static async compareAreas(req, res) {
        try {
            const { country, city } = req.params;
            const { areas, projectType } = req.query;
            if (!country || !city || !areas) {
                return res.status(400).json({ message: 'Country, city, and areas are required' });
            }
            const areaList = areas.split(',').map(a => a.trim());
            const comparison = await PriceAnalyticsService_1.PriceAnalyticsService.compareAreas(country, city, areaList, projectType);
            res.json(comparison);
        }
        catch (error) {
            console.error('Error comparing areas:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get city overview with all areas
     */
    static async getCityOverview(req, res) {
        try {
            const { country, city } = req.params;
            if (!country || !city) {
                return res.status(400).json({ message: 'Country and city are required' });
            }
            const overview = await PriceAnalyticsService_1.PriceAnalyticsService.getCityOverview(country, city);
            res.json(overview);
        }
        catch (error) {
            console.error('Error getting city overview:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Search projects by price per m² range
     */
    static async searchByPriceRange(req, res) {
        try {
            const { country } = req.params;
            const { city, projectType, minPricePerSqm, maxPricePerSqm, page, limit } = req.query;
            if (!country) {
                return res.status(400).json({ message: 'Country is required' });
            }
            const result = await PriceAnalyticsService_1.PriceAnalyticsService.searchByPriceRange({
                country,
                city: city,
                projectType: projectType,
                minPricePerSqm: minPricePerSqm ? parseInt(minPricePerSqm) : undefined,
                maxPricePerSqm: maxPricePerSqm ? parseInt(maxPricePerSqm) : undefined,
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 20,
            });
            res.json(result);
        }
        catch (error) {
            console.error('Error searching by price range:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get price trends for an area
     */
    static async getAreaTrends(req, res) {
        try {
            const { country, city, area } = req.params;
            const { projectType } = req.query;
            if (!country || !city || !area || !projectType) {
                return res.status(400).json({
                    message: 'Country, city, area, and projectType are required',
                });
            }
            const trends = await PriceAnalyticsService_1.PriceAnalyticsService.getAreaTrends(country, city, area, projectType);
            if (!trends) {
                return res.status(404).json({ message: 'No data found for this area' });
            }
            res.json(trends);
        }
        catch (error) {
            console.error('Error getting area trends:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get most affordable areas in a city
     */
    static async getAffordableAreas(req, res) {
        try {
            const { country, city } = req.params;
            const { projectType, limit } = req.query;
            if (!country || !city) {
                return res.status(400).json({ message: 'Country and city are required' });
            }
            const areas = await PriceAnalyticsService_1.PriceAnalyticsService.getAffordableAreas(country, city, projectType || 'villa', limit ? parseInt(limit) : 10);
            res.json({ areas });
        }
        catch (error) {
            console.error('Error getting affordable areas:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Recalculate all price stats (admin only)
     */
    static async recalculateStats(req, res) {
        try {
            const result = await PriceAnalyticsService_1.PriceAnalyticsService.recalculateAllStats();
            res.json({
                message: 'Price stats recalculation completed',
                ...result,
            });
        }
        catch (error) {
            console.error('Error recalculating stats:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Calculate stats for a specific area (admin only)
     */
    static async calculateAreaStats(req, res) {
        try {
            const { country, city, area, projectType } = req.body;
            if (!country || !city || !area || !projectType) {
                return res.status(400).json({
                    message: 'Country, city, area, and projectType are required',
                });
            }
            const stats = await PriceAnalyticsService_1.PriceAnalyticsService.calculateAreaStats(country, city, area, projectType);
            if (!stats) {
                return res.status(404).json({ message: 'No projects found for this area' });
            }
            res.json({ stats });
        }
        catch (error) {
            console.error('Error calculating area stats:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.PriceAnalyticsController = PriceAnalyticsController;
