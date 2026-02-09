import request from 'supertest';
import app from '../src/app';
import { createUser } from '../src/services/userService';
import { Role } from '../src/config/roles';

describe('Auth endpoints', () => {
  it('should register and login a user', async () => {
    const email = 'test@example.com';
    const password = 'pass1234';

    // register via service to ensure user exists
    await createUser(email, password, [Role.USER]);

    const resLogin = await request(app).post('/api/auth/login').send({ email, password });
    expect(resLogin.status).toBe(200);
    expect(resLogin.body.token).toBeDefined();
  });

  it('should forbid protected route without token', async () => {
    const res = await request(app).get('/api/users/');
    expect(res.status).toBe(401);
  });
});
