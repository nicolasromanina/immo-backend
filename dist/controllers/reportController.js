"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dismissReport = exports.resolveReport = exports.addInvestigationNote = exports.updateReportStatus = exports.assignReport = exports.getReportById = exports.getAdminReports = exports.getUserReports = exports.createReport = void 0;
const ReportService_1 = require("../services/ReportService");
const createReport = async (req, res) => {
    try {
        const { targetType, targetId, reason, description, evidence } = req.body;
        const report = await ReportService_1.ReportService.createReport(req.user.id, targetType, targetId, reason, description, evidence);
        res.status(201).json({ report });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createReport = createReport;
const getUserReports = async (req, res) => {
    try {
        const reports = await ReportService_1.ReportService.getUserReports(req.user.id);
        res.json({ reports });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getUserReports = getUserReports;
const getAdminReports = async (req, res) => {
    try {
        const { status, priority, targetType, assignedTo } = req.query;
        const reports = await ReportService_1.ReportService.getAdminReports({
            status,
            priority,
            targetType,
            assignedTo
        });
        res.json({ reports });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAdminReports = getAdminReports;
const getReportById = async (req, res) => {
    try {
        const report = await ReportService_1.ReportService.getReportById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        res.json({ report });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getReportById = getReportById;
const assignReport = async (req, res) => {
    try {
        const { assignedTo } = req.body;
        const report = await ReportService_1.ReportService.assignReport(req.params.id, req.user.id, assignedTo);
        res.json({ report });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.assignReport = assignReport;
const updateReportStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const report = await ReportService_1.ReportService.updateReportStatus(req.params.id, status, req.user.id);
        res.json({ report });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateReportStatus = updateReportStatus;
const addInvestigationNote = async (req, res) => {
    try {
        const { note } = req.body;
        const report = await ReportService_1.ReportService.addInvestigationNote(req.params.id, req.user.id, note);
        res.json({ report });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.addInvestigationNote = addInvestigationNote;
const resolveReport = async (req, res) => {
    try {
        const { action, notes, applyAction } = req.body;
        const report = await ReportService_1.ReportService.resolveReport(req.params.id, req.user.id, action, notes, applyAction);
        res.json({ report });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.resolveReport = resolveReport;
const dismissReport = async (req, res) => {
    try {
        const { notes } = req.body;
        const report = await ReportService_1.ReportService.dismissReport(req.params.id, req.user.id, notes);
        res.json({ report });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.dismissReport = dismissReport;
