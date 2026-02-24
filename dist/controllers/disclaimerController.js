"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDisclaimers = exports.updateDisclaimer = exports.getDisclaimerBySlug = exports.getAllDisclaimers = void 0;
const DisclaimerService_1 = require("../services/DisclaimerService");
const getAllDisclaimers = async (req, res) => {
    try {
        const locale = req.query.locale || 'fr';
        const disclaimers = await DisclaimerService_1.DisclaimerService.getAll(locale);
        res.json(disclaimers);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllDisclaimers = getAllDisclaimers;
const getDisclaimerBySlug = async (req, res) => {
    try {
        const locale = req.query.locale || 'fr';
        const disclaimer = await DisclaimerService_1.DisclaimerService.getBySlug(req.params.slug, locale);
        if (!disclaimer) {
            return res.status(404).json({ message: 'Disclaimer non trouvé' });
        }
        res.json(disclaimer);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDisclaimerBySlug = getDisclaimerBySlug;
const updateDisclaimer = async (req, res) => {
    try {
        const disclaimer = await DisclaimerService_1.DisclaimerService.update(req.params.slug, req.body, req.user.id);
        if (!disclaimer) {
            return res.status(404).json({ message: 'Disclaimer non trouvé' });
        }
        res.json(disclaimer);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateDisclaimer = updateDisclaimer;
const initializeDisclaimers = async (req, res) => {
    try {
        await DisclaimerService_1.DisclaimerService.initializeDefaults();
        res.json({ message: 'Disclaimers initialisés avec succès' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.initializeDisclaimers = initializeDisclaimers;
