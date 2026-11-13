/* Pompa w HA · czat z gotowymi odpowiedziami + strzałka „do góry” (12.11.2026).
 *
 * Jeden plik dla strony głównej i podstron: <script src="/docs/czat.js" defer></script>
 * Bez AI, bez serwera, bez ciasteczek i bez analityki. Odpowiedzi są niżej, w ODP.
 * Treść odpowiedzi bierzemy ze strony (#zgodnosc, #ceny, #pytania, #zwrot). Zmieniasz cenę
 * na stronie → zmień ją też tutaj.
 *
 * Pamięć: tylko sessionStorage (ta karta przeglądarki): czy czat jest otwarty i które pytania padły.
 * Kolizje w prawym dolnym rogu: przyciski unoszą się nad paskiem .pasekCTA (telefon, strona główna)
 * i nad każdym elementem z atrybutem data-pc-przeszkoda.
 */
(function () {
  "use strict";
  if (window.__pompaCzat) return;
  window.__pompaCzat = true;

  var FB = "https://www.facebook.com/groups/pompacieplahomeassistant";
  var MAIL = "pompa@woleoze.pl";
  var TESTER = "mailto:pompa@woleoze.pl?subject=Zg%C5%82oszenie%20do%20test%C3%B3w%3A%20Pompa%20w%20HA&body=Marka%20i%20model%20pompy%3A%0AZdj%C4%99cie%20ty%C5%82u%20sterownika%20i%20ekranu%20menu%20%28w%20za%C5%82%C4%85czniku%29%3A%0AMasz%20Home%20Assistant%20OS%3F%20%28tak/nie%29%3A%0A";
  var INNA = "mailto:pompa@woleoze.pl?subject=Inna%20marka%3A%20Pompa%20w%20HA&body=Marka%20i%20model%20pompy%3A%0AIntegracja%20w%20Home%20Assistant%20%28np.%20HeishaMon%2C%20NIBE%2C%20MELCloud%2C%20ebusd%29%3A%0AMasz%20Home%20Assistant%20OS%3F%20%28tak/nie%29%3A%0A";
  var PYT = "mailto:pompa@woleoze.pl?subject=Pytanie%3A%20Pompa%20w%20HA";

  /* [id, pytanie, odpowiedź (HTML z tego pliku), [[etykieta, adres, styl]]] */
  var ODP = [
    ["pasuje", "Czy działa z moją pompą?",
      "Decyduje sterownik, nie marka: płyta <b>Midea M-Thermal</b> i czarno-biały panel z zaciskami <b>H1/H2</b> oraz menu <b>17.2</b>. Potwierdzone są m.in. Rotenso Aquami, Kaisai Arctic, Galmet Prima i De Dietrich Modena.<br>Najszybciej: wrzuć zdjęcie tabliczki, odpowiedź dostaniesz od razu.",
      [["📷 Wrzuć zdjęcie tabliczki", "/sprawdz/", "g"], ["Lista zgodności", "/#zgodnosc", ""]]],
    ["cena", "Ile to kosztuje?",
      "<b>Start</b> jest za darmo: sprawdzasz, czy to dla Ciebie, bez sprzętu. <b>Pro</b> to 149 zł, płacisz raz.<br>Gotowy zestaw do podpięcia: <b>Wi-Fi 499 zł</b> albo <b>Wi-Fi + LAN 549 zł</b>, z licencją Pro i wysyłką paczkomatem w cenie.<br>Masz własny moduł ESP32 z RS-485? <b>Wgranie i konfiguracja 299 zł</b> z licencją Pro: wysyłasz moduł, wraca wgrany i sprawdzony.",
      [["Zobacz cennik", "/#ceny", "g"], ["Start za darmo", "/#start", ""]]],
    ["montaz", "Jak wygląda montaż?",
      "Dwie żyły do zacisków <b>H1/H2</b> w sterowniku ściennym, ok. <b>15 minut</b>. Pompy nie otwierasz: pracujesz tylko przy sterowniku na ścianie. Zacisków H1/H2 na płycie pompy nie używasz, bo służą do kaskady.<br>Robisz to sam albo Twój instalator. W instrukcji jest film (2 min) i schemat.",
      [["Instrukcja krok po kroku", "/instrukcja/", "g"]]],
    ["zwrot", "Co, jeśli nie zadziała?",
      "Na sprzęt masz <b>14 dni</b> na odstąpienie od umowy bez podania przyczyny. Przy licencji Pro i usłudze przygotowania wybierasz przy płatności w polu „Zgoda”.<br>Nie masz pewności, czy pompa pasuje? Zapytaj przed zakupem albo zacznij od darmowego Startu.",
      [["Zwrot i odstąpienie", "/#zwrot", "g"], ["Regulamin", "/regulamin/", ""]]],
    ["inne", "Mam inną markę (Panasonic, NIBE, Daikin…)",
      "Dla innych marek są <b>karty Pro na Twojej obecnej integracji</b> w Home Assistant, bez naszego modułu: koszty w zł, COP, raport i alarmy po polsku. Panasonic Aquarea, NIBE S, Mitsubishi Ecodan, Vaillant aroTHERM, Daikin Altherma.<br>To jeszcze testy, więc przed zakupem napisz, jaką masz integrację.",
      [["Inne marki", "/#inne-marki", "g"], ["✉️ Napisz przed zakupem", INNA, ""]]],
    ["tester", "Chcę zostać testerem",
      "Szukamy pierwszych właścicieli <b>Rotenso Windmi, Heatmi</b>, Midei z kolorowym panelem (Arctic R290) i <b>LG Therma V</b>. Program jest napisany, brakuje sprawdzenia na prawdziwej pompie.<br>Pierwszy tester danej pompy płaci <b>270 zł</b>: moduł 120 zł i połowę ceny wgrania, 150 zł. Gdy wszystko działa, licencja Pro zostaje u niego na stałe.<br>Zgłoś się mailem: marka, model i zdjęcie tyłu sterownika.",
      [["🧪 Zgłoś się jako tester", TESTER, "g"], ["Kto jest w testach", "/#testy", ""]]],
    ["ludzie", "Chcę zapytać człowieka",
      "Najszybciej w grupie na Facebooku <b>Pompa Ciepła – Home Assistant</b>: piszą tam właściciele pomp i my.<br>Wolisz prywatnie? Napisz na <b>" + MAIL + "</b>, najlepiej ze zdjęciem ekranu menu 17.2.",
      [["👥 Grupa na Facebooku", FB, "z"], ["✉️ " + MAIL, PYT, ""]]],
    ["kto", "Kim jesteście?",
      "Pompę w HA robi <b>WOLEOZE.PL Sp. z o.o.</b> z Jankowic, rodzina serwisu <b>woleOZE</b>. Sami mamy pompę Rotenso Aquami w Home Assistant i na niej wszystko sprawdzamy.<br>Na woleoze.pl znajdziesz też firmy od pomp ciepła w Twojej okolicy.",
      [["🌱 woleoze.pl", "https://woleoze.pl", "g"], ["👥 Grupa na Facebooku", FB, "z"]]]
  ];
  var MAPA = {};
  ODP.forEach(function (o) { MAPA[o[0]] = o; });

  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var waski = window.matchMedia ? matchMedia("(max-width: 560px)") : { matches: false };

  function css() {
    var s = document.createElement("style");
    s.id = "pc-css";
    s.textContent = [
      ".pc-fab{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:calc(var(--pc-dol,0px) + 16px + env(safe-area-inset-bottom));z-index:45;display:flex;align-items:center;gap:10px;transition:bottom .3s ease,opacity .2s;font-family:Inter,\"Segoe UI\",Roboto,system-ui,-apple-system,sans-serif;pointer-events:none}",
      ".pc-fab>*{pointer-events:auto}",
      ".pc-fab.pc-ukryj{opacity:0}.pc-fab.pc-ukryj>*{pointer-events:none}",
      /* strzałka */
      ".pc-gora{width:46px;height:46px;border-radius:50%;border:1px solid rgba(110,160,255,.4);background:rgba(10,18,38,.9);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#5cb8ff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.45);transition:opacity .25s,transform .25s,border-color .2s,color .2s;padding:0}",
      ".pc-gora svg{width:20px;height:20px}",
      ".pc-gora:hover{border-color:#5cb8ff;color:#fff;transform:translateY(-2px)}",
      ".pc-gora[hidden]{display:flex;opacity:0;transform:translateY(12px) scale(.8);pointer-events:none;visibility:hidden}",
      /* przycisk czatu */
      ".pc-b{position:relative;display:flex;align-items:center;gap:9px;height:52px;padding:0 20px 0 8px;border:0;border-radius:999px;background:linear-gradient(135deg,#39c0ff,#2ee6a6);color:#03121e;font-weight:800;font-size:15.5px;line-height:1;font-family:inherit;cursor:pointer;box-shadow:0 10px 30px rgba(57,192,255,.4),0 0 0 1px rgba(255,255,255,.12) inset;transition:transform .2s,box-shadow .2s}",
      ".pc-b:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(46,230,166,.5)}",
      ".pc-b .pc-ik{width:38px;height:38px;border-radius:50%;background:#03121e;color:#5cf0b0;display:flex;align-items:center;justify-content:center;font-size:19px;flex:none}",
      ".pc-b .pc-kr{position:absolute;top:3px;left:36px;width:12px;height:12px;border-radius:50%;background:#3fe08a;border:2px solid #03121e}",
      ".pc-b .pc-kr::after{content:'';position:absolute;inset:-2px;border-radius:50%;background:#3fe08a;animation:pc-puls 2s ease-out infinite}",
      "@keyframes pc-puls{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.8);opacity:0}}",
      ".pc-b::before{content:'';position:absolute;inset:-4px;border-radius:999px;border:2px solid rgba(92,184,255,.55);opacity:0;animation:pc-ring 3.2s ease-out infinite}",
      "@keyframes pc-ring{0%{opacity:.8;transform:scale(.96)}70%,100%{opacity:0;transform:scale(1.14)}}",
      ".pc-b[hidden]{display:none}",
      ".pc-d{position:absolute;right:0;bottom:calc(100% + 12px);width:max-content;max-width:min(250px,calc(100vw - 40px));padding:10px 14px;border-radius:14px 14px 4px 14px;background:#0d1b38;color:#eaf0ff;border:1px solid rgba(92,184,255,.5);font-weight:700;font-size:14px;line-height:1.35;font-family:inherit;text-align:left;box-shadow:0 12px 30px rgba(0,0,0,.5);opacity:0;transform:translateY(6px);transition:opacity .3s,transform .3s;pointer-events:none}",
      ".pc-b.pc-zacz .pc-d{opacity:1;transform:none}",
      ".pc-b.pc-skok{animation:pc-skok .9s ease-in-out}",
      "@keyframes pc-skok{0%,100%{transform:none}20%{transform:translateY(-9px) rotate(-2deg)}40%{transform:none}60%{transform:translateY(-5px) rotate(1deg)}}",
      /* panel */
      ".pc-o{position:fixed;right:16px;bottom:16px;z-index:60;width:min(400px,calc(100vw - 32px));height:min(640px,calc(100vh - 110px));height:min(640px,calc(100dvh - 110px));display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(14,26,54,.97),rgba(7,13,28,.98));color:#eaf0ff;border:1px solid rgba(110,160,255,.32);border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(57,192,255,.06),0 0 60px rgba(57,192,255,.12);font:15px/1.5 Inter,\"Segoe UI\",Roboto,system-ui,-apple-system,sans-serif;overflow:hidden;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);text-align:left}",
      ".pc-o[hidden]{display:none}",
      ".pc-o *{box-sizing:border-box}",
      ".pc-h{display:flex;align-items:center;gap:12px;padding:14px 12px 14px 16px;border-bottom:1px solid rgba(110,160,255,.18);background:radial-gradient(400px 120px at 0 0,rgba(57,192,255,.18),transparent 70%)}",
      ".pc-av{position:relative;width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,#39c0ff,#2ee6a6);display:flex;align-items:center;justify-content:center;font-size:22px;flex:none;box-shadow:0 6px 18px rgba(57,192,255,.35)}",
      ".pc-av::after{content:'';position:absolute;right:-3px;bottom:-3px;width:12px;height:12px;border-radius:50%;background:#3fe08a;border:2px solid #0b1630}",
      ".pc-h .pc-t{flex:1;min-width:0}",
      ".pc-h b{display:block;font-size:16px;font-weight:900;letter-spacing:.01em}",
      ".pc-h small{display:block;color:#97a8cc;font-size:12.5px;line-height:1.3}",
      ".pc-x{width:40px;height:40px;border-radius:12px;border:1px solid rgba(110,160,255,.25);background:rgba(255,255,255,.04);color:#c9d6f2;font-size:24px;line-height:1;cursor:pointer;flex:none;display:flex;align-items:center;justify-content:center;padding:0}",
      ".pc-x:hover{border-color:#5cb8ff;color:#fff}",
      ".pc-l{position:relative;flex:1;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:16px 14px 10px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}",
      ".pc-m{align-self:flex-start;max-width:92%;background:rgba(23,40,80,.85);border:1px solid rgba(110,160,255,.2);border-radius:16px 16px 16px 5px;padding:11px 14px;color:#dfe8fb}",
      ".pc-m b{color:#fff}",
      ".pc-m .pc-ln{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}",
      ".pc-ln a{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:999px;font-weight:800;font-size:14px;line-height:1.2;text-decoration:none;border:1px solid rgba(92,184,255,.55);color:#8fd0ff;background:rgba(92,184,255,.08)}",
      ".pc-ln a:hover{background:rgba(92,184,255,.18);color:#fff}",
      ".pc-ln a.g{background:linear-gradient(135deg,#39c0ff,#2ee6a6);color:#03121e;border-color:transparent}",
      ".pc-ln a.g:hover{color:#03121e;filter:brightness(1.08)}",
      ".pc-ln a.z,.pc-s a.z{background:linear-gradient(135deg,#ffe066,#ffb627 55%,#ff8f1f);color:#1f1300;border-color:transparent}",
      ".pc-ln a::after{content:'→';font-weight:900}",
      ".pc-u{align-self:flex-end;max-width:85%;background:linear-gradient(135deg,#1f6fe0,#1557c0);color:#fff;border-radius:16px 16px 5px 16px;padding:9px 14px;font-weight:700}",
      ".pc-q{display:flex;flex-direction:column;align-items:flex-end;gap:7px;margin-top:2px}",
      ".pc-q .pc-qt{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#7f91b8;margin:4px 2px 0}",
      ".pc-q button{max-width:92%;text-align:right;padding:9px 14px;border-radius:14px 14px 5px 14px;border:1px solid rgba(92,184,255,.45);background:rgba(92,184,255,.07);color:#cfe6ff;font-weight:700;font-size:14.5px;line-height:1.3;font-family:inherit;cursor:pointer;transition:background .15s,border-color .15s,transform .15s}",
      ".pc-q button:hover{background:rgba(92,184,255,.18);border-color:#5cb8ff;color:#fff;transform:translateX(-2px)}",
      ".pc-q button.pc-byl{opacity:.6}",
      ".pc-pisze{display:inline-flex;gap:5px;padding:14px 16px}",
      ".pc-pisze span{width:7px;height:7px;border-radius:50%;background:#8fb4e8;opacity:.4;animation:pc-k 1s infinite}",
      ".pc-pisze span:nth-child(2){animation-delay:.15s}.pc-pisze span:nth-child(3){animation-delay:.3s}",
      "@keyframes pc-k{0%,60%,100%{opacity:.35;transform:none}30%{opacity:1;transform:translateY(-4px)}}",
      ".pc-nowy{animation:pc-in .28s ease-out}",
      "@keyframes pc-in{from{opacity:0;transform:translateY(8px)}}",
      ".pc-s{display:flex;gap:8px;padding:10px 12px calc(12px + env(safe-area-inset-bottom));border-top:1px solid rgba(110,160,255,.18);background:rgba(5,10,22,.6)}",
      ".pc-s a{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 8px;border-radius:12px;font-weight:800;font-size:14px;line-height:1.2;text-decoration:none;text-align:center;white-space:nowrap}",
      ".pc-s a.zi{border:1px solid rgba(63,224,138,.6);color:#5af0a4;background:rgba(63,224,138,.1)}",
      ".pc-s a.zi:hover{background:rgba(63,224,138,.2);color:#fff}",
      ".pc-s a.z:hover{filter:brightness(1.06)}",
      ".pc-b:focus-visible,.pc-gora:focus-visible,.pc-o button:focus-visible,.pc-o a:focus-visible{outline:3px solid #ffb020;outline-offset:2px}",
      "@media (prefers-reduced-motion:no-preference){.pc-o.pc-wjazd{animation:pc-o .26s cubic-bezier(.2,.9,.3,1.2)}@keyframes pc-o{from{opacity:0;transform:translateY(18px) scale(.97)}}}",
      "@media (max-width:560px){",
      " .pc-fab{gap:8px;right:12px;bottom:calc(var(--pc-dol,0px) + 12px + env(safe-area-inset-bottom))}",
      " .pc-b{height:48px;padding:0 16px 0 6px;font-size:15px}.pc-b .pc-ik{width:36px;height:36px;font-size:18px}.pc-b .pc-kr{left:32px}",
      " .pc-gora{width:44px;height:44px}",
      " .pc-o{left:0;right:0;bottom:0;width:100%;height:auto;max-height:88vh;max-height:88dvh;border-radius:22px 22px 0 0;border-left:0;border-right:0;border-bottom:0}",
      " .pc-l{min-height:46vh}",
      " .pc-o::before{content:'';position:absolute;top:6px;left:50%;width:40px;height:4px;margin-left:-20px;border-radius:4px;background:rgba(151,168,204,.35)}",
      "}",
      "@media (prefers-reduced-motion:reduce){.pc-fab *,.pc-o *{animation:none!important;transition:none!important}.pc-l{scroll-behavior:auto}}",
      ".pc-miejsce{height:72px}",
      "@media print{.pc-fab,.pc-o,.pc-miejsce{display:none!important}}"
    ].join("\n");
    document.head.appendChild(s);
  }

  var el = {}, otwarty = false, pytania = [], zegar = null, zegarZacz = null;
  var STAN = "pc-czat";

  function zapisz() {
    try { sessionStorage.setItem(STAN, JSON.stringify({ o: otwarty, h: pytania.slice(-30), z: zaczepiony })); } catch (e) {}
  }
  function wczytaj() {
    try { return JSON.parse(sessionStorage.getItem(STAN) || "null"); } catch (e) { return null; }
  }

  /* Link z odpowiedzi: kotwice strony głównej działają też z podstron; na tej samej stronie
     przewijamy bez przeładowania. */
  function adres(href) {
    if (href.charAt(0) !== "/") return href;
    var i = href.indexOf("#"), sciezka = i < 0 ? href : href.slice(0, i), hasz = i < 0 ? "" : href.slice(i);
    var tu = location.pathname.replace(/index\.html$/, "");
    if (sciezka === tu) return hasz || "#";
    return href;
  }
  function link(et, href, kl) {
    var a = document.createElement("a");
    var h = adres(href);
    a.href = h;
    a.textContent = et;
    if (kl) a.className = kl;
    if (/^https?:/.test(h) && h.indexOf(location.host) < 0) { a.target = "_blank"; a.rel = "noopener"; }
    a.addEventListener("click", function (e) {
      if (h === "#") { e.preventDefault(); window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }); }
      /* Na telefonie panel zasłania stronę: po kliknięciu chowamy go, żeby było widać cel. */
      if (waski.matches && !/^mailto:/.test(h) && !a.target) zamknij(true);
      else if (h.charAt(0) === "#") zamknij(true);
    });
    return a;
  }

  function zbuduj() {
    el.fab = document.createElement("div");
    el.fab.className = "pc-fab";
    el.fab.innerHTML =
      '<button type="button" class="pc-gora" hidden aria-label="Wróć na górę strony" title="Na górę"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>' +
      '<button type="button" class="pc-b" aria-haspopup="dialog" aria-expanded="false" aria-controls="pc-panel"><span class="pc-ik" aria-hidden="true">💬</span><span class="pc-kr" aria-hidden="true"></span><span>Masz pytanie?</span><span class="pc-d" aria-hidden="true">Pasuje do Twojej pompy? Zapytaj, odpowiem od razu 👋</span></button>';
    el.gora = el.fab.querySelector(".pc-gora");
    el.b = el.fab.querySelector(".pc-b");
    el.gora.tabIndex = -1;
    el.gora.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" });
      el.b.focus({ preventScroll: true });
    });
    el.b.addEventListener("click", function () { otworz(true); });

    el.o = document.createElement("div");
    el.o.className = "pc-o";
    el.o.id = "pc-panel";
    el.o.hidden = true;
    el.o.setAttribute("role", "dialog");
    el.o.setAttribute("aria-modal", "false");
    el.o.setAttribute("aria-labelledby", "pc-tyt");
    el.o.innerHTML =
      '<div class="pc-h"><span class="pc-av" aria-hidden="true">♨️</span><div class="pc-t"><b id="pc-tyt">Pompa w HA · pytania</b><small>Gotowe odpowiedzi od razu, bez czekania</small></div><button type="button" class="pc-x" aria-label="Zamknij czat">×</button></div>' +
      '<div class="pc-l" aria-live="polite"></div>' +
      '<div class="pc-s"></div>';
    el.l = el.o.querySelector(".pc-l");
    var s = el.o.querySelector(".pc-s");
    s.appendChild(link("👥 Grupa na Facebooku", FB, "z"));
    s.appendChild(link("🌱 woleoze.pl", "https://woleoze.pl", "zi"));
    el.o.querySelector(".pc-x").addEventListener("click", function () { zamknij(); });

    document.addEventListener("keydown", function (e) {
      if (!otwarty) return;
      if (e.key === "Escape") { e.preventDefault(); zamknij(); return; }
      if (e.key === "Tab") pulapka(e);
    });
    /* Miejsce pod stopką, żeby pływające przyciski nie zasłaniały ostatnich linków
       (na stronie głównej robi to już padding pod paskiem .pasekCTA). */
    if (!document.querySelector(".pasekCTA")) {
      var m = document.createElement("div");
      m.className = "pc-miejsce";
      m.setAttribute("aria-hidden", "true");
      document.body.appendChild(m);
    }
    document.body.appendChild(el.fab);
    document.body.appendChild(el.o);
  }

  /* Focus zostaje w panelu, dopóki jest otwarty (Esc albo × zamyka). */
  function pulapka(e) {
    var f = [].slice.call(el.o.querySelectorAll("a[href],button:not([disabled])")).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var pierwszy = f[0], ostatni = f[f.length - 1];
    if (!el.o.contains(document.activeElement)) { e.preventDefault(); pierwszy.focus(); return; }
    if (e.shiftKey && document.activeElement === pierwszy) { e.preventDefault(); ostatni.focus(); }
    else if (!e.shiftKey && document.activeElement === ostatni) { e.preventDefault(); pierwszy.focus(); }
  }

  function dymek(html, klasa) {
    var d = document.createElement("div");
    d.className = klasa || "pc-m";
    if (html) d.innerHTML = html;
    el.l.appendChild(d);
    return d;
  }
  function naDol() { el.l.scrollTop = el.l.scrollHeight; }

  function powitanie(anim) {
    var d = dymek("Cześć! 👋 Tu szybkie odpowiedzi o <b>Pompie w Home Assistant</b>. Wybierz pytanie, a jeśli nie ma Twojego, zapytaj ludzi w grupie albo napisz do nas.", "pc-m" + (anim ? " pc-nowy" : ""));
    return d;
  }

  function odpowiedz(id, anim) {
    var o = MAPA[id];
    var d = dymek(o[2], "pc-m" + (anim ? " pc-nowy" : ""));
    var ln = document.createElement("div");
    ln.className = "pc-ln";
    o[3].forEach(function (x) { ln.appendChild(link(x[0], x[1], x[2])); });
    d.appendChild(ln);
    return d;
  }

  /* Lista pytań: po każdej odpowiedzi jedna, świeża (stara znika). Zadane pytania idą na koniec. */
  function lista(anim) {
    var stara = el.l.querySelector(".pc-q");
    if (stara) stara.remove();
    var q = document.createElement("div");
    q.className = "pc-q" + (anim ? " pc-nowy" : "");
    var t = document.createElement("div");
    t.className = "pc-qt";
    t.textContent = pytania.length ? "Zapytaj o coś jeszcze" : "Najczęstsze pytania";
    q.appendChild(t);
    var nowe = ODP.filter(function (o) { return pytania.indexOf(o[0]) < 0; });
    var byly = ODP.filter(function (o) { return pytania.indexOf(o[0]) >= 0; });
    nowe.concat(byly).forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = o[1];
      if (pytania.indexOf(o[0]) >= 0) b.className = "pc-byl";
      b.addEventListener("click", function () { zapytaj(o[0]); });
      q.appendChild(b);
    });
    el.l.appendChild(q);
    return q;
  }

  function zapytaj(id) {
    var o = MAPA[id];
    if (!o) return;
    clearTimeout(zegar);
    var stara = el.l.querySelector(".pc-q");
    if (stara) stara.remove();
    var p = el.l.querySelector(".pc-pisze");
    if (p) p.remove();
    var u = dymek("", "pc-u pc-nowy");
    u.textContent = o[1];
    pytania.push(id);
    zapisz();
    var pisze = dymek('<span></span><span></span><span></span>', "pc-m pc-pisze pc-nowy");
    pisze.setAttribute("aria-label", "Pisze…");
    naDol();
    var dl = o[2].replace(/<[^>]+>/g, "").length;
    zegar = setTimeout(function () {
      pisze.remove();
      var d = odpowiedz(id, true);
      var q = lista(true);
      /* pokaż początek odpowiedzi, nie samą listę pytań */
      el.l.scrollTop = Math.max(0, d.offsetTop - 12);
      var pierwszy = d.querySelector("a");
      if (otwarty && pierwszy) pierwszy.focus({ preventScroll: true });
    }, RM ? 200 : Math.min(1200, 550 + dl * 2));
  }

  function odtworz() {
    el.l.innerHTML = "";
    powitanie(false);
    pytania.forEach(function (id) {
      if (!MAPA[id]) return;
      var u = dymek("", "pc-u");
      u.textContent = MAPA[id][1];
      odpowiedz(id, false);
    });
    lista(false);
  }

  function otworz(zKlik) {
    if (otwarty) return;
    otwarty = true;
    przestanZaczepiac();
    if (!el.l.childNodes.length) {
      powitanie(true);
      lista(true);
    }
    el.o.hidden = false;
    el.o.classList.remove("pc-wjazd");
    void el.o.offsetWidth;
    el.o.classList.add("pc-wjazd");
    el.fab.classList.add("pc-ukryj");
    el.b.setAttribute("aria-expanded", "true");
    if (pytania.length) naDol();
    zapisz();
    if (zKlik) {
      var f = el.l.querySelector(".pc-q button");
      if (f) f.focus({ preventScroll: true });
    }
  }
  function zamknij(bezFocusu) {
    if (!otwarty) return;
    otwarty = false;
    el.o.hidden = true;
    el.fab.classList.remove("pc-ukryj");
    el.b.setAttribute("aria-expanded", "false");
    zapisz();
    if (!bezFocusu) el.b.focus({ preventScroll: true });
  }

  /* Zaczepka: po 15 s przycisk podskakuje i pokazuje dymek; najwyżej 2 razy na kartę. */
  var zaczepiony = 0;
  function przestanZaczepiac() {
    clearTimeout(zegarZacz);
    el.b.classList.remove("pc-zacz", "pc-skok");
    zaczepiony = 9;
  }
  function zaczepiaj() {
    if (zaczepiony >= 2) return;
    zegarZacz = setTimeout(function krok() {
      if (otwarty || zaczepiony >= 2) return;
      zaczepiony++;
      zapisz();
      el.b.classList.remove("pc-skok");
      void el.b.offsetWidth;
      el.b.classList.add("pc-zacz");
      if (!RM) el.b.classList.add("pc-skok");
      setTimeout(function () { el.b.classList.remove("pc-zacz"); }, 6000);
      zegarZacz = setTimeout(krok, 45000);
    }, 15000);
  }

  /* Strzałka: widoczna po przewinięciu o 600 px. */
  function strzalka() {
    var w = (window.scrollY || document.documentElement.scrollTop) > 600;
    if (el.gora.hidden === !w) return;
    el.gora.hidden = !w;
    el.gora.tabIndex = w ? 0 : -1;
  }

  /* Odstęp od dołu: nad paskiem .pasekCTA (gdy wysunięty) i nad [data-pc-przeszkoda]. */
  function odstep() {
    var H = window.innerHeight, h = 0;
    [].forEach.call(document.querySelectorAll(".pasekCTA,[data-pc-przeszkoda]"), function (n) {
      var st = getComputedStyle(n);
      if (st.display === "none" || st.visibility === "hidden") return;
      var r = n.getBoundingClientRect();
      if (!r.height || r.top >= H - 2 || r.bottom < H - 200) return;
      h = Math.max(h, H - r.top + 4);
    });
    document.documentElement.style.setProperty("--pc-dol", Math.round(h) + "px");
  }

  function start() {
    css();
    zbuduj();
    var st = wczytaj();
    if (st) {
      pytania = (st.h || []).filter(function (id) { return MAPA[id]; });
      zaczepiony = st.z || 0;
      if (pytania.length) odtworz();
      if (st.o) otworz(false);
    }
    strzalka();
    odstep();
    var czeka = false;
    window.addEventListener("scroll", function () {
      if (czeka) return;
      czeka = true;
      requestAnimationFrame(function () { czeka = false; strzalka(); odstep(); });
    }, { passive: true });
    window.addEventListener("resize", odstep);
    [].forEach.call(document.querySelectorAll(".pasekCTA,[data-pc-przeszkoda]"), function (n) {
      n.addEventListener("transitionend", odstep);
      if (window.MutationObserver) new MutationObserver(odstep).observe(n, { attributes: true, attributeFilter: ["class", "style", "hidden"] });
    });
    zaczepiaj();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
