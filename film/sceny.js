// Sceny filmu „Pompa w Home Assistant · montaż” (12.11.2026). Wszystko liczy window.klatka(t): bez przejść CSS, bez zegara.
// Każda scena: dl (s), lewa kolumna (KROK, tytuł, polecenia [czas, tekst]) i rys(root, tl) z czasem lokalnym tl.
// Znaczniki w tekstach poleceń (początek słowa): ^ niebieski, ! czerwony, + zielony, ~ pomarańczowy, % brązowy.
// Napisy WebVTT powstają z tych samych tekstów (window.NAPISY), więc obraz i napisy się nie rozjadą.

const W = 1140, H = 880, F = 0.6;           // scena po prawej 1140 × 880; zmiana sceny: 0,3 s wygaszenie + 0,3 s wejście
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => cl((t - a) / (b - a));
const eo = (x) => 1 - Math.pow(1 - cl(x), 3);
const eio = (x) => { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const ebk = (x) => { x = cl(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
const q = (r, s) => r.querySelector(s);
const qa = (r, s) => [...r.querySelectorAll(s)];
const op = (el, v) => { if (!el) return; v = cl(v); el.style.opacity = v.toFixed(3); el.style.visibility = v < .002 ? "hidden" : "visible"; };
const sop = (el, v) => { if (el) el.setAttribute("opacity", cl(v).toFixed(3)); };
const tr = (el, s) => { if (el) el.setAttribute("transform", s); };
const puls = (tl, a, d) => { const x = seg(tl, a, a + d); return x > 0 && x < 1 ? Math.sin(Math.PI * x) : 0; };
const miga = (tl, od) => { if (tl < od) return 0; const u = tl * 7.3, k = Math.floor(u); return (k % 5 !== 3 && u - k < .5) ? 1 : 0; };   // nieregularne miganie jak przy transmisji

// ── tekst: słowa w <span>, jednoliterowe spójniki i „→ A+” sklejone twardą spacją (bez sierotek)
const KL = { "^": "nb", "!": "cz", "+": "zi", "~": "po", "%": "br" };
const kolor = (s) => (KL[s[0]] && s.length > 1) ? `<span class="${KL[s[0]]}">${s.slice(1)}</span>` : s;
function slowa(txt) {
  const t = txt.split(" "), out = [];
  const sklej = (a, b) => /(^| )[\^!+~%]?[\p{L}]$/u.test(a) || /^[\^!+~%]?[→=–]$/.test(b) || /[→=–]$/.test(a) ||
    (/\d$/.test(a) && /^[\^!+~%]?(V|A|s|min|minut|°C)[.,]?$/.test(b));
  for (let i = 0; i < t.length; i++) { let w = t[i]; while (i < t.length - 1 && sklej(w, t[i + 1])) w += " " + t[++i]; out.push(w); }
  return out.map((w) => `<span class="w">${w.split(" ").map(kolor).join(" ")}</span>`).join(" ");
}
const czysty = (txt) => txt.replace(/(^|[\s ])[\^!+~%](?=\S)/g, "$1").replace(/ /g, " ");

// ── przewody: obrys + barwa + połysk, rysowane od początku ścieżki; „dane” = białe kreski płynące po przewodzie
function drut(d, kol, rola, sz = 11) {
  const p = (k, w, extra) => `<path d="${d}" pathLength="1" fill="none" stroke="${k}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  return `<g data-r="${rola}" opacity="0">${p("#060a14", sz + 6, 'class="dk"')}${p(kol, sz, 'class="dk"')}` +
    `${p("rgba(255,255,255,.3)", sz * .3, 'class="dk" transform="translate(-1.5 -2)"')}${p("#ffffff", sz * .42, 'class="dane" stroke-dasharray="0.012 0.05" opacity="0"')}</g>`;
}
function rysDrut(r, rola, p, tl, dane = 0, d = null) {
  const g = q(r, `[data-r=${rola}]`); if (!g) return;
  sop(g, p > .002 ? 1 : 0);
  qa(g, "path").forEach((e) => { if (d) e.setAttribute("d", d); });
  qa(g, ".dk").forEach((e) => { e.setAttribute("stroke-dasharray", "1 2"); e.setAttribute("stroke-dashoffset", (1 - p).toFixed(4)); });
  const dn = q(g, ".dane"); sop(dn, dane * .55); dn.setAttribute("stroke-dashoffset", (-tl * .16).toFixed(4));
}

// ── kamera w SVG: punkt (cx, cy) na środku sceny w skali s; klucze [t, cx, cy, s] z płynnym przejściem
function kluczuj(tl, k) {
  if (tl <= k[0][0]) return k[0].slice(1);
  for (let i = 0; i < k.length - 1; i++) if (tl < k[i + 1][0]) { const x = eio((tl - k[i][0]) / (k[i + 1][0] - k[i][0])); return k[i].slice(1).map((v, j) => lerp(v, k[i + 1][j + 1], x)); }
  return k[k.length - 1].slice(1);
}
function kamera(g, tl, k) { const [cx, cy, s] = kluczuj(tl, k); tr(g, `translate(${(W / 2 - s * cx).toFixed(2)} ${(H / 2 - s * cy).toFixed(2)}) scale(${s.toFixed(4)})`); return { cx, cy, s }; }
const mapuj = (c, x, y) => [W / 2 + c.s * (x - c.cx), H / 2 + c.s * (y - c.cy)];

// ── etykiety HTML na scenie: pojawienie (a) z lekkim „wyskokiem”, zniknięcie (b)
function chip(el, tl, a, b = 1e9, x = null, y = null) {
  if (!el) return; const v = Math.min(eo(seg(tl, a, a + .35)), 1 - seg(tl, b, b + .3)); op(el, v);
  if (x !== null) { el.style.left = x.toFixed(1) + "px"; el.style.top = y.toFixed(1) + "px"; }
  el.style.transform = `translate(-50%,-50%) scale(${(.82 + .18 * ebk(seg(tl, a, a + .45))).toFixed(4)})`;
}
function pojaw(el, tl, a, d = .5, dy = 24, b = 1e9) { if (!el) return; const x = Math.min(eo(seg(tl, a, a + d)), 1 - seg(tl, b, b + .35)); op(el, x); el.style.transform = `translateY(${((1 - eo(seg(tl, a, a + d))) * dy).toFixed(1)}px)`; }
// stan pompy (zielona / czerwona kropka): zmiany [[czas, włączona?], …], widoczny od pierwszej zmiany do b
function stan(el, tl, zmiany, x, y, b = 1e9) {
  const akt = zmiany.filter(([t]) => tl >= t).pop() || zmiany[0];
  const v = Math.min(eo(seg(tl, zmiany[0][0], zmiany[0][0] + .35)), 1 - seg(tl, b, b + .3)); op(el, v);
  const wl = akt[1], k = wl ? "#2ee6a6" : "#ff5470";
  el.style.left = x + "px"; el.style.top = y + "px";
  el.style.transform = `translate(-50%,-50%) scale(${(.85 + .15 * ebk(seg(tl, akt[0], akt[0] + .45))).toFixed(4)})`;
  el.style.borderColor = wl ? "rgba(46,230,166,.85)" : "rgba(255,84,112,.9)";
  const kr = q(el, ".kr"); kr.style.background = k; kr.style.boxShadow = `0 0 16px ${k}`;
  q(el, ".st").textContent = wl ? "pompa włączona" : "pompa wyłączona";
}

// ── sterownik: ekran LCD, kursor listy, wciśnięcia przycisków; diody
function ekran(r, n) { qa(r, "[data-e]").forEach((e) => e.setAttribute("opacity", e.dataset.e === n ? 1 : 0)); }
function wiersz(r, e, pref, dy, row) {
  const g = q(r, `[data-e=${e}]`); if (!g) return; tr(q(g, "[data-r=kur]"), `translate(0 ${row * dy})`);
  qa(g, `[data-r^=${pref}]`).forEach((w, i) => { const on = i === row;
    qa(w, "text").forEach((t) => t.setAttribute("fill", on ? "#eef3ff" : "#3a3f47"));
    qa(w, "rect").forEach((t) => { t.setAttribute("fill", on ? "#eef3ff" : "#3a3f47"); t.setAttribute("opacity", on ? .75 : .2); }); });
}
function wcisnij(r, tl, lista) {
  qa(r, "[data-b]").forEach((b) => { let v = 0; for (const [tp, k] of lista) if (k === b.dataset.b) v = Math.max(v, puls(tl, tp - .12, .55));
    const ring = q(b, "[data-r=ring]"); ring.setAttribute("opacity", v.toFixed(3)); ring.setAttribute("r", (24 + 14 * v).toFixed(2));
    qa(b, ".lbl").forEach((l) => l.setAttribute("fill", v > .35 ? "#0b6fae" : "#2f3236")); });
}
function led(r, rola, j) { qa(r, `[data-r=${rola}]`).forEach((g) => { q(g, ".l").setAttribute("fill", j > .5 ? g.dataset.kol : "#4b5157"); sop(q(g, ".gl"), .9 * j); }); }
function fale(r, tl, od, do_ = 1e9, sel = "[data-r=fale]") {
  const g = q(r, sel); if (!g) return; const v = Math.min(seg(tl, od, od + .4), 1 - seg(tl, do_, do_ + .5));
  qa(g, "path").forEach((p, i) => sop(p, v * (.25 + .75 * (Math.sin(tl * 4.2 - i * 1.1) + 1) / 2)));
}

// ── makiety: środek elementu względem pojemnika (bez wpływu skali „wejścia” sceny), stuknięcie palcem, kursor myszy, pisanie
function srodek(el, kont) {
  const a = el.getBoundingClientRect(), b = kont.getBoundingClientRect(), s = b.width / kont.offsetWidth;
  return [(a.left + a.width / 2 - b.left) / s, (a.top + a.height / 2 - b.top) / s];
}
function tapy(r, kont, tl, lista) {
  const tp = q(kont, "[data-r=tap]"); let v = 0;
  for (const [tt, sel] of lista) { const s = seg(tl, tt - .25, tt + .4); if (s > 0 && s < 1) { const [x, y] = srodek(q(r, sel), kont);
    v = s < .4 ? s / .4 : 1 - (s - .4) / .6; tp.style.left = x + "px"; tp.style.top = y + "px"; tp.style.transform = `scale(${(s < .4 ? 1.35 - .55 * s / .4 : .8 + .7 * (s - .4) / .6).toFixed(3)})`; } }
  op(tp, v);
}
function kursorMysz(r, kont, tl, ruchy, od, do_) {
  const k = q(kont, "[data-r=kur]"), kl = q(kont, "[data-r=klik]");
  const pk = ruchy.map(([t, cel, klik]) => { const [x, y] = Array.isArray(cel) ? cel : srodek(q(r, cel), kont); return { t, x, y, klik }; });
  let x = pk[0].x, y = pk[0].y;
  for (let i = 0; i < pk.length; i++) { const p = pk[i]; if (tl >= p.t) { x = p.x; y = p.y; continue; }
    const pr = pk[i - 1]; if (pr) { const st = Math.max(pr.t, p.t - .7); if (tl > st) { const e = eio((tl - st) / (p.t - st)); x = lerp(pr.x, p.x, e); y = lerp(pr.y, p.y, e); } } break; }
  let wc = 0; op(kl, 0);
  for (const p of pk) if (p.klik) { const s = seg(tl, p.t, p.t + .5); if (s > 0 && s < 1) { op(kl, 1 - s); kl.style.left = p.x + "px"; kl.style.top = p.y + "px"; kl.style.transform = `scale(${(.4 + 1.1 * s).toFixed(3)})`; }
    wc = Math.max(wc, puls(tl, p.t - .08, .3)); }
  op(k, Math.min(seg(tl, od, od + .3), 1 - seg(tl, do_, do_ + .3)));
  k.style.left = (x - 4) + "px"; k.style.top = (y - 3) + "px"; k.style.transform = `scale(${(1 - .14 * wc).toFixed(3)})`;
}
function pisz(el, txt, tl, a, b, maska = false) {
  const n = Math.round(seg(tl, a, b) * txt.length), s = maska ? "•".repeat(n) : txt.slice(0, n);
  const kur = tl >= a - .25 && tl <= b + .6 && Math.floor(tl * 2.6) % 2 === 0;
  el.innerHTML = s + (kur ? '<span style="opacity:.75;font-family:Inter">|</span>' : "");
}

// ══════════════════════════ SCENY ══════════════════════════
const SC = [];
const TEL = (strony) => `<div class="tel"><div class="ek"><div class="notch"></div>
  <div class="sb"><span>9:41</span><span style="display:flex;gap:8px;align-items:center">${R.ik.wifi()}<i class="bat"></i></span></div>${strony}<div class="tap" data-r="tap"></div></div></div>`;
const wifiRow = (nazwa, rola = "", kl = "") => `<div class="row ${kl}" ${rola ? `data-r="${rola}"` : ""}><span>${nazwa}</span><span class="ri">${R.ik.klodkaMala()}${R.ik.wifi()}</span></div>`;

// 1 ─ PLANSZA TYTUŁOWA
SC.push({ id: "tytul", dl: 7.5, bezLewej: true, poster: 6.9,
  napisy: [[0, "Pompa w Home Assistant. Montaż w 15 minut."], [3.2, "Przygotuj: moduł z zestawu, 2 żyły przewodu, mały śrubokręt płaski i ładowarkę USB-C."]],
  html: () => {
    const karty = [
      [`<g transform="translate(78 34) scale(.27)">${R.modul({ antena: "krotka" })}</g><g transform="translate(170 20) scale(.31)">${R.bramka()}</g>`, "Moduł z zestawu", "moduł ESP32 z RS-485 albo bramka RS-485 → LAN"],
      [["M30 72C110 22 180 132 270 62", "M30 104C110 54 180 164 270 94"].map((d, i) => `<path d="${d}" stroke="#060a14" stroke-width="18" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${i ? "#a0602f" : "#3a78e0"}" stroke-width="12" fill="none" stroke-linecap="round"/>`).join("") +
        `<path d="M14 78L30 72M14 110L30 104M270 62L286 56M270 94L286 88" stroke="#e8a85a" stroke-width="6" stroke-linecap="round"/>`, "2 żyły przewodu", "np. jedna para z kabla sieciowego"],
      [`<g transform="translate(40 96) rotate(84)">${R.srubokret()}</g>`, "Mały śrubokręt", "płaski, do zacisków śrubowych"],
      [`<path d="M70 122C70 168 160 96 205 96" stroke="#060a14" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M70 122C70 168 160 96 205 96" stroke="#e9ecee" stroke-width="8" fill="none" stroke-linecap="round"/>` +
        `<g transform="translate(70 78) scale(.78)">${R.ladowarka()}</g><g transform="translate(258 96) rotate(-90) scale(.9)">${R.wtykUSB()}</g>`, "Ładowarka USB-C", "5 V, min. 1 A (zestaw Wi-Fi)"],
    ].map(([s, b, o]) => `<div class="karta"><svg viewBox="0 0 300 170">${s}</svg><b>${b}</b><span>${o}</span></div>`).join("");
    return `<div class="tyt"><div class="tag" data-r="tag"><i class="kropka"></i>Instrukcja montażu</div>
      <h1 data-r="h1">Pompa w<br>Home Assistant</h1><div class="g" data-r="g">montaż w 15 minut</div>
      <p data-r="p">Zestaw Wi-Fi albo zestaw Wi-Fi + LAN.<br>Pracujesz tylko przy sterowniku ściennym.</p></div>
      <svg data-r="hero" viewBox="0 0 780 520" style="position:absolute;left:1060px;top:118px;width:780px;height:520px;overflow:visible">
        ${drut("M300 352C470 352 520 515 598 505S634 455 634 408", "#a0602f", "hB", 9)}${drut("M300 326C490 326 570 540 646 522S658 455 658 408", "#3a78e0", "hA", 9)}
        <g transform="translate(20 80) scale(.62)" filter="url(#fCienM)">${R.przod()}</g>
        <g transform="translate(560 140) scale(.62)">${R.modul({ antena: "krotka" })}</g>
        <g data-r="fale" transform="translate(585 66)" fill="none" stroke="#39c0ff" stroke-width="5" stroke-linecap="round">${[22, 40, 58].map((rr) => `<path d="M${-rr * .7} ${-rr * .7}A${rr} ${rr} 0 0 1 ${rr * .7} ${-rr * .7}"/>`).join("")}</g>
      </svg>
      <div class="hpill" data-r="pill" style="left:1290px;top:116px">${R.ik.ok()} Home Assistant</div>
      <div class="przyg" data-r="przyg">Przygotuj</div><div class="karty">${karty}</div>`;
  },
  rys(r, t) {
    pojaw(q(r, "[data-r=tag]"), t, .1); pojaw(q(r, "[data-r=h1]"), t, .25, .7, 34); pojaw(q(r, "[data-r=g]"), t, .8); pojaw(q(r, "[data-r=p]"), t, 1.25);
    const hero = q(r, "[data-r=hero]"), hx = eo(seg(t, .5, 1.4)); op(hero, hx); hero.style.transform = `translateX(${((1 - hx) * 40).toFixed(1)}px)`;
    rysDrut(r, "hA", eio(seg(t, .9, 1.9)), t, seg(t, 2.1, 2.5)); rysDrut(r, "hB", eio(seg(t, 1, 2)), t, seg(t, 2.1, 2.5));
    ekran(r, "main"); led(r, "ledPWR", t > 1.9 ? 1 : 0); led(r, "ledRS", miga(t, 2.2)); fale(r, t, 2.2);
    const pill = q(r, "[data-r=pill]"); op(pill, eo(seg(t, 2.4, 2.9)));
    op(q(r, "[data-r=przyg]"), eo(seg(t, 3.1, 3.5)));
    qa(r, ".karta").forEach((k, i) => { const x = eo(seg(t, 3.3 + i * .35, 3.9 + i * .35)); op(k, x); k.style.transform = `translateY(${((1 - x) * 40).toFixed(1)}px)`; });
  } });

