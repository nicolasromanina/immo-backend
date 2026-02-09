import User, { IUser } from '../models/User';
import bcrypt from 'bcrypt';
import { Role } from '../config/roles';

export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  return User.findOne({ email }).exec();
};

export const findUserById = async (id: string): Promise<IUser | null> => {
  return User.findById(id).exec();
};

export const createUser = async (email: string, password: string, roles: Role[] = [Role.USER]): Promise<IUser> => {
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashed, roles });
  return user.save();
};

export const validatePassword = async (plain: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};

export const listUsers = async (): Promise<IUser[]> => {
  return User.find().select('-password').exec();
};

export const promoteToRole = async (userId: string, role: Role): Promise<IUser | null> => {
  return User.findByIdAndUpdate(userId, { $addToSet: { roles: role } }, { new: true }).select('-password').exec();
};
