// Rysunki sprzętu do filmu „Pompa w HA · montaż” (12.11.2026). Czysty SVG jako tekst, bez zdjęć.
// Wzór: zdjęcia referencyjne Rafała (tył płytki KJRH-120H, ekran Comfort Control, moduł ESP32 z RS-485 na szynę DIN)
// i zdjęcia producentów (tylko jako wzór kształtu). Nazw modeli modułu i bramki nie piszemy.
// Każdy rysunek ma własny układ współrzędnych (opisany przy funkcji); elementy ruchome mają data-r / data-b / data-e.

const R = {};

// ── prosty, powtarzalny los (te same „drobne elementy” na płytce w każdej klatce)
R.los = (ziarno) => () => { ziarno |= 0; ziarno = (ziarno + 0x6D2B79F5) | 0; let t = Math.imul(ziarno ^ (ziarno >>> 15), 1 | ziarno);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

R.defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
 <linearGradient id="gCtrl" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#f1f2ef"/><stop offset="1" stop-color="#c8cbc5"/></linearGradient>
 <linearGradient id="gLcd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f9fc"/><stop offset="1" stop-color="#dbe5ef"/></linearGradient>
 <pattern id="pDots" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="5.5" cy="5.5" r="1.3" fill="rgba(55,58,62,.26)"/></pattern>
 <linearGradient id="gPcb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#27944f"/><stop offset="1" stop-color="#196b3a"/></linearGradient>
 <linearGradient id="gObud" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9dbd6"/><stop offset="1" stop-color="#b3b6b0"/></linearGradient>
 <linearGradient id="gBialy" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".72" stop-color="#eef0f1"/><stop offset="1" stop-color="#d3d8db"/></linearGradient>
 <linearGradient id="gZacisk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f5f3"/><stop offset="1" stop-color="#d5d8d4"/></linearGradient>
 <linearGradient id="gPad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3dcc4"/><stop offset="1" stop-color="#b9ad86"/></linearGradient>
 <radialGradient id="gSrub" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#c3c9cf"/><stop offset="1" stop-color="#7f868e"/></radialGradient>
 <linearGradient id="gZloto" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6a22"/><stop offset=".5" stop-color="#f3d27a"/><stop offset="1" stop-color="#9a7a2c"/></linearGradient>
 <linearGradient id="gZiel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fb36a"/><stop offset="1" stop-color="#23824a"/></linearGradient>
 <filter id="fGlow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="9"/></filter>
 <filter id="fGlowM" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="4"/></filter>
 <filter id="fCien" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#000" flood-opacity=".6"/></filter>
 <filter id="fCienM" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity=".5"/></filter>
 <pattern id="pSciana" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><rect width="22" height="22" fill="#0f1b38"/><path d="M0 11h22" stroke="rgba(130,170,255,.075)" stroke-width="7"/></pattern>
 <pattern id="pTasma" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#8e5a26"/><rect width="2" height="8" fill="#a8703a"/></pattern>
</defs></svg>`;

// ── drobiazgi
R.sruba = (x, y, r, kat = 40, krzyz = true) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="url(#gSrub)" stroke="#646b72" stroke-width="${Math.max(1, r * .09)}"/>` +
  `<g transform="rotate(${kat})" stroke="#4d535a" stroke-width="${r * .24}" stroke-linecap="round">` +
  (krzyz ? `<path d="M${-r * .58} 0H${r * .58}M0 ${-r * .58}V${r * .58}"/>` : `<path d="M${-r * .66} 0H${r * .66}"/>`) + `</g></g>`;

R.led = (rola, x, y, kolor, r = 9) => `<g data-r="${rola}" data-kol="${kolor}" transform="translate(${x} ${y})">` +
  `<circle class="gl" r="${r * 2.6}" fill="${kolor}" filter="url(#fGlow)" opacity="0"/>` +
  `<circle class="l" r="${r}" fill="#4b5157" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>` +
  `<circle r="${r * .34}" cx="${-r * .32}" cy="${-r * .32}" fill="rgba(255,255,255,.55)"/></g>`;

// ── STEROWNIK ŚCIENNY, PRZÓD (520 × 560). Ekran LCD: x 100…420, y 98…302 (320 × 204). Wzór: zdjęcia 3.jpg i 4.jpg.
R.ekrany = () => {
  const L = `font-family="Plex" font-weight="500" fill="#3a3f47"`;
  const linia = (y) => `<line x1="0" y1="${y}" x2="320" y2="${y}" stroke="#7d8590" stroke-width="1.2"/>`;
  const pas = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="9" rx="3" fill="#3a3f47" opacity=".2"/>`;
  const strz = `<g transform="translate(262 176)"><rect width="22" height="20" rx="3" fill="#59606a"/><path d="M11 3l5 6h-10zM11 17l5-6h-10z" fill="#e9f0f6"/></g>` +
    `<g transform="translate(288 176)"><rect width="22" height="20" rx="3" fill="#59606a"/><path d="M3 10l6-5v10zM19 10l-6-5v10z" fill="#e9f0f6"/></g>`;
  const glowna = `<g data-e="main">
    <text x="8" y="21" ${L} font-size="15">12-11-2026</text><text x="132" y="21" ${L} font-size="15">09:47</text>
    <path d="M222 22v-8l8-7 8 7v8z" fill="none" stroke="#3a3f47" stroke-width="1.8"/><text x="242" y="21" ${L} font-size="15">7°</text>
    <g transform="translate(300 17)" fill="none" stroke="#3a3f47" stroke-width="1.8" stroke-linecap="round"><path d="M-9-3a13 13 0 0 1 18 0"/><path d="M-6 1a8 8 0 0 1 12 0"/><circle cx="0" cy="5" r="1.4" fill="#3a3f47"/></g>
    ${linia(29)}<line x1="107" y1="29" x2="107" y2="204" stroke="#7d8590" stroke-width="1.2"/><line x1="213" y1="29" x2="213" y2="204" stroke="#7d8590" stroke-width="1.2"/>
    <g fill="none" stroke="#3a3f47" stroke-width="2.4" stroke-linecap="round"><path d="M16 50q5-6 10 0t10 0 10 0"/><path d="M16 60q5-6 10 0t10 0 10 0"/></g>
    <path d="M22 108q-7 10-7 14a7 7 0 0 0 14 0q0-4-7-14z" fill="none" stroke="#3a3f47" stroke-width="1.8"/>
    <text x="38" y="138" ${L} font-size="46" font-weight="600">36</text><text x="88" y="98" ${L} font-size="14">°C</text>
    <text x="160" y="66" ${L} font-size="27" text-anchor="middle">OFF</text>
    <g transform="translate(160 112)" stroke="#3a3f47" stroke-width="2" fill="none"><circle r="11"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path transform="rotate(${a})" d="M0-15v-6"/>`).join("")}</g>
    <g transform="translate(150 174)" fill="none" stroke="#3a3f47" stroke-width="1.8"><circle r="13"/><path d="M-4-6l9 6-9 6z"/></g>
    <g transform="translate(226 40)" fill="none" stroke="#3a3f47" stroke-width="2"><path d="M0 8h16v6M16 8h10"/><path d="M4 3h14" /><path d="M26 18v4"/><circle cx="26" cy="28" r="2.2"/></g>
    <text x="236" y="138" ${L} font-size="46" font-weight="600">42</text><text x="288" y="98" ${L} font-size="14">°C</text></g>`;
  // lista z kursorem (podświetlony wiersz jak na zdjęciu 3.jpg); wiersze bez znaczenia = szare paski, żeby nie zmyślać nazw pozycji
  const wiersze = (pref, dy, teksty, szer) => `<rect data-r="kur" x="5" y="37" width="310" height="${dy - 3}" fill="#3a3d72"/>` +
    teksty.map((tx, i) => `<g data-r="${pref}${i}">` + (tx ? `<text x="12" y="${54 + i * dy}" font-family="Plex" font-weight="500" font-size="14" fill="#3a3f47">${tx}</text>`
      : `<rect x="12" y="${44 + i * dy}" width="${szer[i]}" height="9" rx="3" fill="#3a3f47" opacity=".2"/>`) + `</g>`).join("");
  const menu = `<g data-e="menu"><text x="10" y="21" ${L} font-size="15">MENU</text>${linia(29)}
    ${wiersze("m", 25, ["", "", "", "", "FOR SERVICEMAN", ""], [150, 190, 120, 170, 0, 140])}${strz}</g>`;
  const haslo = `<g data-e="haslo"><text x="10" y="21" ${L} font-size="15">FOR SERVICEMAN</text>${linia(29)}
    <text x="160" y="72" ${L} font-size="13.5" text-anchor="middle">PLEASE INPUT THE PASSWORD:</text>
    ${[0, 1, 2].map((i) => `<rect data-r="pole${i}" x="${104 + i * 40}" y="96" width="32" height="44" rx="3" fill="none" stroke="#3a3f47" stroke-width="1.6"/>` +
      `<text data-r="cyfra${i}" x="${120 + i * 40}" y="128" ${L} font-size="28" font-weight="600" text-anchor="middle">0</text>`).join("")}
    ${strz}</g>`;
  const lista = `<g data-e="lista"><text x="10" y="21" ${L} font-size="15">FOR SERVICEMAN</text>${linia(29)}
    ${wiersze("l", 28, ["", "", "", "17. HMI ADDRESS SET", ""], [170, 130, 160, 0, 120])}${strz}</g>`;
  const e17 = `<g data-e="e17"><text x="10" y="22" ${L} font-size="15">17. HMI ADDRESS SET</text>${linia(31)}
    <text x="10" y="54" ${L} font-size="15">17.1 HMI SET</text><text x="312" y="54" ${L} font-size="15" text-anchor="end">GŁÓWNA</text>${linia(63)}
    <rect x="6" y="68" width="222" height="24" fill="#3a3d72"/><text x="10" y="86" font-family="Plex" font-weight="500" font-size="15" fill="#eef3ff">17.2 HMI ADDRESS FOR BMS</text>
    <text x="290" y="86" ${L} font-size="15" text-anchor="middle">1</text>${linia(96)}${linia(127)}${linia(158)}${strz}
    <rect data-r="ring1" x="2" y="34" width="316" height="28" rx="5" fill="none" stroke="#2ee6a6" stroke-width="3.5" opacity="0" vector-effect="non-scaling-stroke"/>
    <rect data-r="ring2" x="2" y="65" width="316" height="30" rx="5" fill="none" stroke="#2ee6a6" stroke-width="3.5" opacity="0" vector-effect="non-scaling-stroke"/></g>`;
  return glowna + menu + haslo + lista + e17;
};

R.przod = () => {
  const glosnik = []; for (let i = 0; i < 7; i++) for (let j = 0; j < 6; j++) if (!((i === 0 || i === 6) && (j === 0 || j === 5))) glosnik.push(`<circle cx="${446 + i * 9}" cy="${24 + j * 9}" r="2.1"/>`);
  const T = (k, x, y, glif) => `<g data-b="${k}" transform="translate(${x} ${y})"><circle data-r="ring" r="34" fill="rgba(57,192,255,.22)" stroke="#39c0ff" stroke-width="4" opacity="0"/>${glif}</g>`;
  const napis = (t, s = 27) => `<text class="lbl" y="${s * .36}" text-anchor="middle" font-family="Inter" font-weight="500" font-size="${s}" fill="#2f3236">${t}</text>`;
  const tri = (d) => `<path class="lbl" d="${d}" fill="#2f3236"/>`;
  return `<g class="przod">
   <rect width="520" height="560" rx="30" fill="url(#gCtrl)" stroke="#f7f8f6" stroke-width="2.5"/>
   <path d="M0 300H520V530a30 30 0 0 1-30 30H30A30 30 0 0 1 0 530Z" fill="url(#pDots)"/>
   <rect x="5" y="5" width="510" height="550" rx="26" fill="none" stroke="rgba(0,0,0,.07)" stroke-width="2"/>
   <text x="260" y="60" text-anchor="middle" font-family="Inter" font-weight="500" font-size="25" letter-spacing="7" fill="#42464b"></text>
   <g fill="#585d62">${glosnik.join("")}</g>
   <rect x="88" y="86" width="344" height="228" rx="12" fill="#2a2e35"/>
   <g data-r="lcd" transform="translate(100 98)"><rect width="320" height="204" fill="url(#gLcd)"/>${R.ekrany()}</g>
   <text x="260" y="346" text-anchor="middle" font-family="Inter" font-weight="700" font-size="15" letter-spacing="3" fill="#2f3236">COMFORT CONTROL</text>
   ${T("MENU", 120, 398, napis("MENU"))}${T("UP", 260, 398, tri("M-17 10L0-13 17 10Z"))}${T("ONOFF", 400, 398, napis("ON/OFF"))}
   ${T("LEFT", 120, 456, tri("M10-17L-13 0 10 17Z"))}${T("OK", 260, 456, napis("OK"))}${T("RIGHT", 400, 456, tri("M-10-17L13 0-10 17Z"))}
   ${T("BACK", 120, 514, napis("BACK"))}${T("DOWN", 260, 514, tri("M-17-10L0 13 17-10Z"))}
   ${T("UNLOCK", 400, 508, napis("UNLOCK", 25))}<text x="400" y="535" text-anchor="middle" font-family="Inter" font-size="12.5" fill="#2f3236">(LONG PRESS)</text>
  </g>`;
};

// ── STEROWNIK ŚCIENNY, TYŁ (560 × 600). Wzór: 1.jpg, 2.jpg, 5.jpg.
// Listwa E Y X B A u góry z lewej (śruby x 58…226, y 99), H2 (437,125) wyżej, H1 (437,190) niżej, przy prawej krawędzi płytki.
R.H2 = [437, 125]; R.H1 = [437, 190];
R.tyl = (opcje = {}) => {
  const los = R.los(1209);
  const strefy = [[28, 62, 262, 182], [398, 88, 506, 222], [312, 220, 412, 436], [160, 250, 256, 352], [20, 255, 140, 368], [198, 362, 256, 408],
    [90, 540, 430, 582], [318, 78, 424, 140], [430, 262, 476, 402], [258, 178, 312, 232], [400, 222, 476, 270], [300, 505, 372, 540], [336, 176, 392, 226]];
  const wolne = (x, y, w, h) => x > 34 && x + w < 500 && y > 68 && y + h < 576 && !strefy.some(([a, b, c, d]) => x < c && x + w > a && y < d && y + h > b);
  const smd = []; let n = 0;
  for (let i = 0; i < 900 && n < 74; i++) {
    const pion = los() < .5, w = pion ? 7 : 15, h = pion ? 15 : 7, x = 34 + los() * 466, y = 68 + los() * 508;
    if (!wolne(x - 4, y - 4, w + 8, h + 8)) continue; n++;
    const kap = los() < .35;
    smd.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><rect x="-2" y="-2" width="${w + 4}" height="${h + 4}" rx="2" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/>` +
      `<rect width="${w}" height="${h}" fill="${kap ? "#b98b57" : "#26282b"}"/>` +
      (pion ? `<rect width="${w}" height="3" fill="#d4d8db"/><rect y="${h - 3}" width="${w}" height="3" fill="#d4d8db"/>` : `<rect width="3" height="${h}" fill="#d4d8db"/><rect x="${w - 3}" width="3" height="${h}" fill="#d4d8db"/>`) + `</g>`);
  }
  const via = []; for (let i = 0; i < 46; i++) { const x = 40 + los() * 460, y = 72 + los() * 500; if (wolne(x - 3, y - 3, 6, 6)) via.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="#d5c58c" opacity=".85"/>`); }
  const sciezki = []; for (let i = 0; i < 16; i++) { const x = 60 + los() * 420, y = 80 + los() * 470, d = 40 + los() * 90; if (wolne(x - 2, y - 2, d + 4, 6)) sciezki.push(`<path d="M${x.toFixed(0)} ${y.toFixed(0)}h${(d * .6).toFixed(0)}l${(d * .25).toFixed(0)} ${(d * .25).toFixed(0)}" stroke="rgba(10,60,30,.55)" stroke-width="2.4" fill="none"/>`); }
  const qfp = []; for (let i = 0; i < 15; i++) { const px = 168 + i * 5.1, py = 263 + i * 5.3;
    qfp.push(`<rect x="${px.toFixed(1)}" y="251" width="2.2" height="7" fill="#c9cfd4"/><rect x="${px.toFixed(1)}" y="346" width="2.2" height="7" fill="#c9cfd4"/>` +
      `<rect x="156" y="${py.toFixed(1)}" width="7" height="2.2" fill="#c9cfd4"/><rect x="245" y="${py.toFixed(1)}" width="7" height="2.2" fill="#c9cfd4"/>`); }
  const qr = []; const los2 = R.los(77); for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if (los2() < .5 || (i < 3 && j < 3) || (i > 5 && j < 3) || (i < 3 && j > 5)) qr.push(`<rect x="${366 + i * 3}" y="${312 + j * 3}" width="3" height="3"/>`);
  const listwa = [58, 100, 142, 184, 226];
  const kolory = ["#d6402f", "#2f8c3f", "#2c4fa3", "#e7e1d3", "#5b3521"];
  const druty = listwa.map((x, i) => { const dx = [-16, -8, 2, 12, 22][i], k = kolory[i];
    const d = `M${x} 99C${x} 60 ${x + dx * .4} 20 ${x + dx} -40S${x + dx * 1.4} -120 ${x + dx * 1.2} -170`;
    return `<path d="${d}" fill="none" stroke="#0b0f19" stroke-width="10" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${k}" stroke-width="7" stroke-linecap="round"/>`; }).join("");
  const ksztalty = [`<rect x="-8" y="-8" width="16" height="16"/>`, `<circle r="9"/>`, `<path d="M-9-7H9L0 9Z"/>`, `<path d="M0-10L10 0 0 10-10 0Z"/>`, `<path d="M0-10L9-3 6 9H-6L-9-3Z"/>`, `<path d="M-5-9H5L10 0 5 9H-5L-10 0Z"/>`]
    .map((s, i) => `<g transform="translate(453 ${282 + i * 21})">${s}</g>`).join("");
  return `<g class="tyl">
   ${opcje.bezDrutow ? "" : `<g data-r="druty">${druty}</g>`}
   <rect width="560" height="600" rx="24" fill="url(#gObud)"/>
   <rect x="14" y="14" width="532" height="572" rx="16" fill="#babdb7"/>
   <rect x="508" y="120" width="30" height="70" rx="4" fill="#e8eae6"/><rect x="508" y="300" width="30" height="70" rx="4" fill="#e8eae6"/><rect x="508" y="460" width="30" height="70" rx="4" fill="#e8eae6"/>
   <rect x="28" y="62" width="478" height="520" rx="6" fill="url(#gPcb)" stroke="#135a31" stroke-width="2"/>
   ${sciezki.join("")}${via.join("")}${smd.join("")}
   <g data-r="listwa"><rect x="34" y="70" width="218" height="58" rx="5" fill="url(#gZacisk)" stroke="#a7aba6" stroke-width="1.5"/>
    ${listwa.map((x) => `<rect x="${x - 19}" y="76" width="38" height="46" rx="3" fill="#cfd2ce"/>`).join("")}${listwa.map((x, i) => R.sruba(x, 99, 15, 30 + i * 9)).join("")}
    ${["E", "Y", "X", "B", "A"].map((t, i) => `<text x="${listwa[i]}" y="166" text-anchor="middle" font-family="Inter" font-weight="700" font-size="26" fill="#f2f5f0">${t}</text>`).join("")}</g>
   <g>${[330, 352, 374, 396].map((x) => `<text x="${x + 9}" y="88" text-anchor="middle" font-family="Inter" font-weight="700" font-size="13" fill="#eef2ee">+</text><rect x="${x}" y="94" width="18" height="34" fill="#1d1f22"/><rect x="${x}" y="94" width="18" height="5" fill="#cfd4d8"/><rect x="${x}" y="123" width="18" height="5" fill="#cfd4d8"/>`).join("")}</g>
   <circle cx="285" cy="205" r="22" fill="#1d1f22"/><circle cx="285" cy="205" r="5" fill="#3a3d41"/>
   <rect x="340" y="180" width="48" height="44" rx="9" fill="#202225"/><path d="M350 196h28M350 206h28" stroke="#3b3e42" stroke-width="3"/>
   <g data-r="h2pad"><rect x="414" y="102" width="46" height="46" rx="3" fill="url(#gPad)" stroke="#8f8566" stroke-width="1.5"/>${R.sruba(437, 125, 16, 20)}</g>
   <g data-r="h1pad"><rect x="414" y="167" width="46" height="46" rx="3" fill="url(#gPad)" stroke="#8f8566" stroke-width="1.5"/>${R.sruba(437, 190, 16, 55)}</g>
   <rect x="468" y="113" width="30" height="24" rx="2" fill="#f4f6f2"/><text x="483" y="131" text-anchor="middle" font-family="Inter" font-weight="700" font-size="15" fill="#1d2a20">H2</text>
   <rect x="468" y="178" width="30" height="24" rx="2" fill="#f4f6f2"/><text x="483" y="196" text-anchor="middle" font-family="Inter" font-weight="700" font-size="15" fill="#1d2a20">H1</text>
   ${[408, 430, 452].map((x) => `<rect x="${x}" y="232" width="18" height="30" fill="#1d1f22"/><rect x="${x}" y="232" width="18" height="6" fill="#cfd4d8"/>`).join("")}
   <g fill="none" stroke="#eef2ee" stroke-width="1.8"><rect x="438" y="268" width="31" height="132" rx="2"/>${ksztalty}</g>
   <rect x="316" y="226" width="92" height="208" rx="3" fill="#1d3f8c"/><rect x="316" y="226" width="92" height="60" rx="3" fill="#2a56b3"/>
   <rect x="324" y="288" width="76" height="140" rx="3" fill="#c5cacf" stroke="#9aa1a8" stroke-width="1.5"/><rect x="334" y="300" width="58" height="96" rx="2" fill="#f4f5f2"/>
   <g fill="#2a2d31">${qr.join("")}</g><path d="M340 340h18M340 348h22M340 356h16M340 364h20M340 372h14" stroke="#555a60" stroke-width="2.4"/>
   <rect x="163" y="258" width="82" height="88" rx="2" fill="#1b1d20"/>${qfp.join("")}<circle cx="173" cy="268" r="2.4" fill="#45494e"/>
   <rect x="206" y="372" width="44" height="26" rx="12" fill="#c3c8cd" stroke="#8b9198" stroke-width="1.5"/>
   <rect x="14" y="270" width="96" height="86" fill="url(#pTasma)"/><rect x="104" y="262" width="34" height="102" rx="3" fill="#eceee9" stroke="#a9ada7"/>
   <rect x="302" y="512" width="62" height="20" rx="2" fill="#1d1f22"/>${[0, 1, 2, 3].map((i) => `<circle cx="${312 + i * 14}" cy="522" r="3.2" fill="#c9a64a"/>`).join("")}
   <text x="104" y="568" font-family="Plex" font-weight="500" font-size="13.5" fill="#eef2ee">KJRH-120H/BMK-E.D.1.1-1(WIFI)</text>
  </g>`;
};

// ── MODUŁ ESP32 Z RS-485 na szynę DIN (200 szer.; korpus y 0…452, antena nad nim). Wzór: 6.jpg, 7.jpg, zdjęcia producenta.
// Zaciski u dołu: NO, COM, B− (120,422), A+ (158,422). U góry: wejście USB-C (x 140) i zaciski DC 5 V.
R.BM = [120, 422]; R.AP = [158, 422]; R.USB = [140, 0];
R.modul = (opcje = {}) => {
  const ant = opcje.antena === "krotka" ? `<path d="M50-30L40-92" stroke="#15171a" stroke-width="18" stroke-linecap="round"/>` : `<path d="M50-30L22-230" stroke="#15171a" stroke-width="20" stroke-linecap="round"/><path d="M48-60L27-210" stroke="rgba(255,255,255,.07)" stroke-width="4" stroke-linecap="round"/>`;
  const zac = (t, x) => `<circle cx="${x}" cy="347" r="17" fill="#9fd06a"/><text x="${x}" y="351" text-anchor="middle" font-family="Inter" font-weight="700" font-size="${t.length > 2 ? 10 : 12}" fill="#1b2a12">${t}</text>`;
  return `<g class="modul">
   <g data-r="antena">${ant}<rect x="40" y="-34" width="20" height="38" fill="url(#gZloto)"/><rect x="36" y="-14" width="28" height="9" fill="url(#gZloto)"/></g>
   <rect x="34" y="0" width="132" height="54" rx="7" fill="url(#gZacisk)" stroke="#b9bec2" stroke-width="1.5"/>
   <rect x="74" y="12" width="34" height="28" rx="3" fill="#2f8a4e"/><circle cx="83" cy="26" r="6" fill="#1b4d2c"/><circle cx="99" cy="26" r="6" fill="#1b4d2c"/>
   <rect x="122" y="16" width="36" height="16" rx="8" fill="#2a2e33"/><rect x="128" y="21" width="24" height="6" rx="3" fill="#8d959c"/>
   <rect x="0" y="48" width="200" height="352" rx="13" fill="url(#gBialy)" stroke="#c3c8cb" stroke-width="2"/>
   <path d="M6 74H194M6 376H194" stroke="rgba(0,0,0,.07)" stroke-width="2"/>
   <rect x="22" y="80" width="156" height="290" rx="8" fill="#23272c"/>
   <rect x="34" y="92" width="44" height="22" rx="11" fill="#9fd06a"/><rect x="42" y="99" width="28" height="8" rx="4" fill="#23272c"/>
   <circle cx="113" cy="103" r="13" fill="#9fd06a"/><circle cx="151" cy="103" r="13" fill="#9fd06a"/>
   <text x="113" y="106" text-anchor="middle" font-family="Inter" font-weight="700" font-size="8.5" fill="#1b2a12">GND</text><text x="151" y="106" text-anchor="middle" font-family="Inter" font-weight="700" font-size="8.5" fill="#1b2a12">VCC</text>
   <text x="132" y="133" text-anchor="middle" font-family="Inter" font-weight="500" font-size="10" fill="#c9d1d8">DC 5V</text>
   ${R.led("ledRS", 52, 160, "#3d7bff")}${R.led("ledRel", 100, 160, "#45c06a")}${R.led("ledPWR", 148, 160, "#ff3a3a")}
   <text x="52" y="184" text-anchor="middle" font-family="Inter" font-weight="500" font-size="9" fill="#c9d1d8">RS485</text>
   <text x="100" y="184" text-anchor="middle" font-family="Inter" font-weight="500" font-size="9" fill="#c9d1d8">Relay</text>
   <text x="148" y="184" text-anchor="middle" font-family="Inter" font-weight="500" font-size="9" fill="#c9d1d8">PWR</text>
   <rect x="104" y="204" width="3" height="96" fill="#6fae4a"/><text transform="translate(88 206) rotate(90)" font-family="Inter" font-weight="500" font-size="11" fill="#9aa4ad">ESP32 · RS-485</text>
   <text x="60" y="318" text-anchor="middle" font-family="Inter" font-weight="500" font-size="11" fill="#c9d1d8">Relay</text><text x="140" y="318" text-anchor="middle" font-family="Inter" font-weight="500" font-size="11" fill="#c9d1d8">RS485</text>
   <path d="M40 326v-4h40v4M120 326v-4h40v4" fill="none" stroke="#8b949c" stroke-width="1.4"/>
   ${zac("NO", 40)}${zac("COM", 80)}${zac("B−", 120)}${zac("A+", 160)}
   <rect x="26" y="394" width="148" height="58" rx="7" fill="url(#gZacisk)" stroke="#b9bec2" stroke-width="1.5"/>
   ${[44, 82, 120, 158].map((x, i) => R.sruba(x, 422, 13, [20, 70, 35, 110][i], false)).join("")}
  </g>`;
};

// ── BRAMKA RS-485 → LAN na szynę DIN (150 szer., y 0…440). Wzór: zdjęcie producenta (biała obudowa, zielone zaciski, RJ45).
// Zaciski u dołu: G (45,420), B− (75,420), A+ (105,420). Zasilanie 5 V u góry (x 55…95), RJ45 na froncie.
R.GB = [75, 420]; R.GA = [105, 420]; R.GZ = [75, 0]; R.GLAN = [75, 66];
R.bramka = () => `<g class="bramka">
  <rect x="44" y="0" width="62" height="40" rx="4" fill="url(#gZiel)"/>${[60, 90].map((x) => R.sruba(x, 20, 9, 25, false)).join("")}
  <text x="60" y="-8" text-anchor="middle" font-family="Inter" font-weight="700" font-size="13" fill="#eaf0ff">+</text><text x="90" y="-8" text-anchor="middle" font-family="Inter" font-weight="700" font-size="13" fill="#eaf0ff">−</text>
  <rect x="0" y="34" width="150" height="372" rx="12" fill="url(#gBialy)" stroke="#c3c8cb" stroke-width="2"/>
  <rect x="33" y="56" width="84" height="64" rx="4" fill="#c4c9ce" stroke="#9097a0" stroke-width="1.5"/><rect x="43" y="66" width="64" height="44" rx="2" fill="#16191d"/><rect x="63" y="104" width="24" height="8" fill="#16191d"/>
  ${R.led("gLink", 40, 62, "#2ee66a", 3.5)}${R.led("gAct", 110, 62, "#ffc23a", 3.5)}
  <text x="75" y="138" text-anchor="middle" font-family="Inter" font-weight="700" font-size="13" fill="#5b636b">LAN</text>
  ${[["gPWR", "PWR", "#ff3a3a"], ["gLINK", "LINK", "#2ee66a"], ["gRX", "RX", "#2ee66a"], ["gTX", "TX", "#2ee66a"]].map(([r, t, k], i) => R.led(r, 40, 162 + i * 20, k, 5.5) + `<text x="54" y="${166 + i * 20}" font-family="Inter" font-weight="700" font-size="11" fill="#5b636b">${t}</text>`).join("")}
  <rect x="18" y="246" width="114" height="92" rx="7" fill="#2a5db0"/>
  <text x="75" y="284" text-anchor="middle" font-family="Inter" font-weight="700" font-size="17" fill="#ffffff">RS-485</text><text x="75" y="310" text-anchor="middle" font-family="Inter" font-weight="700" font-size="17" fill="#ffffff">→ LAN</text>
  ${["G", "B−", "A+"].map((t, i) => `<text x="${45 + i * 30}" y="392" text-anchor="middle" font-family="Inter" font-weight="700" font-size="14" fill="#3b434b">${t}</text>`).join("")}
  <rect x="26" y="400" width="98" height="40" rx="4" fill="url(#gZiel)"/>${[45, 75, 105].map((x) => R.sruba(x, 420, 10, 60, false)).join("")}
 </g>`;

// ── ROUTER (260 × 150)
R.router = (napis = "router") => `<g class="router">
  <path d="M50 40L34-40M210 40L226-40" stroke="#1a2238" stroke-width="12" stroke-linecap="round"/>
  <rect x="0" y="36" width="260" height="100" rx="18" fill="#1b2546" stroke="rgba(110,160,255,.35)" stroke-width="2"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="${118 + i * 32}" y="86" width="24" height="20" rx="2" fill="#0a0f1e" stroke="#e8c04a" stroke-width="2"/>`).join("")}
  ${[0, 1, 2, 3].map((i) => `<circle cx="${30 + i * 18}" cy="72" r="4" fill="#2ee6a6" opacity=".9"/>`).join("")}
  <text x="130" y="168" text-anchor="middle" font-family="Inter" font-weight="700" font-size="22" fill="#97a8cc">${napis}</text></g>`;
R.LAN_PORT = [130, 96];

// ── ŁADOWARKA USB-C w gniazdku (gniazdko r 70, kostka ładowarki, wyjście kabla w (0, 70))
R.ladowarka = () => `<g class="ladowarka">
  <circle r="74" fill="#132149" stroke="rgba(110,160,255,.35)" stroke-width="2"/><circle r="56" fill="#0d1734"/>
  <rect x="-46" y="-50" width="92" height="104" rx="16" fill="url(#gBialy)" stroke="#c3c8cb" stroke-width="2"/>
  <rect x="-18" y="30" width="36" height="16" rx="8" fill="#2a2e33"/>
  <text y="0" text-anchor="middle" font-family="Inter" font-weight="700" font-size="15" fill="#5b636b">5 V</text><text y="18" text-anchor="middle" font-family="Inter" font-weight="500" font-size="11" fill="#7b838b">USB-C</text></g>`;
R.zasilacz = () => `<g class="zasilacz">
  <circle r="74" fill="#132149" stroke="rgba(110,160,255,.35)" stroke-width="2"/><circle r="56" fill="#0d1734"/>
  <rect x="-48" y="-52" width="96" height="108" rx="14" fill="#25292f" stroke="#3b4048" stroke-width="2"/>
  <text y="2" text-anchor="middle" font-family="Inter" font-weight="700" font-size="16" fill="#c9d1d8">5 V</text><text y="22" text-anchor="middle" font-family="Inter" font-weight="500" font-size="11" fill="#8b949c">z zestawu</text></g>`;
// wtyczka USB-C (rysowana w miejscu wejścia, ostrze skierowane w dół)
R.wtykUSB = () => `<g class="wtyk"><rect x="-16" y="-58" width="32" height="44" rx="8" fill="#e9ecee" stroke="#b9bec2" stroke-width="1.5"/><rect x="-10" y="-16" width="20" height="16" rx="4" fill="#9aa2aa"/></g>`;
R.wtykDC = () => `<g class="wtyk"><rect x="-13" y="-52" width="26" height="40" rx="6" fill="#25292f"/><rect x="-6" y="-14" width="12" height="12" fill="#9aa2aa"/></g>`;
R.wtykRJ = () => `<g class="wtyk"><rect x="-22" y="-56" width="44" height="40" rx="6" fill="#d9dee3" stroke="#9aa2aa" stroke-width="1.5"/><rect x="-18" y="-18" width="36" height="22" rx="2" fill="rgba(220,235,255,.75)" stroke="#9aa2aa"/></g>`;

// ── ŚRUBOKRĘT PŁASKI (grot w (0,0), rękojeść w górę wzdłuż osi −y)
R.srubokret = () => `<g class="srubokret"><rect x="-4" y="-96" width="8" height="92" fill="#c7cdd3"/><path d="M-4-6h8l-1 6h-6z" fill="#9aa2aa"/>
  <rect x="-15" y="-206" width="30" height="114" rx="13" fill="#ffb020"/><path d="M-6-196v94M2-196v94" stroke="rgba(0,0,0,.18)" stroke-width="4"/><rect x="-15" y="-112" width="30" height="20" rx="6" fill="#1e2433"/></g>`;

// ── ikony interfejsu
R.ik = {
  ok: (k = "#2ee6a6") => `<svg viewBox="0 0 24 24" width="1em" height="1em"><circle cx="12" cy="12" r="11" fill="${k}"/><path d="M6.5 12.5l3.6 3.6 7.4-8" fill="none" stroke="#05121a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  zle: (k = "#ff5470") => `<svg viewBox="0 0 24 24" width="1em" height="1em"><circle cx="12" cy="12" r="11" fill="${k}"/><path d="M7.5 7.5l9 9M16.5 7.5l-9 9" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/></svg>`,
  uwaga: (k = "#ff5470") => `<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M12 2L23 21H1Z" fill="${k}" stroke="${k}" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 9v5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.5" fill="#fff"/></svg>`,
  klodka: (k = "#ffb020") => `<svg viewBox="0 0 24 24" width="1em" height="1em"><rect x="4" y="10" width="16" height="12" rx="3" fill="${k}"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="${k}" stroke-width="2.6"/></svg>`,
  wifi: (k = "#111") => `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="${k}" stroke-width="2.4" stroke-linecap="round"><path d="M2 9a15 15 0 0 1 20 0"/><path d="M5.5 12.5a10 10 0 0 1 13 0"/><path d="M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="1.2" fill="${k}"/></svg>`,
  klodkaMala: (k = "#111") => `<svg viewBox="0 0 24 24" width="1em" height="1em"><rect x="6" y="11" width="12" height="10" rx="2" fill="${k}"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="${k}" stroke-width="2"/></svg>`,
  kursor: () => `<svg viewBox="0 0 32 40" width="40" height="50"><path d="M3 2v30l8-7 5 12 6-3-5-11h11z" fill="#fff" stroke="#0a0f1c" stroke-width="2.4" stroke-linejoin="round"/></svg>`,
};
// ikony paska bocznego HA (proste ścieżki, 24 × 24)
R.ha = {
  przeglad: `<path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z"/>`,
  energia: `<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>`,
  mapa: `<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>`,
  historia: `<path d="M3 20h18v2H3zM5 10h3v8H5zM10.5 5h3v13h-3zM16 13h3v5h-3z"/>`,
  ustawienia: `<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 5.2v-2.4l-2.6-.5a7 7 0 0 0-.8-1.9l1.5-2.2-1.7-1.7-2.2 1.5a7 7 0 0 0-1.9-.8L12.8 2h-2.4l-.5 2.6a7 7 0 0 0-1.9.8L5.8 3.9 4.1 5.6l1.5 2.2a7 7 0 0 0-.8 1.9L2 10.8v2.4l2.6.5a7 7 0 0 0 .8 1.9l-1.5 2.2 1.7 1.7 2.2-1.5a7 7 0 0 0 1.9.8l.5 2.6h2.4l.5-2.6a7 7 0 0 0 1.9-.8l2.2 1.5 1.7-1.7-1.5-2.2a7 7 0 0 0 .8-1.9z"/>`,
  pompa: `<path d="M4 4h16v12H4zM7 19h10v2H7z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/>`,
  dodatki: `<path d="M20 11h-1.5V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.7 2.7 0 0 1 0 5.4H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.7 2.7 0 0 1 5.4 0V22H17a2 2 0 0 0 2-2v-4h1a2.5 2.5 0 0 0 0-5z"/>`,
};
