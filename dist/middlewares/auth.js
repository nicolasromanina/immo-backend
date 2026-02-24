"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.authenticateJWTOptional = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const jwt_1 = require("../config/jwt");
const authenticateJWT = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token)
        return res.status(401).json({ message: 'No token provided' });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, (0, jwt_1.getJwtSecret)());
        console.log('[authenticateJWT] Token décodé:', decoded);
        req.user = { id: decoded.id, roles: decoded.roles };
        // Load promoteurProfile from database for controllers that need it
        try {
            const user = await User_1.default.findById(req.user.id);
            if (user?.promoteurProfile) {
                req.user.promoteurProfile = user.promoteurProfile;
            }
        }
        catch (err) {
            // Log error but continue - don't fail the request
            console.error('[authenticateJWT] Error loading promoteur profile:', err);
        }
        next();
    }
    catch (err) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};
exports.authenticateJWT = authenticateJWT;
const authenticateJWTOptional = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        // No token provided - continue without authentication
        // req.user will be undefined
        return next();
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, (0, jwt_1.getJwtSecret)());
        console.log('[authenticateJWTOptional] Token décodé:', decoded);
        req.user = { id: decoded.id, roles: decoded.roles };
        // Load promoteurProfile from database for controllers that need it
        try {
            const user = await User_1.default.findById(req.user.id);
            if (user?.promoteurProfile) {
                req.user.promoteurProfile = user.promoteurProfile;
            }
        }
        catch (err) {
            console.error('[authenticateJWTOptional] Error loading promoteur profile:', err);
        }
        next();
    }
    catch (err) {
        // Invalid token - continue without authentication
        console.warn('[authenticateJWTOptional] Invalid token, continuing without auth');
        next();
    }
};
exports.authenticateJWTOptional = authenticateJWTOptional;
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
        if (!hasRole)
            return res.status(403).json({ message: 'Forbidden' });
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
