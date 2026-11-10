import { jest } from '@jest/globals';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import Banner from '../models/Banner.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import bannerRoutes from '../routes/bannerRoutes.js';
import jwt from 'jsonwebtoken';

jest.setTimeout(60000);
process.env.JWT_SECRET = 'test_jwt_secret_key_32_characters_long_min';

let mongod;
let app;
let request;
let adminToken;
let userToken;
let adminUser;
let regularUser;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = express();
  app.use(express.json());
  app.use('/api/banners', bannerRoutes);
  request = supertest(app);

  adminUser = await User.create({
    name: 'Admin Banner Tester',
    email: 'admin_banner@shagun.com',
    password: 'Password123!',
    role: 'admin',
    tokenVersion: 0
  });
  regularUser = await User.create({
    name: 'Regular Customer',
    email: 'customer_banner@shagun.com',
    password: 'Password123!',
    role: 'user',
    tokenVersion: 0
  });

  adminToken = jwt.sign({ id: adminUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);
  userToken = jwt.sign({ id: regularUser._id, tokenVersion: 0 }, process.env.JWT_SECRET);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('B1: Banners Architecture & Admin CRUD', () => {
  beforeEach(async () => {
    await Banner.deleteMany({});
    await AuditLog.deleteMany({});
  });

  test('FAILS: Rejects non-Cloudinary image URLs and open redirects in target', async () => {
    // 1. Invalid non-cloudinary image
    const badImageRes = await request
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Malicious Banner',
        imageUrl: 'http://malicious.com/banner.jpg',
        placement: ['web_home'],
        target: { type: 'none' }
      });
    expect(badImageRes.status).toBe(400);
    expect(badImageRes.body.message).toMatch(/Cloudinary/i);

    // 2. Invalid target type (open redirect attempt)
    const badTargetRes = await request
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Open Redirect Banner',
        imageUrl: 'https://res.cloudinary.com/shagun/image/upload/v1234/banner.jpg',
        placement: ['web_home'],
        target: { type: 'external_url', value: 'https://evil.com' }
      });
    expect(badTargetRes.status).toBe(400);
  });

  test('FAILS: Enforces endAt > startAt and max 10 active banners per placement', async () => {
    // 1. Invalid schedule (endAt before startAt)
    const badScheduleRes = await request
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Bad Schedule',
        imageUrl: 'https://res.cloudinary.com/shagun/image/upload/v1234/b1.jpg',
        placement: ['web_home'],
        startAt: new Date('2026-12-31T00:00:00Z'),
        endAt: new Date('2026-12-01T00:00:00Z'),
        target: { type: 'none' }
      });
    expect(badScheduleRes.status).toBe(400);

    // 2. Max 10 active limit per placement
    for (let i = 0; i < 10; i++) {
      await Banner.create({
        title: `Banner ${i}`,
        imageUrl: `https://res.cloudinary.com/shagun/image/upload/v1234/b${i}.jpg`,
        placement: ['web_home'],
        sortOrder: i,
        active: true,
        target: { type: 'none' }
      });
    }

    const eleventhRes = await request
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Eleventh Banner',
        imageUrl: 'https://res.cloudinary.com/shagun/image/upload/v1234/b11.jpg',
        placement: ['web_home'],
        active: true,
        target: { type: 'none' }
      });
    expect(eleventhRes.status).toBe(400);
    expect(eleventhRes.body.message).toMatch(/Maximum 10 active/i);
  });

  test('Public GET /api/banners?placement= filters active, in-schedule and returns sorted', async () => {
    await Banner.create({
      title: 'Active Banner 1',
      imageUrl: 'https://res.cloudinary.com/shagun/image/upload/v1/b1.jpg',
      placement: ['app_home', 'web_home'],
      sortOrder: 2,
      active: true,
      target: { type: 'offers' }
    });

    await Banner.create({
      title: 'Active Banner 0 (First)',
      imageUrl: 'https://res.cloudinary.com/shagun/image/upload/v1/b0.jpg',
      placement: ['web_home'],
      sortOrder: 1,
      active: true,
      target: { type: 'category', value: 'Cosmetics' }
    });

    await Banner.create({
      title: 'Inactive Banner',
      imageUrl: 'https://res.cloudinary.com/shagun/image/upload/v1/b2.jpg',
      placement: ['web_home'],
      sortOrder: 0,
      active: false,
      target: { type: 'none' }
    });

    const res = await request.get('/api/banners?placement=web_home');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('max-age=60');
    expect(res.body.length).toBe(2);
    expect(res.body[0].title).toBe('Active Banner 0 (First)');
    expect(res.body[1].title).toBe('Active Banner 1');
  });

  test('Admin CRUD writes AuditLog entries and blocks non-admin users', async () => {
    // Non-admin rejected (403)
    const regularRes = await request
      .post('/api/banners')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Customer Banner',
        imageUrl: 'https://res.cloudinary.com/shagun/image/upload/v1/b.jpg',
        placement: ['web_home'],
        target: { type: 'none' }
      });
    expect(regularRes.status).toBe(403);

    // Admin creates banner -> AuditLog recorded
    const createRes = await request
      .post('/api/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Audit Test Banner',
        imageUrl: 'https://res.cloudinary.com/shagun/image/upload/v1/b_audit.jpg',
        placement: ['web_home'],
        target: { type: 'none' }
      });
    expect(createRes.status).toBe(201);
    const createdId = createRes.body._id;

    const logs = await AuditLog.find({ entity: 'Banner', entity_id: createdId });
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('CREATE');
  });
});