// 2 ─ MENU POMPY
SC.push({ id: "menu", dl: 14, krok: 1, tytul: "Sprawdź menu pompy",
  kroki: [[.4, "Na sterowniku ściennym naciśnij ^MENU."], [2.2, "Wejdź w menu serwisanta. Hasło zwykle ^234."], [5.2, "Otwórz ^17. ^HMI ^ADDRESS ^SET."],
    [7.5, "^17.1 ^HMI ^SET = +GŁÓWNA."], [9.0, "^17.2 = +1. To ustawienie fabryczne."], [10.8, "Po wyjściu z menu pompa się wyłącza. Włącz ją przyciskiem ^ON/OFF."]],
  html: () => `<svg viewBox="0 0 1140 880" class="okienko"><g data-r="cam"><g transform="translate(310 160)" filter="url(#fCien)">${R.przod()}</g></g></svg>
    <div class="chip zi" data-r="c171">17.1 HMI SET = GŁÓWNA ${R.ik.ok()}</div><div class="chip zi" data-r="c172">17.2 = 1 ${R.ik.ok()}</div>
    <div class="chip stan" data-r="stan"><span class="kr"></span><span class="st"></span></div>`,
  rys(r, t) {
    kamera(q(r, "[data-r=cam]"), t, [[0, 570, 440, 1], [6.8, 570, 440, 1], [7.5, 570, 360, 2.3], [10.3, 570, 360, 2.3], [10.9, 570, 440, 1]]);
    ekran(r, t < 1.45 ? "main" : t < 3.35 ? "menu" : t < 5.05 ? "haslo" : t < 6.75 ? "lista" : t < 11.6 ? "e17" : "main");
    wiersz(r, "menu", "m", 25, [2.0, 2.25, 2.5, 2.75].filter((x) => t >= x).length);
    wiersz(r, "lista", "l", 28, [5.5, 5.75, 6.0].filter((x) => t >= x).length);
    const cyf = [3.75, 4.15, 4.55];
    cyf.forEach((tc, i) => { q(r, `[data-r=cyfra${i}]`).textContent = t >= tc ? "234"[i] : "0";
      const akt = t >= (i ? cyf[i - 1] : 0) && t < tc + .25, p = q(r, `[data-r=pole${i}]`);
      p.setAttribute("stroke-width", akt ? 3.4 : 1.6); p.setAttribute("fill", akt ? "rgba(58,61,114,.16)" : "none"); });
    wcisnij(r, t, [[1.3, "MENU"], [2.0, "DOWN"], [2.25, "DOWN"], [2.5, "DOWN"], [2.75, "DOWN"], [3.2, "OK"], [3.75, "UP"], [4.15, "UP"], [4.55, "UP"], [4.9, "OK"],
      [5.5, "DOWN"], [5.75, "DOWN"], [6.0, "DOWN"], [6.6, "OK"], [11.15, "BACK"], [11.45, "BACK"], [12.6, "ONOFF"]]);
    const zn = 1 - seg(t, 10.2, 10.5);
    sop(q(r, "[data-r=ring1]"), eo(seg(t, 7.6, 7.9)) * zn); sop(q(r, "[data-r=ring2]"), eo(seg(t, 9.1, 9.4)) * zn);
    chip(q(r, "[data-r=c171]"), t, 7.7, 10.2, 380, 765); chip(q(r, "[data-r=c172]"), t, 9.2, 10.2, 835, 765);
    stan(q(r, "[data-r=stan]"), t, [[11.65, false], [12.75, true]], 570, 92);
  } });

