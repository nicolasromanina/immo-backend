"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJwtExpiresIn = exports.getJwtSecret = void 0;
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is required');
    }
    return secret;
};
exports.getJwtSecret = getJwtSecret;
const getJwtExpiresIn = () => {
    return process.env.JWT_EXPIRES_IN || '1d';
};
exports.getJwtExpiresIn = getJwtExpiresIn;
