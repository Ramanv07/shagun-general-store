const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const screenshotPath = path.resolve('C:/Users/raman/.gemini/antigravity-ide/brain/e190f276-df7f-46eb-91e6-b7c76a94134d/.user_uploaded/media_1791178001612.jpg');
const outDir = path.resolve(__dirname, '../public/images');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function extract() {
  const image = sharp(screenshotPath);
  const metadata = await image.metadata();
  console.log(`Original: ${metadata.width}x${metadata.height}`);

  // 1. Hero vanity image
  // Right side of hero section: x: 420, y: 76, width: 604, height: 285
  await image
    .clone()
    .extract({ left: 410, top: 74, width: 614, height: 288 })
    .jpeg({ quality: 90 })
    .toFile(path.join(outDir, 'hero-vanity.jpg'));
  console.log('Saved hero-vanity.jpg');

  // 2. Categories (7 circles)
  // Measured across 1024 width:
  // Card starts around left: 35, right: 990 (width ~955)
  // Circle Y is around top: 370, height: ~60-70
  const categories = [
    { name: 'cat-personal-care.jpg', left: 74, top: 372, width: 66, height: 66 },
    { name: 'cat-bangles.jpg', left: 202, top: 372, width: 66, height: 66 },
    { name: 'cat-toys.jpg', left: 326, top: 372, width: 66, height: 66 },
    { name: 'cat-household.jpg', left: 450, top: 372, width: 66, height: 66 },
    { name: 'cat-beauty.jpg', left: 574, top: 372, width: 66, height: 66 },
    { name: 'cat-lehenga.jpg', left: 700, top: 372, width: 66, height: 66 },
    { name: 'cat-parlour.jpg', left: 846, top: 372, width: 66, height: 66 },
  ];

  for (const cat of categories) {
    await image
      .clone()
      .extract({ left: cat.left, top: cat.top, width: cat.width, height: cat.height })
      .jpeg({ quality: 90 })
      .toFile(path.join(outDir, cat.name));
    console.log(`Saved ${cat.name}`);
  }

  // 3. Three Promo cards
  // y: ~470, height: ~95
  // Card 1 right image: left: 195, top: 472, width: 148, height: 90
  await image
    .clone()
    .extract({ left: 188, top: 470, width: 156, height: 92 })
    .jpeg({ quality: 90 })
    .toFile(path.join(outDir, 'promo-essentials.jpg'));
  console.log('Saved promo-essentials.jpg');

  // Card 2 right image: left: 508, top: 470, width: 156, height: 92
  await image
    .clone()
    .extract({ left: 505, top: 470, width: 160, height: 92 })
    .jpeg({ quality: 90 })
    .toFile(path.join(outDir, 'promo-lehenga.jpg'));
  console.log('Saved promo-lehenga.jpg');

  // Card 3 right image: left: 818, top: 470, width: 165, height: 92
  await image
    .clone()
    .extract({ left: 815, top: 470, width: 170, height: 92 })
    .jpeg({ quality: 90 })
    .toFile(path.join(outDir, 'promo-parlour.jpg'));
  console.log('Saved promo-parlour.jpg');
}

extract().catch(console.error);