// 3 ─ ZDEJMIJ STEROWNIK
SC.push({ id: "sterownik", dl: 13, krok: 2, tytul: "Zdejmij sterownik",
  kroki: [[.4, "Wyłącz pompę przyciskiem ^ON/OFF."], [2.3, "Zdejmij sterownik ze ściany i obróć go."], [5.0, "Listwa ~E ~Y ~X ~B ~A to przewody do pompy. !Nie !ruszaj."],
    [7.6, "Po prawej zaciski ^H2 (wyżej) i %H1 (niżej)."]],
  html: () => `<svg viewBox="0 0 1140 880" class="okienko"><g data-r="cam">
      <rect x="150" y="30" width="840" height="820" rx="26" fill="url(#pSciana)" stroke="rgba(110,160,255,.2)" stroke-width="2"/>
      <g data-r="przod" filter="url(#fCien)">${R.przod()}</g>
      <g data-r="tyl" filter="url(#fCien)" opacity="0">${R.tyl()}
        <rect data-r="ramka" x="20" y="-18" width="248" height="202" rx="16" fill="none" stroke="#ff5470" stroke-width="5" stroke-dasharray="18 12" opacity="0"/>
        <circle data-r="rH2" cx="437" cy="125" r="34" fill="none" stroke="#4f8cff" stroke-width="3" vector-effect="non-scaling-stroke" opacity="0"/>
        <circle data-r="rH1" cx="437" cy="190" r="34" fill="none" stroke="#d9a06e" stroke-width="3" vector-effect="non-scaling-stroke" opacity="0"/></g>
    </g></svg>
    <div class="et" data-r="esc" style="left:210px;top:818px">ściana</div>
    <div class="chip stan" data-r="stan"><span class="kr"></span><span class="st"></span></div>
    <div class="chip cz" data-r="nr">${R.ik.zle()} NIE RUSZAJ</div>
    <div class="chip duzy" data-r="cH2" style="border-color:#4f8cff">H2 <span style="font-size:.52em;color:#97a8cc;font-weight:500">wyżej</span></div>
    <div class="chip duzy" data-r="cH1" style="border-color:#d9a06e">H1 <span style="font-size:.52em;color:#97a8cc;font-weight:500">niżej</span></div>`,
  rys(r, t) {
    kamera(q(r, "[data-r=cam]"), t, [[0, 570, 440, 1], [7.7, 570, 440, 1], [8.7, 737, 328, 2.3]]);
    wcisnij(r, t, [[1.1, "ONOFF"]]); ekran(r, "main");
    stan(q(r, "[data-r=stan]"), t, [[0, true], [1.25, false]], 570, 70, 2.6);
    const lift = eio(seg(t, 2.7, 3.4)), fl = eio(seg(t, 3.5, 4.5)), mv = eio(seg(t, 4.5, 5.1)), sx = Math.abs(Math.cos(Math.PI * fl));
    const cx = lerp(lerp(570, 546, lift), 580, mv), cy = lerp(lerp(440, 412, lift), 470, mv), s = lerp(1 + .05 * lift, 1, mv);
    const pf = q(r, "[data-r=przod]"), pt = q(r, "[data-r=tyl]");
    if (fl < .5) { sop(pf, 1); sop(pt, 0); tr(pf, `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${(sx * s).toFixed(4)} ${s.toFixed(4)}) translate(-260 -280)`); }
    else { sop(pf, 0); sop(pt, 1); tr(pt, `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${(sx * s).toFixed(4)} ${s.toFixed(4)}) translate(-280 -300)`); }
    sop(q(r, "[data-r=ramka]"), eo(seg(t, 5.1, 5.5)) * (.7 + .3 * Math.sin(t * 6)) * (1 - seg(t, 7.5, 7.8)));
    chip(q(r, "[data-r=nr]"), t, 5.3, 7.5, 443, 402);
    op(q(r, "[data-r=esc]"), 1 - seg(t, 7.6, 8.2));
    const pr = eo(seg(t, 8.6, 8.9)) * (.65 + .35 * Math.sin(t * 5));
    sop(q(r, "[data-r=rH2]"), pr); sop(q(r, "[data-r=rH1]"), pr);
    chip(q(r, "[data-r=cH2]"), t, 8.8, 1e9, 875, 364); chip(q(r, "[data-r=cH1]"), t, 9.1, 1e9, 875, 514);
  } });

