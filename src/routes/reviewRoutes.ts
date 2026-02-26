import { Router } from 'express';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';
import {
  createReview,
  getProjectReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  moderateReview,
} from '../controllers/reviewController';

const router = Router();

// Public: reviews publiés d'un projet
router.get('/project/:projectId', getProjectReviews);

// Authentifié (client)
router.post('/', authenticateJWT, createReview);
router.get('/my', authenticateJWT, getMyReviews);
router.patch('/:id', authenticateJWT, updateReview);
router.delete('/:id', authenticateJWT, deleteReview);

// Admin: modération
router.post('/:id/moderate', authenticateJWT, authorizeRoles(Role.ADMIN), moderateReview);

export default router;
