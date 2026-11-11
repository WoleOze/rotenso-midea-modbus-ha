// „Pompa: Start” – darmowa karta Lovelace pompy ciepła Midea M-Thermal (Rotenso Aquami i inne) na integracji midea_ac_lan.
// Bez dodatkowego sprzętu: stan pompy, temperatury, zadane, grzałki, prąd i ciepło z liczników Midea (dziś, miesiąc, 14 dni), COP,
// przełączniki strefy 1, CWU, ECO i trybu cichego. Bez zależności zewnętrznych.
// Element: <rotenso-start>. Konfiguracja karty (wszystko opcjonalne):
//   urzadzenie: <id>   – liczba z nazw encji midea_ac_lan (np. sensor.<id>_outdoor_temperature); bez niej karta szuka sama
//   encje:             – nadpisania pojedynczych encji (klucze jak w ENC niżej)
//   woleoze: false     – bez stopki i bez kafla „Chcesz więcej?”
// Licencja Start (patrz LICENSE). Projekt: github.com/WoleOze/rotenso-midea-modbus-ha
(() => {
const ENC = {
  temp_zew: 'sensor.{id}_outdoor_temperature', bojler: 'sensor.{id}_tank_actual_temperature',
  prad_licznik: 'sensor.{id}_total_energy_consumption', cieplo_licznik: 'sensor.{id}_total_produced_energy',
  grzanie: 'binary_sensor.{id}_status_heating', cwu: 'binary_sensor.{id}_status_dhw', ibh: 'binary_sensor.{id}_status_ibh', tbh: 'binary_sensor.{id}_status_tbh',
  blad: 'sensor.{id}_error_code', strefa1: 'climate.{id}_climate_zone1', zasobnik: 'water_heater.{id}_water_heater',
  sw_strefa1: 'switch.{id}_zone1_power', sw_cwu: 'switch.{id}_dhw_power', sw_eco: 'switch.{id}_eco_mode', sw_cichy: 'switch.{id}_silent_mode', krzywa: 'switch.{id}_zone1_curve',
};
const LINK_PRO = 'https://buy.stripe.com/3cIeVd9SIgVa9rS6aL3Je03';
const LINK_KONF = 'https://buy.stripe.com/7sYbJ1gh6gVa9rS56H3Je00';
const STOPKA = '<div class="stopka"><a href="https://woleoze.pl/pompa-ciepla/" target="_blank" rel="noopener">dane i kalkulatory: woleoze.pl</a> · <a href="https://github.com/WoleOze/rotenso-midea-modbus-ha#nie-chcesz-grzebać-w-yaml-skonfiguruję-to-za-ciebie" target="_blank" rel="noopener">pomoc przy konfiguracji</a></div>';
const BRAK = ['unknown', 'unavailable', '', undefined, null];
const f = (v, d = 0) => (v == null || isNaN(v) ? '–' : Number(v).toFixed(d).replace('.', ','));
const fT = (v) => (v == null || isNaN(v) ? '–' : `${f(v)}°C`);
const DZIEN = 864e5;

const CSS = `
:host{display:block;overflow-x:hidden;--bg:#040914;--panel:rgba(12,24,48,.74);--line:rgba(110,160,255,.16);--txt:#e8eefc;--mut:#8ea0c4;
--hp:#39c0ff;--vio:#b388ff;--ok:#2ee6a6;--warn:#ffb020;--bad:#ff5470}
*{box-sizing:border-box}
.w{min-height:100vh;padding:16px 18px 26px;color:var(--txt);font-family:"Inter","Segoe UI",Roboto,system-ui,sans-serif;font-variant-numeric:tabular-nums;
background:linear-gradient(rgba(80,130,255,.035) 1px,transparent 1px) 0 0/100% 32px,linear-gradient(90deg,rgba(80,130,255,.035) 1px,transparent 1px) 0 0/32px 100%,
radial-gradient(1100px 600px at 80% -10%,rgba(255,84,112,.12),transparent 60%),radial-gradient(900px 600px at -10% 20%,rgba(57,192,255,.14),transparent 60%),var(--bg)}
.top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.ttl{font-weight:800;letter-spacing:.2em;font-size:14px;color:var(--mut)}.ttl b{color:var(--txt)}
.zeg{font-size:40px;font-weight:800;line-height:1}.sp{flex:1}
.chip{display:flex;align-items:center;gap:8px;padding:8px 13px;border-radius:999px;border:1px solid var(--line);background:var(--panel);font-size:14px;white-space:nowrap}
.chip b{font-weight:800}.led{width:9px;height:9px;border-radius:50%;box-shadow:0 0 10px currentColor;background:currentColor}
.g{display:grid;gap:14px;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-flow:row dense}
.c{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:16px 18px;position:relative;overflow:hidden;min-width:0;
box-shadow:0 10px 40px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04)}
.c h3{margin:0 0 10px;font-size:12.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.c h3 span{letter-spacing:.04em;text-transform:none;font-weight:600}
.c3{grid-column:span 3}.c4{grid-column:span 4}.c8{grid-column:span 8}.c12{grid-column:span 12}
.duza{font-size:44px;font-weight:800;line-height:1.05}.pod{color:var(--mut);font-size:13px;margin-top:6px}.pod b{color:var(--txt)}
.stan{font-size:15px;line-height:1.5}
.mini{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.mini>div{background:rgba(255,255,255,.04);border-radius:14px;padding:10px 12px;min-width:0}
.mini small{color:var(--mut);font-size:12.5px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mini b{display:block;font-size:26px;font-weight:800;margin-top:2px}
.mini .kw{font-size:13px;color:var(--mut);margin-top:2px}.mini .kw span{color:var(--txt);font-weight:700}
svg{max-width:100%;display:block}svg text{font-family:inherit}
.prz{display:flex;flex-direction:column;gap:10px}
.sw{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;font-size:14.5px}.sw small{display:block;color:var(--mut);font-size:12.5px}
.tg{min-width:84px;height:38px;border-radius:11px;border:1px solid var(--line);font-weight:800;cursor:pointer;color:var(--txt);font-size:14px;background:rgba(255,255,255,.05);font-family:inherit}
.tg.on{background:rgba(46,230,166,.18);border-color:rgba(46,230,166,.6)}.tg:disabled{opacity:.45;cursor:default}
.uw{color:var(--mut);font-size:12.5px;margin-top:10px;line-height:1.45}
.pro{border-color:rgba(179,136,255,.45);background:linear-gradient(135deg,rgba(179,136,255,.16),rgba(57,192,255,.08)),var(--panel)}
.por{display:grid;grid-template-columns:auto auto 1fr;gap:6px 14px;font-size:14.5px;line-height:1.45;margin-bottom:14px}.por .n{font-weight:800}.por .cena{font-weight:800;color:var(--hp);white-space:nowrap}.por .o{color:var(--mut)}
.bt{display:flex;flex-wrap:wrap;gap:8px}
.bt a{display:inline-flex;align-items:center;padding:10px 16px;border-radius:11px;font-weight:800;font-size:14px;text-decoration:none;color:var(--txt);border:1px solid var(--line);background:rgba(255,255,255,.05)}
.bt a.b1{background:linear-gradient(135deg,#39c0ff,#2ee6a6);color:#03121e;border:0}.bt a:hover{filter:brightness(1.12)}
[data-mi]{cursor:pointer}.mini [data-mi]:hover,.duza[data-mi]:hover,.pod [data-mi]:hover,.chip[data-mi]:hover,.sw [data-mi]:hover{filter:brightness(1.25)}svg [data-mi]:hover{filter:brightness(1.5)}
.stopka{margin-top:16px;text-align:center;font-size:12px}.stopka a{color:var(--mut);opacity:.65;text-decoration:none}.stopka a:hover{opacity:1;text-decoration:underline}
@media (max-width:1150px){.c3{grid-column:span 6}.c8,.c4{grid-column:span 12}}
@media (max-width:640px){.c3{grid-column:span 12}.mini{grid-template-columns:repeat(2,minmax(0,1fr))}.zeg{font-size:30px}.w{padding:10px}.duza{font-size:36px}.por{grid-template-columns:auto 1fr}.por .o{grid-column:1/-1;margin-bottom:6px}}
`;

class RotensoStart extends HTMLElement {
  setConfig(c) { this.cfg = c || {}; this._woleoze = this.cfg.woleoze !== false; this.E = null; this._id = this.cfg.urzadzenie ? String(this.cfg.urzadzenie) : null; }
  getCardSize() { return 12; }
  set hass(h) {
    this._h = h; if (!this.cfg) this.setConfig({});
    if (!this.E) { if (!this._id) this._id = this._szukaj(); if (!this._id && !this.cfg.encje) { this._brak(); return; } this._encje(); }
    if (!this._init) { this._init = true; this._buduj(); this._tz = setInterval(() => this._zegar(), 1000); this._zegar();
      this._staty(); this._ts = setInterval(() => this._staty(), 1800e3); }
    const t = Date.now(); if (!this._ost || t - this._ost > 1500) { this._ost = t; this._odswiez(); }
  }
  disconnectedCallback() { clearInterval(this._tz); clearInterval(this._ts); this._init = false; }
  connectedCallback() { if (this._h && !this._init) this.hass = this._h; }

  // Prefiks urządzenia z pierwszej encji licznika ciepła Midea (sensor.<id>_total_produced_energy); w razie czego z climate.<id>_climate_zone1.
  _szukaj() {
    const ids = Object.keys(this._h.states);
    const m = (re) => { const kand = ids.map((e) => e.match(re)).filter(Boolean); return kand.length ? kand[0][1] : null; };
    return m(/^sensor\.(.+)_total_produced_energy$/) || m(/^climate\.(.+)_climate_zone1$/) || m(/^water_heater\.(.+)_water_heater$/);
  }
  _encje() {
    this.E = {}; for (const [k, v] of Object.entries(ENC)) this.E[k] = v.replace('{id}', this._id || 'brak');
    Object.assign(this.E, this.cfg.encje || {});
  }
  _brak() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (this._bylBrak) return; this._bylBrak = true;
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="w"><div class="c"><h3>Pompa ciepła · Start</h3><div class="stan">Nie znalazłem pompy Midea w Home Assistant.
      Zainstaluj integrację <b>midea_ac_lan</b> (HACS) i dodaj pompę, albo wpisz w konfiguracji karty <code>urzadzenie: &lt;twoje_id&gt;</code> (liczba z nazw encji, np. <code>sensor.&lt;twoje_id&gt;_outdoor_temperature</code>).</div></div></div>`;
  }
  st(id) { const s = this._h && this._h.states[id]; return s ? s.state : undefined; }
  n(id) { const v = parseFloat(this.st(id)); return isNaN(v) ? null : v; }
  at(id, a) { const s = this._h && this._h.states[id]; const v = s ? s.attributes[a] : undefined; return v == null ? null : v; }
  $(q) { return this.shadowRoot.querySelector(q); }
  html(id, v) { const e = this.$('#' + id); if (e && e._v !== v) { e._v = v; e.innerHTML = v; } }
  _zegar() { const z = this.$('#zeg'); if (z) z.textContent = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }); }

  _buduj() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const E = this.E, w = this._woleoze;
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="w">
      <div class="top"><div class="ttl"><b>POMPA CIEPŁA</b> · START</div><div class="zeg" id="zeg"></div><div class="sp"></div><div id="chip"></div></div>
      <div class="g">
        <div class="c c3"><h3>Na dworze</h3><div class="duza" id="zew" data-mi="${E.temp_zew}">–</div><div class="pod" id="zewP"></div></div>
        <div class="c c3"><h3>Bojler (CWU)</h3><div class="duza" id="boj" data-mi="${E.bojler}">–</div><div class="pod" id="bojP"></div></div>
        <div class="c c3"><h3>Strefa 1: zadana woda</h3><div class="duza" id="s1" data-mi="${E.strefa1}">–</div><div class="pod" id="s1P"></div></div>
        <div class="c c3"><h3>Grzałki</h3><div class="duza" id="grz" style="font-size:30px;padding-top:8px">–</div><div class="pod" id="grzP"></div></div>
        <div class="c c8"><h3>Dziś i w tym miesiącu <span id="statOpis"></span></h3><div class="mini" id="lic"></div>
          <svg id="wyk" viewBox="0 0 1000 230" width="100%" style="margin-top:12px"></svg>
          <div class="uw">Prąd i ciepło z liczników Midea (statystyki HA), COP = ciepło ÷ prąd. Liczniki Midea mają rozdzielczość 1 kWh i chmura po restarcie HA milczy do 50 min – dokładne dane co 5 s daje moduł Modbus.</div></div>
        <div class="c c4"><h3>Co teraz robi pompa</h3><div class="stan" id="opis" data-mi="${E.grzanie}"></div>
          <h3 style="margin-top:18px">Przełączniki</h3><div class="prz" id="prz"></div>
          <div class="uw">To te same przełączniki, które daje integracja Midea. Zmiana idzie do pompy od razu.</div></div>
        ${w ? `<div class="c c12 pro"><h3>Chcesz więcej?</h3><div class="por">
          <span class="n">Start</span><span class="cena">0 zł</span><span class="o">ta karta na integracji Midea + moduł Modbus do odczytu: 114 odczytów co 5 s i panel Pompa w podglądzie.</span>
          <span class="n">Pro</span><span class="cena">149 zł</span><span class="o">zmiana nastaw z HA, prąd i COP osobno dla domu i CWU, CWU na tanie godziny, koszty a inne paliwa, raport z alarmami, kreator i aktualizacje.</span>
          <span class="n">Pro + konfiguracja</span><span class="cena">249 zł</span><span class="o">wszystko z Pro, a ja konfiguruję to zdalnie za ciebie; zwrot 100%, jeśli moduł nie złapie komunikacji z pompą.</span></div>
          <div class="bt"><a class="b1" href="${LINK_PRO}" target="_blank" rel="noopener">Pro: 149 zł</a><a href="${LINK_KONF}" target="_blank" rel="noopener">Pro + konfiguracja: 249 zł</a></div></div>` : ''}
      </div>${w ? STOPKA : ''}</div>`;
    if (!this._klikOk) { this._klikOk = true; this.shadowRoot.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-sw]'); if (b) { if (!b.disabled) this._h.callService('switch', 'toggle', { entity_id: b.dataset.sw }); return; }
      if (e.target.closest('a[href]')) return;
      const m = e.target.closest('[data-mi]'); if (m && m.dataset.mi) this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: m.dataset.mi }, bubbles: true, composed: true }));
    }); }
    this._licz = this._wykSig = null;
  }

  _odswiez() {
    const E = this.E, on = (k) => this.st(E[k]) === 'on', brak = (k) => BRAK.includes(this.st(E[k]));
    const kod = this.st(E.blad), blad = !BRAK.includes(kod) && kod !== '0' && kod !== 'brak';
    let stan;
    if (blad) stan = [`Błąd: kod ${kod}`, 'var(--bad)', E.blad];
    else if (on('cwu')) stan = ['Ładuje CWU', 'var(--warn)', E.cwu];
    else if (on('grzanie')) stan = ['Grzeje dom', 'var(--ok)', E.grzanie];
    else if (brak('grzanie') && brak('cwu')) stan = ['Brak danych z Midea', 'var(--mut)', E.grzanie];
    else stan = ['Postój', 'var(--hp)', E.grzanie];
    this.html('chip', `<div class="chip" data-mi="${stan[2]}"><span class="led" style="color:${stan[1]}"></span><b>${stan[0]}</b></div>`);

    const zew = this.n(E.temp_zew);
    this.html('zew', fT(zew));
    this.html('zewP', zew == null ? 'czekam na odczyt z pompy' : 'czujnik jednostki zewnętrznej');
    const boj = this.n(E.bojler) ?? this.at(E.zasobnik, 'current_temperature'), zadC = this.at(E.zasobnik, 'temperature');
    this.html('boj', fT(boj));
    this.html('bojP', `zadana CWU <b data-mi="${E.zasobnik}">${fT(zadC)}</b> · CWU <b data-mi="${E.sw_cwu}">${this.st(E.sw_cwu) === 'on' ? 'włączona' : this.st(E.sw_cwu) === 'off' ? 'wyłączona' : '–'}</b>`);
    const z1 = this.at(E.strefa1, 'temperature'), kr = this.st(E.krzywa);
    this.html('s1', fT(z1));
    this.html('s1P', `tryb <b data-mi="${E.strefa1}">${{ heat: 'grzanie', cool: 'chłodzenie', auto: 'auto', off: 'wyłączona' }[this.st(E.strefa1)] || '–'}</b> · <span data-mi="${E.krzywa}">${kr === 'on' ? 'z krzywej grzewczej' : kr === 'off' ? 'stała temperatura' : 'krzywa: –'}</span>`);
    const ibh = on('ibh'), tbh = on('tbh');
    this.html('grz', ibh || tbh ? '<span style="color:var(--bad)">pracują</span>' : brak('ibh') && brak('tbh') ? '–' : 'wyłączone');
    const g = (k, t) => `<span data-mi="${E[k]}">${t} <b${on(k) ? ' style="color:var(--bad)"' : ''}>${on(k) ? 'pracuje' : brak(k) ? '–' : 'wył.'}</b></span>`;
    this.html('grzP', `${g('ibh', 'IBH (obieg)')} · ${g('tbh', 'TBH (bojler)')}`);

    let opis;
    if (blad) opis = `Pompa zgłasza kod błędu <b>${kod}</b>. Sprawdź go w instrukcji pompy albo na sterowniku ściennym.`;
    else if (on('cwu')) opis = `Ładuje bojler: <b>${fT(boj)}</b> → zadana <b>${fT(zadC)}</b>.`;
    else if (on('grzanie')) opis = `Grzeje dom: zadana woda strefy 1 <b>${fT(z1)}</b>${zew != null ? ` przy ${fT(zew)} na dworze` : ''}.`;
    else if (brak('grzanie') && brak('cwu')) opis = 'Integracja Midea nie podała jeszcze stanu pompy. Po restarcie Home Assistanta dane wracają nawet po 50 min.';
    else opis = `Sprężarka stoi. Bojler <b>${fT(boj)}</b>, strefa 1 ${this.st(E.sw_strefa1) === 'off' ? 'wyłączona' : 'czeka na spadek temperatury wody'}.`;
    this.html('opis', opis);

    const sw = (k, t, pod) => { const s = this.st(E[k]), x = s === 'on', nie = BRAK.includes(s);
      return `<div class="sw"><div data-mi="${E[k]}">${t}<small>${pod}</small></div><button class="tg${x ? ' on' : ''}" data-sw="${E[k]}"${nie ? ' disabled' : ''}>${nie ? '–' : x ? 'WŁ.' : 'WYŁ.'}</button></div>`; };
    this.html('prz', sw('sw_strefa1', 'Strefa 1 (dom)', 'grzanie domu') + sw('sw_cwu', 'Ciepła woda (CWU)', 'ładowanie bojlera')
      + sw('sw_eco', 'Tryb ECO', 'niższe zadane według pompy') + sw('sw_cichy', 'Tryb cichy', 'wentylator i sprężarka wolniej'));
    this._liczniki();
  }

  // Statystyki HA (recorder): zmiana licznika na dobę (14 dni) i na miesiąc, dla prądu i ciepła z liczników Midea.
  async _staty() {
    if (!this._h || !this._h.callWS || this._stTrwa) return; this._stTrwa = true;
    const d0 = new Date(); d0.setHours(0, 0, 0, 0); const od = new Date(d0.getTime() - 13 * DZIEN); od.setHours(0, 0, 0, 0);
    const m0 = new Date(d0); m0.setDate(1);
    const ids = [this.E.prad_licznik, this.E.cieplo_licznik], iso = (d) => d.toISOString();
    const zap = (start, period) => this._h.callWS({ type: 'recorder/statistics_during_period', start_time: iso(start), end_time: iso(new Date()), statistic_ids: ids, period, types: ['change'], units: { energy: 'kWh' } });
    try {
      const [dni, mies] = await Promise.all([zap(od, 'day'), zap(m0, 'month')]);
      const ts = (x) => (typeof x.start === 'number' ? x.start : Date.parse(x.start));
      const seria = (id) => { const m = {}; (dni[id] || []).forEach((x) => { if (x.change != null) m[new Date(ts(x)).toDateString()] = x.change; }); return m; };
      const sumaOd = (id, t) => (mies[id] || []).filter((x) => ts(x) >= t && x.change != null).reduce((a, x) => a + x.change, 0);
      const ma = (id) => (mies[id] || []).some((x) => ts(x) >= m0.getTime() && x.change != null);
      const P = seria(ids[0]), Q = seria(ids[1]), dniL = [];
      for (let i = 0; i < 14; i++) { const d = new Date(od); d.setDate(od.getDate() + i); const k = d.toDateString(); dniL.push({ d, p: P[k] ?? null, q: Q[k] ?? null }); }
      this._st = { dni: dniL, mP: ma(ids[0]) ? sumaOd(ids[0], m0.getTime()) : null, mQ: ma(ids[1]) ? sumaOd(ids[1], m0.getTime()) : null, t: Date.now() };
      this._licz = this._wykSig = null; this._liczniki();
    } catch (e) { this.html('statOpis', `statystyki niedostępne: ${e.message}`); }
    this._stTrwa = false;
  }

  _liczniki() {
    const S = this._st, E = this.E; if (!S || !this.$('#lic')) return;
    const dzis = S.dni[S.dni.length - 1], cop = (q, p) => (q != null && p > 0 ? q / p : null);
    const kol = (c) => (c == null ? 'var(--mut)' : c >= 3.5 ? 'var(--ok)' : c >= 2.5 ? 'var(--warn)' : 'var(--bad)');
    const kafel = (t, p, q) => { const c = cop(q, p);
      return `<div data-mi="${E.prad_licznik}"><small>${t}: prąd</small><b>${p == null ? '–' : f(p, 0)} <span style="font-size:14px;color:var(--mut)">kWh</span></b></div>`
        + `<div data-mi="${E.cieplo_licznik}"><small>${t}: ciepło</small><b>${q == null ? '–' : f(q, 0)} <span style="font-size:14px;color:var(--mut)">kWh</span></b></div>`
        + `<div data-mi="${E.cieplo_licznik}"><small>${t}: COP</small><b style="color:${kol(c)}">${c == null ? '–' : f(c, 1)}</b></div>`; };
    const h = kafel('Dziś', dzis.p, dzis.q) + kafel('Miesiąc', S.mP, S.mQ);
    if (this._licz !== h) { this._licz = h; this.$('#lic').innerHTML = h; }
    this.html('statOpis', `odświeżane co 30 min · ${new Date(S.t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`);
    this._wykres(S.dni, cop, kol);
  }

  // 14 dni: słupki = prąd na dobę (kWh), kropki = COP doby (prawa oś).
  _wykres(dni, cop, kol) {
    const sig = JSON.stringify(dni.map((x) => [x.p, x.q])); if (this._wykSig === sig) return; this._wykSig = sig;
    const W = 1000, H = 230, L = 50, R = 44, T = 30, B = 30, E = this.E;
    const pmax = Math.max(10, Math.ceil(Math.max(0, ...dni.map((x) => x.p || 0)) / 10) * 10), cmax = Math.max(4, Math.ceil(Math.max(0, ...dni.map((x) => cop(x.q, x.p) || 0))));
    const kw = (W - L - R) / dni.length, Y = (v) => H - B - v / pmax * (H - T - B), YC = (c) => H - B - c / cmax * (H - T - B);
    let g = '';
    for (let v = 0; v <= pmax; v += pmax > 40 ? 20 : 10) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,.06)"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="#39c0ff">${v}</text>`;
    for (let c = 0; c <= cmax; c += 1) g += `<text x="${W - R + 8}" y="${YC(c) + 4}" font-size="12" fill="#2ee6a6">${c}</text>`;
    g += `<text x="${L - 8}" y="12" text-anchor="end" font-size="11" fill="#39c0ff">kWh</text><text x="${W - R + 8}" y="12" font-size="11" fill="#2ee6a6">COP</text>`;
    const pkt = [];
    dni.forEach((x, i) => { const x0 = L + i * kw, c = cop(x.q, x.p), dzis = i === dni.length - 1;
      if (x.p != null) g += `<rect data-mi="${E.prad_licznik}" x="${(x0 + kw * 0.18).toFixed(1)}" y="${Y(x.p).toFixed(1)}" width="${(kw * 0.64).toFixed(1)}" height="${Math.max(1, Y(0) - Y(x.p)).toFixed(1)}" rx="5" fill="rgba(57,192,255,${dzis ? '.35' : '.65'})"><title>${x.d.toLocaleDateString('pl-PL')}: ${f(x.p)} kWh prądu, ${f(x.q)} kWh ciepła</title></rect>`;
      if (c != null) pkt.push([x0 + kw / 2, YC(c), c]);
      if (i % 2 === (dni.length - 1) % 2) g += `<text x="${(x0 + kw / 2).toFixed(1)}" y="${H - 9}" text-anchor="middle" font-size="12" fill="#8ea0c4">${dzis ? 'dziś' : x.d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}</text>`; });
    if (pkt.length > 1) g += `<polyline points="${pkt.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="none" stroke="#2ee6a6" stroke-width="2" stroke-dasharray="5 5"/>`;
    pkt.forEach(([x, y, c]) => { g += `<circle data-mi="${E.cieplo_licznik}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${kol(c)}" stroke="#040914" stroke-width="2"><title>COP ${f(c, 1)}</title></circle>`; });
    if (!dni.some((x) => x.p != null)) g += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="15" fill="#8ea0c4">Brak statystyk liczników Midea z ostatnich 14 dni</text>`;
    this.$('#wyk').innerHTML = g;
  }
}
if (!customElements.get('rotenso-start')) customElements.define('rotenso-start', RotensoStart);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'rotenso-start')) window.customCards.push({ type: 'rotenso-start', name: 'Pompa ciepła: Start', description: 'Pompa Midea na integracji midea_ac_lan: stan, temperatury, prąd, ciepło i COP.' });
})();
