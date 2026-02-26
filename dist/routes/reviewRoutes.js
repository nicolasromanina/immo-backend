"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const reviewController_1 = require("../controllers/reviewController");
const router = (0, express_1.Router)();
// Public: reviews publiés d'un projet
router.get('/project/:projectId', reviewController_1.getProjectReviews);
// Authentifié (client)
router.post('/', auth_1.authenticateJWT, reviewController_1.createReview);
router.get('/my', auth_1.authenticateJWT, reviewController_1.getMyReviews);
router.patch('/:id', auth_1.authenticateJWT, reviewController_1.updateReview);
router.delete('/:id', auth_1.authenticateJWT, reviewController_1.deleteReview);
// Admin: modération
router.post('/:id/moderate', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN), reviewController_1.moderateReview);
exports.default = router;
