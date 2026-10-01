// Landmark silhouettes for the 2D preview pictures (04 §7 table). Pure: each returns an SVG fragment string drawn
// in the 480 × 270 viewBox, from the horizon (y 190) up. Fixed shapes (no randomness) so every place reads the same.
// Keep the strongest feature off the center bottom, where the home sits (x ≈ 170–310, y > 150).

const H = 190;
const water = (y, color = '#4f86b0', top = '#7fb0d2') =>
  `<rect x="0" y="${y}" width="480" height="${H + 14 - y}" fill="${color}"/>`
  + `<rect x="0" y="${y}" width="480" height="3" fill="${top}" opacity="0.8"/>`
  + `<path d="M30 ${y + 8}h40M150 ${y + 11}h30M300 ${y + 7}h50M410 ${y + 12}h30" stroke="#d8ecf6" stroke-width="1.5" opacity="0.6"/>`;
const rects = (list, fill) => list.map(([x, w, ht]) => `<rect x="${x}" y="${H - ht}" width="${w}" height="${ht}" fill="${fill}"/>`).join('');
const pines = (x0, x1, base, size, color, step) => {
  let s = '';
  for (let x = x0, i = 0; x < x1; x += step, i++) {
    const t = size * (0.8 + ((i * 37) % 5) / 10);
    s += `<path d="M${x} ${base - t}L${x + t * 0.35} ${base}H${x - t * 0.35}Z" fill="${color}"/>`;
  }
  return s;
};

