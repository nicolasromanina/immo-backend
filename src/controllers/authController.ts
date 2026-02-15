import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { Role } from '../config/roles';

export const register = async (req: Request, res: Response) => {
  const { email, password, roles } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, roles: roles || [Role.USER] });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    // If user has a promoteur profile but PROMOTEUR role is missing, add it
    if (user.promoteurProfile && !user.roles.includes(Role.PROMOTEUR)) {
      user.roles.push(Role.PROMOTEUR);
      await user.save();
    }
    
    const token = jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error });
  }
};
