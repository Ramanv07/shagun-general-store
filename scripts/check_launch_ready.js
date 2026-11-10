import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SCAN_DIRS = ['pages', 'src/pages', 'dist'];
const ALLOWED_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.html'];
const PROHIBITED_PATTERNS = [
  { pattern: /\[FILL/i, name: '[FILL] placeholder' },
  { pattern: /Draft\s*—/i, name: 'Draft banner ("Draft —")' }
];

function scanDirectory(dirPath, violations) {
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath, violations);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split(/\r?\n/);

      lines.forEach((line, idx) => {
        for (const { pattern, name } of PROHIBITED_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: path.relative(rootDir, fullPath),
              line: idx + 1,
              name,
              snippet: line.trim().slice(0, 100)
            });
          }
        }
      });
    }
  }
}

function runCheck() {
  console.log('🔍 Running Launch Readiness Check (pre-deployment audit)...');
  const violations = [];

  for (const dir of SCAN_DIRS) {
    scanDirectory(path.join(rootDir, dir), violations);
  }

  if (violations.length > 0) {
    console.error('\n❌ LAUNCH READINESS CHECK FAILED: Found unresolved draft content or placeholders!\n');
    console.error(`Total Violations Found: ${violations.length}\n`);
    violations.forEach(v => {
      console.error(`  - ${v.file}:${v.line} [${v.name}] -> "${v.snippet}"`);
    });
    console.error('\nAction Required: Fill all [FILL: ...] business parameters and remove draft banners before public deployment.\n');
    process.exit(1);
  }

  console.log('✅ Launch readiness check PASSED: No [FILL] placeholders or draft banners found.');
  process.exit(0);
}

runCheck();
