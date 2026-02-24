"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABTestController = void 0;
const ABTest_1 = __importDefault(require("../models/ABTest"));
const Project_1 = __importDefault(require("../models/Project"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
const mongoose_1 = __importDefault(require("mongoose"));
class ABTestController {
    /**
     * Créer un nouveau test A/B
     */
    static async createTest(req, res) {
        try {
            const { projectId, testType, description, variantA, variantB } = req.body;
            const promoteurId = req.user?.id;
            // Validation
            if (!projectId || !testType || !description || !variantA || !variantB) {
                return res.status(400).json({ message: 'Paramètres manquants' });
            }
            if (!['description', 'image'].includes(testType)) {
                return res.status(400).json({ message: 'Type de test invalide' });
            }
            // Vérifier que le projet appartient au promoteur
            const project = await Project_1.default.findOne({
                _id: projectId,
                promoteur: promoteurId,
            });
            if (!project) {
                return res.status(404).json({ message: 'Projet non trouvé' });
            }
            // Créer le test A/B
            const newTest = new ABTest_1.default({
                projectId,
                promoteurId,
                projectName: project.title,
                testType,
                description,
                variants: [
                    {
                        id: 'variant-a',
                        name: variantA.name || 'Variante A',
                        type: testType,
                        content: variantA.content,
                        views: 0,
                        clicks: 0,
                        conversions: 0,
                    },
                    {
                        id: 'variant-b',
                        name: variantB.name || 'Variante B',
                        type: testType,
                        content: variantB.content,
                        views: 0,
                        clicks: 0,
                        conversions: 0,
                    },
                ],
                status: 'active',
                startDate: new Date(),
                minViews: 500,
            });
            await newTest.save();
            res.status(201).json({
                message: 'Test A/B créé avec succès',
                test: newTest,
            });
        }
        catch (error) {
            console.error('Erreur création test A/B:', error);
            res.status(500).json({
                message: 'Erreur lors de la création du test A/B',
                error: error.message,
            });
        }
    }
    /**
     * Récupérer tous les tests A/B d'un promoteur
     */
    static async getTests(req, res) {
        try {
            const promoteurId = req.user?.id;
            const { status } = req.query;
            const filter = { promoteurId };
            if (status && ['active', 'paused', 'completed'].includes(status)) {
                filter.status = status;
            }
            const tests = await ABTest_1.default.find(filter)
                .sort({ startDate: -1 })
                .lean();
            // Calculer les stats pour chaque test
            const testsWithStats = tests.map((test) => ({
                ...test,
                stats: calculateTestStats(test),
            }));
            res.json({
                tests: testsWithStats,
                total: tests.length,
            });
        }
        catch (error) {
            console.error('Erreur récupération tests A/B:', error);
            res.status(500).json({
                message: 'Erreur lors de la récupération des tests',
                error: error.message,
            });
        }
    }
    /**
     * Admin: récupérer tous les tests A/B (tous promoteurs)
     */
    static async getAllForAdmin(req, res) {
        try {
            const { status, promoteurId } = req.query;
            const filter = {};
            if (status && ['active', 'paused', 'completed'].includes(status)) {
                filter.status = status;
            }
            if (promoteurId) {
                filter.promoteurId = promoteurId;
            }
            const tests = await ABTest_1.default.find(filter)
                .sort({ startDate: -1 })
                .lean();
            const userIds = [...new Set(tests.map((t) => t.promoteurId).filter(Boolean))];
            const promoteurs = await Promoteur_1.default.find({ user: { $in: userIds } })
                .select('organizationName user')
                .lean();
            const promoteurMap = Object.fromEntries(promoteurs.map((p) => [p.user?.toString(), p]));
            const testsWithStats = tests.map((test) => {
                const promo = promoteurMap[test.promoteurId?.toString()];
                return {
                    ...test,
                    promoteurName: promo?.organizationName || '—',
                    stats: calculateTestStats(test),
                };
            });
            res.json({
                tests: testsWithStats,
                total: tests.length,
            });
        }
        catch (error) {
            console.error('Erreur récupération tests A/B admin:', error);
            res.status(500).json({
                message: 'Erreur lors de la récupération des tests',
                error: error.message,
            });
        }
    }
    /**
     * Récupérer un test A/B spécifique
     */
    static async getTest(req, res) {
        try {
            const { testId } = req.params;
            const promoteurId = req.user?.id;
            if (!mongoose_1.default.Types.ObjectId.isValid(testId)) {
                return res.status(400).json({ message: 'ID du test invalide' });
            }
            const test = await ABTest_1.default.findOne({
                _id: testId,
                promoteurId,
            });
            if (!test) {
                return res.status(404).json({ message: 'Test non trouvé' });
            }
            res.json({
                test: {
                    ...test.toObject(),
                    stats: calculateTestStats(test),
                },
            });
        }
        catch (error) {
            console.error('Erreur récupération test A/B:', error);
            res.status(500).json({
                message: 'Erreur lors de la récupération du test',
                error: error.message,
            });
        }
    }
    /**
     * Mettre à jour les statistiques d'une variante
     */
    static async recordEvent(req, res) {
        try {
            const { testId, variantId, eventType } = req.body;
            if (!['view', 'click', 'conversion'].includes(eventType)) {
                return res.status(400).json({ message: 'Type d\'événement invalide' });
            }
            const test = await ABTest_1.default.findById(testId);
            if (!test) {
                return res.status(404).json({ message: 'Test non trouvé' });
            }
            const variant = test.variants.find((v) => v.id === variantId);
            if (!variant) {
                return res.status(404).json({ message: 'Variante non trouvée' });
            }
            // Incrémenter le compteur approprié
            if (eventType === 'view') {
                variant.views += 1;
            }
            else if (eventType === 'click') {
                variant.clicks += 1;
            }
            else if (eventType === 'conversion') {
                variant.conversions += 1;
            }
            await test.save();
            res.json({ message: 'Événement enregistré', variant });
        }
        catch (error) {
            console.error('Erreur enregistrement événement:', error);
            res.status(500).json({
                message: 'Erreur lors de l\'enregistrement de l\'événement',
                error: error.message,
            });
        }
    }
    /**
     * Arrêter un test A/B
     */
    static async stopTest(req, res) {
        try {
            const { testId } = req.params;
            const promoteurId = req.user?.id;
            if (!mongoose_1.default.Types.ObjectId.isValid(testId)) {
                return res.status(400).json({ message: 'ID du test invalide' });
            }
            const test = await ABTest_1.default.findOne({
                _id: testId,
                promoteurId,
            });
            if (!test) {
                return res.status(404).json({ message: 'Test non trouvé' });
            }
            // Déterminer la variante gagnante (celle avec le meilleur taux de conversion)
            let winnerVariantId = test.variants[0].id;
            let highestConversionRate = 0;
            test.variants.forEach((variant) => {
                const conversionRate = variant.views > 0 ? variant.conversions / variant.views : 0;
                if (conversionRate > highestConversionRate) {
                    highestConversionRate = conversionRate;
                    winnerVariantId = variant.id;
                }
            });
            test.status = 'completed';
            test.endDate = new Date();
            test.winnerVariantId = winnerVariantId;
            await test.save();
            res.json({
                message: 'Test A/B arrêté avec succès',
                test,
                winner: winnerVariantId,
            });
        }
        catch (error) {
            console.error('Erreur arrêt test A/B:', error);
            res.status(500).json({
                message: 'Erreur lors de l\'arrêt du test',
                error: error.message,
            });
        }
    }
    /**
     * Supprimer un test A/B
     */
    static async deleteTest(req, res) {
        try {
            const { testId } = req.params;
            const promoteurId = req.user?.id;
            if (!mongoose_1.default.Types.ObjectId.isValid(testId)) {
                return res.status(400).json({ message: 'ID du test invalide' });
            }
            const test = await ABTest_1.default.findOneAndDelete({
                _id: testId,
                promoteurId,
            });
            if (!test) {
                return res.status(404).json({ message: 'Test non trouvé' });
            }
            res.json({ message: 'Test A/B supprimé avec succès' });
        }
        catch (error) {
            console.error('Erreur suppression test A/B:', error);
            res.status(500).json({
                message: 'Erreur lors de la suppression du test',
                error: error.message,
            });
        }
    }
}
exports.ABTestController = ABTestController;
/**
 * Calcule les statistiques d'un test A/B
 */
function calculateTestStats(test) {
    const variants = test.variants || [];
    return {
        totalViews: variants.reduce((sum, v) => sum + v.views, 0),
        totalClicks: variants.reduce((sum, v) => sum + v.clicks, 0),
        totalConversions: variants.reduce((sum, v) => sum + v.conversions, 0),
        avgCTR: variants.reduce((sum, v) => {
            const ctr = v.views > 0 ? (v.clicks / v.views) * 100 : 0;
            return sum + ctr;
        }, 0) / variants.length,
        avgConversionRate: variants.reduce((sum, v) => {
            const rate = v.views > 0 ? (v.conversions / v.views) * 100 : 0;
            return sum + rate;
        }, 0) / variants.length,
        variantStats: variants.map((v) => ({
            id: v.id,
            name: v.name,
            views: v.views,
            clicks: v.clicks,
            conversions: v.conversions,
            ctr: v.views > 0 ? ((v.clicks / v.views) * 100).toFixed(1) : '0.0',
            conversionRate: v.views > 0 ? ((v.conversions / v.views) * 100).toFixed(1) : '0.0',
        })),
    };
}
