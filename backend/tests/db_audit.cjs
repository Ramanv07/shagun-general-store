const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('=== PHASE 1: DATABASE AUDIT (STAGING DATA) ===\n');

const backupDir = path.resolve(__dirname, '../backups/atlas_backup_20261101120039');

// 0. Checksum Before
const rawProductsBefore = fs.readFileSync(path.join(backupDir, 'products.json'));
const checksumBefore = crypto.createHash('sha256').update(rawProductsBefore).digest('hex');
console.log('Pre-Audit products.json SHA-256:', checksumBefore);

function loadCollection(name) {
  const filePath = path.join(backupDir, `${name}.json`);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error(`Failed to parse ${name}.json:`, e.message);
    return [];
  }
}

const products = loadCollection('products');
const users = loadCollection('users');
const orders = loadCollection('orders');
const categories = loadCollection('categorysections');
const parlorServices = loadCollection('parlorservices');
const rentals = loadCollection('rentals');
const appointments = loadCollection('appointments');

const findings = [];
function addFinding(severity, area, title, evidence, expected, actual, fix) {
  findings.push({ severity, area, title, evidence, expected, actual, fix });
}

console.log(`Loaded Documents:
- Products: ${products.length}
- Users: ${users.length}
- Orders: ${orders.length}
- Categories: ${categories.length}
- Parlor Services: ${parlorServices.length}
- Rentals: ${rentals.length}
- Appointments: ${appointments.length}
`);

// Build reference sets
const userIdSet = new Set(users.map(u => String(u._id.$oid || u._id)));
const userEmailSet = new Map();
const userPhoneSet = new Map();
const productIdSet = new Set(products.map(p => String(p._id.$oid || p._id)));
const productNameSet = new Map();

// --- 1. PRODUCT AUDIT ---
products.forEach((p, idx) => {
  const pId = String(p._id.$oid || p._id);
  
  // A. Missing required fields
  ['name', 'price', 'category', 'stock', 'description', 'image'].forEach(reqField => {
    if (p[reqField] === undefined || p[reqField] === null || p[reqField] === '') {
      addFinding('🔴 BLOCKER', 'DB/Product', `Product missing required field: ${reqField}`,
        `Product ID: ${pId}, Name: "${p.name || ''}"`,
        `Field "${reqField}" must be present and non-empty`,
        `Value is ${JSON.stringify(p[reqField])}`,
        `Provide valid ${reqField} for product ${pId}`);
    }
  });

  // B. Price & MRP anomalies
  if (typeof p.price !== 'number' || isNaN(p.price) || p.price <= 0) {
    addFinding('🔴 BLOCKER', 'DB/Product', 'Invalid product price (<= 0 or not a number)',
      `Product ID: ${pId}, Name: "${p.name}", Price: ${p.price}`,
      'Price must be a positive number > 0',
      `Price is ${p.price}`,
      'Fix price to valid positive INR amount');
  }

  if (p.mrp !== undefined && p.mrp !== null) {
    if (typeof p.mrp !== 'number' || isNaN(p.mrp) || p.mrp <= 0) {
      addFinding('🟠 HIGH', 'DB/Product', 'Invalid product MRP (<= 0 or not a number)',
        `Product ID: ${pId}, Name: "${p.name}", MRP: ${p.mrp}`,
        'MRP must be a positive number',
        `MRP is ${p.mrp}`,
        'Correct or remove invalid MRP');
    } else if (p.mrp < p.price) {
      addFinding('🔴 BLOCKER', 'DB/Product', 'Product MRP is strictly lower than selling price',
        `Product ID: ${pId}, Name: "${p.name}", Price: ₹${p.price}, MRP: ₹${p.mrp}`,
        'MRP must be >= selling price (MRP >= price)',
        `MRP (₹${p.mrp}) < Price (₹${p.price})`,
        'Ensure MRP reflects manufacturer retail price >= selling price');
    }
  }

  // C. Stock anomalies
  if (typeof p.stock !== 'number' || p.stock < 0 || !Number.isInteger(p.stock)) {
    addFinding('🔴 BLOCKER', 'DB/Product', 'Invalid product stock count (< 0 or non-integer)',
      `Product ID: ${pId}, Name: "${p.name}", Stock: ${p.stock}`,
      'Stock must be an integer >= 0',
      `Stock is ${p.stock}`,
      'Set stock to valid non-negative integer');
  }

  // D. Duplicates by name
  if (p.name) {
    const cleanName = p.name.trim().toLowerCase();
    if (productNameSet.has(cleanName)) {
      addFinding('🟡 MEDIUM', 'DB/Product', 'Duplicate product name detected',
        `Product ID: ${pId} duplicates "${p.name}" (first seen at ID: ${productNameSet.get(cleanName)})`,
        'Product names should ideally be unique or clearly distinguishable',
        `Duplicate product name: "${p.name}"`,
        'Rename or merge duplicate products');
    } else {
      productNameSet.set(cleanName, pId);
    }
  }

  // E. Image URL verification
  if (p.image) {
    if (p.image.startsWith('http://localhost') || p.image.includes('127.0.0.1')) {
      addFinding('🟠 HIGH', 'DB/Product', 'Localhost image URL found in database',
        `Product ID: ${pId}, Image: "${p.image}"`,
        'Image URLs must be relative or hosted on CDN/Cloudinary',
        `Image contains localhost: "${p.image}"`,
        'Migrate localhost image URLs to Cloudinary or static assets');
    }
  }
});

