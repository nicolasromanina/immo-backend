"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotaireAvailability = exports.submitConsultationReport = exports.scheduleNotaireAppointment = exports.requestConsultation = exports.submitDevis = exports.requestDevis = exports.submitPortfolio = exports.getCourtierStats = exports.preQualifyLead = void 0;
const PartnerWorkflowService_1 = require("../services/PartnerWorkflowService");
// ===== Courtier =====
const preQualifyLead = async (req, res) => {
    try {
        const result = await PartnerWorkflowService_1.CourtierWorkflowService.preQualifyLead({
            courtierId: req.body.courtierId,
            leadId: req.params.leadId,
            qualificationData: req.body.qualificationData,
        });
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.preQualifyLead = preQualifyLead;
const getCourtierStats = async (req, res) => {
    try {
        const stats = await PartnerWorkflowService_1.CourtierWorkflowService.getCourtierStats(req.params.courtierId);
        res.json(stats);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getCourtierStats = getCourtierStats;
// ===== Architecte =====
const submitPortfolio = async (req, res) => {
    try {
        const partner = await PartnerWorkflowService_1.ArchitectWorkflowService.submitPortfolio(req.params.partnerId, req.body);
        if (!partner)
            return res.status(404).json({ message: 'Partenaire non trouvé' });
        res.json(partner);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.submitPortfolio = submitPortfolio;
const requestDevis = async (req, res) => {
    try {
        const request = await PartnerWorkflowService_1.ArchitectWorkflowService.requestDevis({
            clientId: req.user.id,
            architecteId: req.params.partnerId,
            ...req.body,
        });
        res.status(201).json(request);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.requestDevis = requestDevis;
const submitDevis = async (req, res) => {
    try {
        const request = await PartnerWorkflowService_1.ArchitectWorkflowService.submitDevis(req.params.requestId, req.body);
        if (!request)
            return res.status(404).json({ message: 'Demande non trouvée' });
        res.json(request);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.submitDevis = submitDevis;
// ===== Notaire =====
const requestConsultation = async (req, res) => {
    try {
        const request = await PartnerWorkflowService_1.NotaireWorkflowService.requestConsultation({
            clientId: req.user.id,
            notaireId: req.params.partnerId,
            ...req.body,
        });
        res.status(201).json(request);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.requestConsultation = requestConsultation;
const scheduleNotaireAppointment = async (req, res) => {
    try {
        const appointment = await PartnerWorkflowService_1.NotaireWorkflowService.scheduleAppointment(req.params.requestId, req.body);
        res.status(201).json(appointment);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.scheduleNotaireAppointment = scheduleNotaireAppointment;
const submitConsultationReport = async (req, res) => {
    try {
        const request = await PartnerWorkflowService_1.NotaireWorkflowService.submitConsultationReport(req.params.requestId, req.body);
        if (!request)
            return res.status(404).json({ message: 'Demande non trouvée' });
        res.json(request);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.submitConsultationReport = submitConsultationReport;
const getNotaireAvailability = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const availability = await PartnerWorkflowService_1.NotaireWorkflowService.getNotaireAvailability(req.params.partnerId, new Date(startDate), new Date(endDate));
        res.json(availability);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getNotaireAvailability = getNotaireAvailability;
