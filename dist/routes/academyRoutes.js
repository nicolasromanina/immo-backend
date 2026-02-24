"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const academyController_1 = require("../controllers/academyController");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const router = (0, express_1.Router)();
// Public Course Discovery
router.get('/courses', academyController_1.AcademyController.getCourses);
router.get('/courses/:id', academyController_1.AcademyController.getCourse);
// Enrolled User Endpoints
router.post('/courses/:id/enroll', auth_1.authenticateJWT, academyController_1.AcademyController.enrollInCourse);
router.get('/courses/:id/progress', auth_1.authenticateJWT, academyController_1.AcademyController.getMyProgress);
router.post('/courses/:courseId/lessons/:lessonId/complete', auth_1.authenticateJWT, academyController_1.AcademyController.completeLesson);
router.post('/courses/:courseId/modules/:moduleId/quiz', auth_1.authenticateJWT, academyController_1.AcademyController.submitQuiz);
router.get('/certificates', auth_1.authenticateJWT, academyController_1.AcademyController.getMyCertificates);
router.post('/courses/:id/rate', auth_1.authenticateJWT, academyController_1.AcademyController.rateCourse);
router.patch('/courses/:id/time', auth_1.authenticateJWT, academyController_1.AcademyController.updateTimeSpent);
// Admin Endpoints
router.post('/admin/courses', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), academyController_1.AcademyController.createCourse);
router.post('/admin/courses/:id/modules', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), academyController_1.AcademyController.addModule);
router.patch('/admin/courses/:id/publish', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), academyController_1.AcademyController.publishCourse);
router.get('/admin/courses/:id/analytics', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), academyController_1.AcademyController.getCourseAnalytics);
exports.default = router;
