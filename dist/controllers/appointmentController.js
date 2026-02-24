"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentController = void 0;
const AppointmentService_1 = require("../services/AppointmentService");
const Appointment_1 = __importDefault(require("../models/Appointment"));
const Promoteur_1 = __importDefault(require("../models/Promoteur"));
class AppointmentController {
    /**
     * Get available slots for a promoteur
     */
    static async getAvailableSlots(req, res) {
        try {
            const { promoteurId } = req.params;
            const { date, duration } = req.query;
            if (!date) {
                return res.status(400).json({ message: 'Date is required' });
            }
            const slots = await AppointmentService_1.AppointmentService.getAvailableSlots(promoteurId, new Date(date), duration ? parseInt(duration) : 30);
            res.json({ slots });
        }
        catch (error) {
            console.error('Error getting available slots:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Create appointment
     */
    static async createAppointment(req, res) {
        try {
            const { promoteurId, projectId, leadId, scheduledAt, durationMinutes, type, notes, } = req.body;
            const appointment = await AppointmentService_1.AppointmentService.createAppointment({
                promoteurId,
                projectId,
                leadId,
                scheduledAt: new Date(scheduledAt),
                durationMinutes: durationMinutes || 30,
                type,
                notes,
                createdBy: req.user.id,
            });
            res.status(201).json({ appointment });
        }
        catch (error) {
            console.error('Error creating appointment:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Confirm appointment
     */
    static async confirmAppointment(req, res) {
        try {
            const { id } = req.params;
            const appointment = await AppointmentService_1.AppointmentService.confirmAppointment(id, req.user.id);
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            res.json({ appointment });
        }
        catch (error) {
            console.error('Error confirming appointment:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Cancel appointment
     */
    static async cancelAppointment(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const appointment = await AppointmentService_1.AppointmentService.cancelAppointment(id, req.user.id, reason);
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            res.json({ appointment });
        }
        catch (error) {
            console.error('Error canceling appointment:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Complete appointment
     */
    static async completeAppointment(req, res) {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const appointment = await AppointmentService_1.AppointmentService.completeAppointment(id, req.user.id, notes);
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            res.json({ appointment });
        }
        catch (error) {
            console.error('Error completing appointment:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get upcoming appointments
     */
    static async getUpcomingAppointments(req, res) {
        try {
            const promoteur = await Promoteur_1.default.findOne({ user: req.user.id });
            if (!promoteur) {
                return res.status(404).json({ message: 'Promoteur not found' });
            }
            const { days } = req.query;
            const appointments = await AppointmentService_1.AppointmentService.getUpcomingAppointments(promoteur._id.toString(), days ? parseInt(days) : 7);
            res.json({ appointments });
        }
        catch (error) {
            console.error('Error getting upcoming appointments:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get appointment by ID
     */
    static async getAppointment(req, res) {
        try {
            const { id } = req.params;
            const appointment = await Appointment_1.default.findById(id)
                .populate('lead', 'firstName lastName email phone')
                .populate('project', 'title');
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            res.json({ appointment });
        }
        catch (error) {
            console.error('Error getting appointment:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get calendar link
     */
    static async getCalendarLink(req, res) {
        try {
            const { id } = req.params;
            const appointment = await Appointment_1.default.findById(id).populate('project', 'title');
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            const calendarLink = AppointmentService_1.AppointmentService.generateCalendarLink(appointment);
            res.json({ calendarLink });
        }
        catch (error) {
            console.error('Error generating calendar link:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
    /**
     * Get appointments for a project
     */
    static async getProjectAppointments(req, res) {
        try {
            const { projectId } = req.params;
            const { status } = req.query;
            const query = { project: projectId };
            if (status)
                query.status = status;
            const appointments = await Appointment_1.default.find(query)
                .populate('lead', 'firstName lastName email phone')
                .sort({ scheduledAt: 1 });
            res.json({ appointments });
        }
        catch (error) {
            console.error('Error getting project appointments:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}
exports.AppointmentController = AppointmentController;