// --- 2. USER AUDIT ---
users.forEach(u => {
  const uId = String(u._id.$oid || u._id);
  
  if (!u.email) {
    addFinding('🔴 BLOCKER', 'DB/User', 'User missing required email',
      `User ID: ${uId}, Name: "${u.name}"`,
      'Email is required and unique',
      `Email is missing`,
      'Set valid unique email for user');
  } else {
    const cleanEmail = u.email.trim().toLowerCase();
    if (userEmailSet.has(cleanEmail)) {
      addFinding('🔴 BLOCKER', 'DB/User', 'Duplicate user email in database',
        `User ID: ${uId} duplicates email "${u.email}" (first seen at ID: ${userEmailSet.get(cleanEmail)})`,
        'User emails must be strictly unique',
        `Duplicate email found: "${u.email}"`,
        'Remove or merge duplicate user accounts');
    } else {
      userEmailSet.set(cleanEmail, uId);
    }
  }

  if (u.role && !['user', 'admin'].includes(u.role)) {
    addFinding('🟠 HIGH', 'DB/User', 'Invalid user role value',
      `User ID: ${uId}, Role: "${u.role}"`,
      'Role must be either "user" or "admin"',
      `Role is "${u.role}"`,
      'Sanitize role to valid enum');
  }

  // Address validation in user
  if (Array.isArray(u.addresses)) {
    u.addresses.forEach((addr, aIdx) => {
      ['fullName', 'mobile', 'houseNo', 'street', 'city', 'state', 'pinCode'].forEach(af => {
        if (!addr[af]) {
          addFinding('🟡 MEDIUM', 'DB/User', `User address missing field: ${af}`,
            `User ID: ${uId}, Address index: ${aIdx}, Field: ${af}`,
            'Address requires fullName, mobile, houseNo, street, city, state, pinCode',
            `Field ${af} is empty or missing`,
            'Ensure address validation prevents incomplete saved addresses');
        }
      });
    });
  }
});

