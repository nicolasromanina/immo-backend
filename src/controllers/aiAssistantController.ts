import { Request, Response } from 'express';
import { AIWritingAssistantService } from '../services/AIWritingAssistantService';
import { AuthRequest } from '../middlewares/auth';

export const generateText = async (req: AuthRequest, res: Response) => {
  try {
    const result = await AIWritingAssistantService.generateText(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const generateWithAlternatives = async (req: AuthRequest, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 3;
    const result = await AIWritingAssistantService.generateWithAlternatives(req.body, count);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const improveText = async (req: AuthRequest, res: Response) => {
  try {
    const result = await AIWritingAssistantService.improveText(
      req.body.text,
      req.body.instructions
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const generateProjectDescription = async (req: AuthRequest, res: Response) => {
  try {
    const result = await AIWritingAssistantService.generateProjectDescription(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const generateUpdateText = async (req: AuthRequest, res: Response) => {
  try {
    const result = await AIWritingAssistantService.generateUpdateText(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const generateLeadResponse = async (req: AuthRequest, res: Response) => {
  try {
    const result = await AIWritingAssistantService.generateLeadResponse(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
