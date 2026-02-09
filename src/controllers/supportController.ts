import { Request, Response } from 'express';
import { SupportService } from '../services/SupportService';
import { AuthRequest } from '../middlewares/auth';

export const createTicket = async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await SupportService.createTicket({
      userId: req.user!.id,
      ...req.body,
    });
    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const replyToTicket = async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.roles.some(r => ['admin', 'support'].includes(r));
    const ticket = await SupportService.replyToTicket(req.params.id, {
      senderId: req.user!.id,
      senderRole: isAdmin ? 'support' : 'user',
      content: req.body.content,
      attachments: req.body.attachments,
      isInternal: isAdmin ? req.body.isInternal : false,
    });
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyTickets = async (req: AuthRequest, res: Response) => {
  try {
    const result = await SupportService.getUserTickets(req.user!.id, {
      status: req.query.status as string,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTicketById = async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.roles.some(r => ['admin', 'support'].includes(r));
    const ticket = await SupportService.getTicketById(
      req.params.id,
      isAdmin ? undefined : req.user!.id
    );
    res.json(ticket);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

export const getAllTickets = async (req: AuthRequest, res: Response) => {
  try {
    const result = await SupportService.getAllTickets({
      status: req.query.status as string,
      category: req.query.category as string,
      priority: req.query.priority as string,
      assignedTo: req.query.assignedTo as string,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const assignTicket = async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await SupportService.assignTicket(req.params.id, req.body.agentId);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const resolveTicket = async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await SupportService.resolveTicket(req.params.id, req.user!.id, req.body.note);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const closeTicket = async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await SupportService.closeTicket(req.params.id);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const rateTicket = async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await SupportService.rateTicket(
      req.params.id,
      req.user!.id,
      req.body.rating,
      req.body.comment
    );
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
