const sharp = require('sharp');
const path = require('path');

const screenshotPath = path.resolve('C:/Users/raman/.gemini/antigravity-ide/brain/e190f276-df7f-46eb-91e6-b7c76a94134d/.user_uploaded/media_1791178001612.jpg');
const outDir = path.resolve(__dirname, '../public/images');

async function extractCleanInnerCircles() {
  const circles = [
    { name: 'cat-personal-care.jpg', cx: 140, cy: 398 },
    { name: 'cat-bangles.jpg', cx: 267, cy: 398 },
    { name: 'cat-toys.jpg', cx: 393, cy: 398 },
    { name: 'cat-household.jpg', cx: 520, cy: 398 },
    { name: 'cat-beauty.jpg', cx: 652, cy: 398 },
    { name: 'cat-lehenga.jpg', cx: 782, cy: 398 },
    { name: 'cat-parlour.jpg', cx: 910, cy: 398 },
  ];

  // Using size 56 so the crop is strictly INSIDE the circular photo
  // No outer card border, no white corner cuts, no brown arcs
  const size = 56;
  const half = 28;

  for (const c of circles) {
    const left = c.cx - half;
    const top = c.cy - half;

    await sharp(screenshotPath)
      .extract({ left, top, width: size, height: size })
      .resize(240, 240, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
      .jpeg({ quality: 98 })
      .toFile(path.join(outDir, c.name));
  }

  console.log('Clean inner circle photos generated successfully!');
}

extractCleanInnerCircles().catch(console.error);
