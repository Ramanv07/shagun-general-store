const fs = require('fs');
const crypto = require('crypto');

const raw = fs.readFileSync('backend/backups/atlas_backup_20261101120039/products.json', 'utf8');
const rawSha = crypto.createHash('sha256').update(raw).digest('hex');
const products = JSON.parse(raw);
const canonical = products.map(x => ({
  _id: x._id,
  name: x.name,
  price: x.price,
  mrp: x.mrp,
  image: x.image,
  stock: x.stock
}));
const canonSha = crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');

console.log('Product Count:', products.length);
console.log('Raw SHA-256:', rawSha);
console.log('Canonical SHA-256:', canonSha);

const EXPECTED_RAW = 'f792b316b6a0b6870085c483cdaf356d3c240ddaa8b66f581498a285cd816e9c';
const EXPECTED_CANONICAL = '53fa1d92b6381474ede7c1a94240f62fba4e928a5c0e23657b57e661643b1c60';

if (rawSha === EXPECTED_RAW && canonSha === EXPECTED_CANONICAL) {
  console.log('STATUS: VERIFIED (100% Exact Match)');
  process.exit(0);
} else {
  console.error('STATUS: MISMATCH!');
  process.exit(1);
}
