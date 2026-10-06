const sharp = require('sharp');
const path = require('path');

const screenshotPath = path.resolve('C:/Users/raman/.gemini/antigravity-ide/brain/e190f276-df7f-46eb-91e6-b7c76a94134d/.user_uploaded/media_1791178001612.jpg');

async function testCircles() {
  const metadata = await sharp(screenshotPath).metadata();
  console.log(`Dimensions: ${metadata.width}x${metadata.height}`);
  
  // Let's extract a strip containing all 7 circles to find exact coordinates
  // y between 360 and 450
  await sharp(screenshotPath)
    .extract({ left: 30, top: 350, width: 960, height: 110 })
    .toFile(path.resolve(__dirname, 'category_strip_raw.png'));
  console.log('Saved category_strip_raw.png');
}

testCircles().catch(console.error);
