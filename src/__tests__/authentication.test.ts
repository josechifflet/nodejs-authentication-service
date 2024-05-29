import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import loadExpress from '../infra/express';
import flushDb from '../__tests_setup__/flushDb';
import flushRedis from '../__tests_setup__/flushRedis';

describe('[Authentication]', () => {
  beforeAll(async () => {
    await flushDb();
    await flushRedis();
    vi.clearAllMocks();
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const testApp = loadExpress();
  let userId: string;

  describe('POST /api/v1/auth/register', () => {
    it('should create a new user with valid data', async () => {
      const { status, body } = await request(testApp)
        .post('/api/v1/auth/register')
        .set('x-requested-with', 'authaas')
        .set('accept', 'application/json')
        .set('accept', 'application/vnd.auth.v1+json')
        .send({
          username: 'NewUser',
          email: 'newuser@example.com',
          phoneNumber: '+1234567890',
          password: 'SecurePassword1!',
          fullName: 'New User',
        });

      expect(status).toBe(201);
      expect(body).toHaveProperty(
        'message',
        'Successfully registered! Please check your email address for verification.',
      );
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('userID');
      expect(body.data).toHaveProperty('email', 'newuser@example.com');
      expect(body.data).toHaveProperty('phoneNumber', '+1234567890');
      expect(body.data).toHaveProperty('fullName', 'New User');
      expect(body.data).toHaveProperty('role', 'user');
      expect(body.data).toHaveProperty('isActive', true);
      expect(body.data).toHaveProperty('createdAt');
      expect(body.data).toHaveProperty('updatedAt');
      expect(body.data).toHaveProperty('uri');
      userId = body.data.userID;
    });

    it('should fail to create a new user with invalid credentials (existing user)', async () => {
      const { status, body } = await request(testApp)
        .post('/api/v1/auth/register')
        .set('x-requested-with', 'authaas')
        .set('accept', 'application/json')
        .set('accept', 'application/vnd.auth.v1+json')
        .send({
          username: 'NewUser',
          email: 'newuser@example.com',
          phoneNumber: '+1234567890',
          password: 'SecurePassword1!',
          fullName: 'New User',
        });

      expect(status).toBe(422);
      expect(body).toHaveProperty(
        'message',
        'Not possible to create a user with those credentials!',
      );
    });

    it('should fail to create a new user with invalid credentials (existing user)', async () => {
      const { status, body } = await request(testApp)
        .post('/api/v1/auth/register')
        .set('x-requested-with', 'authaas')
        .set('accept', 'application/json')
        .set('accept', 'application/vnd.auth.v1+json')
        .send({
          username: 'NewUser',
          email: 'newuserexample.com',
          phoneNumber: '+1234567890',
          password: 'SecurePassword1!',
          fullName: 'New User',
        });

      expect(status).toBe(400);
      expect(body).toHaveProperty('message', 'body.email: Invalid email');
    });
  });
});
