// „Pompa: telemetria” – karta Lovelace pompy ciepła Rotenso Aquami (Midea M-Thermal) z modułu Modbus (ESPHome „Pompa Modbus”).
// Wersja Start (tryb podglądu): obieg czynnika na żywo, sprawność (COP), doba pracy (starty sprężarki), krzywa nr 9 z histerezą,
// nastawy instalatora do odczytu, liczniki, błędy. Sterowanie CWU, podział prądu i COP na dom/CWU oraz zapis nastaw są w wersji Pro.
// Bez zależności zewnętrznych. Element: <rotenso-pompa>. Konfiguracja karty: `encje` (nadpisania encji spoza ESPHome),
// `woleoze` (stopka i kafel Pro, domyślnie true). Licencja Start (patrz LICENSE). Projekt: github.com/WoleOze/rotenso-midea-modbus-ha
const P = 'sensor.pompa_modbus_', B = 'binary_sensor.pompa_modbus_';
const C = {
  hz: P + 'sprezarka_czestotliwosc', hzT: P + 'sprezarka_czestotliwosc_docelowa', t1: P + 't1_woda_zasilajaca_za_grzalka',
  twi: P + 'woda_wejscie_wymiennika_tw_in', two: P + 'woda_wyjscie_wymiennika_tw_out', t1s: P + 't1s_z_krzywej_strefa_1',
  t2: P + 't2_czynnik_strona_cieczy', t2b: P + 't2b_czynnik_strona_gazu', t3: P + 't3_wymiennik_jednostki_zewn', t4: P + 't4_temperatura_zewnetrzna',
  t5: P + 't5_bojler_cwu', th: P + 'th_ssanie_sprezarki', tp: P + 'tp_tloczenie_sprezarki', tf: P + 'temperatura_modulu_inwertera_tf',
  ph: P + 'cisnienie_wysokie', iz: P + 'prad_jednostki_zewn', uz: P + 'napiecie_jednostki_zewn', idc: P + 'prad_szyny_dc', udc: P + 'napiecie_szyny_dc',
  eev: P + 'zawor_rozprezny_eev', fan: P + 'wentylator', flow: P + 'przeplyw_wody_wyliczany_przez_pompe', qhp: P + 'moc_modulu_hydraulicznego_wg_pompy',
  qdt: P + 'moc_cieplna_z_przeplywu_i_dt_wg_czujnikow_pompy', eP: P + 'licznik_pradu_pompy', eQ: P + 'licznik_ciepla_pompy', godz: P + 'sprezarka_czas_pracy',
  kod: P + 'kod_bledu', bl: [1, 2, 3].map((i) => P + `blad_poprzedni_${i}_nr`), cwuZ: P + 'zadana_cwu', wifi: P + 'sygnal_wi_fi',
  dT1SH: P + '3_5_dt1sh_histereza_grzania', dT5: P + '1_6_dt5_on', h1: P + '3_8_t1seth1_krzywa_9_woda_w_mroz', h2: P + '3_9_t1seth2_krzywa_9_woda_w_cieple',
  x1: P + '3_10_t4h1_krzywa_9_punkt_mroz', x2: P + '3_11_t4h2_krzywa_9_punkt_cieplo',
  run: B + 'praca_run', sv1: B + 'zawor_sv1_na_cwu', defr: B + 'odszranianie', ibh1: B + 'grzalka_ibh1_pracuje', ibh2: B + 'grzalka_ibh2_pracuje',
  tbh: B + 'grzalka_bojlera_tbh_pracuje', strefa: B + 'strefa_1_wlaczona', cwuOn: B + 'cwu_wlaczona', pumpi: B + 'pompa_obiegowa_pump_i', alarm: B + 'alarm',
  online: B + 'modul_online', oil: B + 'powrot_oleju', mroz: B + 'ochrona_przed_zamarzaniem', dezyn: B + 'dezynfekcja', prio: B + 'priorytet_cwu',
};
// Encje spoza ESPHome: domyślne z tabeli w README, nadpisywane przez `encje:` w konfiguracji karty.
const ENC = { prad_moc: 'sensor.pompa_modbus_moc_elektryczna_szacowana', temp_zew: 'sensor.pompa_modbus_t4_temperatura_zewnetrzna' };
// Wersja Pro: link do zakupu i zestaw gotowy do podpięcia.
const LINK_PRO = 'https://buy.stripe.com/3cIeVd9SIgVa9rS6aL3Je03';
const LINK_ZESTAW = 'https://pompa.woleoze.pl/#ceny';
const STOPKA = '<div class="stopka"><a href="https://woleoze.pl/pompa-ciepla/" target="_blank" rel="noopener">dane i kalkulatory: woleoze.pl</a> · <a href="mailto:pompa@woleoze.pl">pomoc: pompa@woleoze.pl</a></div>';
// Nastawy z menu DLA SERWISANTA: [encja, numer, opis, wartość fabryczna, jednostka]. Fabryczne z instrukcji producenta (seria AQM, R13).
const NAST = [
  ['3_5_dt1sh_histereza_grzania', '3.5', 'Sprężarka rusza, gdy woda spadnie o', 5, '°C'],
  ['3_8_t1seth1_krzywa_9_woda_w_mroz', '3.8', 'Krzywa 9: woda przy mrozie', 35, '°C'],
  ['3_10_t4h1_krzywa_9_punkt_mroz', '3.10', 'Krzywa 9: punkt mrozu', -5, '°C'],
  ['3_9_t1seth2_krzywa_9_woda_w_cieple', '3.9', 'Krzywa 9: woda przy cieple', 28, '°C'],
  ['3_11_t4h2_krzywa_9_punkt_cieplo', '3.11', 'Krzywa 9: punkt ciepła', 7, '°C'],
  ['3_12_odbiornik_strefa_1_grzanie_0_fcu_1_grzejniki_2_podloga', '3.12', 'Odbiornik (1 grzejniki, 2 podłoga)', 1, ''],
  ['3_4_t4hmin', '3.4', 'Grzeje domu do temp. zewn.', -15, '°C'],
  ['1_6_dt5_on', '1.6', 'CWU: dogrzewa, gdy spadnie o', 10, '°C'],
  ['1_17_t_dhwhp_restrict', '1.17', 'Dom między ładowaniami CWU', 30, 'min'],
  ['1_18_t_dhwhp_max', '1.18', 'Najdłuższe ładowanie CWU', 90, 'min'],
  ['7_3_t4_ibh_on', '7.3', 'Grzałka IBH dozwolona poniżej', -5, '°C'],
  ['7_2_t_ibh_delay', '7.2', 'Grzałka IBH po pracy sprężarki', 30, 'min'],
  ['7_8_p_ibh1_moc_grzalki', '7.8', 'Moc IBH wliczana do licznika', 0, 'kW'],
  ['14_1_ograniczenie_mocy_typ', '14.1', 'Ograniczenie poboru mocy', 0, ''],
];
const BLEDY = { 0: 'brak', 1: 'E0 przepływ wody (3x E8)', 2: 'E1 zanik fazy', 3: 'E2 komunikacja panel-moduł', 4: 'E3 czujnik T1', 5: 'E4 czujnik T5', 6: 'E5 czujnik T3',
  7: 'E6 czujnik T4', 8: 'E7 czujnik Tbt1', 9: 'E8 przepływ wody', 10: 'E9 czujnik Th', 11: 'EA czujnik Tp', 12: 'Eb czujnik Tsolar', 13: 'Ec czujnik Tbt2', 14: 'Ed czujnik Tw_in',
  15: 'EE EEPROM modułu', 20: 'P0 niskie ciśnienie', 21: 'P1 wysokie ciśnienie', 23: 'P3 przeciążenie sprężarki', 24: 'P4 wysoka temp. tłoczenia', 25: 'P5 duża różnica temp. wymiennika',
  26: 'P6 moduł inwertera', 31: 'Pb ochrona przed zamarzaniem', 33: 'Pd wysoka temp. skraplacza', 38: 'PP wejście cieplejsze niż wyjście', 39: 'H0 komunikacja moduł-płyta B',
  40: 'H1 komunikacja inwerter-płyta B', 41: 'H2 czujnik T2', 42: 'H3 czujnik T2B', 43: 'H4 3x L0/L1', 44: 'H5 czujnik Ta', 45: 'H6 wentylator DC', 46: 'H7 napięcie zasilania',
  47: 'H8 czujnik ciśnienia', 48: 'H9 czujnik Tw2', 49: 'HA czujnik Tw_out', 50: 'Hb 3x PP i Tw_out<7', 52: 'Hd komunikacja kaskada', 53: 'HE komunikacja termostat',
  54: 'HF EEPROM inwertera', 55: 'HH 10x H6 w 2 h', 57: 'HP niskie ciśnienie (chłodzenie)', 65: 'C7 temperatura modułu inwertera', 112: 'bH płyta PED', 116: 'F1 niskie napięcie DC',
  134: 'L0 moduł inwertera', 135: 'L1 niskie napięcie DC', 136: 'L2 wysokie napięcie DC', 138: 'L4 MCE', 139: 'L5 zerowa prędkość', 141: 'L7 kolejność faz', 142: 'L8 skok częstotliwości',
  143: 'L9 odchyłka częstotliwości' };
