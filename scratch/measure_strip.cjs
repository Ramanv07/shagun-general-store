const sharp = require('sharp');
const path = require('path');

const stripPath = path.resolve(__dirname, 'category_strip_raw.png');

async function measure() {
  const { data, info } = await sharp(stripPath).raw().toBuffer({ resolveWithObject: true });
  // Find y bounds where pixels are distinctly not white (R, G, B all < 250)
  let minY = 999, maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 50; x < info.width - 50; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      // Check if it's an image pixel (not white background, not text at the bottom)
      if (y < 70 && (r < 245 || g < 245 || b < 245)) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(`Circles vertical range in strip: y=${minY} to y=${maxY}, height=${maxY - minY + 1}`);

  // Now find the horizontal center of each of the 7 circles
  // at y = (minY + maxY) / 2
  const midY = Math.round((minY + maxY) / 2);
  console.log(`Scanning horizontal line at y=${midY}:`);

  const segments = [];
  let inCircle = false;
  let startX = 0;
  for (let x = 20; x < info.width - 20; x++) {
    const idx = (midY * info.width + x) * info.channels;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    const isCirclePixel = (r < 248 || g < 248 || b < 248);

    if (isCirclePixel && !inCircle) {
      inCircle = true;
      startX = x;
    } else if (!isCirclePixel && inCircle) {
      inCircle = false;
      const width = x - startX;
      if (width > 20) { // filter out arrow buttons or artifacts
        segments.push({ startX, endX: x, width, cx: Math.round((startX + x) / 2) });
      }
    }
  }

  console.log('Found circle segments:', segments);
}

measure().catch(console.error);
