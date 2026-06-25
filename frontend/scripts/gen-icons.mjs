/**
 * Generates all PWA icon PNGs from SVG source using sharp.
 * Run once: node scripts/gen-icons.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');

// ── SVG source: vibrant wallet icon, blue→purple gradient on #0B1424 navy ────
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3B6CFF"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <linearGradient id="g2" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#5B8FFF" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#C4B5FD" stop-opacity="0.6"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="54%">
      <stop offset="0%" stop-color="#3B6CFF" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background: #0B1424 navy with rounded corners -->
  <rect width="512" height="512" rx="112" fill="#0B1424"/>
  <!-- Blue ambient glow in upper half -->
  <ellipse cx="256" cy="196" rx="230" ry="190" fill="url(#glow)"/>

  <!-- ── Wallet body ──────────────────────────────────────────────────── -->
  <!-- Shadow layer (dark, offset down) -->
  <rect x="76" y="178" width="368" height="236" rx="38" fill="#0B1424" opacity="0.55"/>
  <!-- Main gradient fill -->
  <rect x="72" y="168" width="368" height="236" rx="38" fill="url(#g1)"/>
  <!-- Top highlight sheen -->
  <rect x="72" y="168" width="368" height="82" rx="38" fill="url(#g2)"/>
  <rect x="72" y="218" width="368" height="32" fill="rgba(255,255,255,0.07)"/>

  <!-- ── Coin pocket (right) ──────────────────────────────────────────── -->
  <rect x="272" y="248" width="134" height="116" rx="26" fill="rgba(11,20,36,0.50)"/>
  <!-- Coin rings -->
  <circle cx="339" cy="306" r="33" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
  <circle cx="339" cy="306" r="20" fill="rgba(255,255,255,0.14)"/>
  <!-- Small coin dot -->
  <circle cx="339" cy="306" r="7" fill="rgba(255,255,255,0.28)"/>

  <!-- ── Card lines (left) ────────────────────────────────────────────── -->
  <rect x="104" y="294" width="134" height="13" rx="6.5" fill="rgba(255,255,255,0.40)"/>
  <rect x="104" y="326" width="90" height="13" rx="6.5" fill="rgba(255,255,255,0.24)"/>

  <!-- ── Chip (top-left of pocket area) ──────────────────────────────── -->
  <rect x="104" y="358" width="54" height="36" rx="8" fill="rgba(255,255,255,0.18)"/>
  <line x1="126" y1="358" x2="126" y2="394" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
  <line x1="104" y1="376" x2="158" y2="376" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
</svg>`;

// ── Maskable variant: full-bleed bg, content in 76% safe zone ────────────────
const MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3B6CFF"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <linearGradient id="g2" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#5B8FFF" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#C4B5FD" stop-opacity="0.6"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="54%">
      <stop offset="0%" stop-color="#3B6CFF" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Full-bleed background: OS can mask to any shape (circle, squircle, etc.) -->
  <rect width="512" height="512" fill="#0B1424"/>
  <ellipse cx="256" cy="196" rx="230" ry="190" fill="url(#glow)"/>

  <!-- Wallet at 76% scale from centre — keeps content well inside safe zone -->
  <g transform="translate(256 256) scale(0.76) translate(-256 -256)">
    <rect x="76" y="178" width="368" height="236" rx="38" fill="#0B1424" opacity="0.55"/>
    <rect x="72" y="168" width="368" height="236" rx="38" fill="url(#g1)"/>
    <rect x="72" y="168" width="368" height="82" rx="38" fill="url(#g2)"/>
    <rect x="72" y="218" width="368" height="32" fill="rgba(255,255,255,0.07)"/>

    <rect x="272" y="248" width="134" height="116" rx="26" fill="rgba(11,20,36,0.50)"/>
    <circle cx="339" cy="306" r="33" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
    <circle cx="339" cy="306" r="20" fill="rgba(255,255,255,0.14)"/>
    <circle cx="339" cy="306" r="7" fill="rgba(255,255,255,0.28)"/>

    <rect x="104" y="294" width="134" height="13" rx="6.5" fill="rgba(255,255,255,0.40)"/>
    <rect x="104" y="326" width="90" height="13" rx="6.5" fill="rgba(255,255,255,0.24)"/>

    <rect x="104" y="358" width="54" height="36" rx="8" fill="rgba(255,255,255,0.18)"/>
    <line x1="126" y1="358" x2="126" y2="394" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
    <line x1="104" y1="376" x2="158" y2="376" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
  </g>
</svg>`;

await mkdir(outDir, { recursive: true });

const reg  = Buffer.from(ICON_SVG);
const mask = Buffer.from(MASKABLE_SVG);

const icons = [
  { buf: reg,  size: 192, name: 'icon-192.png' },
  { buf: reg,  size: 512, name: 'icon-512.png' },
  { buf: mask, size: 512, name: 'icon-maskable-512.png' },
  { buf: reg,  size: 180, name: 'apple-touch-icon.png' },
];

for (const { buf, size, name } of icons) {
  const dest = join(outDir, name);
  await sharp(buf).resize(size, size).png({ compressionLevel: 9 }).toFile(dest);
  console.log(`  ✓  ${name}  (${size}×${size})`);
}

console.log('\n✅  PWA icons written to public/icons/');