// R32: ciśnienie nasycenia (kPa absolutne) → temperatura. Na postoju ok. 950 kPa przy T3 = 5°C, czyli pompa podaje ciśnienie absolutne.
const R32 = [[-10, 582], [-5, 681], [0, 813], [5, 951], [10, 1107], [15, 1280], [20, 1475], [25, 1691], [30, 1928], [35, 2190], [40, 2478], [45, 2793], [50, 3140], [55, 3519], [60, 3932]];
const tSat = (p) => { if (p == null || p < R32[0][1] || p > R32[R32.length - 1][1]) return null;
  for (let i = 1; i < R32.length; i++) if (p <= R32[i][1]) { const [t0, p0] = R32[i - 1], [t1, p1] = R32[i]; return t0 + (p - p0) / (p1 - p0) * (t1 - t0); } return null; };
const KOL = [[15, [90, 140, 255]], [25, [57, 192, 255]], [33, [46, 230, 166]], [40, [255, 210, 63]], [47, [255, 140, 60]], [55, [255, 84, 112]]];
const kolT = (t) => { if (t == null) return '#5a6a8a'; if (t <= KOL[0][0]) return `rgb(${KOL[0][1]})`; if (t >= KOL[KOL.length - 1][0]) return `rgb(${KOL[KOL.length - 1][1]})`;
  for (let i = 1; i < KOL.length; i++) if (t <= KOL[i][0]) { const [t0, a] = KOL[i - 1], [t1, b] = KOL[i], k = (t - t0) / (t1 - t0); return `rgb(${a.map((x, j) => Math.round(x + (b[j] - x) * k)).join(',')})`; } };
const f = (v, d = 0) => (v == null || isNaN(v) ? '–' : Number(v).toFixed(d).replace('.', ','));
const fT = (v) => (v == null ? '–' : `${f(v)}°C`);
const tys = (v) => (v == null ? '–' : Math.round(v).toLocaleString('pl-PL'));

const CSS = `
:host{display:block;overflow-x:hidden;--bg:#040914;--panel:rgba(12,24,48,.74);--line:rgba(110,160,255,.16);--txt:#e8eefc;--mut:#8ea0c4;
--sun:#ffd23f;--imp:#ff5470;--hp:#39c0ff;--vio:#b388ff;--ok:#2ee6a6;--warn:#ffb020;--bad:#ff5470}
*{box-sizing:border-box}
.w{min-height:100vh;padding:16px 18px 26px;color:var(--txt);font-family:"Inter","Segoe UI",Roboto,system-ui,sans-serif;font-variant-numeric:tabular-nums;
background:linear-gradient(rgba(80,130,255,.035) 1px,transparent 1px) 0 0/100% 32px,linear-gradient(90deg,rgba(80,130,255,.035) 1px,transparent 1px) 0 0/32px 100%,
radial-gradient(1100px 600px at 80% -10%,rgba(255,84,112,.12),transparent 60%),radial-gradient(900px 600px at -10% 20%,rgba(57,192,255,.14),transparent 60%),var(--bg)}
.top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.ttl{font-weight:800;letter-spacing:.2em;font-size:14px;color:var(--mut)}.ttl b{color:var(--txt)}
.zeg{font-size:40px;font-weight:800;line-height:1}.sp{flex:1}
.chip{display:flex;align-items:center;gap:8px;padding:8px 13px;border-radius:999px;border:1px solid var(--line);background:var(--panel);font-size:14px;backdrop-filter:blur(8px);white-space:nowrap}
.chip b{font-weight:800}.led{width:9px;height:9px;border-radius:50%;box-shadow:0 0 10px currentColor;background:currentColor}
.btn{cursor:pointer;text-decoration:none;color:var(--txt);border-color:rgba(179,136,255,.5);background:rgba(179,136,255,.14)}
.g{display:grid;gap:14px;grid-template-columns:repeat(12,minmax(0,1fr))}
.c{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:16px 18px;position:relative;overflow:hidden;backdrop-filter:blur(10px);min-width:0;
box-shadow:0 10px 40px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04)}
.c h3{margin:0 0 10px;font-size:12.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.c h3 span{letter-spacing:.04em;text-transform:none;font-weight:600}
.c8{grid-column:span 8}.c4{grid-column:span 4}.kol{grid-column:span 4;display:flex;flex-direction:column;gap:14px}
svg{max-width:100%;display:block}svg text{font-family:inherit}
@keyframes plyn{to{stroke-dashoffset:-48}}@keyframes obr{to{transform:rotate(360deg)}}@keyframes puls{50%{opacity:.35}}
.rura{fill:none;stroke-linecap:round;stroke-linejoin:round}.ruch{pointer-events:none;fill:none;stroke-linecap:round;stroke-dasharray:6 18;animation:plyn linear infinite}
#fan{transform-origin:165px 335px;animation:obr linear infinite}
.duzy{display:flex;align-items:baseline;gap:10px;margin:2px 0 10px}.duzy b{font-size:56px;font-weight:800;line-height:1}.duzy small{color:var(--mut);font-size:14px}
.mini{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mini div,.mini3 div{background:rgba(255,255,255,.04);border-radius:14px;padding:9px 12px;min-width:0}
.mini b{display:block;font-size:22px;font-weight:800;margin-top:2px}.mini small,.mini3 small{color:var(--mut);font-size:12.5px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mini3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.mini3 b{font-size:19px;font-weight:800}
.uw{color:var(--mut);font-size:12.5px;margin-top:10px;line-height:1.45}
.nast{display:grid;grid-template-columns:38px 1fr auto auto;gap:4px 10px;align-items:center;font-size:13.5px}
.nast .nr{color:var(--mut);font-size:12px}.nast .v{font-weight:800;text-align:right}.nast .fb{color:var(--mut);font-size:12px;text-align:right;white-space:nowrap}
.nast .inna{color:var(--warn)}.nast .lin{grid-column:1/-1;height:1px;background:rgba(255,255,255,.05)}
.st{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.st div{background:rgba(255,255,255,.04);border-radius:12px;padding:7px 11px;font-size:13px;color:var(--mut)}.st b{color:var(--txt);font-size:17px;margin-left:4px}
.bl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:13.5px}.bl span:nth-child(odd){color:var(--mut)}
.g{grid-auto-flow:row dense}#krz{max-width:640px;margin:0 auto}
[data-mi],[data-cel],[data-nav]{cursor:pointer}svg [data-mi]:hover,svg [data-nav]:hover{filter:brightness(1.5)}.duzy[data-mi]:hover b,#stan:hover{filter:brightness(1.2)}.st [data-mi]:hover,.bl [data-mi]:hover,.nast [data-mi]:hover{background:rgba(57,192,255,.10);border-radius:6px}.chip[data-mi]:hover,.chip[data-nav]:hover{border-color:rgba(57,192,255,.6)}
.mini [data-mi]:hover,.mini3 [data-mi]:hover{background:rgba(57,192,255,.10)}
.pro{border-color:rgba(179,136,255,.45);background:linear-gradient(135deg,rgba(179,136,255,.16),rgba(57,192,255,.08)),var(--panel)}
.pro p{margin:0 0 12px;font-size:14.5px;line-height:1.5}.pro .bt{display:flex;flex-wrap:wrap;gap:8px}
.pro a{display:inline-flex;align-items:center;padding:9px 14px;border-radius:11px;font-weight:800;font-size:14px;text-decoration:none;color:var(--txt);border:1px solid var(--line);background:rgba(255,255,255,.05)}
.pro a.b1{background:linear-gradient(135deg,#39c0ff,#2ee6a6);color:#03121e;border:0}.pro a:hover{filter:brightness(1.12)}
.stopka{margin-top:16px;text-align:center;font-size:12px}.stopka a{color:var(--mut);opacity:.65;text-decoration:none}.stopka a:hover{opacity:1;text-decoration:underline}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.92em;color:var(--txt)}
@media (max-width:1150px){.c8{grid-column:span 12}.c4,.kol{grid-column:span 6}}
@media (max-width:760px){.c4,.kol{grid-column:span 12}}
@media (max-width:560px){.zeg{font-size:30px}.w{padding:10px}.chip{font-size:12.5px;padding:6px 10px}.mini3{grid-template-columns:repeat(2,minmax(0,1fr))}.duzy b{font-size:44px}}
`;

