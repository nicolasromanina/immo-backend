"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const questionController_1 = require("../controllers/questionController");
const router = (0, express_1.Router)();
// Public routes (for published projects)
router.get('/projects/:projectId/questions', questionController_1.getProjectQuestions);
router.get('/projects/:projectId/questions/popular', questionController_1.getPopularQuestions);
// Authenticated routes
router.use(auth_1.authenticateJWT);
router.post('/projects/:projectId/questions', questionController_1.askQuestion);
router.post('/projects/:projectId/questions/:questionId/upvote', questionController_1.upvoteQuestion);
// Promoteur routes
router.get('/promoteurs/questions', questionController_1.getPromoteurQuestions);
router.post('/promoteurs/questions/:id/answer', questionController_1.answerQuestion);
router.delete('/promoteurs/questions/:id', questionController_1.rejectQuestion);
exports.default = router;
