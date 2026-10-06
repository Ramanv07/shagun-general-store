const sharp = require('sharp');

async function checkSlice() {
  const { data, info } = await sharp('scratch/test_c1.png').raw().toBuffer({ resolveWithObject: true });
  // Find where the blue bottle is (it has high blue, low red)
  console.log(`info: ${info.width}x${info.height}`);
  for (let y = 10; y < info.height - 10; y += 10) {
    for (let x = 0; x < info.width; x += 5) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      // blue bottle has b > r + 30 or dark blue
      if (b > r + 20 || (r < 80 && g < 80 && b > 80)) {
        console.log(`Blue bottle found at x=${x} (relative to left=70 in strip, which is x=${70+x}): RGB(${r},${g},${b})`);
      }
    }
  }
}

checkSlice();