// Schemat: jednostka zewnętrzna (parownik + wentylator) → sprężarka → skraplacz (wymiennik płytowy) → zawór rozprężny → z powrotem; po prawej woda do zaworu SV1.
const SCHEMAT = `
<defs><pattern id="plyta" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="10" stroke="rgba(255,255,255,.12)" stroke-width="3"/></pattern>
<filter id="blask"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect x="30" y="50" width="270" height="380" rx="18" fill="rgba(255,255,255,.03)" stroke="rgba(110,160,255,.16)"/>
<text x="46" y="76" font-size="12.5" fill="#8ea0c4" letter-spacing="2">JEDNOSTKA ZEWNĘTRZNA</text>
<text data-mi="${C.t4}" x="46" y="100" font-size="15" fill="#8ea0c4">powietrze T4 <tspan id="sT4" fill="#e8eefc" font-weight="800">–</tspan></text>
<g id="lamele" data-mi="${C.defr}">${Array.from({ length: 19 }, (_, i) => `<line x1="${62 + i * 11.5}" y1="118" x2="${62 + i * 11.5}" y2="232" stroke="rgba(57,192,255,.35)" stroke-width="3" stroke-linecap="round"/>`).join('')}</g>
<text data-mi="${C.t3}" x="165" y="256" text-anchor="middle" font-size="14" fill="#8ea0c4">parownik T3 <tspan id="sT3" fill="#e8eefc" font-weight="800">–</tspan></text>
<circle data-mi="${C.fan}" cx="165" cy="335" r="56" fill="rgba(255,255,255,.03)" stroke="rgba(110,160,255,.25)" stroke-width="2"/>
<g id="fan" data-mi="${C.fan}">${[0, 120, 240].map((a) => `<ellipse cx="165" cy="305" rx="13" ry="28" fill="rgba(57,192,255,.45)" transform="rotate(${a} 165 335)"/>`).join('')}<circle cx="165" cy="335" r="9" fill="#8ea0c4"/></g>
<text data-mi="${C.fan}" x="165" y="414" text-anchor="middle" font-size="13.5" fill="#8ea0c4">wentylator <tspan id="sFan" fill="#e8eefc" font-weight="800">–</tspan></text>

<path id="rSuc" class="rura" d="M300 140 H500 V298" stroke-width="7"/><path id="rSucA" class="ruch" d="M300 140 H500 V298" stroke-width="7"/>
<path id="rGas" class="rura" d="M550 350 H630 V120 H700" stroke-width="7"/><path id="rGasA" class="ruch" d="M550 350 H630 V120 H700" stroke-width="7"/>
<path id="rLiq" class="rura" d="M735 320 V445 H420" stroke-width="7"/><path id="rLiqA" class="ruch" d="M735 320 V445 H420" stroke-width="7"/>
<path id="rMix" class="rura" d="M380 445 H330 V370 H300" stroke-width="7"/><path id="rMixA" class="ruch" d="M380 445 H330 V370 H300" stroke-width="7"/>
<text data-mi="${C.th}" x="400" y="128" text-anchor="middle" font-size="13.5" fill="#8ea0c4">ssanie Th <tspan id="sTh" fill="#e8eefc" font-weight="800">–</tspan></text>
<text data-mi="${C.tp}" x="620" y="240" text-anchor="end" font-size="13.5" fill="#8ea0c4">tłoczenie Tp</text><text data-mi="${C.tp}" x="620" y="260" text-anchor="end" font-size="20" font-weight="800" fill="#e8eefc" id="sTp">–</text>
<text data-mi="${C.t2b}" x="665" y="108" text-anchor="middle" font-size="13" fill="#8ea0c4">T2B <tspan id="sT2b" fill="#e8eefc" font-weight="800">–</tspan></text>
<text data-mi="${C.t2}" x="725" y="400" text-anchor="end" font-size="13" fill="#8ea0c4">T2 <tspan id="sT2" fill="#e8eefc" font-weight="800">–</tspan></text>

<g data-mi="${C.hz}"><circle id="spr" cx="500" cy="350" r="50" fill="rgba(255,84,112,.10)" stroke="#ff5470" stroke-width="3"/>
<text x="500" y="336" text-anchor="middle" font-size="11" letter-spacing="1.5" fill="#8ea0c4">SPRĘŻARKA</text>
<text x="500" y="366" text-anchor="middle" font-size="27" font-weight="800" fill="#e8eefc" id="sHz">–</text>
<text x="500" y="386" text-anchor="middle" font-size="12" fill="#8ea0c4" id="sHzT"></text></g>
<g data-mi="${C.eev}"><path d="M400 428 L420 445 L400 462 L380 445 Z" fill="rgba(255,176,32,.18)" stroke="#ffb020" stroke-width="2.5"/>
<text x="400" y="484" text-anchor="middle" font-size="13" fill="#8ea0c4">zawór rozprężny <tspan id="sEev" fill="#e8eefc" font-weight="800">–</tspan></text></g>

<text x="735" y="78" text-anchor="middle" font-size="12" letter-spacing="1.5" fill="#8ea0c4">SKRAPLACZ</text>
<rect data-mi="${C.ph}" x="700" y="90" width="70" height="230" rx="10" fill="url(#plyta)" stroke="rgba(255,255,255,.28)" stroke-width="2"/>
<rect id="plytaBlask" style="pointer-events:none" x="700" y="90" width="70" height="230" rx="10" fill="#ff5470" opacity="0"/>
<text data-mi="${C.ph}" x="985" y="478" text-anchor="end" font-size="12.5" fill="#8ea0c4" id="sPh"></text>

<path data-mi="${C.twi}" id="wIn" class="rura" d="M985 290 H770" stroke-width="9"/><path id="wInA" class="ruch" d="M985 290 H770" stroke-width="9"/>
<path data-mi="${C.two}" id="wOut" class="rura" d="M770 120 H861" stroke-width="9"/><path id="wOutA" class="ruch" d="M770 120 H861" stroke-width="9"/>
<path data-mi="${C.two}" id="wCO" class="rura" d="M889 120 H985" stroke-width="9"/><path id="wCOA" class="ruch" d="M889 120 H985" stroke-width="9"/>
<path data-mi="${C.t5}" id="wCWU" class="rura" d="M875 134 V205 H985" stroke-width="9"/><path id="wCWUA" class="ruch" d="M875 134 V205 H985" stroke-width="9"/>
<g data-mi="${C.ibh1}"><rect id="ibh" x="800" y="109" width="34" height="22" rx="5" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.25)"/><text x="817" y="124" text-anchor="middle" font-size="10.5" font-weight="800" fill="#8ea0c4">IBH</text></g>
<g data-mi="${C.sv1}"><circle cx="875" cy="120" r="14" fill="#0b1630" stroke="#b388ff" stroke-width="2.5"/><text x="875" y="124.5" text-anchor="middle" font-size="10" font-weight="800" fill="#b388ff">SV1</text></g>
<text data-mi="${C.strefa}" x="985" y="100" text-anchor="end" font-size="12.5" fill="#39c0ff" letter-spacing="1">BUFOR → DOM</text>
<text x="985" y="228" text-anchor="end" font-size="12.5" fill="#ffb020" letter-spacing="1" id="sCwu" data-cel="cwu">BOJLER CWU</text>
<text data-mi="${C.twi}" x="985" y="280" text-anchor="end" font-size="12.5" fill="#8ea0c4" letter-spacing="1">POWRÓT</text>
<text data-mi="${C.two}" x="785" y="160" font-size="13" fill="#8ea0c4">wyjście <tspan id="sTwo" fill="#e8eefc" font-weight="800">–</tspan> · T1 <tspan data-mi="${C.t1}" id="sT1" fill="#e8eefc" font-weight="800">–</tspan></text>
<text data-mi="${C.twi}" x="785" y="316" font-size="13" fill="#8ea0c4">wejście <tspan id="sTwi" fill="#e8eefc" font-weight="800">–</tspan></text>
<text data-mi="${C.qhp}" x="790" y="360" font-size="12.5" fill="#8ea0c4" letter-spacing="1">CIEPŁO DO WODY</text>
<text data-mi="${C.qhp}" x="790" y="398" font-size="34" font-weight="800" fill="#e8eefc" id="sQ">–</text>
<text data-mi="${C.flow}" x="790" y="424" font-size="13.5" fill="#8ea0c4" id="sQop">–</text>
<text data-mi="${C.qdt}" x="790" y="446" font-size="13.5" fill="#8ea0c4" id="sQop2"></text>
`;