/** Landmark key → [drawing, short description for <desc>]. */
const DRAW = {
  'kilauea-plume': () => [
    `<path d="M-10 ${H}C80 168 170 150 290 148S420 168 490 ${H}Z" fill="#5a5560"/>`
    + `<path d="M270 150q20 -4 40 0" stroke="#3a3540" stroke-width="3" fill="none"/>`
    + `<path d="M288 148c-4 -14 6 -22 2 -36s10 -24 22 -30s30 -10 44 -22" stroke="#eee8e0" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.75"/>`
    + `<path d="M292 140c4 -14 14 -18 18 -32s22 -22 40 -34" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.6"/>`
    + `<ellipse cx="380" cy="70" rx="40" ry="9" fill="#e6e0d8" opacity="0.5"/>`,
    'Kīlauea, a low shield volcano with a thin steam plume'],
  maunakea: () => [
    `<path d="M-20 ${H}C80 150 170 96 220 92H270C320 96 400 150 500 ${H}Z" fill="#6a6f86"/>`
    + `<path d="M196 104C208 96 214 93 222 92H268C278 93 286 96 296 104C280 110 270 104 258 110C246 103 236 112 224 106C214 110 206 104 196 104Z" fill="#f4f6fa"/>`
    + `<path d="M232 92a5 5 0 0 1 10 0ZM250 92a4 4 0 0 1 8 0ZM262 92a3.5 3.5 0 0 1 7 0Z" fill="#ffffff" stroke="#c8ccd8" stroke-width="0.6"/>`,
    'Maunakea, a broad volcano with a snowy summit and observatory domes'],
  hualalai: () => [
    `<path d="M-20 ${H}L40 150C90 110 130 82 160 80C190 82 230 112 280 150L360 ${H}Z" fill="#5d5a52"/>`
    + `<path d="M148 84l12 -4l14 6l-6 6l-10 -3z" fill="#4a4740"/>`
    + `<path d="M60 150q40 -6 80 -2M190 120q30 6 60 22" stroke="#6f8a50" stroke-width="5" fill="none" opacity="0.6"/>`
    + water(176, '#2f78b8', '#6fb6e4'),
    'Hualālai, a volcano rising over the blue ocean'],
  'kohala-hills': () => [
    `<path d="M-10 ${H}V140C40 120 90 118 140 132S240 120 300 112S420 118 490 134V${H}Z" fill="#8fb37a"/>`
    + `<path d="M-10 ${H}V160C60 140 120 146 180 158S300 138 360 146S450 156 490 150V${H}Z" fill="#6f9e5c"/>`
    + `<ellipse cx="110" cy="128" rx="90" ry="9" fill="#ffffff" opacity="0.55"/>`
    + `<ellipse cx="360" cy="118" rx="110" ry="10" fill="#ffffff" opacity="0.5"/>`
    + `<ellipse cx="250" cy="150" rx="140" ry="7" fill="#ffffff" opacity="0.35"/>`,
    'the rolling green Kohala hills with mist'],
  leahi: () => [
    rects([[8, 10, 58], [22, 8, 46], [34, 12, 70], [50, 9, 52], [62, 11, 40]], '#c9c4bc')
    + `<path d="M70 ${H}L110 150L134 112L150 98L160 96L172 108L196 116L236 120L280 130L330 146L390 168L430 ${H}Z" fill="#8a7a5a"/>`
    + `<path d="M134 112L150 98L160 96L172 108L160 120Z" fill="#6f6248"/>`
    + `<path d="M150 98l-8 30M172 108l-6 26M210 118l-6 22M260 126l-4 20" stroke="#6f6248" stroke-width="2"/>`
    + water(178, '#2f86b8', '#78c4e6'),
    'Lēʻahi (Diamond Head), the crater ridge beside Waikīkī'],
  'needle-rainier': () => [
    `<path d="M200 ${H}L300 100C320 78 344 68 360 68C376 68 396 80 414 100L500 ${H}Z" fill="#a9b6cc"/>`
    + `<path d="M300 100C320 78 344 68 360 68C376 68 396 80 414 100C400 112 390 104 380 116C372 104 360 118 350 108C338 120 326 106 316 116C310 108 306 108 300 100Z" fill="#f6f8fc"/>`
    + rects([[20, 26, 34], [52, 18, 48], [180, 30, 30], [214, 16, 42]], '#7f8a9c')
    + `<path d="M118 ${H}L132 82H138L152 ${H}H146L135 92L124 ${H}Z" fill="#e8e6e2"/>`
    + `<path d="M108 80C118 70 152 70 162 80L156 86H114Z" fill="#f2efe8" stroke="#8a8a90" stroke-width="1"/>`
    + `<rect x="128" y="64" width="14" height="8" fill="#e8e6e2"/><path d="M135 64V40" stroke="#e8e6e2" stroke-width="2.5"/>`
    + `<path d="M124 134H146" stroke="#e8e6e2" stroke-width="3"/>`,
    'the Space Needle with snowy Mount Rainier behind'],
  'manhattan-skyline': () => {
    const blocks = [[0, 22, 50], [24, 16, 70], [42, 20, 58], [64, 14, 84], [80, 22, 66], [104, 18, 92], [124, 14, 60],
      [140, 20, 76], [184, 18, 70], [204, 22, 96], [228, 14, 64], [244, 20, 80], [266, 16, 58], [284, 22, 72],
      [330, 18, 62], [350, 20, 78], [372, 14, 54], [388, 24, 68], [414, 16, 58], [432, 22, 50], [456, 24, 44]];
    return [rects(blocks, '#5c6478')
      + `<path d="M160 ${H}V96H164V84H168V70H172V48H174V34H176V48H178V70H182V84H186V96V${H}Z" fill="#4a5266"/>`
      + `<path d="M302 ${H}L306 60H318L322 ${H}Z" fill="#7a8aa4"/><path d="M306 60L312 54L318 60Z" fill="#7a8aa4"/>`
      + `<path d="M312 54V30" stroke="#7a8aa4" stroke-width="2"/>`
      + water(176, '#3f5f80', '#6f8fb0'),
    'the Manhattan skyline across the river'];
  },
  'biscayne-skyline': () => [
    rects([[230, 18, 70], [252, 14, 92], [270, 20, 82], [294, 16, 104], [314, 22, 76], [340, 14, 88], [358, 20, 64],
      [382, 16, 56]], '#e6eef2')
    + `<path d="M252 ${H - 92}h14M294 ${H - 104}h16" stroke="#7fc8d0" stroke-width="3"/>`
    + `<path d="M270 ${H}V${H - 82}" stroke="#9fd6dc" stroke-width="20" opacity="0.45"/>`
    + `<path d="M314 ${H}V${H - 76}" stroke="#9fd6dc" stroke-width="22" opacity="0.45"/>`
    + water(170, '#2a9cc0', '#7fd8e8')
    + `<path d="M0 166Q120 156 220 170" stroke="#e8e2d8" stroke-width="3" fill="none"/>`
    + `<path d="M40 162v8M90 159v10M140 160v10M190 165v6" stroke="#e8e2d8" stroke-width="2"/>`,
    'Biscayne Bay with white and teal towers'],
  'water-tower': () => [
    rects([[20, 30, 10], [60, 24, 8], [380, 34, 10], [420, 28, 8]], '#9a9a8c')
    + `<path d="M342 ${H}L350 98M386 ${H}L378 98M350 98L386 ${H}M378 98L342 ${H}" stroke="#8c9aa6" stroke-width="2.5"/>`
    + `<path d="M342 ${H}V${H}M364 98V${H}" stroke="#8c9aa6" stroke-width="2.5"/>`
    + `<ellipse cx="364" cy="80" rx="34" ry="24" fill="#c8d4dc"/>`
    + `<path d="M330 80a34 24 0 0 0 68 0" fill="#b4c2cc"/>`
    + `<path d="M342 60Q364 46 386 60" fill="#b4c2cc"/><path d="M364 50v-8" stroke="#8c9aa6" stroke-width="2"/>`
    + `<text x="364" y="86" font-family="IBM Plex Sans, Arial, sans-serif" font-size="13" font-weight="700" fill="#4f6a80" text-anchor="middle">KATY</text>`,
    'a flat horizon with the town water tower'],
  'strip-mountains': () => [
    `<path d="M-10 ${H}L30 140L70 156L120 112L170 150L220 126L270 158L320 108L370 146L420 118L490 150V${H}Z" fill="#9a7a8a"/>`
    + `<path d="M260 ${H}L300 136L340 ${H}Z" fill="#3a3a44"/><path d="M300 136V100" stroke="#fff6c8" stroke-width="2" opacity="0.8"/>`
    + rects([[346, 20, 74], [372, 14, 90], [392, 26, 62], [424, 16, 82]], '#d8c8b0')
    + `<path d="M372 ${H - 90}h14M424 ${H - 82}h16" stroke="#e8a85a" stroke-width="3"/>`
    + `<path d="M186 ${H}L190 70H196L200 ${H}Z" fill="#e0dcd4"/><ellipse cx="193" cy="68" rx="12" ry="7" fill="#e0dcd4"/>`
    + `<path d="M193 61V36" stroke="#e0dcd4" stroke-width="2"/>`,
    'desert mountains behind the Las Vegas Strip towers'],
  'lookout-mountain': () => [
    `<path d="M-10 ${H}V120C40 112 120 108 200 108S320 110 360 114L400 ${H}Z" fill="#3f6a3e"/>`
    + `<path d="M360 114L372 120L380 150L400 ${H}H356Z" fill="#7a6a5a"/>`
    + pines(10, 360, 112, 10, '#2f5a30', 14)
    + `<path d="M-10 182C80 172 160 186 260 178S420 170 490 180V196H-10Z" fill="#4f88b0"/>`
    + `<path d="M40 182c40 -4 80 2 120 0" stroke="#bfe0f0" stroke-width="1.5" opacity="0.7"/>`,
    'a forested ridge over a river'],
  'harbour-lighthouse': () => [
    `<path d="M-10 ${H}V150C60 144 140 148 220 156S400 146 490 150V${H}Z" fill="#6f8a6a"/>`
    + ['#d2483c', '#f0b030', '#3f7ac0', '#5aa05a', '#e07a3a', '#8a5aa8', '#e8d24a', '#3aa0a0'].map((c, i) =>
      `<rect x="${250 + i * 26}" y="${132 + (i % 3) * 4}" width="20" height="${26 - (i % 3) * 4}" fill="${c}"/>`
      + `<path d="M${248 + i * 26} ${132 + (i % 3) * 4}L${260 + i * 26} ${122 + (i % 3) * 4}L${272 + i * 26} ${132 + (i % 3) * 4}Z" fill="#4a4a50"/>`).join('')
    + water(166, '#3a6f96', '#7fa8c8')
    + `<path d="M30 ${H}Q60 160 120 ${H}Z" fill="#6a6660"/>`
    + `<path d="M64 166L68 100H84L88 166Z" fill="#f6f2ea"/>`
    + `<path d="M66 140H86L87 152H65ZM67 114H85L86 126H66Z" fill="#d23c34"/>`
    + `<rect x="66" y="88" width="20" height="12" fill="#fff4b0" stroke="#3a3a3a" stroke-width="1.5"/>`
    + `<path d="M64 88L76 76L88 88Z" fill="#d23c34"/>`
    + `<path d="M86 94L140 82V106ZM66 94L20 84V104Z" fill="#fff8c8" opacity="0.45"/>`,
    'a harbour with a red and white lighthouse'],
  'pine-ridges': () => [
    `<path d="M-10 ${H}V110L60 96L130 114L210 90L290 112L370 92L490 112V${H}Z" fill="#8aa0b4"/>`
    + pines(-4, 490, 112, 12, '#7a92a8', 9)
    + `<path d="M-10 ${H}V140L90 126L180 146L280 128L380 146L490 134V${H}Z" fill="#567a6a"/>`
    + pines(0, 490, 142, 16, '#4a6e5e', 11)
    + `<path d="M-10 ${H}V168L120 158L240 172L360 160L490 168V${H}Z" fill="#2f5a44"/>`
    + pines(4, 490, 170, 22, '#26503a', 13),
    'layered ridges of pine forest'],
  'ore-dock': () => [
    `<path d="M-10 160C80 152 140 156 200 160V${H}H-10Z" fill="#6f8a6a"/>`
    + `<rect x="-10" y="160" width="500" height="44" fill="#3f6f9a"/><rect x="200" y="158" width="290" height="3" fill="#8fb4d0"/>`
    + `<path d="M210 168h40M340 170h60M420 174h40" stroke="#c8deec" stroke-width="1.5" opacity="0.6"/>`
    + `<rect x="230" y="124" width="250" height="16" fill="#5a4a44"/>`
    + `<rect x="230" y="118" width="250" height="6" fill="#6f5a50"/>`
    + Array.from({ length: 12 }, (_, i) => `<path d="M${236 + i * 20} 140v18h12v-18" fill="none" stroke="#4a3c38" stroke-width="3"/>`
      + `<path d="M${238 + i * 20} 140l-6 12" stroke="#7a6458" stroke-width="2"/>`).join('')
    + `<path d="M40 150h70l-6 8h-58z" fill="#7a3a34"/><rect x="92" y="142" width="10" height="8" fill="#e8e2d8"/>`,
    'Lake Superior with the long lakeside ore dock'],
  'gold-dome': () => [
    `<path d="M-10 ${H}V130C60 112 120 120 180 128S320 108 380 118S460 126 490 120V${H}Z" fill="#5f8a4c"/>`
    + pines(-4, 160, 130, 14, '#3f6a3a', 10) + pines(330, 490, 124, 14, '#3f6a3a', 10)
    + `<rect x="90" y="148" width="120" height="42" fill="#e8e2d6"/>`
    + `<path d="M122 148V138H178V148" fill="#efe9de"/><path d="M118 138L150 128L182 138Z" fill="#efe9de" stroke="#c8c0b0" stroke-width="1"/>`
    + `<path d="M126 152v34M138 152v34M150 152v34M162 152v34M174 152v34" stroke="#c8c0b0" stroke-width="3"/>`
    + `<rect x="136" y="114" width="28" height="14" fill="#efe9de"/>`
    + `<path d="M134 114C134 96 166 96 166 114Z" fill="#e0b030"/><path d="M140 108c4 -6 8 -8 14 -9" stroke="#fff0a0" stroke-width="2" fill="none"/>`
    + `<path d="M150 98V88" stroke="#a88a40" stroke-width="2"/><circle cx="150" cy="86" r="3" fill="#a88a40"/>`,
    'the gold-domed state capitol among green hills'],
  'allegheny-ridges': () => [
    `<path d="M-10 ${H}V104C60 92 140 96 220 106S380 92 490 100V${H}Z" fill="#a8bcd4"/>`
    + `<path d="M-10 ${H}V124C80 114 160 128 260 120S400 110 490 122V${H}Z" fill="#8aa2c2"/>`
    + `<path d="M-10 ${H}V146C100 134 200 150 300 140S420 134 490 144V${H}Z" fill="#6a86ac"/>`
    + `<path d="M-10 ${H}V166C110 156 220 170 330 160S440 158 490 164V${H}Z" fill="#4f6a8e"/>`,
    'layered blue Allegheny ridges'],
  'delta-crossroads': () => [
    Array.from({ length: 8 }, (_, i) => `<path d="M-10 ${174 + i * 2}H490" stroke="${i % 2 ? '#8a9a5a' : '#a8b070'}" stroke-width="2"/>`).join('')
    + `<path d="M110 ${H}V74" stroke="#5a6a7a" stroke-width="5"/>`
    + `<path d="M60 112H108V128H60L50 120Z" fill="#2f6ab0"/><path d="M112 134H160L170 142L160 150H112Z" fill="#2f6ab0"/>`
    + `<path d="M58 120H100M118 142H158" stroke="#ffffff" stroke-width="2.5"/>`
    + [[86, 70, -30], [110, 64, 0], [134, 70, 30]].map(([x, y, r]) =>
      `<g transform="rotate(${r} ${x} ${y + 20})"><path d="M${x} ${y - 26}V${y + 4}" stroke="#2f6ab0" stroke-width="3"/>`
      + `<rect x="${x - 4}" y="${y - 30}" width="8" height="6" rx="1" fill="#2f6ab0"/>`
      + `<path d="M${x} ${y}c-10 0 -12 8 -8 13c-6 4 -4 14 8 14s14 -10 8 -14c4 -5 2 -13 -8 -13z" fill="#2f6ab0"/>`
      + `<circle cx="${x}" cy="${y + 13}" r="2.5" fill="#d8e4f0"/></g>`).join(''),
    'flat Delta fields with the crossroads signpost and its blue guitars'],
  'mule-mountains': () => [
    `<path d="M-10 ${H}V140L30 118L60 128L100 92L130 106L160 84L200 116L240 102L280 124L330 96L370 112L410 90L450 108L490 100V${H}Z" fill="#a8785a"/>`
    + `<path d="M100 92L118 112L104 120ZM160 84L176 106L160 112ZM330 96L348 116L334 122ZM410 90L428 110L414 116Z" fill="#8a5e46"/>`
    + `<path d="M-10 ${H}V160L60 148L140 162L220 146L300 160L380 144L490 158V${H}Z" fill="#b98a66"/>`
    + `<text x="150" y="112" font-family="Arial, sans-serif" font-size="18" font-weight="900" fill="#f6f2ea">B</text>`
    + ['#e05a4a', '#4a9ad0', '#f0c040', '#5ab07a', '#e08a3a'].map((c, i) =>
      `<rect x="${330 + i * 22}" y="${132 + (i % 2) * 8}" width="12" height="9" fill="${c}"/>`).join(''),
    'rocky desert hills with the big white "B" and hillside houses'],
  'sandhills-windmill': () => [
    `<path d="M-10 ${H}V156C60 142 120 144 180 156S300 144 360 150S450 160 490 152V${H}Z" fill="#c8bc84"/>`
    + `<path d="M-10 ${H}V170C80 160 160 166 240 172S400 160 490 168V${H}Z" fill="#b4ac6e"/>`
    + `<path d="M366 ${H}L378 92H386L398 ${H}M370 160H394M374 128H390M368 ${H}L390 128M396 ${H}L374 128" stroke="#6a6a6a" stroke-width="2.5" fill="none"/>`
    + Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 * Math.PI) / 180;
      return `<path d="M382 86L${(382 + Math.cos(a) * 26).toFixed(1)} ${(86 + Math.sin(a) * 26).toFixed(1)}" stroke="#7a7a7a" stroke-width="4"/>`;
    }).join('')
    + `<circle cx="382" cy="86" r="26" fill="none" stroke="#6a6a6a" stroke-width="2"/><circle cx="382" cy="86" r="4" fill="#5a5a5a"/>`
    + `<path d="M386 86H420L428 78V96L420 90H386Z" fill="#8a8a8a"/>`,
    'grassy Sandhills dunes with a ranch windmill'],
  'kachemak-spit': () => [
    `<path d="M-10 160L40 104L80 120L130 80L180 112L230 74L290 110L340 84L390 118L440 92L490 112V164H-10Z" fill="#7a8aa6"/>`
    + `<path d="M130 80L120 100L136 96L142 122L150 96ZM230 74L218 98L234 92L240 128L248 92ZM340 84L330 104L344 100L350 126ZM440 92L432 108L446 106Z" fill="#f4f8fc"/>`
    + `<path d="M40 104L32 116L44 114ZM290 110L282 120L296 118Z" fill="#f4f8fc"/>`
    + `<rect x="-10" y="160" width="500" height="44" fill="#4a7a9e"/><rect x="-10" y="160" width="500" height="3" fill="#9ac0d8"/>`
    + `<path d="M-10 186C80 180 200 178 330 174C350 173 364 174 368 177C340 182 200 186 -10 192Z" fill="#c8b890"/>`
    + `<rect x="300" y="168" width="8" height="6" fill="#d24a3c"/><rect x="316" y="167" width="7" height="7" fill="#3f7ac0"/>`
    + `<rect x="332" y="168" width="8" height="6" fill="#e8c040"/>`,
    'Kachemak Bay with glaciers and the long Homer Spit'],
};

/** Every landmark key this module can draw. */
export const LANDMARK_KEYS = Object.keys(DRAW);

/** SVG fragment for a landmark key ('' for an unknown key). */
export function landmark(key) {
  const d = DRAW[key];
  return d ? d()[0] : '';
}

/** Short plain-text description of a landmark for <desc> (empty for an unknown key). */
export function landmarkDescription(key) {
  const d = DRAW[key];
  return d ? d()[1] : '';
}
