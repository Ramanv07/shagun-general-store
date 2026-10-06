const sharp = require('sharp');
const path = require('path');

const stripPath = path.resolve(__dirname, 'category_strip_raw.png');
const outDir = path.resolve(__dirname, '../public/images');

async function findCircles() {
  const { data, info } = await sharp(stripPath).raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  // Let's sample a horizontal line across the middle of the circles
  // Circle centers are roughly at y = 30 relative to top=350 (i.e. y ~ 380 in original)
  // Let's find columns where pixel is not white/card background (#FFFFFF)
  console.log(`Strip: ${width}x${height}, channels: ${channels}`);

  // In the 1024x576 original image:
  // Card starts at left ~36, right ~988 (width ~952)
  // Inside the card, left arrow is at ~48, right arrow is at ~976
  // Available width between arrows: ~910px
  // 7 categories distributed evenly across ~910px:
  // spacing = 910 / 7 ≈ 130px center-to-center!
  // Let's test centers:
  // 1: x ≈ 112
  // 2: x ≈ 238
  // 3: x ≈ 362
  // 4: x ≈ 488
  // 5: x ≈ 614
  // 6: x ≈ 740
  // 7: x ≈ 866
  //
  // Circle diameter is about 58px to 62px in the 1024x576 image!
  // Top of circle in strip (top=350):
  // Let's measure exact Y where circle begins and ends
  
  // Let's extract individual test crops and inspect them
  const centers = [
    { name: 'cat-personal-care.jpg', cx: 110, cy: 30 },
    { name: 'cat-bangles.jpg', cx: 239, cy: 30 },
    { name: 'cat-toys.jpg', cx: 365, cy: 30 },
    { name: 'cat-household.jpg', cx: 492, cy: 30 },
    { name: 'cat-beauty.jpg', cx: 624, cy: 30 },
    { name: 'cat-lehenga.jpg', cx: 755, cy: 30 },
    { name: 'cat-parlour.jpg', cx: 885, cy: 30 },
  ];

  // Circle radius ~ 28px (diameter ~ 56px)
  const radius = 28;
  for (const c of centers) {
    const left = c.cx - radius;
    const top = c.cy - radius;
    const d = radius * 2;
    console.log(`Extracting ${c.name} at left: ${left}, top: ${top}, size: ${d}`);
    await sharp(stripPath)
      .extract({ left, top, width: d, height: d })
      .jpeg({ quality: 95 })
      .toFile(path.join(outDir, c.name));
  }
}

findCircles().catch(console.error);