// --- 3. ORDER AUDIT & FINANCIAL INTEGRITY ---
orders.forEach(o => {
  const oId = String(o._id.$oid || o._id);
  const orderUser = String(o.user?.$oid || o.user || '');

  // A. Orphan user reference
  if (orderUser && !userIdSet.has(orderUser) && !o.legacyUserId) {
    addFinding('🔴 BLOCKER', 'DB/Order', 'Order references non-existent User ID (Orphan Reference)',
      `Order ID: ${oId}, User Ref: "${orderUser}"`,
      'Every order user reference must resolve to a valid User document',
      `User ID "${orderUser}" does not exist in users collection`,
      'Add referential integrity check before creating orders');
  }

  // B. Item reference & financial calculation
  let calculatedItemsSum = 0;
  if (!Array.isArray(o.items) || o.items.length === 0) {
    addFinding('🔴 BLOCKER', 'DB/Order', 'Order has empty items array',
      `Order ID: ${oId}`,
      'Order must contain at least 1 item',
      'Items array is empty',
      'Prevent creation of empty orders');
  } else {
    o.items.forEach((item, itemIdx) => {
      const pRef = String(item.product?.$oid || item.product || '');
      if (pRef && !productIdSet.has(pRef)) {
        addFinding('🟠 HIGH', 'DB/Order', 'Order item references deleted/non-existent Product ID',
          `Order ID: ${oId}, Item Index: ${itemIdx}, Product Ref: "${pRef}", Item Name: "${item.name}"`,
          'Order item product reference should point to an existing product',
          `Product ID "${pRef}" not found in products collection`,
          'Handle deleted products gracefully with historical snapshot preservation');
      }

      if (typeof item.price !== 'number' || item.price <= 0 || typeof item.quantity !== 'number' || item.quantity <= 0) {
        addFinding('🔴 BLOCKER', 'DB/Order', 'Invalid item price or quantity in order',
          `Order ID: ${oId}, Item: "${item.name}", Price: ${item.price}, Qty: ${item.quantity}`,
          'Item price and quantity must be positive numbers',
          `Price: ${item.price}, Quantity: ${item.quantity}`,
          'Validate item price and quantity strictly > 0');
      } else {
        calculatedItemsSum += (item.price * item.quantity);
      }
    });
  }

  // Total amount matching
  if (typeof o.totalAmount === 'number') {
    // Check if delivery fee rule is applied (threshold 399)
    const expectedDelivery = calculatedItemsSum >= 399 ? 0 : 30; // standard delivery fee in app is 30
    const expectedWithDelivery = calculatedItemsSum + expectedDelivery;
    
    // In some orders totalAmount might just equal calculatedItemsSum (free delivery) or include fee
    const diffExact = Math.abs(o.totalAmount - calculatedItemsSum);
    const diffWithFee = Math.abs(o.totalAmount - expectedWithDelivery);

    if (diffExact > 0.01 && diffWithFee > 0.01) {
      addFinding('🔴 BLOCKER', 'DB/Order', 'Order totalAmount mismatch with item sum',
        `Order ID: ${oId}, Recorded totalAmount: ₹${o.totalAmount}, Calculated Items Sum: ₹${calculatedItemsSum}, Expected with delivery: ₹${expectedWithDelivery}`,
        'Order totalAmount must equal sum(price * qty) + deliveryFee',
        `Discrepancy of ₹${o.totalAmount - calculatedItemsSum}`,
        'Server-side recalculation of totalAmount before saving order');
    }
  }

  // C. Status validity
  const validOrderStatuses = ['Processing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];
  if (o.status && !validOrderStatuses.includes(o.status)) {
    addFinding('🔴 BLOCKER', 'DB/Order', 'Order has invalid status value',
      `Order ID: ${oId}, Status: "${o.status}"`,
      `Status must be one of: ${validOrderStatuses.join(', ')}`,
      `Status is "${o.status}"`,
      'Ensure order state machine only permits valid status transitions');
  }

  // D. Payment Status validity
  const validPaymentStatuses = ['Pending', 'Completed', 'Failed'];
  if (o.paymentStatus && !validPaymentStatuses.includes(o.paymentStatus)) {
    addFinding('🟠 HIGH', 'DB/Order', 'Order has invalid paymentStatus value',
      `Order ID: ${oId}, PaymentStatus: "${o.paymentStatus}"`,
      `PaymentStatus must be one of: ${validPaymentStatuses.join(', ')}`,
      `PaymentStatus is "${o.paymentStatus}"`,
      'Sanitize paymentStatus enum');
  }
});

// --- 4. SCHEMA & INDEX AUDIT ---
// Review & Wishlist indexes
addFinding('🔴 BLOCKER', 'DB/Schema', 'Missing compound unique index on Review (user_id + product_id)',
  'File: backend/models/Review.js:12, autoIndex: false, no compound index',
  'Review schema must enforce unique compound index { user_id: 1, product_id: 1 } to prevent duplicate reviews',
  'No unique index exists; duplicate reviews can be created indefinitely',
  'Add reviewSchema.index({ user_id: 1, product_id: 1 }, { unique: true });');

addFinding('🔴 BLOCKER', 'DB/Schema', 'Missing compound unique index on WishlistItem (user_id + product_id)',
  'File: backend/models/WishlistItem.js:10, autoIndex: false, no compound index',
  'WishlistItem schema must enforce unique compound index { user_id: 1, product_id: 1 } to prevent spamming duplicate items',
  'No unique index exists; duplicate wishlist entries can be created indefinitely',
  'Add wishlistItemSchema.index({ user_id: 1, product_id: 1 }, { unique: true });');

addFinding('🟠 HIGH', 'DB/Schema', 'Inconsistent timestamp field naming between models',
  'Review & WishlistItem use snake_case "created_at" whereas Order & User use camelCase "createdAt" (Mongoose timestamps)',
  'All collections should follow consistent timestamp convention ("createdAt" and "updatedAt")',
  'Models mix snake_case created_at with camelCase timestamps: true',
  'Standardize timestamp convention across all Mongoose schemas');

addFinding('🟡 MEDIUM', 'DB/Schema', 'Missing text/search index on Product (name, description, category)',
  'File: backend/models/Product.js, no text index defined',
  'Fast catalog search requires compound or text index on name, category, and brand_id',
  'Queries rely on regex table scans ($regex) without text index',
  'Add productSchema.index({ name: "text", category: "text" });');

// --- 5. SOFT-DELETE AUDIT ---
const modelsWithoutSoftDelete = ['Product', 'User', 'Order', 'ParlorService'];
addFinding('🟠 HIGH', 'DB/Schema', 'Lack of soft-delete pattern across catalog and transactional models',
  'Files: backend/models/Product.js, backend/models/User.js',
  'Production e-commerce systems should support soft-delete (isDeleted flag) to preserve order history integrity',
  'Deleting a product or user can leave orphan references in historical orders and reviews',
  'Implement soft-delete middleware with { isDeleted: { type: Boolean, default: false } }');

// 6. Checksum After
const rawProductsAfter = fs.readFileSync(path.join(backupDir, 'products.json'));
const checksumAfter = crypto.createHash('sha256').update(rawProductsAfter).digest('hex');
console.log('Post-Audit products.json SHA-256:', checksumAfter);
console.log('Checksum Match:', checksumBefore === checksumAfter ? 'EXACT MATCH (Byte-identical)' : 'MISMATCH!');

// Output summary
const counts = {
  blocker: findings.filter(f => f.severity.includes('BLOCKER')).length,
  high: findings.filter(f => f.severity.includes('HIGH')).length,
  medium: findings.filter(f => f.severity.includes('MEDIUM')).length,
  low: findings.filter(f => f.severity.includes('LOW')).length,
  total: findings.length
};

console.log('\n=== AUDIT FINDINGS SUMMARY ===');
console.log(`Total Findings: ${counts.total}`);
console.log(`🔴 BLOCKER: ${counts.blocker}`);
console.log(`🟠 HIGH: ${counts.high}`);
console.log(`🟡 MEDIUM: ${counts.medium}`);
console.log(`⚪ LOW: ${counts.low}`);

fs.writeFileSync(path.resolve(__dirname, '../../scratch/db_audit_results.json'), JSON.stringify({
  checksumBefore,
  checksumAfter,
  counts,
  findings
}, null, 2));

console.log('Detailed audit results saved to scratch/db_audit_results.json');

