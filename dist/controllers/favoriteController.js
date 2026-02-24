"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteController = void 0;
const Favorite_1 = __importDefault(require("../models/Favorite"));
const Project_1 = __importDefault(require("../models/Project"));
class FavoriteController {
    /**
     * Add project to favorites
     */
    static async add(req, res) {
        try {
            const userId = req.user.id;
            const { projectId } = req.body;
            // Check if already favorited
            const existing = await Favorite_1.default.findOne({ user: userId, project: projectId });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'Project already in favorites',
                });
            }
            const favorite = new Favorite_1.default({
                user: userId,
                project: projectId,
            });
            await favorite.save();
            // Increment project favorites count
            await Project_1.default.findByIdAndUpdate(projectId, { $inc: { favorites: 1 } });
            res.status(201).json({
                success: true,
                data: favorite,
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
     * Remove from favorites
     */
    static async remove(req, res) {
        try {
            const userId = req.user.id;
            const { projectId } = req.params;
            const favorite = await Favorite_1.default.findOneAndDelete({ user: userId, project: projectId });
            if (!favorite) {
                return res.status(404).json({
                    success: false,
                    error: 'Favorite not found',
                });
            }
            // Decrement project favorites count
            await Project_1.default.findByIdAndUpdate(projectId, { $inc: { favorites: -1 } });
            res.json({
                success: true,
                message: 'Removed from favorites',
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
     * Get user's favorites
     */
    static async getMyFavorites(req, res) {
        try {
            const userId = req.user.id;
            const favorites = await Favorite_1.default.find({ user: userId })
                .populate({
                path: 'project',
                populate: {
                    path: 'promoteur',
                    select: 'organizationName trustScore badges',
                },
            })
                .sort({ createdAt: -1 });
            res.json({
                success: true,
                data: favorites,
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
     * Check if project is favorited
     */
    static async checkFavorite(req, res) {
        try {
            const userId = req.user.id;
            const { projectId } = req.params;
            const favorite = await Favorite_1.default.findOne({ user: userId, project: projectId });
            res.json({
                success: true,
                data: { isFavorite: !!favorite },
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
     * Add note to favorite
     */
    static async addNote(req, res) {
        try {
            const userId = req.user.id;
            const { projectId } = req.params;
            const { note } = req.body;
            const favorite = await Favorite_1.default.findOne({ user: userId, project: projectId });
            if (!favorite) {
                return res.status(404).json({
                    success: false,
                    error: 'Favorite not found',
                });
            }
            favorite.notes = note;
            await favorite.save();
            res.json({
                success: true,
                data: favorite,
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
exports.FavoriteController = FavoriteController;