class RotensoPompa extends HTMLElement {
  setConfig(c) {
    this.cfg = c || {};
    this.E = Object.assign({}, ENC, this.cfg.encje || {});
    this._szac = /moc_elektryczna_szacowana$/.test(this.E.prad_moc); // moc z U×I zamiast licznika: prąd ma rozdzielczość 1 A, czyli ±0,4 kW
    this._woleoze = this.cfg.woleoze !== false;
  }
  getCardSize() { return 16; }
  set hass(h) {
    this._h = h; if (!this.E) this.setConfig(this.cfg);
    if (!this._init) { this._init = true; this._buduj(); this._tz = setInterval(() => this._zegar(), 1000); this._zegar();
      this._doba(); this._td = setInterval(() => this._doba(), 300e3); }
    const t = Date.now(); if (!this._ost || t - this._ost > 1500) { this._ost = t; this._odswiez(); }
  }
  disconnectedCallback() { clearInterval(this._tz); clearInterval(this._td); this._init = false; }
  // HA odłącza i podłącza kartę przy zmianie zakładek: po ponownym podłączeniu budujemy od nowa (bez czekania na kolejny stan).
  connectedCallback() { if (this._h && !this._init) this.hass = this._h; }
  st(id) { const s = this._h && this._h.states[id]; return s ? s.state : undefined; }
  n(id) { const v = parseFloat(this.st(id)); return isNaN(v) ? null : v; }
  on(id) { return this.st(id) === 'on'; }
  $(q) { return this.shadowRoot.querySelector(q); }
  tx(id, v) { const e = this.$('#' + id); if (e && e.textContent !== v) e.textContent = v; }

