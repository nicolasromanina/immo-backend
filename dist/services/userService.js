"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promoteToRole = exports.listUsers = exports.validatePassword = exports.createUser = exports.findUserById = exports.findUserByEmail = void 0;
const User_1 = __importDefault(require("../models/User"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const roles_1 = require("../config/roles");
const findUserByEmail = async (email) => {
    return User_1.default.findOne({ email }).exec();
};
exports.findUserByEmail = findUserByEmail;
const findUserById = async (id) => {
    return User_1.default.findById(id).exec();
};
exports.findUserById = findUserById;
const createUser = async (email, password, roles = [roles_1.Role.USER]) => {
    const hashed = await bcrypt_1.default.hash(password, 10);
    const user = new User_1.default({ email, password: hashed, roles });
    return user.save();
};
exports.createUser = createUser;
const validatePassword = async (plain, hashed) => {
    return bcrypt_1.default.compare(plain, hashed);
};
exports.validatePassword = validatePassword;
const listUsers = async () => {
    return User_1.default.find().select('-password').exec();
};
exports.listUsers = listUsers;
const promoteToRole = async (userId, role) => {
    return User_1.default.findByIdAndUpdate(userId, { $addToSet: { roles: role } }, { new: true }).select('-password').exec();
};
exports.promoteToRole = promoteToRole;
