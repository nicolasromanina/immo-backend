"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceAnalyticsService = void 0;
const PriceStats_1 = __importDefault(require("../models/PriceStats"));
const Project_1 = __importDefault(require("../models/Project"));
/**
 * Service for price analytics and comparison
 * Provides price per m² data by area/quartier
 */
class PriceAnalyticsService {
    /**
     * Calculate and update price statistics for an area
     */
    static async calculateAreaStats(country, city, area, projectType) {
        // Get all published projects in the area
        const projects = await Project_1.default.find({
            country,
            city,
            area,
            projectType,
            publicationStatus: 'published',
            status: { $nin: ['archive', 'suspended'] },
        });
        if (projects.length === 0) {
            return null;
        }
        // Calculate price per sqm for each project/typology
        const allPricesPerSqm = [];
        const typologyData = new Map();
        for (const project of projects) {
            for (const typo of project.typologies) {
                if (typo.price > 0 && typo.surface > 0) {
                    const pricePerSqm = typo.price / typo.surface;
                    allPricesPerSqm.push(pricePerSqm);
                    if (!typologyData.has(typo.name)) {
                        typologyData.set(typo.name, { prices: [], surfaces: [], pricesPerSqm: [] });
                    }
                    const data = typologyData.get(typo.name);
                    data.prices.push(typo.price);
                    data.surfaces.push(typo.surface);
                    data.pricesPerSqm.push(pricePerSqm);
                }
            }
        }
        if (allPricesPerSqm.length === 0) {
            return null;
        }
        // Calculate overall statistics
        allPricesPerSqm.sort((a, b) => a - b);
        const min = allPricesPerSqm[0];
        const max = allPricesPerSqm[allPricesPerSqm.length - 1];
        const average = allPricesPerSqm.reduce((a, b) => a + b, 0) / allPricesPerSqm.length;
        const median = this.calculateMedian(allPricesPerSqm);
        // Calculate typology statistics
        const typologyStats = [];
        for (const [name, data] of typologyData) {
            typologyStats.push({
                name,
                minPrice: Math.min(...data.prices),
                maxPrice: Math.max(...data.prices),
                avgPrice: data.prices.reduce((a, b) => a + b, 0) / data.prices.length,
                avgSurface: data.surfaces.reduce((a, b) => a + b, 0) / data.surfaces.length,
                avgPricePerSqm: data.pricesPerSqm.reduce((a, b) => a + b, 0) / data.pricesPerSqm.length,
                count: data.prices.length,
            });
        }
        // Find or create the stats document
        let stats = await PriceStats_1.default.findOne({ country, city, area, projectType });
        const previousAvg = stats?.pricePerSqm?.average;
        if (!stats) {
            stats = new PriceStats_1.default({
                country,
                city,
                area,
                projectType,
                pricePerSqm: { min, max, average, median },
                sampleSize: allPricesPerSqm.length,
                projectIds: projects.map(p => p._id),
                typologyStats,
                history: [],
                lastUpdated: new Date(),
                isActive: true,
            });
        }
        else {
            // Add to history before updating
            stats.history.push({
                date: new Date(),
                avgPricePerSqm: average,
                sampleSize: allPricesPerSqm.length,
            });
            // Keep only last 12 months of history
            if (stats.history.length > 12) {
                stats.history = stats.history.slice(-12);
            }
            // Update current stats
            stats.pricePerSqm = { min, max, average, median };
            stats.sampleSize = allPricesPerSqm.length;
            stats.projectIds = projects.map(p => p._id);
            stats.typologyStats = typologyStats;
            stats.lastUpdated = new Date();
        }
        // Calculate trend
        if (previousAvg && previousAvg > 0) {
            const percentageChange = ((average - previousAvg) / previousAvg) * 100;
            stats.trend = {
                direction: percentageChange > 2 ? 'up' : percentageChange < -2 ? 'down' : 'stable',
                percentageChange: Math.round(percentageChange * 100) / 100,
                lastCalculated: new Date(),
            };
        }
        await stats.save();
        return stats;
    }
    /**
     * Get price stats for an area
     */
    static async getAreaStats(country, city, area, projectType) {
        const query = { country, city, area, isActive: true };
        if (projectType) {
            query.projectType = projectType;
        }
        const stats = await PriceStats_1.default.find(query).sort({ projectType: 1 });
        return stats;
    }
    /**
     * Compare prices across multiple areas
     */
    static async compareAreas(country, city, areas, projectType) {
        const query = {
            country,
            city,
            area: { $in: areas },
            isActive: true,
        };
        if (projectType) {
            query.projectType = projectType;
        }
        const stats = await PriceStats_1.default.find(query);
        if (stats.length === 0) {
            return {
                areas: [],
                cheapest: '',
                mostExpensive: '',
                average: 0,
            };
        }
        const formattedAreas = stats.map(s => ({
            area: s.area,
            projectType: s.projectType,
            avgPricePerSqm: Math.round(s.pricePerSqm.average),
            minPricePerSqm: Math.round(s.pricePerSqm.min),
            maxPricePerSqm: Math.round(s.pricePerSqm.max),
            sampleSize: s.sampleSize,
            trend: s.trend.direction,
        }));
        // Sort by average price
        formattedAreas.sort((a, b) => a.avgPricePerSqm - b.avgPricePerSqm);
        const overallAverage = formattedAreas.reduce((sum, a) => sum + a.avgPricePerSqm, 0) / formattedAreas.length;
        return {
            areas: formattedAreas,
            cheapest: formattedAreas[0]?.area || '',
            mostExpensive: formattedAreas[formattedAreas.length - 1]?.area || '',
            average: Math.round(overallAverage),
        };
    }
    /**
     * Get city overview with all areas
     */
    static async getCityOverview(country, city) {
        const stats = await PriceStats_1.default.find({ country, city, isActive: true });
        if (stats.length === 0) {
            return {
                city,
                country,
                totalProjects: 0,
                areas: [],
                cityAverage: 0,
                priceRange: { min: 0, max: 0 },
            };
        }
        // Group by area
        const areaMap = new Map();
        let allPrices = [];
        let totalSampleSize = 0;
        for (const s of stats) {
            if (!areaMap.has(s.area)) {
                areaMap.set(s.area, { villaAvg: null, immeubleAvg: null, sampleSize: 0 });
            }
            const areaData = areaMap.get(s.area);
            if (s.projectType === 'villa') {
                areaData.villaAvg = Math.round(s.pricePerSqm.average);
            }
            else {
                areaData.immeubleAvg = Math.round(s.pricePerSqm.average);
            }
            areaData.sampleSize += s.sampleSize;
            totalSampleSize += s.sampleSize;
            allPrices.push(s.pricePerSqm.average);
        }
        const areas = Array.from(areaMap.entries()).map(([area, data]) => ({
            area,
            ...data,
        }));
        // Sort by average price (combining villa and immeuble)
        areas.sort((a, b) => {
            const avgA = ((a.villaAvg || 0) + (a.immeubleAvg || 0)) / (a.villaAvg && a.immeubleAvg ? 2 : 1);
            const avgB = ((b.villaAvg || 0) + (b.immeubleAvg || 0)) / (b.villaAvg && b.immeubleAvg ? 2 : 1);
            return avgA - avgB;
        });
        const cityAverage = allPrices.length > 0
            ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length)
            : 0;
        return {
            city,
            country,
            totalProjects: totalSampleSize,
            areas,
            cityAverage,
            priceRange: {
                min: Math.round(Math.min(...allPrices)),
                max: Math.round(Math.max(...allPrices)),
            },
        };
    }
    /**
     * Search projects within a price range per m²
     */
    static async searchByPriceRange(params) {
        const query = {
            country: params.country,
            publicationStatus: 'published',
            status: { $nin: ['archive', 'suspended'] },
        };
        if (params.city)
            query.city = params.city;
        if (params.projectType)
            query.projectType = params.projectType;
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;
        // Get all matching projects
        let projects = await Project_1.default.find(query)
            .populate('promoteur', 'organizationName trustScore badges')
            .lean();
        // Filter by price per sqm
        if (params.minPricePerSqm || params.maxPricePerSqm) {
            projects = projects.filter(project => {
                // Calculate average price per sqm for the project
                const validTypologies = project.typologies.filter((t) => t.price > 0 && t.surface > 0);
                if (validTypologies.length === 0)
                    return false;
                const avgPricePerSqm = validTypologies.reduce((sum, t) => sum + t.price / t.surface, 0) / validTypologies.length;
                const meetsMin = !params.minPricePerSqm || avgPricePerSqm >= params.minPricePerSqm;
                const meetsMax = !params.maxPricePerSqm || avgPricePerSqm <= params.maxPricePerSqm;
                return meetsMin && meetsMax;
            });
        }
        // Add calculated price per sqm to each project
        const projectsWithPricePerSqm = projects.map(project => {
            const validTypologies = project.typologies.filter((t) => t.price > 0 && t.surface > 0);
            const avgPricePerSqm = validTypologies.length > 0
                ? validTypologies.reduce((sum, t) => sum + t.price / t.surface, 0) / validTypologies.length
                : 0;
            return {
                ...project,
                calculatedPricePerSqm: Math.round(avgPricePerSqm),
            };
        });
        // Sort by price per sqm
        projectsWithPricePerSqm.sort((a, b) => a.calculatedPricePerSqm - b.calculatedPricePerSqm);
        const total = projectsWithPricePerSqm.length;
        const paginatedProjects = projectsWithPricePerSqm.slice(skip, skip + limit);
        return {
            projects: paginatedProjects,
            total,
            page,
            pages: Math.ceil(total / limit),
        };
    }
    /**
     * Get price trends for an area over time
     */
    static async getAreaTrends(country, city, area, projectType) {
        const stats = await PriceStats_1.default.findOne({ country, city, area, projectType });
        if (!stats) {
            return null;
        }
        return {
            currentAvg: Math.round(stats.pricePerSqm.average),
            history: stats.history.map(h => ({
                date: h.date,
                avgPricePerSqm: Math.round(h.avgPricePerSqm),
            })),
            trend: {
                direction: stats.trend.direction,
                percentageChange: stats.trend.percentageChange,
            },
        };
    }
    /**
     * Recalculate all price stats (scheduled job)
     */
    static async recalculateAllStats() {
        // Get all unique location/type combinations from projects
        const combinations = await Project_1.default.aggregate([
            {
                $match: {
                    publicationStatus: 'published',
                    status: { $nin: ['archive', 'suspended'] },
                },
            },
            {
                $group: {
                    _id: {
                        country: '$country',
                        city: '$city',
                        area: '$area',
                        projectType: '$projectType',
                    },
                },
            },
        ]);
        let updated = 0;
        let errors = 0;
        for (const combo of combinations) {
            try {
                await this.calculateAreaStats(combo._id.country, combo._id.city, combo._id.area, combo._id.projectType);
                updated++;
            }
            catch (error) {
                console.error(`Error calculating stats for ${JSON.stringify(combo._id)}:`, error);
                errors++;
            }
        }
        return { updated, errors };
    }
    /**
     * Get areas ranked by affordability
     */
    static async getAffordableAreas(country, city, projectType, limit = 10) {
        const stats = await PriceStats_1.default.find({
            country,
            city,
            projectType,
            isActive: true,
        })
            .sort({ 'pricePerSqm.average': 1 })
            .limit(limit);
        return stats.map(s => ({
            area: s.area,
            avgPricePerSqm: Math.round(s.pricePerSqm.average),
            priceRange: `${Math.round(s.pricePerSqm.min).toLocaleString()} - ${Math.round(s.pricePerSqm.max).toLocaleString()}`,
            sampleSize: s.sampleSize,
        }));
    }
    // Helper: Calculate median
    static calculateMedian(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }
}
exports.PriceAnalyticsService = PriceAnalyticsService;
