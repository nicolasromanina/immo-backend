"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminGeoService = void 0;
const AdminGeoAssignment_1 = __importDefault(require("../models/AdminGeoAssignment"));
class AdminGeoService {
    /**
     * Assign admin to countries/cities
     */
    static async assignAdmin(data) {
        const existing = await AdminGeoAssignment_1.default.findOne({
            admin: data.adminId,
            role: data.role,
        });
        if (existing) {
            existing.countries = data.countries;
            existing.cities = data.cities || [];
            await existing.save();
            return existing;
        }
        return AdminGeoAssignment_1.default.create({
            admin: data.adminId,
            countries: data.countries,
            cities: data.cities || [],
            role: data.role,
        });
    }
    /**
     * Get admin for a country/city
     */
    static async getAdminForLocation(country, city, role) {
        const query = { countries: country, isActive: true };
        if (role)
            query.role = role;
        const assignments = await AdminGeoAssignment_1.default.find(query)
            .populate('admin', 'email firstName lastName');
        if (city) {
            const cityMatch = assignments.filter(a => a.cities.length === 0 || a.cities.includes(city));
            return cityMatch.length > 0 ? cityMatch : assignments;
        }
        return assignments;
    }
    /**
     * Get all assignments
     */
    static async getAllAssignments() {
        return AdminGeoAssignment_1.default.find({ isActive: true })
            .populate('admin', 'email firstName lastName')
            .sort({ countries: 1, role: 1 });
    }
    /**
     * Remove assignment
     */
    static async removeAssignment(assignmentId) {
        return AdminGeoAssignment_1.default.findByIdAndUpdate(assignmentId, { isActive: false }, { new: true });
    }
}
exports.AdminGeoService = AdminGeoService;
