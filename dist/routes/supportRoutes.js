"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const roles_1 = require("../config/roles");
const supportController = __importStar(require("../controllers/supportController"));
const router = (0, express_1.Router)();
// User routes
router.post('/', auth_1.authenticateJWT, supportController.createTicket);
router.get('/my', auth_1.authenticateJWT, supportController.getMyTickets);
router.get('/:id', auth_1.authenticateJWT, supportController.getTicketById);
router.post('/:id/reply', auth_1.authenticateJWT, supportController.replyToTicket);
router.post('/:id/rate', auth_1.authenticateJWT, supportController.rateTicket);
// Admin routes
router.get('/', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), supportController.getAllTickets);
router.put('/:id/assign', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), supportController.assignTicket);
router.put('/:id/resolve', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), supportController.resolveTicket);
router.put('/:id/close', auth_1.authenticateJWT, (0, auth_1.authorizeRoles)(roles_1.Role.ADMIN, roles_1.Role.SUPPORT), supportController.closeTicket);
exports.default = router;
