const sharp = require('sharp');
const path = require('path');

const screenshotPath = path.resolve('C:/Users/raman/.gemini/antigravity-ide/brain/e190f276-df7f-46eb-91e6-b7c76a94134d/.user_uploaded/media_1791178001612.jpg');
const outDir = path.resolve(__dirname, '../public/images');

async function extractAccurateCircles() {
  const centers = [
    { name: 'cat-personal-care.jpg', cx: 88, cy: 386 },
    { name: 'cat-bangles.jpg', cx: 217, cy: 386 },
    { name: 'cat-toys.jpg', cx: 343, cy: 386 },
    { name: 'cat-household.jpg', cx: 472, cy: 386 },
    { name: 'cat-beauty.jpg', cx: 600, cy: 386 },
    { name: 'cat-lehenga.jpg', cx: 730, cy: 386 },
    { name: 'cat-parlour.jpg', cx: 868, cy: 386 },
  ];

  const size = 62;
  const half = Math.round(size / 2);

  for (const c of centers) {
    const left = c.cx - half;
    const top = c.cy - half;
    console.log(`Extracting ${c.name} at left=${left}, top=${top}, size=${size}x${size}`);

    await sharp(screenshotPath)
      .extract({ left, top, width: size, height: size })
      .resize(180, 180, { fit: 'cover' }) // upscale cleanly with lanczos3
      .jpeg({ quality: 95 })
      .toFile(path.join(outDir, c.name));
  }
  console.log('All 7 category circles extracted and resized successfully!');
}

extractAccurateCircles().catch(console.error);
