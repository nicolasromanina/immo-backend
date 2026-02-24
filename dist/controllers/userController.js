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
exports.promoteUser = exports.getUsers = exports.getProfile = void 0;
const userService = __importStar(require("../services/userService"));
const roles_1 = require("../config/roles");
const getProfile = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Unauthorized' });
    console.log('[UserController.getProfile] req.user:', req.user);
    const user = await userService.findUserById?.(req.user.id) || await userService.findUserByEmail(req.user.email || '');
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    console.log('[UserController.getProfile] User found:', user.email, 'roles:', user.roles);
    // Retourner les informations du profil incluant avatar et nom
    const safe = {
        id: user._id,
        email: user.email,
        roles: user.roles,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        avatar: user.avatar || null, // URL de l'avatar ou null
        phone: user.phone || null,
        country: user.country || null,
        city: user.city || null,
        status: user.status || 'active',
        emailVerified: user.emailVerified || false,
        phoneVerified: user.phoneVerified || false,
    };
    console.log('[UserController.getProfile] Sending profile response with roles:', safe.roles);
    res.json(safe);
};
exports.getProfile = getProfile;
const getUsers = async (_req, res) => {
    const users = await userService.listUsers();
    res.json(users);
};
exports.getUsers = getUsers;
const promoteUser = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!Object.values(roles_1.Role).includes(role))
        return res.status(400).json({ message: 'Invalid role' });
    const updated = await userService.promoteToRole(id, role);
    if (!updated)
        return res.status(404).json({ message: 'User not found' });
    res.json(updated);
};
exports.promoteUser = promoteUser;
