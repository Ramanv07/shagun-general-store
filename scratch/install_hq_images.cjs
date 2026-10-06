const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const brainDir = path.resolve('C:/Users/raman/.gemini/antigravity-ide/brain/e190f276-df7f-46eb-91e6-b7c76a94134d');
const outDir = path.resolve(__dirname, '../public/images');

const imageMap = [
  { src: 'cat_personal_care_1791182243024.jpg', dest: 'cat-personal-care.jpg' },
  { src: 'cat_bangles_1791195847480.jpg', dest: 'cat-bangles.jpg' },
  { src: 'cat_toys_1791195970800.jpg', dest: 'cat-toys.jpg' },
  { src: 'cat_household_1791196026938.jpg', dest: 'cat-household.jpg' },
  { src: 'cat_beauty_1791196139755.jpg', dest: 'cat-beauty.jpg' },
  { src: 'cat_lehenga_1791196209008.jpg', dest: 'cat-lehenga.jpg' },
  { src: 'cat_parlour_1791196333713.jpg', dest: 'cat-parlour.jpg' }
];

async function updateCategoryImages() {
  for (const item of imageMap) {
    const srcPath = path.join(brainDir, item.src);
    const destPath = path.join(outDir, item.dest);
    if (fs.existsSync(srcPath)) {
      await sharp(srcPath)
        .resize(400, 400, { fit: 'cover' })
        .jpeg({ quality: 92 })
        .toFile(destPath);
      console.log(`Updated ${item.dest} from ${item.src}`);
    } else {
      console.error(`Missing source image: ${srcPath}`);
    }
  }
  console.log('All 7 category images updated with high quality originals!');
}

updateCategoryImages().catch(console.error);
