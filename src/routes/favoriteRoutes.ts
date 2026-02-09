import { Router } from 'express';
import { FavoriteController } from '../controllers/favoriteController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';

const router = Router();

router.post('/', authenticateJWT, FavoriteController.add);
router.get('/my-favorites', authenticateJWT, FavoriteController.getMyFavorites);
router.get('/check/:projectId', authenticateJWT, FavoriteController.checkFavorite);
router.delete('/:projectId', authenticateJWT, FavoriteController.remove);
router.put('/:projectId/note', authenticateJWT, FavoriteController.addNote);

export default router;
