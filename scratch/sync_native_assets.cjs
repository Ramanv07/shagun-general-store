const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcImagesDir = path.join(rootDir, 'public/images');
const destImagesDir = path.join(rootDir, 'shagun-native/assets/images');

const srcDataDir = path.join(rootDir, 'data');
const destDataDir = path.join(rootDir, 'shagun-native/data');

if (!fs.existsSync(destImagesDir)) {
  fs.mkdirSync(destImagesDir, { recursive: true });
}

if (!fs.existsSync(destDataDir)) {
  fs.mkdirSync(destDataDir, { recursive: true });
}

// Copy images
const images = fs.readdirSync(srcImagesDir);
for (const file of images) {
  if (file.endsWith('.jpg') || file.endsWith('.png')) {
    fs.copyFileSync(path.join(srcImagesDir, file), path.join(destImagesDir, file));
    console.log(`Copied image: ${file}`);
  }
}

// Copy categories.json
fs.copyFileSync(path.join(srcDataDir, 'categories.json'), path.join(destDataDir, 'categories.json'));
console.log('Copied categories.json');
