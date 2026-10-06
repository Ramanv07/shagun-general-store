const sharp = require('sharp');
const path = require('path');

async function analyzeCircles() {
  const { data, info } = await sharp('scratch/category_strip_raw.png').raw().toBuffer({ resolveWithObject: true });
  
  // Let's examine column x=110 (near personal care)
  // Let's find for each x around 110 what y range has non-white colors
  for (let y = 0; y < info.height; y++) {
    const idx = (y * info.width + 110) * info.channels;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    // if not pure white/cream (card background is 255 or 254)
    if (r < 240 || g < 240 || b < 240) {
      console.log(`y=${y} (orig y=${350+y}): RGB(${r},${g},${b})`);
    }
  }
}

analyzeCircles();
