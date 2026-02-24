"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SupportTicket_1 = __importDefault(require("../models/SupportTicket"));
const router = (0, express_1.Router)();
/**
 * POST /api/public/appointment-requests
 * Crée une demande de rendez-vous (sans authentification requise)
 */
router.post('/appointment-requests', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, date, time, message, projectId, promoterName, } = req.body;
        // Validation basique
        if (!firstName || !lastName || !email || !phone || !date || !time) {
            return res.status(400).json({
                message: 'Missing required fields',
                fields: ['firstName', 'lastName', 'email', 'phone', 'date', 'time']
            });
        }
        // Valider l'email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email address' });
        }
        // Créer un ticket de support pour la demande de rendez-vous
        const ticketData = {
            subject: `Demande de rendez-vous - ${promoterName || 'Promoteur'}`,
            description: `
Demande de rendez-vous soumise via FIRSTIMMO

**Informations du demandeur:**
- Nom: ${firstName} ${lastName}
- Email: ${email}
- Téléphone: ${phone}

**Détails de la demande:**
- Date souhaitée: ${date}
- Heure souhaitée: ${time}
- Promoteur: ${promoterName || 'Non spécifié'}
- Projet: ${projectId || 'Non spécifié'}

**Message additionnel:**
${message || 'Aucun message'}
      `.trim(),
            category: 'appointment_request',
            priority: 'medium',
            status: 'open',
            messages: [],
            tags: ['appointment', 'public-request'],
            submitterEmail: email,
            submitterPhone: phone,
            submitterName: `${firstName} ${lastName}`,
            projectId: projectId || undefined,
            appointmentDate: date,
            appointmentTime: time,
        };
        // Créer le ticket
        const ticket = new SupportTicket_1.default(ticketData);
        await ticket.save();
        // Retourner une réponse positive
        res.status(201).json({
            message: 'Appointment request submitted successfully',
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
        });
    }
    catch (error) {
        console.error('Error creating appointment request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