// 4 ─ UWAGA: TYLKO STEROWNIK ŚCIENNY
const JEDNOSTKA = `<rect x="30" y="16" width="440" height="560" rx="22" fill="#d9dde1" stroke="#aeb4ba" stroke-width="3"/>
  <rect x="56" y="42" width="388" height="508" rx="12" fill="#1c2436"/>
  <rect x="86" y="74" width="328" height="320" rx="6" fill="url(#gPcb)" stroke="#135a31" stroke-width="2"/>
  <rect x="108" y="98" width="86" height="62" rx="4" fill="#1e5bd6"/><rect x="208" y="98" width="62" height="48" rx="4" fill="#1e5bd6"/><rect x="282" y="98" width="62" height="48" rx="4" fill="#1e5bd6"/>
  <circle cx="372" cy="122" r="22" fill="#1d1f22"/><circle cx="372" cy="176" r="22" fill="#1d1f22"/>
  <rect x="118" y="186" width="74" height="74" fill="#1b1d20"/><rect x="226" y="180" width="96" height="84" rx="6" fill="#d7b96a"/><path d="M234 196h80M234 212h80M234 228h80M234 244h80" stroke="#a88b40" stroke-width="4"/>
  <rect x="98" y="300" width="304" height="58" rx="6" fill="url(#gZiel)"/>
  ${[0, 1, 2, 3, 4, 5, 6].map((i) => R.sruba(120 + i * 43, 329, 14, 30 + i * 17, false)).join("")}
  <text x="292" y="292" text-anchor="middle" font-family="Inter" font-weight="700" font-size="22" fill="#f2f5f0">H1</text>
  <text x="335" y="292" text-anchor="middle" font-family="Inter" font-weight="700" font-size="22" fill="#f2f5f0">H2</text>
  <ellipse data-r="rJ" cx="313" cy="318" rx="58" ry="46" fill="none" stroke="#ff5470" stroke-width="5" opacity="0"/>
  ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${120 + i * 43} 358V${420 + (i % 3) * 30}" stroke="${["#222", "#555", "#2c4fa3", "#d6402f", "#2f8c3f", "#555", "#222"][i]}" stroke-width="7"/>`).join("")}
  <g transform="translate(250 500)"><path d="M-30 18L0-34 30 18Z" fill="#ffb020"/><path d="M3-20L-8 2H2L-4 14 10-6H0L6-20Z" fill="#1c2436"/></g>
  <text x="250" y="560" text-anchor="middle" font-family="Inter" font-weight="700" font-size="24" fill="#ffb020">230 / 400 V</text>`;
SC.push({ id: "uwaga", dl: 7, etykieta: "Uwaga", kolor: "#ff5470", tytul: "Tylko sterownik ścienny",
  kroki: [[.4, "!Nie podłączaj się do H1/H2 na płycie głównej jednostki."], [2.6, "To inna magistrala, nie Modbus."], [4.3, "Dwie żyły idą tylko do sterownika ściennego."]],
  html: () => `<div class="karta2" data-r="kL" style="left:0;top:30px;width:545px;height:820px;border-color:rgba(255,84,112,.55)">
      <div class="kt">Płyta główna jednostki</div><div class="kp">w środku pompy, wysokie napięcie</div>
      <svg viewBox="0 0 500 600">${JEDNOSTKA}</svg><div class="stempel" style="left:78%;top:24%;width:150px;height:150px;margin:-75px 0 0 -75px">${R.ik.zle()}</div></div>
    <div class="karta2" data-r="kP" style="left:595px;top:30px;width:545px;height:820px;border-color:rgba(46,230,166,.55)">
      <div class="kt">Sterownik ścienny</div><div class="kp">tył płytki, zaciski H2 i H1</div>
      <svg viewBox="0 0 500 600"><g transform="translate(34 160) scale(.76)">${R.tyl()}</g>
        <circle data-r="rP" cx="366" cy="280" rx="0" r="62" fill="none" stroke="#2ee6a6" stroke-width="5" opacity="0"/></svg>
      <div class="stempel" style="left:80%;top:86%;width:150px;height:150px;margin:-75px 0 0 -75px">${R.ik.ok()}</div></div>`,
  rys(r, t) {
    const kL = q(r, "[data-r=kL]"), kP = q(r, "[data-r=kP]");
    pojaw(kL, t, .2, .5, 30); pojaw(kP, t, 3.6, .5, 30);
    sop(q(r, "[data-r=rJ]"), eo(seg(t, .8, 1.1)) * (.65 + .35 * Math.sin(t * 6)));
    sop(q(r, "[data-r=rP]"), eo(seg(t, 4.3, 4.6)) * (.65 + .35 * Math.sin(t * 6)));
    [[kL, 1.0], [kP, 4.6]].forEach(([k, a]) => { const st = q(k, ".stempel"), s = seg(t, a, a + .45); op(st, eo(s)); st.style.transform = `scale(${lerp(1.8, 1, ebk(s)).toFixed(3)}) rotate(${lerp(-14, 0, eo(s)).toFixed(1)}deg)`; });
  } });

// 5 ─ DWIE ŻYŁY
const PA = "M958 684C958 830 700 850 620 770C560 700 590 360 470 345C410 338 360 300 322 283";
const PB = "M920 684C920 790 720 800 660 720C610 650 620 450 500 440C430 434 360 400 322 381";
SC.push({ id: "przewody", dl: 14, krok: 3, tytul: "Podłącz dwie żyły",
  kroki: [[.4, "Niebieska żyła: ^H2 → ^A+ modułu."], [3.6, "Brązowa żyła: %H1 → %B− modułu."], [7.0, "Masy (GND) nie łączysz."],
    [8.8, "Istniejących przewodów nie odpinasz."], [10.8, "Załóż sterownik z powrotem i włącz pompę."]],
  html: () => `<svg viewBox="0 0 1140 880"><defs><clipPath id="clip5"><rect x="250" y="30" width="310" height="300" rx="14"/></clipPath></defs>
      <g transform="translate(30 140) scale(1.5) translate(-250 -30)"><g clip-path="url(#clip5)">${R.tyl({ bezDrutow: true })}</g><rect x="250" y="30" width="310" height="300" rx="14" fill="none" stroke="rgba(110,160,255,.45)" stroke-width="1.5"/></g>
      ${drut(PB, "#a0602f", "dB", 12)}${drut(PA, "#3a78e0", "dA", 12)}
      <g transform="translate(800 250)">${R.modul()}</g>
      <circle data-r="rGND" cx="913" cy="353" r="22" fill="none" stroke="#ff5470" stroke-width="4" opacity="0"/>
      <g data-r="sr" opacity="0">${R.srubokret()}</g>
      <g data-r="mini" opacity="0" transform="translate(70 646) scale(.3)">${R.przod()}</g></svg>
    <div class="chip duzy" data-r="cA" style="border-color:#4f8cff;color:#9cc2ff">A+</div>
    <div class="chip duzy" data-r="cB" style="border-color:#d9a06e;color:#f1c9a4">B−</div>
    <div class="badge" data-r="bGnd" style="left:858px;top:136px;border-color:rgba(255,84,112,.85)">${R.ik.zle()} GND nie łączysz</div>
    <div class="badge" data-r="bLst" style="left:30px;top:44px">${R.ik.klodka()} <span class="lst">E Y X B A</span> zostają podłączone</div>
    <div class="chip stan" data-r="stan"><span class="kr"></span><span class="st"></span></div>`,
  rys(r, t) {
    rysDrut(r, "dA", eio(seg(t, .9, 2.5)), t); rysDrut(r, "dB", eio(seg(t, 4.1, 5.7)), t);
    chip(q(r, "[data-r=cA]"), t, 2.4, 1e9, 1066, 700); chip(q(r, "[data-r=cB]"), t, 5.6, 1e9, 748, 652);
    const sr = q(r, "[data-r=sr]"); let sv = 0;
    for (const [a, x, y] of [[2.5, 311, 283], [5.75, 311, 381]]) { const s = seg(t, a, a + .9); if (s > 0 && s < 1) { sv = Math.min(seg(s, 0, .2), 1 - seg(s, .8, 1));
      const wej = 1 - eo(seg(s, 0, .25)); tr(sr, `translate(${x + 40 * wej} ${y - 40 * wej}) rotate(${(35 + 11 * Math.sin(t * 19)).toFixed(2)})`); } }
    sop(sr, sv);
    sop(q(r, "[data-r=rGND]"), eo(seg(t, 7.1, 7.4)) * (.65 + .35 * Math.sin(t * 6)) * (1 - seg(t, 8.8, 9.1)));
    const bg = q(r, "[data-r=bGnd]"); pojaw(bg, t, 7.2, .4, 14, 8.8);
    pojaw(q(r, "[data-r=bLst]"), t, 9.0, .4, 14);
    const mini = q(r, "[data-r=mini]"); sop(mini, eo(seg(t, 10.9, 11.3)));
    wcisnij(r, t, [[11.85, "ONOFF"]]); ekran(r, "main");
    stan(q(r, "[data-r=stan]"), t, [[11.0, false], [11.95, true]], 392, 728);
  } });

// 6 ─ ZASILANIE MODUŁU
SC.push({ id: "zasilanie", dl: 10.5, krok: 4, tytul: "Zasilanie modułu",
  kroki: [[.4, "Podłącz ładowarkę ^USB-C (5 V)."], [2.0, "Dioda !PWR świeci na czerwono."], [3.8, "Po chwili miga niebieska ^RS485: moduł rozmawia z pompą."],
    [6.8, "!Nigdy nie podawaj zasilania na H1/H2."]],
  html: () => `<svg viewBox="0 0 1140 880" class="okienko"><g data-r="cam">
      ${drut("M595 740C595 800 565 830 530 862", "#a0602f", "sB", 13)}${drut("M642.5 740C642.5 805 670 835 700 862", "#3a78e0", "sA", 13)}
      <g transform="translate(445 200) scale(1.25)">${R.modul({ antena: "krotka" })}</g>
      <g data-r="kab"><path class="k1" fill="none" stroke="#060a14" stroke-width="15" stroke-linecap="round"/><path class="k2" fill="none" stroke="#e9ecee" stroke-width="10" stroke-linecap="round"/></g>
      <g data-r="wtyk">${R.wtykUSB()}</g>
      <g transform="translate(930 170)">${R.ladowarka()}</g></g></svg>
    <div class="chip cz ma" data-r="cPWR"><span class="kr" style="width:14px;height:14px;border-radius:50%;background:#ff3a3a;box-shadow:0 0 12px #ff3a3a"></span>PWR</div>
    <div class="chip ma" data-r="cRS" style="border-color:#4f8cff"><span class="kr" style="width:14px;height:14px;border-radius:50%;background:#3d7bff;box-shadow:0 0 12px #3d7bff"></span>RS485</div>
    <div class="et" data-r="eDo" style="left:860px;top:845px">do sterownika (H2, H1)</div>
    <div class="zakaz" data-r="zak" style="left:250px;top:4px">${R.ik.uwaga()} zasilanie → <span class="pady">H1 H2</span> ${R.ik.zle()}</div>`,
  rys(r, t) {
    const c = kamera(q(r, "[data-r=cam]"), t, [[0, 570, 440, 1], [1.8, 570, 440, 1], [2.5, 575, 410, 1.55], [6.2, 575, 410, 1.55], [6.8, 570, 440, 1]]);
    const dy = lerp(-95, 0, eio(seg(t, .6, 1.4))), py = 200 + dy;
    tr(q(r, "[data-r=wtyk]"), `translate(620 ${py.toFixed(1)}) scale(1.25)`); sop(q(r, "[data-r=wtyk]"), eo(seg(t, .3, .7)));
    const d = `M930 226C930 330 620 ${(py - 190).toFixed(1)} 620 ${(py - 70).toFixed(1)}`;
    qa(r, "[data-r=kab] path").forEach((p) => p.setAttribute("d", d)); sop(q(r, "[data-r=kab]"), eo(seg(t, .3, .7)));
    led(r, "ledPWR", t > 1.6 ? 1 : 0); led(r, "ledRS", miga(t, 4.4));
    rysDrut(r, "sA", 1, t, seg(t, 4.4, 4.8)); rysDrut(r, "sB", 1, t, seg(t, 4.4, 4.8));
    const [px, ppy] = mapuj(c, 630, 400), [rx, ry] = mapuj(c, 510, 400);
    chip(q(r, "[data-r=cPWR]"), t, 2.1, 6.2, px, ppy + 125); chip(q(r, "[data-r=cRS]"), t, 4.0, 6.2, rx, ry + 125);
    op(q(r, "[data-r=eDo]"), 1 - seg(t, 1.8, 2.2) + seg(t, 6.5, 7));
    const z = q(r, "[data-r=zak]"); pojaw(z, t, 6.9, .45, 18);
  } });

// 7 ─ SIEĆ WI-FI (makieta telefonu)
SC.push({ id: "siec", dl: 12.5, krok: 5, tytul: "Połącz z Wi-Fi",
  kroki: [[.4, "W telefonie wybierz Wi-Fi ^„pompa-setup”."], [2.3, "Hasło: ^pompa-setup."], [4.5, "Otworzy się strona ^192.168.4.1."],
    [6.2, "Wybierz swoją sieć domową i wpisz hasło."], [9.2, "Sieć „pompa-setup” znika. +Gotowe."]],
  html: () => `<svg viewBox="0 0 1140 880">
      <path data-r="link" d="M175 430C330 540 760 540 905 455" fill="none" stroke="#2ee6a6" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round" opacity="0"/>
      <g transform="translate(70 300) scale(.5)">${R.modul({ antena: "krotka" })}</g>
      <g data-r="fale" transform="translate(90 240)" fill="none" stroke="#39c0ff" stroke-width="5" stroke-linecap="round">${[22, 40, 58].map((rr) => `<path d="M${-rr * .7} ${-rr * .7}A${rr} ${rr} 0 0 1 ${rr * .7} ${-rr * .7}"/>`).join("")}</g>
      <g transform="translate(870 380) scale(.8)">${R.router("router · sieć domowa")}</g></svg>
    <div class="et" style="left:120px;top:560px">moduł</div><div class="et" data-r="eAP" style="left:110px;top:150px;color:#39c0ff">pompa-setup</div>
    <div style="position:absolute;left:380px;top:30px">${TEL(`
      <div class="pg" data-p="wifi"><div class="pt">Wi-Fi</div><div class="grp"><div class="row"><span>Wi-Fi</span><i class="tgl"></i></div></div>
        <div class="sec">SIECI</div><div class="grp">${wifiRow("MojDom")}${wifiRow("pompa-setup", "rPompa")}${wifiRow("Kowalscy_5G")}</div></div>
      <div class="pg" data-p="haslo"><div class="mt">Wpisz hasło do sieci<br>„pompa-setup”</div><div class="fld akt" data-r="fHaslo"></div>
        <div class="btns"><span>Anuluj</span><span class="pri" data-r="bPolacz">Połącz</span></div></div>
      <div class="pg" data-p="www"><div class="url">${R.ik.klodkaMala("#666")}192.168.4.1</div><div class="www"><div class="wh">WiFi Networks</div>
        <div class="wl" data-r="wMoj"><span>MojDom</span>${R.ik.wifi()}</div><div class="wl"><span>Kowalscy_5G</span>${R.ik.wifi()}</div>
        <div class="wh" style="margin-top:16px">WiFi Settings</div><div class="wlab">SSID</div><div class="fld" data-r="fSsid"></div>
        <div class="wlab">Password</div><div class="fld" data-r="fPass"></div><div class="wbtn" data-r="bSave">Save</div></div></div>
      <div class="pg" data-p="wifi2"><div class="pt">Wi-Fi</div><div class="grp"><div class="row"><span>Wi-Fi</span><i class="tgl"></i></div>
        <div class="row"><span class="ptk">✓ MojDom</span><span class="ri">${R.ik.klodkaMala()}${R.ik.wifi()}</span></div></div>
        <div class="sec">SIECI</div><div class="grp">${wifiRow("pompa-setup", "rPompa2")}${wifiRow("Kowalscy_5G")}</div></div>`)}</div>
    <div class="ilu">ILUSTRACJA</div>`,
  rys(r, t) {
    const ek = q(r, ".ek"), str = t < 2.1 ? "wifi" : t < 4.4 ? "haslo" : t < 8.75 ? "www" : "wifi2";
    ["wifi", "haslo", "www", "wifi2"].forEach((n) => op(q(r, `[data-p=${n}]`), n === str ? 1 : 0));
    q(r, "[data-r=rPompa]").style.background = `rgba(10,132,255,${(.22 * eo(seg(t, .8, 1.2))).toFixed(3)})`;
    pisz(q(r, "[data-r=fHaslo]"), "pompa-setup", t, 2.6, 3.8);
    q(r, "[data-r=wMoj]").classList.toggle("hl", t >= 6.6);
    q(r, "[data-r=fSsid]").textContent = t >= 6.7 ? "MojDom" : "";
    q(r, "[data-r=fSsid]").classList.toggle("akt", t >= 6.7 && t < 7.0);
    pisz(q(r, "[data-r=fPass]"), "••••••••••", t, 7.0, 8.0, true); q(r, "[data-r=fPass]").classList.toggle("akt", t >= 6.95 && t < 8.6);
    const rp = q(r, "[data-r=rPompa2]"), zw = eio(seg(t, 9.6, 10.3));
    rp.style.height = lerp(58, 0, zw).toFixed(1) + "px"; rp.style.opacity = (1 - seg(t, 9.4, 9.9)).toFixed(3);
    rp.style.textDecoration = t > 9.3 ? "line-through" : "none"; rp.style.borderBottomWidth = zw > .98 ? "0" : "1px";
    tapy(r, ek, t, [[1.9, "[data-r=rPompa]"], [4.2, "[data-r=bPolacz]"], [6.6, "[data-r=wMoj]"], [8.5, "[data-r=bSave]"]]);
    fale(r, t, 0, 9.0); op(q(r, "[data-r=eAP]"), 1 - seg(t, 9.0, 9.5));
    const ln = q(r, "[data-r=link]"); sop(ln, eo(seg(t, 9.3, 9.8))); ln.setAttribute("stroke-dashoffset", (-t * 36).toFixed(1));
    led(r, "ledPWR", 1); led(r, "ledRS", miga(t, 0));
  } });

// 8 ─ HOME ASSISTANT (makieta)
const SIDE = (it) => `<div class="side"><div class="hlogo"><i class="hdot"></i>Home Assistant</div>
  <div class="it">${`<svg viewBox="0 0 24 24">${R.ha.przeglad}</svg>`}Przegląd</div>
  <div class="it" data-r="itPompa" style="height:0">${`<svg viewBox="0 0 24 24">${R.ha.pompa}</svg>`}Pompa</div>
  <div class="it"><svg viewBox="0 0 24 24">${R.ha.energia}</svg>Energia</div><div class="it"><svg viewBox="0 0 24 24">${R.ha.mapa}</svg>Mapa</div>
  <div class="it"><svg viewBox="0 0 24 24">${R.ha.historia}</svg>Historia</div><div class="sp"></div>
  <div class="it" data-r="itUst"><svg viewBox="0 0 24 24">${R.ha.ustawienia}</svg>Ustawienia</div></div>`;
const SCHEMAT = `<svg viewBox="0 20 420 360" style="width:100%;height:430px;display:block">
  <rect x="14" y="150" width="130" height="150" rx="12" fill="#d9dde1"/><circle cx="79" cy="225" r="48" fill="#2a3245"/>
  <g data-r="wiatrak" transform="translate(79 225)">${[0, 120, 240].map((a) => `<path transform="rotate(${a})" d="M0 0C10-10 30-12 40-4C30 2 12 6 0 0Z" fill="#9aa5b8"/>`).join("")}<circle r="7" fill="#d9dde1"/></g>
  <text x="79" y="330" text-anchor="middle" font-family="Inter" font-weight="500" font-size="16" fill="#8b9198">pompa ciepła</text>
  <path d="M408 110L334 50 260 110V300H408Z" fill="none" stroke="#c9ccd1" stroke-width="5" stroke-linejoin="round"/>
  <rect x="280" y="214" width="60" height="58" rx="5" fill="none" stroke="#ff7a59" stroke-width="4"/><path d="M292 214v58M304 214v58M316 214v58M328 214v58" stroke="#ff7a59" stroke-width="3"/>
  <rect x="354" y="190" width="40" height="84" rx="16" fill="none" stroke="#39c0ff" stroke-width="4"/>
  <text x="334" y="330" text-anchor="middle" font-family="Inter" font-weight="500" font-size="16" fill="#8b9198">dom i ciepła woda</text>
  <path data-r="rura1" d="M144 230H280" stroke="#ff7a59" stroke-width="7" fill="none" stroke-dasharray="14 10"/>
  <path data-r="rura2" d="M280 262H144" stroke="#39c0ff" stroke-width="7" fill="none" stroke-dasharray="14 10"/>
  <text x="206" y="216" text-anchor="middle" font-family="Inter" font-weight="700" font-size="18" fill="#ff7a59">36 °C</text>
  <text x="206" y="290" text-anchor="middle" font-family="Inter" font-weight="700" font-size="18" fill="#39c0ff">31 °C</text></svg>`;
SC.push({ id: "ha", dl: 15, krok: 6, tytul: "Home Assistant",
  kroki: [[.4, "Ustawienia → Urządzenia i usługi."], [2.4, "Wykryto: ^Pompa ^Modbus → ^Dodaj."], [4.5, "Otwórz dodatek ^„Pompa ^w ^HA”."],
    [6.0, "Wklej klucz z maila i kliknij ^„Zainstaluj”."], [10.4, "Po minucie w pasku bocznym jest ^„Pompa”. +Gotowe."]],
  html: () => `<div class="ha" style="left:10px;top:40px;width:1120px;height:800px">${SIDE()}
      <div class="main">
        <div class="pg" data-p="ust"><div class="hh">Ustawienia</div>
          <div class="li" data-r="liUrz"><i class="ic n"></i><div><b>Urządzenia i usługi</b><small>Integracje, urządzenia, encje</small></div></div>
          <div class="li"><i class="ic p"></i><div><b>Automatyzacje i sceny</b><small>Automatyzacje, sceny, skrypty</small></div></div>
          <div class="li"><i class="ic z"></i><div><b>Obszary i strefy</b><small>Pomieszczenia i piętra</small></div></div>
          <div class="li"><i class="ic f"></i><div><b>Dodatki</b><small>Dodatkowe aplikacje</small></div></div>
          <div class="li"><i class="ic"></i><div><b>System</b><small>Kopie zapasowe, sieć, aktualizacje</small></div></div></div>
        <div class="pg" data-p="urz"><div class="hh">Urządzenia i usługi</div><div class="tabs"><b>Integracje</b><span>Urządzenia</span><span>Encje</span></div>
          <div class="sec">Wykryto</div>
          <div class="card odkr"><div class="cb"><i class="esp">ESP</i><div><b>Pompa Modbus</b><small>ESPHome</small></div></div><div class="cbtn" data-r="bDodaj">Dodaj</div><div class="cdone" data-r="dodano">${R.ik.ok()} Dodano</div></div>
          <div class="sec">Skonfigurowane</div><div class="grid"><div class="card"><i class="ic n"></i>ESPHome</div><div class="card"><i class="ic z"></i>Met.no</div><div class="card"><i class="ic p"></i>Słońce</div></div></div>
        <div class="pg" data-p="dod"><div class="hh">Pompa w HA <span class="okr">Ustawienia › Dodatki</span></div>
          <div class="panelD"><div class="lab">Klucz z maila</div><div class="fld" data-r="fKlucz"></div><div class="cbtn duzy" data-r="bInst">Zainstaluj</div>
            <div class="pas"><i data-r="pas"></i></div>
            <div class="prog"><div class="pr" data-r="p0">${R.ik.ok()} Zapisuję pakiety, karty i pulpit</div><div class="pr" data-r="p1">${R.ik.ok()} Sprawdzam konfigurację</div><div class="pr" data-r="p2">${R.ik.ok()} Restartuję Home Assistant</div></div></div></div>
        <div class="pg" data-p="pan"><div class="hh">Pompa</div><div class="dash">
          <div class="tile"><small>Obieg teraz</small>${SCHEMAT}</div>
          <div class="tiles"><div class="tile"><small>COP teraz</small><b style="color:#2ee6a6">4,1</b></div><div class="tile"><small>Na zewnątrz</small><b>7 °C</b></div>
            <div class="tile"><small>Zasilanie</small><b style="color:#ff7a59">36 °C</b></div><div class="tile"><small>Ciepła woda</small><b style="color:#39c0ff">42 °C</b></div>
            <div class="tile"><small>Moc grzania</small><b>4,9 kW</b></div><div class="tile"><small>Pobór prądu</small><b>1,2 kW</b></div></div></div></div>
      </div><div class="kursor" data-r="kur">${R.ik.kursor()}</div><div class="klik" data-r="klik"></div></div>
    <div class="ilu">ILUSTRACJA</div>`,
  rys(r, t) {
    const ha = q(r, ".ha"), str = t < 1.7 ? "ust" : t < 4.75 ? "urz" : t < 11.35 ? "dod" : "pan";
    ["ust", "urz", "dod", "pan"].forEach((n) => op(q(r, `[data-p=${n}]`), n === str ? 1 : 0));
    const dod = t >= 3.6; op(q(r, "[data-r=bDodaj]"), dod ? 0 : 1); op(q(r, "[data-r=dodano]"), eo(seg(t, 3.6, 3.9)));
    const fk = q(r, "[data-r=fKlucz]"); fk.textContent = t >= 6.85 ? "RPRO-XXXX-XXXX-XXXX" : ""; fk.classList.toggle("akt", t >= 6.6 && t < 7.7);
    fk.style.background = `rgba(41,182,246,${(.35 * puls(t, 6.85, .5)).toFixed(3)})`;
    const bi = q(r, "[data-r=bInst]"); bi.style.filter = `brightness(${(1 - .25 * puls(t, 7.62, .3)).toFixed(3)})`;
    q(r, "[data-r=pas]").style.width = (100 * eio(seg(t, 7.8, 10.1))).toFixed(1) + "%";
    [8.3, 8.95, 9.7].forEach((a, i) => pojaw(q(r, `[data-r=p${i}]`), t, a, .35, 10));
    const ip = q(r, "[data-r=itPompa]"); ip.style.height = (54 * eio(seg(t, 10.5, 10.9))).toFixed(1) + "px";
    const pa = t >= 11.25; ip.classList.toggle("akt", pa); q(r, "[data-r=itUst]").classList.toggle("akt", !pa);
    ip.style.boxShadow = `inset 0 0 0 2px rgba(255,176,32,${(puls(t, 10.6, 1.0)).toFixed(3)})`;
    tr(q(r, "[data-r=wiatrak]"), `translate(79 225) rotate(${(t * 220).toFixed(1)})`);
    q(r, "[data-r=rura1]").setAttribute("stroke-dashoffset", (-t * 40).toFixed(1)); q(r, "[data-r=rura2]").setAttribute("stroke-dashoffset", (-t * 40).toFixed(1));
    kursorMysz(r, ha, t, [[.3, [760, 600]], [1.4, "[data-r=liUrz]", 1], [3.4, "[data-r=bDodaj]", 1], [4.9, [720, 420]], [6.6, "[data-r=fKlucz]", 1], [7.6, "[data-r=bInst]", 1],
      [10.3, [520, 360]], [11.15, "[data-r=itPompa]", 1], [12.3, [760, 560]]], .2, 12.4);
  } });

// 9 ─ WARIANT LAN
const LA = "M150 203C195 236 262 250 320 360C390 500 430 720 590.75 712C590.75 680 590.75 640 590.75 600";
const LB = "M150 281C190 312 240 330 290 420C350 540 400 740 556.25 735C556.25 700 556.25 650 556.25 600";
SC.push({ id: "lan", dl: 11.5, etykieta: "Zestaw Wi-Fi + LAN", kolor: "#ffb020", tytul: "Wariant z kablem",
  kroki: [[.4, "Bramka ^RS-485 ^→ ^LAN: te same dwie żyły, ^H2 → ^A+ i %H1 → %B−."], [2.8, "Zasilacz ^5 V z zestawu."], [4.2, "Kabel sieciowy do routera."],
    [6.0, "W dodatku: ^„Szukaj ^bramki ^LAN” → ^„Użyj”."], [9.4, "Kroków z Wi-Fi nie robisz."]],
  html: () => `<svg viewBox="0 0 1140 880"><defs><clipPath id="clip9"><rect x="330" y="40" width="230" height="260" rx="14"/></clipPath></defs>
      <g transform="translate(20 100) scale(1.2) translate(-330 -40)"><g clip-path="url(#clip9)">${R.tyl({ bezDrutow: true })}</g><rect x="330" y="40" width="230" height="260" rx="14" fill="none" stroke="rgba(110,160,255,.45)" stroke-width="1.5"/></g>
      ${drut(LB, "#a0602f", "lB", 11)}${drut(LA, "#3a78e0", "lA", 11)}
      <g data-r="kDC"><path class="k1" fill="none" stroke="#060a14" stroke-width="12" stroke-linecap="round"/><path class="k2" fill="none" stroke="#2f343b" stroke-width="8" stroke-linecap="round"/></g>
      <g transform="translate(470 110) scale(1.15)">${R.bramka()}</g>
      <g data-r="kRJ"><path class="k1" fill="none" stroke="#060a14" stroke-width="15" stroke-linecap="round"/><path class="k2" fill="none" stroke="#8fb3d9" stroke-width="10" stroke-linecap="round"/></g>
      <g data-r="wRJ"><rect x="-36" y="-26" width="72" height="52" rx="7" fill="rgba(215,232,255,.92)" stroke="#8fb3d9" stroke-width="3"/><rect x="-24" y="-12" width="48" height="10" rx="2" fill="#c9a64a"/></g>
      <g data-r="wDC">${R.wtykDC()}</g>
      <g transform="translate(840 280) scale(.9)">${R.router()}</g>
      <g transform="translate(1000 110) scale(.85)">${R.zasilacz()}</g></svg>
    <div class="okno" data-r="ok9" style="left:660px;top:520px;width:470px">
      <div class="ot"><i></i>Pompa w HA · instalator</div>
      <div style="display:flex;align-items:center;gap:16px"><div class="ob jas" data-r="bSzukaj">Szukaj bramki LAN</div><span class="spin" data-r="spin"></span></div>
      <div class="wyn" data-r="wyn"><div><b>Bramka RS-485 → LAN</b><small>192.168.1.50</small></div><div class="ob" data-r="bUzyj">Użyj</div></div>
      <div class="okk" data-r="okk">${R.ik.ok()} Połączono z bramką</div></div>
    <div class="kursor" data-r="kur">${R.ik.kursor()}</div><div class="klik" data-r="klik"></div>`,
  rys(r, t) {
    rysDrut(r, "lA", eio(seg(t, .8, 2.4)), t, seg(t, 6.0, 6.4)); rysDrut(r, "lB", eio(seg(t, .9, 2.5)), t, seg(t, 6.0, 6.4));
    const dy = lerp(-70, 0, eio(seg(t, 3.0, 3.6))), py = 110 + dy;
    tr(q(r, "[data-r=wDC]"), `translate(556.25 ${py.toFixed(1)}) scale(1.15)`); sop(q(r, "[data-r=wDC]"), eo(seg(t, 2.8, 3.1)));
    const dDC = `M1000 160C1000 270 556.25 ${(py - 150).toFixed(1)} 556.25 ${(py - 58).toFixed(1)}`;
    qa(r, "[data-r=kDC] path").forEach((p) => p.setAttribute("d", dDC)); sop(q(r, "[data-r=kDC]"), eo(seg(t, 2.8, 3.1)));
    const dx = lerp(140, 0, eio(seg(t, 4.4, 5.0))), px = 556.25 + dx;
    tr(q(r, "[data-r=wRJ]"), `translate(${px.toFixed(1)} 211)`); sop(q(r, "[data-r=wRJ]"), eo(seg(t, 4.3, 4.6)));
    const dRJ = `M${(px + 36).toFixed(1)} 211C${(px + 170).toFixed(1)} 211 957 250 957 352`;
    const kr = q(r, "[data-r=kRJ]"); qa(kr, "path").forEach((p) => { p.setAttribute("d", dRJ); p.setAttribute("pathLength", "1"); p.setAttribute("stroke-dasharray", "1 2");
      p.setAttribute("stroke-dashoffset", (1 - eio(seg(t, 4.9, 5.7))).toFixed(4)); }); sop(kr, eo(seg(t, 4.3, 4.6)));
    led(r, "gPWR", t > 3.7 ? 1 : 0); led(r, "gLINK", t > 5.75 ? 1 : 0); led(r, "gLink", t > 5.75 ? 1 : 0);
    led(r, "gRX", miga(t, 6.0)); led(r, "gTX", miga(t + .37, 6.1)); led(r, "gAct", miga(t + .2, 6.0));
    const ok = q(r, "[data-r=ok9]"); pojaw(ok, t, 6.2, .45, 30);
    op(q(r, "[data-r=spin]"), seg(t, 7.05, 7.15) * (1 - seg(t, 7.8, 7.9))); q(r, "[data-r=spin]").style.transform = `rotate(${(t * 400).toFixed(0)}deg)`;
    pojaw(q(r, "[data-r=wyn]"), t, 7.85, .35, 10); pojaw(q(r, "[data-r=okk]"), t, 8.85, .35, 10);
    op(q(r, "[data-r=bUzyj]"), t >= 8.75 ? .45 : 1);
    kursorMysz(r, q(r, ".stage"), t, [[6.6, [1000, 860]], [7.0, "[data-r=bSzukaj]", 1], [8.6, "[data-r=bUzyj]", 1], [9.6, [1060, 860]]], 6.5, 9.9);
  } });

// 10 ─ DIAGNOSTYKA
SC.push({ id: "diag", dl: 10.5, krok: 7, tytul: "Diagnostyka",
  kroki: [[.4, "Panel ^„Pompa ^– ^instalator” sprawdza wszystko sam."], [2.2, "Zielony +✓ znaczy: działa."],
    [3.6, "Czerwony !✗ przy odczytach? Najpierw zamień przewody ^A i ^B."], [6.4, "Potem sprawdź: ^17.2 = ^1 i ^HMI ^SET = ^GŁÓWNA."]],
  html: () => `<div class="okno diag" data-r="pan" style="left:0;top:36px;width:700px;height:800px">
      <div class="ot"><i></i>Pompa – instalator</div>
      <div class="rw" data-r="w0">${R.ik.ok()}<div>Home Assistant widzi moduł</div></div>
      <div class="rw" data-r="w1"><span data-r="ikW1" style="display:flex"></span><div><span data-r="txW1">Odczyty z pompy</span><small data-r="smW1">co 5 sekund</small></div></div>
      <div class="rw" data-r="w2">${R.ik.ok()}<div>Pakiety Pro wczytane</div></div>
      <div class="rw" data-r="w3">${R.ik.ok()}<div>Klucz aktywny</div></div>
      <div class="ob jas" style="margin-top:12px">Wyślij raport do wsparcia</div></div>
    <svg viewBox="0 0 1140 880"><defs><clipPath id="clip10"><rect x="0" y="300" width="200" height="170"/></clipPath></defs>
      <g data-r="in1" opacity="0"><rect x="750" y="36" width="390" height="400" rx="24" fill="rgba(13,24,50,.85)" stroke="rgba(110,160,255,.25)" stroke-width="2"/>
        <text x="945" y="86" text-anchor="middle" font-family="Inter" font-weight="700" font-size="28" fill="#eaf0ff">Zamień A i B</text>
        ${drut("M0 0", "#3a78e0", "zA", 12)}${drut("M0 0", "#a0602f", "zB", 12)}
        <g transform="translate(845 -170)"><g clip-path="url(#clip10)">${R.modul()}</g></g>
        <path data-r="strz" d="M925 360C935 380 975 380 985 360M925 360l-2 12 12-4M985 360l2 12-12-4" fill="none" stroke="#ffb020" stroke-width="5" stroke-linecap="round" opacity="0"/></g>
      <g data-r="in2" opacity="0"><rect x="750" y="470" width="390" height="370" rx="24" fill="rgba(13,24,50,.85)" stroke="rgba(110,160,255,.25)" stroke-width="2"/>
        <text x="945" y="520" text-anchor="middle" font-family="Inter" font-weight="700" font-size="28" fill="#eaf0ff">Menu 17 na sterowniku</text>
        <rect x="768" y="548" width="354" height="258" rx="12" fill="#2a2e35"/>
        <g transform="translate(780 560) scale(1.032)"><rect width="320" height="204" fill="url(#gLcd)"/>${R.ekrany()}</g></g></svg>
    <div class="ilu" style="right:auto;left:540px">ILUSTRACJA</div>`,
  rys(r, t) {
    pojaw(q(r, "[data-r=pan]"), t, .1, .45, 24);
    [.6, .9, 1.2, 1.5].forEach((a, i) => pojaw(q(r, `[data-r=w${i}]`), t, a, .35, 12));
    const zle = t >= 3.7 && t < 8.8, w1 = q(r, "[data-r=w1]");
    w1.classList.toggle("zle", zle); q(r, "[data-r=ikW1]").innerHTML = zle ? R.ik.zle() : R.ik.ok();
    q(r, "[data-r=txW1]").textContent = zle ? "Brak odczytów z pompy" : "Odczyty z pompy";
    q(r, "[data-r=smW1]").textContent = zle ? "sprawdź przewody i menu 17" : t >= 8.8 ? "działa, co 5 sekund" : "co 5 sekund";
    const trz = zle ? 7 * Math.sin(t * 50) * (1 - seg(t, 3.7, 4.1)) : 0; w1.style.transform = `translateX(${trz.toFixed(1)}px)`;
    const i1 = q(r, "[data-r=in1]"); sop(i1, eo(seg(t, 4.0, 4.4)));
    const sw = eio(seg(t, 4.7, 5.7)), bx = lerp(965, 1003, sw), brx = lerp(1003, 965, sw);   // śruby B− (965) i A+ (1003) w tej wstawce
    rysDrut(r, "zA", 1, t, 0, `M${bx.toFixed(1)} 262C${bx.toFixed(1)} 360 905 400 905 425`);
    rysDrut(r, "zB", 1, t, 0, `M${brx.toFixed(1)} 262C${brx.toFixed(1)} 360 1065 400 1065 425`);
    sop(q(r, "[data-r=strz]"), puls(t, 4.6, 1.3));
    sop(q(r, "[data-r=in2]"), eo(seg(t, 6.5, 6.9))); ekran(r, "e17");
    sop(q(r, "[data-r=ring1]"), eo(seg(t, 7.0, 7.3)) * (.6 + .4 * Math.sin(t * 6))); sop(q(r, "[data-r=ring2]"), eo(seg(t, 6.8, 7.1)) * (.6 + .4 * Math.sin(t * 6)));
  } });

// 11 ─ PLANSZA KOŃCOWA (bez przycisków)
SC.push({ id: "koniec", dl: 6, bezLewej: true,
  napisy: [[0, "Pomoc mailowo: pompa@woleoze.pl. Instrukcja: pompa.woleoze.pl/instrukcja. Projekt woleOZE."]],
  html: () => `<div class="kon"><div class="plogo" data-r="a">POMPA<span>·HA</span></div>
    <div class="p1" data-r="b">Pomoc mailowo: <b>pompa@woleoze.pl</b></div><div class="p2" data-r="c">pompa.woleoze.pl/instrukcja</div>
    <div class="p3" data-r="d">projekt <b>woleOZE</b></div></div>`,
  rys(r, t) { pojaw(q(r, "[data-r=a]"), t, .15, .6, 30); pojaw(q(r, "[data-r=b]"), t, .6); pojaw(q(r, "[data-r=c]"), t, .9); pojaw(q(r, "[data-r=d]"), t, 1.3); } });

// ══════════════════════════ BUDOWA I KLATKA ══════════════════════════
function lewaHtml(s) {
  const lab = s.krok ? `Krok ${s.krok} z 7` : s.etykieta;
  const paski = s.krok ? [1, 2, 3, 4, 5, 6, 7].map((i) => `<i class="${i < s.krok ? "p" : i === s.krok ? "a" : ""}"></i>`).join("")
    : `<i class="a" style="width:150px;background:${s.kolor};box-shadow:0 0 14px ${s.kolor}"></i>`;
  return `<div class="lewa"><div class="krok" style="${s.kolor ? `color:${s.kolor}` : ""}">${lab}</div><div class="paski">${paski}</div><h2>${s.tytul}</h2>
    <div class="kroki">${s.kroki.map(([, tx]) => `<div class="k"><span class="n"><span class="bar"></span>${R.ik.ok()}</span><span class="tx">${slowa(tx)}</span></div>`).join("")}</div></div>`;
}
function rysLewa(s, tl) {
  const ks = s.kEls; let cur = -1; s.kroki.forEach(([t], i) => { if (tl >= t) cur = i; });
  pojaw(s.naglowek, tl, 0, .45, 16); pojaw(s.h2, tl, .08, .5, 20);
  ks.forEach((el, i) => {
    if (i > cur) { el.style.display = "none"; return; }
    el.style.display = "flex";
    const t = s.kroki[i][0], tn = i < s.kroki.length - 1 ? s.kroki[i + 1][0] : 1e9, m = eio(seg(tl, tn, tn + .45));
    el.style.fontSize = lerp(40, 27, m).toFixed(2) + "px";
    q(el, ".tx").style.opacity = lerp(1, .6, m).toFixed(3);
    q(el, ".bar").style.opacity = (1 - m).toFixed(3); q(el, ".n svg").style.opacity = m.toFixed(3);
    const ws = s.wEls[i], n = ws.length, k = Math.min(.085, .75 / n);
    ws.forEach((w, j) => { const x = eo(seg(tl, t + j * k, t + j * k + .38)); w.style.opacity = x.toFixed(3); w.style.transform = `translateY(${((1 - x) * 16).toFixed(1)}px)`; });
  });
}

let acc = 0;
const kont = document.getElementById("sceny");
kont.insertAdjacentHTML("beforeend", R.defs);
for (const s of SC) {
  s.t0 = acc; acc += s.dl;
  const sec = document.createElement("section"); sec.className = "sc"; sec.id = "sc-" + s.id;
  sec.innerHTML = s.bezLewej ? s.html() : lewaHtml(s) + `<div class="stage">${s.html()}</div>`;
  kont.appendChild(sec); s.root = sec;
  if (!s.bezLewej) { s.kEls = qa(sec, ".k"); s.wEls = s.kEls.map((k) => qa(k, ".w")); s.naglowek = q(sec, ".krok"); s.h2 = q(sec, ".lewa h2"); s.stage = q(sec, ".stage"); }
}
window.DL = Math.round(acc * 30) / 30;
window.POSTER = SC[0].poster;
window.SCENY = SC.map((s) => ({ id: s.id, od: s.t0, do: s.t0 + s.dl, tytul: s.tytul || (s.id === "tytul" ? "Plansza tytułowa" : "Plansza końcowa"), krok: s.krok || s.etykieta || "" }));
window.NAPISY = [];
for (const s of SC) {
  if (s.napisy) s.napisy.forEach(([t, tx], i, a) => window.NAPISY.push({ od: s.t0 + t, do: s.t0 + (a[i + 1] ? a[i + 1][0] : s.dl), tekst: tx }));
  else s.kroki.forEach(([t, tx], i, a) => window.NAPISY.push({ od: s.t0 + (i ? t : 0), do: s.t0 + (a[i + 1] ? a[i + 1][0] : s.dl),
    tekst: (i ? "" : `${s.krok ? `Krok ${s.krok} z 7` : s.etykieta}: ${s.tytul}.\n`) + czysty(tx) }));
}
const gora = document.getElementById("gora"), pasek = document.querySelector("#pasek i");
window.klatka = (t) => {
  SC.forEach((s, i) => {
    const a = i === 0 ? 1 : seg(t, s.t0, s.t0 + F / 2), b = i === SC.length - 1 ? 1 : 1 - seg(t, s.t0 + s.dl - F / 2, s.t0 + s.dl);
    const o = Math.min(a, b); op(s.root, o);
    if (o > 0) { const tl = t - s.t0;
      if (!s.bezLewej) { rysLewa(s, tl); const e = eo(seg(tl, 0, .6)); s.stage.style.transform = `translateY(${((1 - e) * 14).toFixed(1)}px) scale(${(.985 + .015 * e).toFixed(4)})`; }
      s.rys(s.root, tl); }
  });
  const ko = SC[SC.length - 1]; op(gora, 1 - seg(t, ko.t0 - F / 2, ko.t0));
  pasek.style.width = (100 * cl(t / window.DL)).toFixed(2) + "%";
};
(async () => {
  await Promise.all(["400 20px Inter", "500 20px Inter", "700 20px Inter", "500 20px Plex", "600 20px Plex"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const p = new URLSearchParams(location.search);
  window.klatka(Number(p.get("t") ?? 2.9));
  window.gotowe = true;
})();
