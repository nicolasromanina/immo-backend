import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.setTimeout(30000);

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing_only';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_webhook_secret';
process.env.FRONTEND_URL = 'http://localhost:3000';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});
