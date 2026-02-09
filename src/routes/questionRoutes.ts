import { Router } from 'express';
import { authenticateJWT } from '../middlewares/auth';
import {
  askQuestion,
  getProjectQuestions,
  getPromoteurQuestions,
  answerQuestion,
  rejectQuestion,
  upvoteQuestion,
  getPopularQuestions
} from '../controllers/questionController';

const router = Router();

// Public routes (for published projects)
router.get('/projects/:projectId/questions', getProjectQuestions);
router.get('/projects/:projectId/questions/popular', getPopularQuestions);

// Authenticated routes
router.use(authenticateJWT);

router.post('/projects/:projectId/questions', askQuestion);
router.post('/projects/:projectId/questions/:questionId/upvote', upvoteQuestion);

// Promoteur routes
router.get('/promoteurs/questions', getPromoteurQuestions);
router.post('/promoteurs/questions/:id/answer', answerQuestion);
router.delete('/promoteurs/questions/:id', rejectQuestion);

export default router;