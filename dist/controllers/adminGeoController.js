"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeAssignment = exports.getAllAssignments = exports.getAdminForLocation = exports.assignAdmin = void 0;
const AdminGeoService_1 = require("../services/AdminGeoService");
const assignAdmin = async (req, res) => {
    try {
        const assignment = await AdminGeoService_1.AdminGeoService.assignAdmin(req.body);
        res.status(201).json(assignment);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.assignAdmin = assignAdmin;
const getAdminForLocation = async (req, res) => {
    try {
        const { country, city, role } = req.query;
        const admins = await AdminGeoService_1.AdminGeoService.getAdminForLocation(country, city, role);
        res.json(admins);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAdminForLocation = getAdminForLocation;
const getAllAssignments = async (req, res) => {
    try {
        const assignments = await AdminGeoService_1.AdminGeoService.getAllAssignments();
        res.json(assignments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllAssignments = getAllAssignments;
const removeAssignment = async (req, res) => {
    try {
        await AdminGeoService_1.AdminGeoService.removeAssignment(req.params.id);
        res.json({ message: 'Assignment supprimé' });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.removeAssignment = removeAssignment;
