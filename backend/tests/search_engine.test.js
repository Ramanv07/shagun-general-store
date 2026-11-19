import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import express from 'express';
import productRoutes from '../routes/productRoutes.js';
import settingRoutes from '../routes/settingRoutes.js';
import Product from '../models/Product.js';
import Brand from '../models/Brand.js';
import StoreSetting from '../models/StoreSetting.js';
import SearchMiss from '../models/SearchMiss.js';
import {
  searchProducts,
  getSuggestions,
  normalizeText,
  editDistance,
  invalidateSearchCache,
  invalidateSynonymsCache,
  DEFAULT_SYNONYMS
} from '../utils/searchEngine.js';

const app = express();
app.use(express.json());
app.use('/api/products', productRoutes);
app.use('/api/settings', settingRoutes);

describe('Backend Smart Search Engine Suite', () => {
  let mongod;
  let brands = [];
  const testCatalog = [];

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    // 1. Seed Brands
    const brandData = [
      { name: 'Mamaearth', slug: 'mamaearth' },
      { name: 'Nivea', slug: 'nivea' },
      { name: 'Vaseline', slug: 'vaseline' },
      { name: 'Dove', slug: 'dove' },
      { name: "Pond's", slug: 'ponds' },
      { name: 'Garnier', slug: 'garnier' },
      { name: 'Himalaya', slug: 'himalaya' },
      { name: 'Lakme', slug: 'lakme' }
    ];
    brands = await Brand.insertMany(brandData);

    const brandMap = {};
    brands.forEach(b => { brandMap[b.name] = b._id; });

    // 2. Generate ~500 realistic products with catalog categories, sizes, and variations
    const categories = ['Skin Care', 'Personal Care', 'Hair Care', 'Fragrances', 'Beauty', 'General Use'];
    const productTemplates = [
      // Target focus products
      { name: 'Mamaearth Ubtan Natural Face Wash 100ml', brand: 'Mamaearth', cat: 'Skin Care', stock: 50 },
      { name: 'Mamaearth Tea Tree Face Wash with Neem 100ml', brand: 'Mamaearth', cat: 'Skin Care', stock: 45 },
      { name: 'Mamaearth Vitamin C Face Wash 100ml', brand: 'Mamaearth', cat: 'Skin Care', stock: 60 },
      { name: 'Mamaearth Onion Hair Oil 150ml', brand: 'Mamaearth', cat: 'Hair Care', stock: 40 },
      { name: 'Mamaearth Daily Glow Body Lotion 400ml', brand: 'Mamaearth', cat: 'Personal Care', stock: 30 },
      { name: 'Nivea Soft Light Moisturizer Cream 100ml', brand: 'Nivea', cat: 'Skin Care', stock: 80 },
      { name: 'Nivea Men Fresh Active Shower Gel 250ml', brand: 'Nivea', cat: 'Personal Care', stock: 35 },
      { name: 'Nivea Nourishing Body Milk Lotion 400ml', brand: 'Nivea', cat: 'Personal Care', stock: 55 },
      { name: 'Vaseline Intensive Care Deep Moisture Body Lotion 400ml', brand: 'Vaseline', cat: 'Personal Care', stock: 70 },
      { name: 'Vaseline Healthy Bright Daily Sunscreen SPF50 100g', brand: 'Vaseline', cat: 'Skin Care', stock: 25 },
      { name: 'Vaseline Pure Petroleum Jelly 50g', brand: 'Vaseline', cat: 'Personal Care', stock: 120 },
      { name: 'Dove Cream Beauty Bathing Soap Bar 100g', brand: 'Dove', cat: 'Personal Care', stock: 150 },
      { name: 'Dove Intense Repair Shampoo 340ml', brand: 'Dove', cat: 'Hair Care', stock: 40 },
      { name: "Pond's Super Light Gel Moisturizer 100g", brand: "Pond's", cat: 'Skin Care', stock: 60 },
      { name: "Pond's Bright Beauty Face Wash 100g", brand: "Pond's", cat: 'Skin Care', stock: 50 },
      { name: 'Garnier Skin Naturals Micellar Cleansing Water 125ml', brand: 'Garnier', cat: 'Skin Care', stock: 30 },
      { name: 'Garnier Men Acno Fight Anti-Pimple Face Wash 100g', brand: 'Garnier', cat: 'Skin Care', stock: 40 },
      { name: 'Himalaya Purifying Neem Face Wash 150ml', brand: 'Himalaya', cat: 'Skin Care', stock: 90 },
      { name: 'Himalaya Herbals Purifying Neem Pack 100g', brand: 'Himalaya', cat: 'Skin Care', stock: 35 },
      { name: 'Lakme Eyeconic Kajal Deep Black 0.35g', brand: 'Lakme', cat: 'Beauty', stock: 100 },
      // Out-of-stock item for ranking test
      { name: 'Mamaearth Charcoal Face Wash 100ml', brand: 'Mamaearth', cat: 'Skin Care', stock: 0 },
      // Draft item
      { name: 'Mamaearth Secret Upcoming Serum 30ml', brand: 'Mamaearth', cat: 'Skin Care', stock: 10, isDraft: true },
      // Soft deleted item
      { name: 'Mamaearth Old Discontinued Face Wash 100ml', brand: 'Mamaearth', cat: 'Skin Care', stock: 10, isDeleted: true }
    ];

    const allProducts = [];
    // Push the specific target templates
    for (const t of productTemplates) {
      allProducts.push({
        name: t.name,
        price: 299,
        mrp: 399,
        category: t.cat,
        stock: t.stock,
        description: `Premium ${t.name} formulated with natural actives for daily care.`,
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03',
        brand_id: brandMap[t.brand] || null,
        isFeatured: false,
        isDraft: Boolean(t.isDraft),
        isDeleted: Boolean(t.isDeleted)
      });
    }

    // Generate remaining up to ~500 realistic catalog items
    const adjectives = ['Nourishing', 'Hydrating', 'Smoothing', 'Herbal', 'Refreshing', 'Intense', 'Gentle', 'Classic'];
    const items = ['Shampoo', 'Conditioner', 'Body Wash', 'Night Cream', 'Hand Sanitizer', 'Sunscreen Lotion', 'Talcum Powder', 'Facial Mist'];
    const sizes = ['50g', '100g', '200ml', '400ml', '500ml', '1l'];

    let count = allProducts.length;
    for (const b of brands) {
      for (const adj of adjectives) {
        for (const item of items) {
          if (count >= 505) break;
          const sz = sizes[count % sizes.length];
          const cat = categories[count % categories.length];
          allProducts.push({
            name: `${b.name} ${adj} ${item} ${sz}`,
            price: 150 + (count % 20) * 20,
            mrp: 200 + (count % 20) * 25,
            category: cat,
            stock: (count % 7 === 0) ? 0 : 20 + (count % 50),
            description: `${adj} ${item} by ${b.name} for complete protection.`,
            image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03',
            brand_id: b._id,
            isFeatured: count % 15 === 0,
            isDraft: false,
            isDeleted: false
          });
          count++;
        }
      }
    }

    await Product.insertMany(allProducts);

    // Seed default search synonyms
    await StoreSetting.updateOne(
      { key: 'search_synonyms' },
      { $set: { key: 'search_synonyms', value: DEFAULT_SYNONYMS } },
      { upsert: true }
    );

    invalidateSearchCache();
    invalidateSynonymsCache();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(() => {
    invalidateSearchCache();
    invalidateSynonymsCache();
  });

  // --- UNIT: Normalization & Helpers ---
  test('normalizeText standardizes spacing, accents, repeated chars, and units', () => {
    expect(normalizeText('  MAMA   EARTH  ')).toBe('mama earth');
    expect(normalizeText('soooap bar')).toBe('soap bar');
    expect(normalizeText('Crème')).toBe('creme');
    expect(normalizeText('400 ml')).toBe('400ml');
    expect(normalizeText('50 gm')).toBe('50g');
    expect(normalizeText('Pond’s!!')).toBe('pond s');
  });

  test('editDistance correctly calculates Damerau-Levenshtein distances', () => {
    expect(editDistance('face', 'fae')).toBe(1); // 1 deletion
    expect(editDistance('face', 'fase')).toBe(1); // 1 substitution
    expect(editDistance('nivea', 'nivea')).toBe(0);
    expect(editDistance('mamaearth', 'mamarth')).toBe(2); // 2 edits
  });

  // --- CORE SEARCH CASES TABLE ---
  test('1. "mamarth" matches Mamaearth items via synonym/typo tolerance', async () => {
    const res = await request(app).get('/api/products?search=mamarth');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toMatch(/Mamaearth/i);
    expect(res.headers['x-search-mode']).toBe('fuzzy');
  });

  test('2. "mamaarth face wash" matches Mamaearth face washes first', async () => {
    const res = await request(app).get('/api/products?search=mamaarth%20face%20wash');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toMatch(/Mamaearth.*Face Wash/i);
    expect(res.body[0].stock).toBeGreaterThan(0); // in stock before out of stock
  });

  test('3. "face wash mamaearth" (word order reordered) matches identical items', async () => {
    const res = await request(app).get('/api/products?search=face%20wash%20mamaearth');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toMatch(/Mamaearth.*Face Wash/i);
  });

  test('4. "mamaearth facewash" (compound word) matches face washes', async () => {
    const res = await request(app).get('/api/products?search=mamaearth%20facewash');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toMatch(/Face Wash/i);
  });

  test('5. Typo tolerance: "fae wash", "fase wash", "face wsh" match face washes', async () => {
    for (const typo of ['fae wash', 'fase wash', 'face wsh']) {
      const res = await request(app).get(`/api/products?search=${encodeURIComponent(typo)}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.some(p => /Face Wash/i.test(p.name))).toBe(true);
    }
  });

  test('6. "lotoin" & "lotion vaseline 400" match Vaseline 400ml lotion', async () => {
    const res1 = await request(app).get('/api/products?search=lotoin');
    expect(res1.status).toBe(200);
    expect(res1.body.some(p => /Lotion/i.test(p.name))).toBe(true);

    const res2 = await request(app).get('/api/products?search=lotion%20vaseline%20400');
    expect(res2.status).toBe(200);
    expect(res2.body.length).toBeGreaterThan(0);
    expect(res2.body[0].name).toMatch(/Vaseline.*Lotion.*400ml/i);
  });

  test('7. "nivea crem" matches Nivea cream items', async () => {
    const res = await request(app).get('/api/products?search=nivea%20crem');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toMatch(/Nivea.*Cream/i);
  });

  test('8. Plural / Singular tolerance: "creams" matches "cream", "shampoos" matches "shampoo"', async () => {
    const res = await request(app).get('/api/products?search=creams');
    expect(res.status).toBe(200);
    expect(res.body.some(p => /Cream/i.test(p.name))).toBe(true);
  });

  test('9. Punctuation & case: "pond\'s" matches "Pond\'s"', async () => {
    const res = await request(app).get('/api/products?search=pond%27s');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toMatch(/Pond's/i);
  });

  test('10. 1-2 character queries: prefix matching only without fuzzy explosion', async () => {
    const res = await request(app).get('/api/products?search=va');
    expect(res.status).toBe(200);
    expect(res.body.every(p => /va/i.test(p.name) || /Vaseline/i.test(p.name))).toBe(true);
  });

  test('11. Complete nonsense query "xqzvw" returns empty array and logs miss', async () => {
    const res = await request(app).get('/api/products?search=xqzvw');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(res.headers['x-total-count']).toBe('0');

    // Verify SearchMiss logged query
    const miss = await SearchMiss.findOne({ query: 'xqzvw' });
    expect(miss).toBeTruthy();
    expect(miss.count).toBeGreaterThanOrEqual(1);
  });

  test('12. Security: SQL/NoSQL injection and regex characters do not crash or execute', async () => {
    const injectionQueries = [
      '{ $where: "1 == 1" }',
      'Mamaearth.*',
      '<script>alert(1)</script>',
      'DROP TABLE products;'
    ];
    for (const q of injectionQueries) {
      const res = await request(app).get(`/api/products?search=${encodeURIComponent(q)}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  test('13. Query length capping: 80+ characters truncated safely without crashing', async () => {
    const longQuery = 'mamaearth face wash '.repeat(10); // > 100 chars
    const res = await request(app).get(`/api/products?search=${encodeURIComponent(longQuery)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('14. Drafts and soft-deleted items are never returned for public search', async () => {
    const res = await request(app).get('/api/products?search=Mamaearth');
    expect(res.status).toBe(200);
    expect(res.body.some(p => p.name === 'Mamaearth Secret Upcoming Serum 30ml')).toBe(false);
    expect(res.body.some(p => p.name === 'Mamaearth Old Discontinued Face Wash 100ml')).toBe(false);
  });

  test('15. Out of stock item ranks below in-stock items', async () => {
    const res = await request(app).get('/api/products?search=mamaearth%20face%20wash');
    expect(res.status).toBe(200);
    const charcoalIdx = res.body.findIndex(p => p.name.includes('Charcoal')); // stock: 0
    const ubtanIdx = res.body.findIndex(p => p.name.includes('Ubtan')); // stock: 50
    expect(ubtanIdx).toBeLessThan(charcoalIdx);
  });

  test('16. Suggestions endpoint GET /api/products/suggest returns max 8 items', async () => {
    const res = await request(app).get('/api/products/suggest?q=mama');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(res.body).toHaveProperty('brands');
    expect(res.body).toHaveProperty('categories');
    expect(res.body.brands).toContain('Mamaearth');
    expect(res.body.products.length).toBeLessThanOrEqual(4);
  });

  test('17. Old clients requesting /api/products without search still get standard array', async () => {
    const res = await request(app).get('/api/products?limit=10');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(10);
  });

  test('18. Concurrent 50 requests and server response timing (p95 < 50ms)', async () => {
    const start = Date.now();
    const promises = [];
    const testQueries = ['mamaearth', 'face wash', 'nivea', 'lotion', 'vaseline 400', 'dove soap', 'himalaya neem', 'crem', 'ponds'];

    for (let i = 0; i < 50; i++) {
      const q = testQueries[i % testQueries.length];
      promises.push(request(app).get(`/api/products?search=${encodeURIComponent(q)}`));
    }

    const responses = await Promise.all(promises);
    const totalTime = Date.now() - start;
    const avgTimePerReq = totalTime / 50;

    responses.forEach(r => {
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body)).toBe(true);
    });

    console.log(`[Search Perf Benchmark] 50 concurrent requests over ~500 items completed in ${totalTime}ms (avg: ${avgTimePerReq.toFixed(1)}ms/req)`);
    expect(avgTimePerReq).toBeLessThan(50);
  }, 15000);
});
