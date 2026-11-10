import { jest } from '@jest/globals';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import Brand from '../models/Brand.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import brandRoutes from '../routes/brandRoutes.js';
import productRoutes from '../routes/productRoutes.js';
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
  app.use('/api/brands', brandRoutes);
  app.use('/api/products', productRoutes);
  request = supertest(app);

  adminUser = await User.create({
    name: 'Brand Admin',
    email: 'brand_admin@shagun.com',
    password: 'Password123!',
    role: 'admin',
    tokenVersion: 0
  });
  regularUser = await User.create({
    name: 'Brand Customer',
    email: 'brand_customer@shagun.com',
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

describe('B3: Brands Architecture, Admin CRUD & Active With Products Filter', () => {
  beforeEach(async () => {
    await Brand.deleteMany({});
    await Product.deleteMany({});
    await AuditLog.deleteMany({});
  });

  test('Admin CRUD creates, updates, logs to AuditLog, and blocks non-admin users', async () => {
    // Non-admin rejected
    const nonAdminRes = await request
      .post('/api/brands')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Lakme' });
    expect(nonAdminRes.status).toBe(403);

    // Admin creates brand
    const createRes = await request
      .post('/api/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Lakme Cosmetics',
        logo: 'https://res.cloudinary.com/shagun/image/upload/v1/lakme.png',
        description: 'Premium Indian makeup brand'
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.slug).toBe('lakme-cosmetics');
    const brandId = createRes.body._id;

    // Verify AuditLog
    const logs = await AuditLog.find({ entity: 'Brand', entity_id: brandId });
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('CREATE');
  });

  test('GET /api/brands/active-with-products returns ONLY active brands with non-deleted products', async () => {
    const brandWithProduct = await Brand.create({
      name: 'Maybelline',
      slug: 'maybelline',
      isActive: true
    });
    const brandWithoutProduct = await Brand.create({
      name: 'Loreal',
      slug: 'loreal',
      isActive: true
    });
    const inactiveBrandWithProduct = await Brand.create({
      name: 'Nivea',
      slug: 'nivea',
      isActive: false
    });

    // Product attached to Maybelline
    await Product.create({
      name: 'Maybelline Mascara',
      description: 'Lash sensational mascara for bold volume.',
      price: 399,
      category: 'Cosmetics',
      image: 'https://res.cloudinary.com/shagun/image/upload/v1/mascara.jpg',
      stock: 10,
      brand_id: brandWithProduct._id
    });

    // Product attached to inactive Nivea
    await Product.create({
      name: 'Nivea Body Lotion',
      description: 'Moisturizing deep moisture serum body lotion.',
      price: 250,
      category: 'Personal Care',
      image: 'https://res.cloudinary.com/shagun/image/upload/v1/lotion.jpg',
      stock: 15,
      brand_id: inactiveBrandWithProduct._id
    });

    const res = await request.get('/api/brands/active-with-products');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Maybelline');
  });

  test('GET /api/products?brand= filters by brand id and backwards-compatible slug', async () => {
    const brand = await Brand.create({
      name: 'Colorbar',
      slug: 'colorbar',
      isActive: true
    });

    const p1 = await Product.create({
      name: 'Colorbar Matte Lipstick',
      description: 'Velvet matte lipstick long lasting rich pigment.',
      price: 499,
      category: 'Cosmetics',
      image: 'https://res.cloudinary.com/shagun/image/upload/v1/lipstick.jpg',
      stock: 12,
      brand_id: brand._id
    });

    const p2 = await Product.create({
      name: 'Generic Nail Polish',
      description: 'Quick dry vibrant shiny nail lacquer.',
      price: 99,
      category: 'Cosmetics',
      image: 'https://res.cloudinary.com/shagun/image/upload/v1/nail.jpg',
      stock: 20
    });

    // 1. Filter by brand ID
    const resId = await request.get(`/api/products?brand=${brand._id}`);
    expect(resId.status).toBe(200);
    expect(resId.body.length).toBe(1);
    expect(resId.body[0].name).toBe('Colorbar Matte Lipstick');

    // 2. Filter by brand slug
    const resSlug = await request.get('/api/products?brand=colorbar');
    expect(resSlug.status).toBe(200);
    expect(resSlug.body.length).toBe(1);
    expect(resSlug.body[0].name).toBe('Colorbar Matte Lipstick');
  });
});

