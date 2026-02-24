"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateTicket = exports.closeTicket = exports.resolveTicket = exports.assignTicket = exports.getAllTickets = exports.getTicketById = exports.getMyTickets = exports.replyToTicket = exports.createTicket = void 0;
const SupportService_1 = require("../services/SupportService");
const createTicket = async (req, res) => {
    try {
        const ticket = await SupportService_1.SupportService.createTicket({
            userId: req.user.id,
            ...req.body,
        });
        res.status(201).json(ticket);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createTicket = createTicket;
const replyToTicket = async (req, res) => {
    try {
        const isAdmin = req.user.roles.some(r => ['admin', 'support'].includes(r));
        const ticket = await SupportService_1.SupportService.replyToTicket(req.params.id, {
            senderId: req.user.id,
            senderRole: isAdmin ? 'support' : 'user',
            content: req.body.content,
            attachments: req.body.attachments,
            isInternal: isAdmin ? req.body.isInternal : false,
        });
        res.json(ticket);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.replyToTicket = replyToTicket;
const getMyTickets = async (req, res) => {
    try {
        const result = await SupportService_1.SupportService.getUserTickets(req.user.id, {
            status: req.query.status,
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyTickets = getMyTickets;
const getTicketById = async (req, res) => {
    try {
        const isAdmin = req.user.roles.some(r => ['admin', 'support'].includes(r));
        const ticket = await SupportService_1.SupportService.getTicketById(req.params.id, isAdmin ? undefined : req.user.id);
        res.json(ticket);
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
};
exports.getTicketById = getTicketById;
const getAllTickets = async (req, res) => {
    try {
        const result = await SupportService_1.SupportService.getAllTickets({
            status: req.query.status,
            category: req.query.category,
            priority: req.query.priority,
            assignedTo: req.query.assignedTo,
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllTickets = getAllTickets;
const assignTicket = async (req, res) => {
    try {
        const ticket = await SupportService_1.SupportService.assignTicket(req.params.id, req.body.agentId);
        res.json(ticket);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.assignTicket = assignTicket;
const resolveTicket = async (req, res) => {
    try {
        const ticket = await SupportService_1.SupportService.resolveTicket(req.params.id, req.user.id, req.body.note);
        res.json(ticket);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.resolveTicket = resolveTicket;
const closeTicket = async (req, res) => {
    try {
        const ticket = await SupportService_1.SupportService.closeTicket(req.params.id);
        res.json(ticket);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.closeTicket = closeTicket;
const rateTicket = async (req, res) => {
    try {
        const ticket = await SupportService_1.SupportService.rateTicket(req.params.id, req.user.id, req.body.rating, req.body.comment);
        res.json(ticket);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.rateTicket = rateTicket;
