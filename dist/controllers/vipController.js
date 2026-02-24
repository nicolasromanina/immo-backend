"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVIPRequestById = exports.getAllVIPRequests = exports.getPendingRequests = exports.processDecision = exports.submitBypassRequest = void 0;
const VIPRejectionService_1 = require("../services/VIPRejectionService");
const submitBypassRequest = async (req, res) => {
    try {
        const request = await VIPRejectionService_1.VIPRejectionService.submitBypassRequest({
            ...req.body,
            requestedBy: req.user.id,
        });
        res.status(201).json(request);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.submitBypassRequest = submitBypassRequest;
const processDecision = async (req, res) => {
    try {
        const result = await VIPRejectionService_1.VIPRejectionService.processDecision({
            requestId: req.params.id,
            decision: req.body.decision,
            decidedBy: req.user.id,
            justification: req.body.justification,
        });
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.processDecision = processDecision;
const getPendingRequests = async (req, res) => {
    try {
        const requests = await VIPRejectionService_1.VIPRejectionService.getPendingRequests();
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getPendingRequests = getPendingRequests;
const getAllVIPRequests = async (req, res) => {
    try {
        const requests = await VIPRejectionService_1.VIPRejectionService.getAllRequests({
            status: req.query.status,
        });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllVIPRequests = getAllVIPRequests;
const getVIPRequestById = async (req, res) => {
    try {
        const request = await VIPRejectionService_1.VIPRejectionService.getRequestById(req.params.id);
        if (!request)
            return res.status(404).json({ message: 'Demande non trouvée' });
        res.json(request);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getVIPRequestById = getVIPRequestById;
