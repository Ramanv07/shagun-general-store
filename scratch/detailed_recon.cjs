const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('=== PHASE 0 DETAILED RECON ===\n');

// 1. Backend Routes
const routesDir = path.resolve('backend/routes');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

const allEndpoints = [];

routeFiles.forEach(file => {
  const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  // Match router.get, router.post, router.put, router.delete, router.patch
  const routeRegex = /router\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]\s*,\s*([^;]+)\)/g;
  let m;
  while ((m = routeRegex.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    const subpath = m[2];
    const handlers = m[3];
    const hasAuth = handlers.includes('protect') || handlers.includes('authMiddleware') || handlers.includes('requireAuth');
    const hasAdmin = handlers.includes('isAdmin') || handlers.includes('adminOnly') || handlers.includes('adminMiddleware');
    allEndpoints.push({
      file,
      method,
      subpath,
      hasAuth,
      hasAdmin,
      handlers: handlers.trim().split(',').map(h => h.trim())
    });
  }
});

console.log(`Total Route Files: ${routeFiles.length}`);
console.log(`Total Endpoints Discovered: ${allEndpoints.length}`);

// 2. Models and Indexes
const modelsDir = path.resolve('backend/models');
const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
const modelInfo = [];

modelFiles.forEach(file => {
  const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');
  // Extract index statements
  const indexMatches = content.match(/\.index\([^)]+\)/g) || [];
  // Extract unique fields
  const uniqueMatches = content.match(/(\w+):\s*\{[^}]*unique:\s*true/g) || [];
  modelInfo.push({
    file,
    indexes: indexMatches,
    uniques: uniqueMatches
  });
});

// Output findings to scratch/recon_summary.json
fs.writeFileSync('scratch/recon_summary.json', JSON.stringify({
  allEndpoints,
  modelInfo
}, null, 2));

console.log(`Models analyzed: ${modelInfo.length}`);
console.log('Detailed recon written to scratch/recon_summary.json');

