const sharp = require('sharp');
const path = require('path');

const screenshotPath = path.resolve('C:/Users/raman/.gemini/antigravity-ide/brain/e190f276-df7f-46eb-91e6-b7c76a94134d/.user_uploaded/media_1791178001612.jpg');
const outDir = path.resolve(__dirname, '../public/images');

async function fixHeroImage() {
  // Start right below the header line at y=68
  // Hero vanity image is on the right side: left ~415 to 1024, top ~68 to 365
  await sharp(screenshotPath)
    .extract({ left: 410, top: 68, width: 614, height: 300 })
    .jpeg({ quality: 95 })
    .toFile(path.join(outDir, 'hero-vanity.jpg'));
  console.log('Fixed hero-vanity.jpg with complete vertical span!');
}

fixHeroImage().catch(console.error);
