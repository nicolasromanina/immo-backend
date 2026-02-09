import { Router } from 'express';
import { AcademyController } from '../controllers/academyController';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../config/roles';

const router = Router();

// Public Course Discovery
router.get('/courses', AcademyController.getCourses);
router.get('/courses/:id', AcademyController.getCourse);

// Enrolled User Endpoints
router.post('/courses/:id/enroll', authenticateJWT, AcademyController.enrollInCourse);
router.get('/courses/:id/progress', authenticateJWT, AcademyController.getMyProgress);
router.post('/courses/:courseId/lessons/:lessonId/complete', authenticateJWT, AcademyController.completeLesson);
router.post('/courses/:courseId/modules/:moduleId/quiz', authenticateJWT, AcademyController.submitQuiz);
router.get('/certificates', authenticateJWT, AcademyController.getMyCertificates);
router.post('/courses/:id/rate', authenticateJWT, AcademyController.rateCourse);
router.patch('/courses/:id/time', authenticateJWT, AcademyController.updateTimeSpent);

// Admin Endpoints
router.post('/admin/courses', authenticateJWT, authorizeRoles(Role.ADMIN), AcademyController.createCourse);
router.post('/admin/courses/:id/modules', authenticateJWT, authorizeRoles(Role.ADMIN), AcademyController.addModule);
router.patch('/admin/courses/:id/publish', authenticateJWT, authorizeRoles(Role.ADMIN), AcademyController.publishCourse);
router.get('/admin/courses/:id/analytics', authenticateJWT, authorizeRoles(Role.ADMIN), AcademyController.getCourseAnalytics);

export default router;
