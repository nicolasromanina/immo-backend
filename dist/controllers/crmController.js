"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRMController = void 0;
const CRMWebhook_1 = __importDefault(require("../models/CRMWebhook"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
class CRMController {
    static async getConfig(req, res) {
        try {
            const userId = req.user.id;
            const promoteur = await Promoteur_1.default.findOne({ user: userId });
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const config = await CRMWebhook_1.default.findOne({ promoteur: promoteur._id });
            res.json({ config });
        }
        catch (error) {
            console.error('Error getting CRM config:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    static async updateConfig(req, res) {
        try {
            const userId = req.user.id;
            const { enabled, url, secret, events } = req.body;
            const promoteur = await Promoteur_1.default.findOne({ user: userId });
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const config = await CRMWebhook_1.default.findOneAndUpdate({ promoteur: promoteur._id }, { enabled, url, secret, events }, { new: true, upsert: true });
            res.json({ config });
        }
        catch (error) {
            console.error('Error updating CRM config:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.CRMController = CRMController;
