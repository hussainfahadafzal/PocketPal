/**
 * Generates all PWA icon PNGs from frontend/public/logo.png using sharp.
 * Run: npm run gen-icons   (from the frontend/ directory)
 */
import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src    = join(__dirname, '..', 'public', 'logo.png');
const outDir = join(__dirname, '..', 'public');

const BG = '#0B0B14';

await mkdir(outDir, { recursive: true });

// ── Standard icons: flatten logo (fill any alpha with BG), resize ──────────
const standard = [
  { size: 512, name: 'icon-512.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 48,  name: 'favicon.png' },
];

for (const { size, name } of standard) {
  await sharp(src)
    .flatten({ background: BG })
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, name));
  console.log(`  ✓  ${name}  (${size}×${size})`);
}

// ── Maskable: logo at 70% centred on full-bleed #0B0B14 canvas ────────────
// Android's squircle/circle crop uses the inner 80% safe zone; keeping
// the logo at 70% guarantees the P mark is never clipped on any shape.
const LOGO_SIZE = Math.round(512 * 0.70);          // 358 px
const OFFSET    = Math.floor((512 - LOGO_SIZE) / 2); // 77 px padding each side

const logoBuffer = await sharp(src)
  .flatten({ background: BG })
  .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'cover', position: 'centre' })
  .png()
  .toBuffer();

await sharp({
  create: { width: 512, height: 512, channels: 3, background: BG },
})
  .composite([{ input: logoBuffer, top: OFFSET, left: OFFSET }])
  .png({ compressionLevel: 9 })
  .toFile(join(outDir, 'icon-maskable-512.png'));

console.log(`  ✓  icon-maskable-512.png  (512×512 maskable, logo at 70%)`);
console.log('\n✅  Icons written to frontend/public/');
