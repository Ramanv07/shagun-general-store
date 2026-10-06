const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const brainDir = path.resolve('C:/Users/raman/.gemini/antigravity-ide/brain/e190f276-df7f-46eb-91e6-b7c76a94134d');
const outDir = path.resolve(__dirname, '../public/images');

const promoMap = [
  { src: 'promo_essentials_1791197148038.jpg', dest: 'promo-essentials.jpg' },
  { src: 'promo_lehenga_1791197293588.jpg', dest: 'promo-lehenga.jpg' },
  { src: 'promo_parlour_1791197477727.jpg', dest: 'promo-parlour.jpg' }
];

async function updatePromoImages() {
  for (const item of promoMap) {
    const srcPath = path.join(brainDir, item.src);
    const destPath = path.join(outDir, item.dest);
    if (fs.existsSync(srcPath)) {
      await sharp(srcPath)
        .resize(600, 450, { fit: 'cover' })
        .jpeg({ quality: 92 })
        .toFile(destPath);
      console.log(`Updated ${item.dest} from ${item.src}`);
    } else {
      console.error(`Missing source image: ${srcPath}`);
    }
  }
  console.log('All 3 promo images installed successfully!');
}

updatePromoImages().catch(console.error);
