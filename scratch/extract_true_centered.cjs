const sharp = require('sharp');
const path = require('path');

const screenshotPath = path.resolve('C:/Users/raman/.gemini/antigravity-ide/brain/e190f276-df7f-46eb-91e6-b7c76a94134d/.user_uploaded/media_1791178001612.jpg');
const outDir = path.resolve(__dirname, '../public/images');

async function extractTrueCenteredCircles() {
  const circles = [
    { name: 'cat-personal-care.jpg', cx: 110, cy: 398 },
    { name: 'cat-bangles.jpg', cx: 239, cy: 398 },
    { name: 'cat-toys.jpg', cx: 365, cy: 398 },
    { name: 'cat-household.jpg', cx: 492, cy: 398 },
    { name: 'cat-beauty.jpg', cx: 624, cy: 398 },
    { name: 'cat-lehenga.jpg', cx: 755, cy: 398 },
    { name: 'cat-parlour.jpg', cx: 885, cy: 398 },
  ];

  const size = 60;
  const half = 30;

  for (const c of circles) {
    const left = c.cx - half;
    const top = c.cy - half;

    console.log(`Extracting ${c.name} at left=${left}, top=${top}, size=${size}x${size}`);
    await sharp(screenshotPath)
      .extract({ left, top, width: size, height: size })
      .resize(240, 240, { fit: 'cover' })
      .jpeg({ quality: 98 })
      .toFile(path.join(outDir, c.name));
  }

  console.log('True centered category circles successfully generated!');
}

extractTrueCenteredCircles().catch(console.error);
