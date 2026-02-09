import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { QuestionService } from '../services/QuestionService';

export const askQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, question } = req.body;
    const questionDoc = await QuestionService.askQuestion(projectId, req.user!.id, question);
    res.status(201).json({ question: questionDoc });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getProjectQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;
    const questions = await QuestionService.getProjectQuestions(
      projectId,
      req.user?.id,
      { status }
    );
    res.json({ questions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPromoteurQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { status, projectId } = req.query;
    const questions = await QuestionService.getPromoteurQuestions(req.user!.id, {
      status,
      projectId
    });
    res.json({ questions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const answerQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { answer, makePublic } = req.body;
    const question = await QuestionService.answerQuestion(
      req.params.id,
      req.user!.id,
      answer,
      makePublic
    );
    res.json({ question });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const rejectQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const question = await QuestionService.rejectQuestion(req.params.id, req.user!.id);
    res.json({ question });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const upvoteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const result = await QuestionService.upvoteQuestion(req.params.questionId, req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getPopularQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { limit } = req.query;
    const questions = await QuestionService.getPopularQuestions(
      projectId,
      parseInt(limit as string) || 10
    );
    res.json({ questions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};