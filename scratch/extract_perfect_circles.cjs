const sharp = require('sharp');
const path = require('path');

const screenshotPath = path.resolve('C:/Users/raman/.gemini/antigravity-ide/brain/e190f276-df7f-46eb-91e6-b7c76a94134d/.user_uploaded/media_1791178001612.jpg');
const outDir = path.resolve(__dirname, '../public/images');

async function extractPerfectCircles() {
  // Original screenshot coordinate centers:
  // cy = 350 + 48 = 398
  const circles = [
    { name: 'cat-personal-care.jpg', cx: 140, cy: 398 },
    { name: 'cat-bangles.jpg', cx: 267, cy: 398 },
    { name: 'cat-toys.jpg', cx: 393, cy: 398 },
    { name: 'cat-household.jpg', cx: 520, cy: 398 },
    { name: 'cat-beauty.jpg', cx: 652, cy: 398 },
    { name: 'cat-lehenga.jpg', cx: 782, cy: 398 },
    { name: 'cat-parlour.jpg', cx: 910, cy: 398 },
  ];

  const size = 68; // diameter of the circle inside
  const half = 34;

  for (const c of circles) {
    const left = c.cx - half;
    const top = c.cy - half;
    console.log(`Extracting ${c.name}: left=${left}, top=${top}, size=${size}x${size}`);

    await sharp(screenshotPath)
      .extract({ left, top, width: size, height: size })
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 98 })
      .toFile(path.join(outDir, c.name));
  }

  console.log('Successfully saved all 7 clean category circle images!');
}

extractPerfectCircles().catch(console.error);
