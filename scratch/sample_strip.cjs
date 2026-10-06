const sharp = require('sharp');
const path = require('path');

const stripPath = path.resolve(__dirname, 'category_strip_raw.png');

async function debugColors() {
  const { data, info } = await sharp(stripPath).raw().toBuffer({ resolveWithObject: true });
  // Let's log RGB every 20px across y=35
  for (let x = 30; x < info.width - 30; x += 15) {
    const idx = (35 * info.width + x) * info.channels;
    console.log(`x=${x}: RGB(${data[idx]}, ${data[idx+1]}, ${data[idx+2]})`);
  }
}

debugColors().catch(console.error);
