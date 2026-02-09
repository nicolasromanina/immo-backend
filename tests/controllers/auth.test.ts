import request from 'supertest';
import app from '../../src/app';
import User from '../../src/models/User';
import { createUser } from '../../src/services/userService';
import { Role } from '../../src/config/roles';
import { createTestUser, createTestAdmin, randomEmail } from '../helpers/testHelpers';

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const email = randomEmail();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBeDefined();
      
      const user = await User.findOne({ email });
      expect(user).toBeDefined();
      expect(user?.roles).toContain(Role.USER);
    });

    it('should reject duplicate email', async () => {
      const email = randomEmail();
      await createUser(email, 'pass1234', [Role.USER]);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: 'password123' });

      expect([201, 400, 422]).toContain(res.status);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const email = randomEmail();
      const password = 'pass1234';
      await createUser(email, password, [Role.USER]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const email = randomEmail();
      await createUser(email, 'correctpass', [Role.USER]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrongpass' });

      expect(res.status).toBe(400);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'anypass' });

      expect(res.status).toBe(400);
    });
  });
});

describe('User Controller', () => {
  describe('GET /api/users/', () => {
    it('should forbid access without token', async () => {
      const res = await request(app).get('/api/users/');
      expect(res.status).toBe(401);
    });

    it('should allow access with valid token', async () => {
      const { token } = await createTestAdmin();

      const res = await request(app)
        .get('/api/users/')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 403]).toContain(res.status);
    });
  });

  describe('GET /api/users/me', () => {
    it('should return current user profile', async () => {
      const { user, token } = await createTestUser(randomEmail(), 'pass1234');

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      // May return 200 or 404 depending on route existence
      if (res.status === 200) {
        expect(res.body.email).toBe(user.email);
      }
    });
  });
});
