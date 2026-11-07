const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Check product checksums
const backupPath = path.resolve('backend/backups/atlas_backup_20261101120039/products.json');
const raw = fs.readFileSync(backupPath);
const rawHash = crypto.createHash('sha256').update(raw).digest('hex');
const items = JSON.parse(raw);
const normalized = items.map(p => ({
  _id: String(p._id.$oid || p._id),
  name: p.name,
  price: p.price,
  mrp: p.mrp,
  image: p.image,
  stock: p.stock
})).sort((a,b) => a._id.localeCompare(b._id));
const normHash = crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');

console.log('=== PRODUCT DATA CHECKSUM ===');
console.log('File:', backupPath);
console.log('Raw SHA-256:', rawHash);
console.log('Product Count:', items.length);
console.log('Normalized (name, price, mrp, image, stock, _id) SHA-256:', normHash);

// 2. Discover Backend routes from backend/server.js
const serverJs = fs.readFileSync('backend/server.js', 'utf8');
console.log('\n=== BACKEND ROUTES MOUNTED IN server.js ===');
const mountRegex = /app\.use\(['"]([^'"]+)['"],\s*require\(['"]([^'"]+)['"]\)\)/g;
let match;
const mounts = [];
while ((match = mountRegex.exec(serverJs)) !== null) {
  mounts.push({ mount: match[1], file: match[2] });
  console.log(match[1], '->', match[2]);
}

// 3. Discover models in backend/models
console.log('\n=== MONGOOSE MODELS ===');
const modelsDir = path.resolve('backend/models');
const modelFiles = fs.readdirSync(modelsDir);
modelFiles.forEach(f => {
  console.log(f);
});

// 4. Discover App Screens in shagun-native/app
console.log('\n=== NATIVE APP SCREENS ===');
function walk(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      walk(path.join(dir, e.name), path.join(prefix, e.name));
    } else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) {
      console.log(path.join(prefix, e.name).replace(/\\/g, '/'));
    }
  }
}
walk(path.resolve('shagun-native/app'));

// 5. Discover Web Pages
console.log('\n=== WEB PAGES ===');
if (fs.existsSync('pages')) {
  fs.readdirSync('pages').forEach(p => console.log('pages/' + p));
}

// 6. Discover Context / State Stores
console.log('\n=== STATE STORES (CONTEXT) ===');
if (fs.existsSync('shagun-native/context')) {
  fs.readdirSync('shagun-native/context').forEach(c => console.log('shagun-native/context/' + c));
}
if (fs.existsSync('context')) {
  fs.readdirSync('context').forEach(c => console.log('context/' + c));
}
