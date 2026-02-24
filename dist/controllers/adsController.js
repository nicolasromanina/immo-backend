"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get7DayStats = exports.resumeAdAdmin = exports.pauseAdAdmin = exports.getActiveAds = exports.getAllAds = exports.getMyAds = exports.trackClick = exports.trackImpression = exports.resumeAd = exports.pauseAd = exports.rejectAd = exports.approveAd = exports.submitAdForReview = exports.createAd = void 0;
const AdsService_1 = require("../services/AdsService");
const createAd = async (req, res) => {
    try {
        // Prefer promoteurProfile (Promoteur._id) if available on the authenticated user
        const promoteurId = req.body.promoteurId || req.user?.promoteurProfile || req.user.id;
        const ad = await AdsService_1.AdsService.createAd(promoteurId, req.body);
        res.status(201).json(ad);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createAd = createAd;
const submitAdForReview = async (req, res) => {
    try {
        const ad = await AdsService_1.AdsService.submitForReview(req.params.id, req.user.id);
        res.json(ad);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.submitAdForReview = submitAdForReview;
const approveAd = async (req, res) => {
    try {
        const ad = await AdsService_1.AdsService.approveAd(req.params.id, req.user.id);
        if (!ad)
            return res.status(404).json({ message: 'Annonce non trouvée' });
        res.json(ad);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.approveAd = approveAd;
const rejectAd = async (req, res) => {
    try {
        const ad = await AdsService_1.AdsService.rejectAd(req.params.id, req.user.id, req.body.reason);
        if (!ad)
            return res.status(404).json({ message: 'Annonce non trouvée' });
        res.json(ad);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.rejectAd = rejectAd;
const pauseAd = async (req, res) => {
    try {
        const ad = await AdsService_1.AdsService.pauseAd(req.params.id, req.user.id);
        if (!ad)
            return res.status(404).json({ message: 'Annonce non trouvée ou non pausable' });
        res.json(ad);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.pauseAd = pauseAd;
const resumeAd = async (req, res) => {
    try {
        const ad = await AdsService_1.AdsService.resumeAd(req.params.id, req.user.id);
        if (!ad)
            return res.status(404).json({ message: 'Annonce non trouvée ou non resumable' });
        res.json(ad);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.resumeAd = resumeAd;
const trackImpression = async (req, res) => {
    try {
        await AdsService_1.AdsService.trackImpression(req.params.id);
        res.status(204).send();
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.trackImpression = trackImpression;
const trackClick = async (req, res) => {
    try {
        await AdsService_1.AdsService.trackClick(req.params.id);
        res.status(204).send();
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.trackClick = trackClick;
const getMyAds = async (req, res) => {
    try {
        // Try promoteurProfile first (Promoteur._id), fallback to User._id for backward compatibility
        const promoteurId = req.user?.promoteurProfile || req.user.id;
        const userId = req.user.id;
        const ads = await AdsService_1.AdsService.getPromoteurAds(promoteurId, userId, {
            status: req.query.status,
            type: req.query.type,
        });
        res.json(ads);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyAds = getMyAds;
const getAllAds = async (req, res) => {
    try {
        const result = await AdsService_1.AdsService.getAllAds({
            status: req.query.status,
            type: req.query.type,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllAds = getAllAds;
const getActiveAds = async (req, res) => {
    try {
        const ads = await AdsService_1.AdsService.getActiveAdsForDisplay({
            city: req.query.city,
            country: req.query.country,
            type: req.query.type,
        });
        res.json(ads);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getActiveAds = getActiveAds;
// Admin pause/resume (force)
const pauseAdAdmin = async (req, res) => {
    try {
        const ad = await AdsService_1.AdsService.pauseAdAdmin(req.params.id);
        if (!ad)
            return res.status(404).json({ message: 'Annonce non trouvée' });
        res.json(ad);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.pauseAdAdmin = pauseAdAdmin;
const resumeAdAdmin = async (req, res) => {
    try {
        const ad = await AdsService_1.AdsService.resumeAdAdmin(req.params.id);
        if (!ad)
            return res.status(404).json({ message: 'Annonce non trouvée' });
        res.json(ad);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.resumeAdAdmin = resumeAdAdmin;
const get7DayStats = async (req, res) => {
    try {
        const stats = await AdsService_1.AdsService.get7DayStats(req.params.id);
        res.json(stats);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.get7DayStats = get7DayStats;
