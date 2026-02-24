"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCrisisById = exports.getAllCrises = exports.getActiveCrises = exports.resolveCrisis = exports.sendCrisisCommunication = exports.assignCrisis = exports.updateCrisisStatus = exports.declareCrisis = void 0;
const CrisisService_1 = require("../services/CrisisService");
const declareCrisis = async (req, res) => {
    try {
        const crisis = await CrisisService_1.CrisisService.declareCrisis({
            ...req.body,
            detectedBy: req.user.id,
        });
        res.status(201).json(crisis);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.declareCrisis = declareCrisis;
const updateCrisisStatus = async (req, res) => {
    try {
        const crisis = await CrisisService_1.CrisisService.updateStatus(req.params.id, req.body.status, req.user.id, req.body.notes);
        if (!crisis)
            return res.status(404).json({ message: 'Crise non trouvée' });
        res.json(crisis);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateCrisisStatus = updateCrisisStatus;
const assignCrisis = async (req, res) => {
    try {
        const crisis = await CrisisService_1.CrisisService.assignCrisis(req.params.id, req.body.assigneeId, req.user.id);
        if (!crisis)
            return res.status(404).json({ message: 'Crise non trouvée' });
        res.json(crisis);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.assignCrisis = assignCrisis;
const sendCrisisCommunication = async (req, res) => {
    try {
        const crisis = await CrisisService_1.CrisisService.sendCrisisCommunication(req.params.id, {
            ...req.body,
            sentBy: req.user.id,
        });
        res.json(crisis);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.sendCrisisCommunication = sendCrisisCommunication;
const resolveCrisis = async (req, res) => {
    try {
        const crisis = await CrisisService_1.CrisisService.resolveCrisis(req.params.id, req.user.id, req.body.summary);
        if (!crisis)
            return res.status(404).json({ message: 'Crise non trouvée' });
        res.json(crisis);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.resolveCrisis = resolveCrisis;
const getActiveCrises = async (req, res) => {
    try {
        const crises = await CrisisService_1.CrisisService.getActiveCrises();
        res.json(crises);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getActiveCrises = getActiveCrises;
const getAllCrises = async (req, res) => {
    try {
        const result = await CrisisService_1.CrisisService.getAllCrises({
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
exports.getAllCrises = getAllCrises;
const getCrisisById = async (req, res) => {
    try {
        const crisis = await CrisisService_1.CrisisService.getCrisisById(req.params.id);
        if (!crisis)
            return res.status(404).json({ message: 'Crise non trouvée' });
        res.json(crisis);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getCrisisById = getCrisisById;
