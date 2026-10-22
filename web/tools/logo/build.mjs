// Writes public/logo.svg: the original Kubotz logo (logo_SD.png, gh-pages 2015) as vectors.
// paths.json holds the six letters: Okuba Cloud glyphs cut from the 150 px font atlas
// (public/fonts/okubacloud*.png), traced with potrace, each stretched onto its letter in
// the original by a pixel fit. The circuit traces and the glow were measured off it.
// Run from web/: node tools/logo/build.mjs
import fs from 'fs';
const HERE = new URL('.', import.meta.url).pathname;
const P = JSON.parse(fs.readFileSync(HERE + 'paths.json'));
const glow = { spread: 0.6, blur: 1.8, slope: 2.6, wide: 4.5, wslope: 1.3 };
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 298 134" width="298" height="134">
  <!-- The original Kubotz logo (logo_SD.png, gh-pages 2015) as vectors: Okuba Cloud letters
       traced from the 150 px font atlas and placed letter by letter on the original, the
       circuit traces measured off it, one #0066CC outer glow around everything white. -->
  <defs>
    <filter id="glow" x="-10%" y="-20%" width="120%" height="140%" color-interpolation-filters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius="${glow.spread}" result="spread"/>
      <feGaussianBlur in="spread" stdDeviation="${glow.blur}" result="soft"/>
      <feComponentTransfer in="soft" result="edge"><feFuncA type="linear" slope="${glow.slope}"/></feComponentTransfer>
      <feGaussianBlur in="spread" stdDeviation="${glow.wide}" result="far"/>
      <feComponentTransfer in="far" result="haze"><feFuncA type="linear" slope="${glow.wslope}"/></feComponentTransfer>
      <feMerge result="halo"><feMergeNode in="haze"/><feMergeNode in="edge"/></feMerge>
      <feFlood flood-color="#0066cc"/>
      <feComposite in2="halo" operator="in" result="blue"/>
      <feMerge><feMergeNode in="blue"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#glow)">
    <g id="circuit" fill="none" stroke="#fff" stroke-width="2.8" stroke-linejoin="miter">
      <path d="M24.5 30 L11.2 39.5 L11.2 101 L26 116.8 L103.6 116.8"/>
      <path d="M133.2 79 L133.2 98 L144 105.6 L145.5 112"/>
      <path d="M188.7 117.3 L266 117.3 L287.6 96 L287.6 23.8 L273.6 10.5 L188 10.5 L180.4 18 L180.4 37"/>
      <circle cx="109.5" cy="116.6" r="5.1"/>
      <circle cx="145.6" cy="118.4" r="5.1"/>
      <circle cx="182.6" cy="117.3" r="5.1"/>
    </g>
    <g id="letters" fill="#fff" fill-rule="evenodd">
${Object.entries(P).map(([k, d]) => `      <path id="${k}" d="${d}"/>`).join('\n')}
    </g>
  </g>
</svg>
`;
fs.writeFileSync(HERE + '../../public/logo.svg', svg);