  _buduj() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    // Nowy DOM = puste kontenery, więc kasujemy pamięć tego, co już narysowane (inaczej niezmienione sekcje zostają puste).
    this._chipy = this._sp = this._opis = this._krzSig = this._kom = this._nast = this._cwu = this._licz = this._bl = this._dobaSig = this._ost = undefined;
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="w">
      <div class="top"><div class="ttl"><b>POMPA CIEPŁA</b> · TELEMETRIA</div><div class="zeg" id="zeg"></div><div class="sp"></div><div id="chipy" style="display:flex;gap:10px;flex-wrap:wrap"></div>
        ${this._woleoze ? `<a class="chip btn" href="${LINK_PRO}" target="_blank" rel="noopener">Pro ›</a>` : ''}</div>
      <div class="g">
        <div class="c c8"><h3>Obieg czynnika R32 na żywo <span id="schOpis"></span></h3><svg id="sch" viewBox="0 0 1000 500" width="100%">${SCHEMAT}</svg></div>
        <div class="kol">
          <div class="c"><h3>Sprawność teraz <span id="copOpis"></span></h3><div class="duzy" data-mi="${C.qhp}"><b id="cop">–</b><small id="copPod"></small></div><div class="mini" id="sprawn"></div>
            <div class="uw">COP = ciepło według pompy ÷ prąd z <code>prad_moc</code>${this._szac ? ' (moc szacowana z U×I, ±0,4 kW)' : ''}. Przepływ pompa wylicza (±15%), czujniki wody ±1°C.</div></div>
          <div class="c"><h3>Co teraz robi pompa</h3><div id="stan" data-mi="${C.run}" style="font-size:15px;line-height:1.5"></div></div>
        </div>
        <div class="c c8"><h3><span style="letter-spacing:.16em;text-transform:uppercase;font-weight:700">Doba pracy: ostatnie 24 h</span><span id="dobaOpis"></span></h3>
          <svg id="doba" data-mi="${this.E.prad_moc}" viewBox="0 0 1000 250" width="100%"></svg><div class="st" id="dobaSt"></div>
          <div class="uw">Moc z <code>prad_moc</code>${this._szac ? ' (szacowana z U×I)' : ''}, na wykresie średnie minutowe. Bieg sprężarki: od wzrostu mocy powyżej 600 W do spadku poniżej 300 W, czerwona kreska pod osią. Pasy: CWU = zawór na bojler, Dom = termostaty wołają o ciepło (strefa 1).</div></div>
        <div class="c c4"><h3>Krzywa grzewcza nr 9 <span id="krzOpis"></span></h3><svg id="krz" data-mi="${C.t1s}" viewBox="0 0 520 300" width="100%"></svg><div class="uw" id="krzUw"></div></div>
        <div class="c c4"><h3>Sprężarka i inwerter</h3><div class="mini3" id="kom"></div><div class="uw" id="komUw"></div></div>
        <div class="c c4"><h3>Nastawy instalatora <span>teraz · fabrycznie</span></h3><div class="nast" id="nast"></div>
          <div class="uw">Odczyt z pompy co 10 min. Na pomarańczowo: inaczej niż fabrycznie. Zmiana na sterowniku ściennym (menu serwisanta); z HA w wersji Pro.</div></div>
        <div class="kol">
          <div class="c" id="cwuKarta"><h3>Ciepła woda (CWU) <span id="cwuOpis"></span></h3><div class="mini" id="cwu"></div></div>
          ${this._woleoze ? `<div class="c pro"><h3>Wersja Pro</h3><p>Sterowanie CWU na tanie godziny, prąd i COP osobno dla domu i ciepłej wody, zmiana nastaw instalatora prosto z Home Assistanta.</p>
            <div class="bt"><a class="b1" href="${LINK_PRO}" target="_blank" rel="noopener">Pro: 149 zł</a><a href="${LINK_ZESTAW}" target="_blank" rel="noopener">Zestaw: od 499 zł</a></div></div>` : ''}
          <div class="c"><h3>Liczniki i błędy</h3><div class="mini" id="licz"></div><div class="bl" id="bledy" style="margin-top:10px"></div></div>
        </div>
      </div>${this._woleoze ? STOPKA : ''}</div>`;
    this._klik();
  }
  _klik() {
    const R = this.shadowRoot;
    // shadowRoot przeżywa przebudowy karty: nasłuch kliknięć dodajemy tylko raz (inaczej okno historii otwierałoby się 2×)
    if (!this._klikOk) { this._klikOk = true; R.addEventListener('click', (e) => {
      const c = e.target.closest('[data-cel=cwu]'); if (c) { this._pokazCwu(); return; }
      if (e.target.closest('a[href]')) return; // zwykły link (FAQ, Pro, pomoc) – bez okna statystyk
      const m = e.target.closest('[data-mi]'); if (m && m.dataset.mi) this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: m.dataset.mi }, bubbles: true, composed: true }));
    }); }
    if (location.hash === '#cwu') setTimeout(() => this._pokazCwu(), 400);
  }
  _pokazCwu() { const k = this.$('#cwuKarta'); if (!k) return; k.scrollIntoView({ behavior: 'smooth', block: 'center' }); k.classList.remove('blysk'); void k.offsetWidth; k.classList.add('blysk'); }
  at(id, a) { const s = this._h && this._h.states[id]; return s ? s.attributes[a] : undefined; }
  _zegar() { const z = this.$('#zeg'); if (z) z.textContent = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }); }

  _odswiez() {
    const n = (k) => this.n(C[k]), on = (k) => this.on(C[k]);
    const hz = n('hz') || 0, biegnie = hz > 0, el = this.n(this.E.prad_moc), elKW = el == null ? null : el / 1000;
    const qhp = n('qhp'), qdt = n('qdt'), flow = n('flow'), twi = n('twi'), two = n('two'), t1 = n('t1'), t1s = n('t1s'), t4 = n('t4');
    const dT1SH = n('dT1SH'), ph = n('ph'), tc = tSat(ph), naCwu = on('sv1'), pompaWody = on('pumpi');
    const online = on('online'), kod = this.st(C.kod), blad = (kod && kod !== 'brak' && kod !== 'unknown' && kod !== 'unavailable') || on('alarm');
    const odszr = on('defr'), strefa = on('strefa');

    // Chipy u góry
    let stan;
    if (!online) stan = ['Moduł Modbus offline', 'var(--bad)'];
    else if (blad) stan = [`Błąd: ${kod}`, 'var(--bad)'];
    else if (odszr) stan = ['Odszranianie', 'var(--vio)'];
    else if (biegnie && naCwu) stan = ['Ładuje CWU', 'var(--warn)'];
    else if (biegnie) stan = ['Grzeje dom', 'var(--ok)'];
    else if (!strefa) stan = ['Postój: termostaty nie wołają', 'var(--mut)'];
    else stan = ['Postój: woda dość ciepła', 'var(--hp)'];
    const chip = (t, k, e) => `<div class="chip" data-mi="${e}"><span class="led" style="color:${k}"></span>${t}</div>`;
    const ch = chip(`<b>${stan[0]}</b>`, stan[1], odszr ? C.defr : biegnie && naCwu ? C.sv1 : C.run) + chip(`na dworze <b>${fT(t4)}</b>`, 'var(--hp)', C.t4) + chip(`sprężarka <b>${f(hz)} Hz</b>`, biegnie ? 'var(--ok)' : 'var(--mut)', C.hz);
    if (this._chipy !== ch) { this._chipy = ch; this.$('#chipy').innerHTML = ch; }

    // Schemat
    const vis = (id, v) => { const e = this.$('#' + id); if (e) e.style.display = v ? '' : 'none'; };
    const kolR = { rSuc: '#39c0ff', rGas: '#ff5470', rLiq: '#ffb020', rMix: '#7aa8ff' };
    const durR = `${Math.max(0.5, 2.6 - hz / 40).toFixed(2)}s`;
    for (const [id, k] of Object.entries(kolR)) {
      const b = this.$('#' + id), a = this.$('#' + id + 'A');
      b.setAttribute('stroke', k); b.setAttribute('opacity', biegnie ? '.45' : '.18');
      a.setAttribute('stroke', k); a.style.animationDuration = durR; vis(id + 'A', biegnie);
    }
    const durW = `${Math.max(0.6, 3.2 / Math.max(0.3, flow || 0.3)).toFixed(2)}s`, plynie = pompaWody && (flow || 0) > 0.1;
    const wody = { wIn: twi, wOut: two, wCO: two, wCWU: two };
    for (const [id, t] of Object.entries(wody)) {
      const b = this.$('#' + id), a = this.$('#' + id + 'A'), aktywna = id === 'wCO' ? !naCwu : id === 'wCWU' ? naCwu : true;
      b.setAttribute('stroke', kolT(t)); b.setAttribute('opacity', aktywna ? '.55' : '.12');
      a.setAttribute('stroke', kolT(t)); a.style.animationDuration = durW; vis(id + 'A', plynie && aktywna);
    }
    const fan = this.$('#fan'), rpm = n('fan') || 0; fan.style.animationDuration = rpm > 0 ? `${Math.max(0.25, 60 / rpm * 4).toFixed(2)}s` : '0s'; fan.style.animationPlayState = rpm > 0 ? 'running' : 'paused';
    this.$('#spr').setAttribute('filter', biegnie ? 'url(#blask)' : ''); this.$('#spr').setAttribute('stroke', biegnie ? '#ff5470' : '#5a6a8a');
    this.$('#plytaBlask').setAttribute('opacity', biegnie && !odszr ? '.12' : '0');
    const ibhOn = on('ibh1') || on('ibh2'); this.$('#ibh').setAttribute('fill', ibhOn ? 'rgba(255,84,112,.55)' : 'rgba(255,255,255,.06)');
    this.tx('sT4', fT(t4)); this.tx('sT3', fT(n('t3'))); this.tx('sFan', `${f(rpm)} obr/min`); this.tx('sTh', fT(n('th'))); this.tx('sTp', fT(n('tp')));
    this.tx('sT2b', fT(n('t2b'))); this.tx('sT2', fT(n('t2'))); this.tx('sHz', `${f(hz)} Hz`); this.tx('sHzT', biegnie || n('hzT') ? `cel ${f(n('hzT'))} Hz` : 'stoi');
    this.tx('sEev', `${f(n('eev'))} kroków`); this.tx('sTwo', fT(two)); this.tx('sT1', fT(t1)); this.tx('sTwi', fT(twi));
    this.tx('sPh', ph == null ? '' : biegnie ? `ciśnienie ${f(ph / 1000, 2)} MPa → skrapla w ${f(tc, 1)}°C` : `ciśnienie ${f(ph / 1000, 2)} MPa (postój, obieg wyrównany)`);
    this.tx('sCwu', `BOJLER CWU ${fT(n('t5'))} ›`);
    this.tx('sQ', biegnie && qhp != null ? `${f(qhp, 1)} kW` : '0 kW');
    this.tx('sQop', flow == null ? '' : `przepływ ${f(flow, 2)} m³/h · ΔT ${twi != null && two != null ? f(two - twi, 0) : '–'} K`);
    this.tx('sQop2', biegnie && qdt != null ? `z przepływu × ΔT: ${f(qdt, 1)} kW` : '');
    this.tx('schOpis', naCwu ? 'zawór SV1 → bojler CWU' : 'zawór SV1 → bufor i dom');

    // Sprawność
    const cop = biegnie && elKW > 0.3 && qhp != null ? qhp / elKW : null;
    this.tx('cop', cop == null ? '–' : f(cop, 1));
    this.tx('copPod', cop == null ? (biegnie ? 'czekam na dane' : 'sprężarka stoi') : 'COP teraz');
    const kc = cop == null ? 'var(--mut)' : cop >= 3.5 ? 'var(--ok)' : cop >= 2.5 ? 'var(--warn)' : 'var(--bad)'; this.$('#cop').style.color = kc;
    const m2 = (t, v, e) => `<div${e ? ` data-mi="${e}"` : ''}><small>${t}</small><b>${v}</b></div>`;
    const sp = m2(this._szac ? 'Prąd teraz (szacowany)' : 'Prąd teraz', el == null ? '–' : el < 1000 ? `${f(el)} W` : `${f(elKW, 2)} kW`, this.E.prad_moc) + m2('Ciepło wg pompy', biegnie ? `${f(qhp, 1)} kW` : '0 kW', C.qhp)
      + m2('Ciepło z przepływu×ΔT', biegnie ? `${f(qdt, 1)} kW` : '0 kW', C.qdt) + m2('Skraplanie − woda', biegnie && tc != null && two != null ? `${f(tc - two, 1)} K` : '–', C.ph);
    if (this._sp !== sp) { this._sp = sp; this.$('#sprawn').innerHTML = sp; }

    // Co teraz robi pompa
    const prog = t1s != null && dT1SH != null ? t1s - dT1SH : null;
    let opis;
    if (!online) opis = 'Brak łączności z modułem Modbus przy sterowniku ściennym. Pompa pracuje normalnie na własnym sterowniku.'
      + ' Sprawdź zamianę A/B i HMI SET = 0 (<a href="https://github.com/WoleOze/rotenso-midea-modbus-ha/blob/main/docs/faq.md" target="_blank" rel="noopener" style="color:var(--hp)">FAQ</a>).'
      + (this._woleoze ? ' Dalej nic? Napisz na <a href="mailto:pompa@woleoze.pl" style="color:var(--hp)">pompa@woleoze.pl</a>; z Pro najpierw kliknij „Wyślij raport” w dodatku.' : '');
    else if (blad) opis = `Pompa zgłasza błąd <b>${kod}</b>.`;
    else if (odszr) opis = 'Odszranianie parownika: pompa na chwilę odwraca obieg i zabiera ciepło z wody.';
    else if (biegnie && naCwu) opis = `Ładuje bojler: <b>${fT(n('t5'))}</b> → zadana <b>${fT(n('cwuZ'))}</b>. Dom w tym czasie nie dostaje ciepła.`;
    else if (biegnie) opis = `Grzeje dom: woda <b>${fT(two)}</b>, zadana z krzywej <b>${fT(t1s)}</b> przy ${fT(t4)} na dworze.`;
    else if (!strefa) opis = 'Sprężarka stoi: termostaty nie wołają o ciepło (strefa 1 wyłączona).';
    else opis = `Sprężarka stoi: woda <b>${fT(t1)}</b>. Ruszy, gdy spadnie do <b>${fT(prog)}</b> (zadana ${fT(t1s)} − histereza ${f(dT1SH)}°C).`;
    if (on('ibh1') || on('ibh2')) opis += ' <b style="color:var(--bad)">Grzałka IBH pracuje.</b>';
    if (on('tbh')) opis += ' <b style="color:var(--bad)">Grzałka bojlera pracuje.</b>';
    if (this._opis !== opis) { this._opis = opis; this.$('#stan').innerHTML = opis; }

    this._krzywa(); this._kompresor(); this._nastawy(); this._cwuLicz();
    if (this._dobaD) this._dobaRysuj();
  }

  _krzywa() {
    const n = (k) => this.n(C[k]), h1 = n('h1'), h2 = n('h2'), x1 = n('x1'), x2 = n('x2'), t4 = n('t4'), t1s = n('t1s'), t1 = n('t1'), hist = n('dT1SH');
    const sig = [h1, h2, x1, x2, t4, t1s, t1, hist].join(); if (this._krzSig === sig) return; this._krzSig = sig;
    const s = this.$('#krz'); if (h1 == null || h2 == null || x1 == null || x2 == null) { s.innerHTML = '<text x="260" y="150" text-anchor="middle" fill="#8ea0c4" font-size="15">Czekam na nastawy z pompy…</text>'; return; }
    const W = 520, H = 300, L = 40, R = 12, T = 14, Bm = 30, xmin = -25, xmax = 25, ymin = 20, ymax = 50;
    const X = (t) => L + (t - xmin) / (xmax - xmin) * (W - L - R), Y = (v) => H - Bm - (v - ymin) / (ymax - ymin) * (H - T - Bm);
    const kr = (a1, b1, a2, b2) => (t) => (t <= a1 ? b1 : t >= a2 ? b2 : b1 + (t - a1) / (a2 - a1) * (b2 - b1));
    const ta = kr(x1, h1, x2, h2), fab = kr(-5, 35, 7, 28), pts = [xmin, x1, x2, xmax];
    let g = '';
    for (let v = ymin; v <= ymax; v += 5) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,.06)"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="#8ea0c4">${v}°</text>`;
    for (let t = xmin; t <= xmax; t += 10) g += `<text x="${X(t)}" y="${H - 10}" text-anchor="middle" font-size="12" fill="#8ea0c4">${t > 0 ? '+' : ''}${t}°</text>`;
    g += `<line x1="${X(0)}" x2="${X(0)}" y1="${T}" y2="${H - Bm}" stroke="rgba(255,255,255,.1)"/>`;
    if (hist != null) g += `<polygon points="${pts.map((t) => `${X(t)},${Y(ta(t))}`).join(' ')} ${pts.slice().reverse().map((t) => `${X(t)},${Y(ta(t) - hist)}`).join(' ')}" fill="rgba(57,192,255,.14)"/>`;
    g += `<polyline points="${[xmin, -5, 7, xmax].map((t) => `${X(t)},${Y(fab(t))}`).join(' ')}" fill="none" stroke="#8ea0c4" stroke-width="2" stroke-dasharray="6 6"/>`;
    g += `<polyline points="${pts.map((t) => `${X(t)},${Y(ta(t))}`).join(' ')}" fill="none" stroke="#ffb020" stroke-width="3.5"/>`;
    if (t4 != null) {
      g += `<line x1="${X(t4)}" x2="${X(t4)}" y1="${T}" y2="${H - Bm}" stroke="rgba(255,255,255,.35)" stroke-dasharray="3 5"/>`;
      if (t1s != null) g += `<circle cx="${X(t4)}" cy="${Y(t1s)}" r="7" fill="#ffb020" stroke="#040914" stroke-width="2"/>`;
      if (t1 != null) g += `<circle cx="${X(t4)}" cy="${Y(t1)}" r="6" fill="${kolT(t1)}" stroke="#fff" stroke-width="1.5"/><text x="${X(t4) + 10}" y="${Y(t1) + 4}" font-size="12.5" fill="#e8eefc">woda ${f(t1)}°</text>`;
    }
    g += `<text x="${W - R}" y="${T + 12}" text-anchor="end" font-size="12" fill="#ffb020">ustawiona</text><text x="${W - R}" y="${T + 28}" text-anchor="end" font-size="12" fill="#8ea0c4">fabrycznie (przerywana)</text>`;
    s.innerHTML = g;
    this.tx('krzOpis', `${f(h1)}° przy ${f(x1)}° · ${f(h2)}° przy +${f(x2)}°`);
    this.$('#krzUw').innerHTML = t4 == null ? '' : `Przy ${fT(t4)} na dworze zadana woda to <b>${fT(t1s)}</b>. Niebieski pas to histereza ${f(hist)}°C: sprężarka rusza ponownie, gdy woda spadnie do <b>${fT(t1s - hist)}</b> (fabrycznie przy ${fT(t1s - 5)}).`;
  }

  _kompresor() {
    const n = (k) => this.n(C[k]), ph = n('ph'), tc = (n('hz') || 0) > 0 ? tSat(ph) : null;
    const m = (t, v) => `<div><small>${t}</small><b>${v}</b></div>`, m3 = (e, t, v) => `<div data-mi="${e}"><small>${t}</small><b>${v}</b></div>`;
    const h = m3(C.hz, 'Częstotliwość', `${f(n('hz'))} Hz`) + m3(C.hzT, 'Docelowa', `${f(n('hzT'))} Hz`) + m3(C.iz, 'Prąd jedn. zewn.', `${f(n('iz'))} A`)
      + m3(C.tp, 'Tłoczenie Tp', fT(n('tp'))) + m3(C.th, 'Ssanie Th', fT(n('th'))) + m3(C.ph, 'Skraplanie', tc == null ? 'postój' : `${f(tc, 1)}°C`)
      + m3(C.ph, 'Ciśnienie wys.', ph == null ? '–' : `${f(ph / 100, 1)} bar`) + m3(C.udc, 'Szyna DC', `${f(n('udc'))} V`) + m3(C.idc, 'Prąd DC', `${f(n('idc'))} A`)
      + m3(C.tf, 'Inwerter TF', fT(n('tf'))) + m3(C.eev, 'Zawór EEV', `${f(n('eev'))} kr.`) + m3(C.fan, 'Wentylator', `${f(n('fan'))} obr/min`);
    if (this._kom !== h) { this._kom = h; this.$('#kom').innerHTML = h; }
    const oil = this.on(C.oil), mroz = this.on(C.mroz);
    this.tx('komUw', `Temperatura skraplania z ciśnienia (R32, tablica nasycenia). Napięcie zasilania ${f(n('uz'))} V.${oil ? ' Teraz: powrót oleju.' : ''}${mroz ? ' Teraz: ochrona przed zamarzaniem.' : ''}`);
  }

  _nastawy() {
    let h = '';
    NAST.forEach(([e, nr, op, fab, j], i) => {
      const v = this.n(P + e), inna = v != null && v !== fab;
      if (i) h += '<div class="lin"></div>';
      h += `<span class="nr" data-mi="${P + e}">${nr}</span><span data-mi="${P + e}">${op}</span><span data-mi="${P + e}" class="v${inna ? ' inna' : ''}">${v == null ? '–' : f(v, Number.isInteger(v) ? 0 : 1)}${j && v != null ? ' ' + j : ''}</span><span class="fb" data-mi="${P + e}">${f(fab)}${j ? ' ' + j : ''}</span>`;
    });
    if (this._nast !== h) { this._nast = h; this.$('#nast').innerHTML = h; }
  }

  _cwuLicz() {
    const n = (k) => this.n(C[k]), m = (t, v, e) => `<div${e ? ` data-mi="${e}"` : ''}><small>${t}</small><b>${v}</b></div>`;
    const t5 = n('t5'), z = n('cwuZ'), d5 = n('dT5'), wl = this.on(C.cwuOn);
    const c = m('W bojlerze', fT(t5), C.t5) + m('Zadana teraz', fT(z), C.cwuZ) + m('Doładuje poniżej', z != null && d5 != null ? fT(z - d5) : '–', C.dT5)
      + m('Grzałka bojlera', this.on(C.tbh) ? '<span style="color:var(--bad)">pracuje</span>' : 'wyłączona', C.tbh);
    if (this._cwu !== c) { this._cwu = c; this.$('#cwu').innerHTML = c; }
    this.tx('cwuOpis', wl ? (this.on(C.prio) ? 'włączona · priorytet' : 'włączona') : 'WYŁĄCZONA');
    this.$('#cwuOpis').style.color = wl ? '' : 'var(--bad)';
    const eQ = n('eQ'), eP = n('eP');
    const l = m('Ciepło od montażu', `${tys(eQ)} kWh`, C.eQ) + m('Prąd wg pompy', `${tys(eP)} kWh`, C.eP) + m('COP wg liczników pompy', eQ && eP ? f(eQ / eP, 2) : '–', C.eQ)
      + m('Sprężarka przepracowała', `${tys(n('godz'))} h`, C.godz);
    if (this._licz !== l) { this._licz = l; this.$('#licz').innerHTML = l; }
    const kod = this.st(C.kod), bl = C.bl.map((id) => this.n(id));
    const b = `<span data-mi="${C.kod}">Teraz</span><span data-mi="${C.kod}">${kod && kod !== 'unknown' ? kod : '–'}</span>` + bl.map((v, i) => `<span data-mi="${C.bl[i]}">Poprzedni ${i + 1}</span><span data-mi="${C.bl[i]}">${v == null ? '–' : BLEDY[v] || `kod ${v}`}</span>`).join('')
      + `<span data-mi="${C.online}">Moduł Modbus</span><span data-mi="${C.wifi}">${this.on(C.online) ? 'online' : '<b style="color:var(--bad)">offline</b>'} · Wi-Fi ${f(n('wifi'))} dBm</span>`;
    if (this._bl !== b) { this._bl = b; this.$('#bledy').innerHTML = b; }
  }

  async _doba() {
    if (!this._h || !this._h.callWS || this._dobaTrwa) return;
    this._dobaTrwa = true;
    const t1 = Date.now(), t0 = t1 - 864e5, iso = (t) => new Date(t).toISOString();
    try {
      // Moc elektryczna (prad_moc): surowe odczyty. Pierwszy raz cała doba, potem tylko przyrost od ostatniego punktu.
      const od = this._raw && this._raw.length ? this._raw[this._raw.length - 1].t : t0;
      const [hm, hist, sts] = await Promise.all([
        this._h.callWS({ type: 'history/history_during_period', start_time: iso(od), end_time: iso(t1), entity_ids: [this.E.prad_moc], minimal_response: true, no_attributes: true, significant_changes_only: false }),
        this._h.callWS({ type: 'history/history_during_period', start_time: iso(t0), end_time: iso(t1), entity_ids: [C.sv1, C.strefa, C.defr], minimal_response: true, no_attributes: true, significant_changes_only: false }),
        this._h.callWS({ type: 'recorder/statistics_during_period', start_time: iso(t0), end_time: iso(t1), statistic_ids: [this.E.temp_zew], period: '5minute', types: ['mean'], units: {} }),
      ]);
      const nowe = (hm[this.E.prad_moc] || []).map((x) => ({ t: x.lu ? x.lu * 1000 : Date.parse(x.last_updated), v: parseFloat(x.s) })).filter((q) => !isNaN(q.v) && q.t);
      const ost = this._raw && this._raw.length ? this._raw[this._raw.length - 1].t : -1;
      this._raw = (this._raw || []).concat(nowe.filter((q) => q.t > ost)).filter((q) => q.t >= t0 - 600e3);
      const tz = (sts[this.E.temp_zew] || []).map((x) => ({ t: typeof x.start === 'number' ? x.start : Date.parse(x.start), v: x.mean })).filter((q) => q.v != null);
      const pasy = (id) => { const a = (hist[id] || []).map((x) => ({ t: x.lu ? x.lu * 1000 : Date.parse(x.last_updated), s: x.s })); const o = [];
        a.forEach((x, i) => { if (x.s === 'on') o.push([Math.max(x.t, t0), i + 1 < a.length ? a[i + 1].t : t1]); }); return o; };
      this._dobaD = { t0, t1, tz, cwu: pasy(C.sv1), dom: pasy(C.strefa), odsz: pasy(C.defr) };
      this._dobaSig = null; this._dobaRysuj();
    } catch (e) { this.$('#doba').innerHTML = `<text x="20" y="120" fill="#8ea0c4" font-size="15">Doba niedostępna: ${e.message}</text>`; }
    this._dobaTrwa = false;
  }

  _dobaRysuj() {
    const D = this._dobaD, s = this.$('#doba'), raw = this._raw || []; if (!D || !s) return;
    const sig = `${D.t1}|${raw.length}`; if (this._dobaSig === sig) return; this._dobaSig = sig;
    const { t0, t1, tz } = D, W = 1000, H = 250, L = 46, R = 46, T = 44, Bm = 26;
    // Średnie minutowe do rysowania i energii (stan trzymany do następnego odczytu)
    const min = []; let j = 0, cur = null;
    while (j < raw.length && raw[j].t < t0) cur = raw[j++].v;
    for (let m = t0; m < t1; m += 60e3) { let suma = 0, ile = 0; if (cur != null) { suma += cur; ile++; }
      while (j < raw.length && raw[j].t < m + 60e3) { cur = raw[j++].v; suma += cur; ile++; }
      min.push({ t: m, v: ile ? suma / ile : null }); }
    const X = (t) => L + (Math.min(Math.max(t, t0), t1) - t0) / (t1 - t0) * (W - L - R);
    const pmax = Math.max(4, Math.ceil(Math.max(0, ...min.map((q) => (q.v || 0) / 1000)))), Y = (kw) => H - Bm - kw / pmax * (H - T - Bm);
    let g = '';
    for (let k = 0; k <= pmax; k += pmax > 6 ? 2 : 1) g += `<line x1="${L}" x2="${W - R}" y1="${Y(k)}" y2="${Y(k)}" stroke="rgba(255,255,255,.06)"/><text x="${L - 6}" y="${Y(k) + 4}" text-anchor="end" font-size="12" fill="#8ea0c4">${k} kW</text>`;
    const h0 = new Date(t0); h0.setMinutes(0, 0, 0);
    for (let t = h0.getTime() + 3600e3; t < t1; t += 3600e3) { const d = new Date(t); if (d.getHours() % 3) continue;
      g += `<line x1="${X(t)}" x2="${X(t)}" y1="${T - 30}" y2="${H - Bm}" stroke="rgba(255,255,255,.05)"/><text x="${X(t)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#8ea0c4">${String(d.getHours()).padStart(2, '0')}:00</text>`; }
    const pas = (lista, y, k, nazwa) => `<text x="${L - 6}" y="${y + 9}" text-anchor="end" font-size="11" fill="#8ea0c4">${nazwa}</text><rect x="${L}" y="${y}" width="${W - L - R}" height="11" rx="5" fill="rgba(255,255,255,.04)"/>`
      + lista.map(([a, b]) => `<rect x="${X(a)}" y="${y}" width="${Math.max(1.5, X(b) - X(a))}" height="11" rx="4" fill="${k}"/>`).join('');
    g += pas(D.dom, 4, 'rgba(57,192,255,.7)', 'Dom') + pas(D.cwu, 20, 'rgba(255,176,32,.85)', 'CWU');
    const mm = min.filter((q) => q.v != null);
    if (mm.length) {
      const pkt = mm.map((q) => `${X(q.t + 30e3).toFixed(1)},${Y(q.v / 1000).toFixed(1)}`);
      g += `<path d="M${X(mm[0].t + 30e3)},${Y(0)} L${pkt.join(' L')} L${X(mm[mm.length - 1].t + 30e3)},${Y(0)} Z" fill="rgba(255,84,112,.22)"/><polyline points="${pkt.join(' ')}" fill="none" stroke="#ff5470" stroke-width="1.4"/>`;
    }
    D.odsz.forEach(([a, b]) => { g += `<rect x="${X(a)}" y="${T}" width="${Math.max(2, X(b) - X(a))}" height="${H - T - Bm}" fill="rgba(179,136,255,.25)"/>`; });
    if (tz.length) {
      const tmin = Math.floor(Math.min(...tz.map((q) => q.v)) / 5) * 5 - 5, tmax = Math.ceil(Math.max(...tz.map((q) => q.v)) / 5) * 5 + 5, YT = (v) => H - Bm - (v - tmin) / (tmax - tmin) * (H - T - Bm);
      g += `<polyline points="${tz.map((q) => `${X(q.t + 150e3).toFixed(1)},${YT(q.v).toFixed(1)}`).join(' ')}" fill="none" stroke="#39c0ff" stroke-width="1.6" stroke-dasharray="4 4"/>`;
      for (let v = tmin; v <= tmax; v += 5) g += `<text x="${W - R + 6}" y="${YT(v) + 4}" font-size="11.5" fill="#39c0ff">${v}°</text>`;
    }
    // Biegi sprężarki z surowych odczytów: start, gdy moc ≥ 600 W, koniec, gdy < 300 W (sam postój z pompą obiegową to ok. 100 W)
    const biegi = []; let start = null;
    for (const q of raw) { if (q.t < t0) { start = q.v >= 600 ? t0 : null; continue; }
      if (start == null && q.v >= 600) start = q.t; else if (start != null && q.v < 300) { biegi.push({ od: start, do: q.t }); start = null; } }
    if (start != null) biegi.push({ od: start, do: t1, trwa: true });
    biegi.forEach((b) => { g += `<rect x="${X(b.od)}" y="${H - Bm + 2}" width="${Math.max(1.5, X(b.do) - X(b.od))}" height="4" fill="#ff5470"/>`; });
    s.innerHTML = g;
    const pelne = biegi.filter((b) => b.od > t0 && !b.trwa), dl = (b) => (b.do - b.od) / 60e3;
    const starty = biegi.filter((b) => b.od > t0).length, czas = biegi.reduce((a, b) => a + dl(b), 0);
    const kwh = mm.reduce((a, q) => a + q.v / 60 / 1000, 0), sr = pelne.length ? pelne.reduce((a, b) => a + dl(b), 0) / pelne.length : null;
    const krotkie = pelne.filter((b) => dl(b) <= 20).length, najkr = pelne.length ? Math.min(...pelne.map(dl)) : null, ladowan = D.cwu.filter(([a]) => a > t0).length;
    const k = (t, v, kol, e = C.run) => `<div data-mi="${e}">${t}<b${kol ? ` style="color:${kol}"` : ''}>${v}</b></div>`;
    this.$('#dobaSt').innerHTML = k('Starty sprężarki', starty, starty > 24 ? 'var(--warn)' : '') + k('Średni bieg', sr == null ? '–' : `${f(sr)} min`)
      + k('Najkrótszy', najkr == null ? '–' : `${f(najkr)} min`) + k('Biegi ≤ 20 min', krotkie, krotkie > 3 ? 'var(--warn)' : '')
      + k('Praca', `${f(czas / 14.4)}% doby`) + k('Prąd', `${f(kwh, 1)} kWh`, '', this.E.prad_moc) + k('Ładowania CWU', ladowan, '', C.sv1);
    this.tx('dobaOpis', `odświeżane co 5 min · ${new Date(t1).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`);
  }
}
customElements.define('rotenso-pompa', RotensoPompa);
