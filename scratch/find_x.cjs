const sharp = require('sharp');

async function findHorizontalCenters() {
  const { data, info } = await sharp('scratch/category_strip_raw.png').raw().toBuffer({ resolveWithObject: true });
  const y = 48; // mid-circle in strip
  console.log(`Scanning at strip y=${y} (original y=${350+y}):`);

  for (let x = 30; x < info.width - 30; x++) {
    const idx = (y * info.width + x) * info.channels;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    // Card background inside card at this y is roughly RGB(255, 255, 255)
    // When inside a circle, r,g,b are different
  }

  // Let's extract 7 slices of 60x60 around each estimated center and output their average colors and bounding boxes
  const estimatedX = [110, 237, 363, 490, 622, 752, 880];
  for (let i = 0; i < estimatedX.length; i++) {
    const cx = estimatedX[i];
    // Find min and max x around cx where pixel is in circle
    let minX = cx, maxX = cx;
    for (let x = cx - 35; x <= cx + 35; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      // Inside circle pixel vs outside white
      if (r < 248 || g < 248 || b < 248) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    console.log(`Circle ${i+1}: minX=${minX}, maxX=${maxX}, width=${maxX - minX + 1}, real_cx=${(minX + maxX)/2}`);
  }
}

findHorizontalCenters();
