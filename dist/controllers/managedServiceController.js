"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.terminateManagedService = exports.getAllManagedServices = exports.getMyManagedServices = exports.logActivity = exports.activateManagedService = exports.requestManagedService = void 0;
const ManagedServiceManager_1 = require("../services/ManagedServiceManager");
const requestManagedService = async (req, res) => {
    try {
        const service = await ManagedServiceManager_1.ManagedServiceManager.requestManagedService({
            promoteurId: req.body.promoteurId || req.user.id,
            ...req.body,
        });
        res.status(201).json(service);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.requestManagedService = requestManagedService;
const activateManagedService = async (req, res) => {
    try {
        const service = await ManagedServiceManager_1.ManagedServiceManager.activate(req.params.id, req.user.id);
        if (!service)
            return res.status(404).json({ message: 'Service non trouvé' });
        res.json(service);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.activateManagedService = activateManagedService;
const logActivity = async (req, res) => {
    try {
        const service = await ManagedServiceManager_1.ManagedServiceManager.logActivity(req.params.id, req.body.action, req.user.id, req.body.details);
        if (!service)
            return res.status(404).json({ message: 'Service non trouvé' });
        res.json(service);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.logActivity = logActivity;
const getMyManagedServices = async (req, res) => {
    try {
        const services = await ManagedServiceManager_1.ManagedServiceManager.getForPromoteur(req.params.promoteurId || req.user.id);
        res.json(services);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyManagedServices = getMyManagedServices;
const getAllManagedServices = async (req, res) => {
    try {
        const result = await ManagedServiceManager_1.ManagedServiceManager.getAll({
            status: req.query.status,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllManagedServices = getAllManagedServices;
const terminateManagedService = async (req, res) => {
    try {
        const service = await ManagedServiceManager_1.ManagedServiceManager.terminate(req.params.id, req.body.reason);
        if (!service)
            return res.status(404).json({ message: 'Service non trouvé' });
        res.json(service);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.terminateManagedService = terminateManagedService;
