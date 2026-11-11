// „Pompa w HA – Pro” : loader kart Pro (licencjonowanych).
// Element: <rotenso-pro>. Konfiguracja karty:
//   type: custom:rotenso-pro
//   karta: pompa            # pompa | koszty | raport
//   klucz: RPRO-XXXX-XXXX-XXXX-XXXX
//   encje: { ... }          # nadpisania encji (jak w kartach)
//   woleoze: true           # stopka
// Loader pobiera zaciemniony kod karty z serwera licencji, trzyma go w cache
// (7 dni, praca offline), rejestruje element pod nazwą z sufiksem „-pro”
// (żeby nie kolidował z kartą Start) i przekazuje mu hass + konfigurację.
// Bez zależności zewnętrznych.
//
// ⚠ PO DEPLOYU: wpisz rzeczywisty adres Workera w SERWER poniżej.
const SERWER =
  (typeof window !== 'undefined' && window.ROTENSO_SERWER) ||
  'https://rotenso-licencje.PODMIEN.workers.dev';

const LINK_ZAKUP = 'https://buy.stripe.com/3cIeVd9SIgVa9rS6aL3Je03';
const KONTAKT = 'https://github.com/WoleOze/rotenso-midea-modbus-ha#nie-chcesz-grzebać-w-yaml-skonfiguruję-to-za-ciebie';
const KARTY_OK = ['pompa', 'koszty', 'raport'];
const CACHE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dni

// Krótki, stabilny hash hosta (do identyfikatora instalacji).
function hashHost(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// Identyfikator instalacji: losowy (raz) + hash hosta. Trzymany w localStorage.
function instId() {
  let rand = '';
  try {
    rand = localStorage.getItem('rotenso-pro-inst') || '';
    if (!rand) {
      const b = new Uint8Array(6);
      (crypto || window.crypto).getRandomValues(b);
      rand = Array.from(b).map((x) => x.toString(36)).join('');
      localStorage.setItem('rotenso-pro-inst', rand);
    }
  } catch (e) {
    rand = 'tmp' + Math.floor(Math.random() * 1e9).toString(36);
  }
  let host = 'local';
  try { host = location.host || 'local'; } catch (e) { /* noop */ }
  return rand + '.' + hashHost(host);
}

// Podmiana nazw elementów na wersję „-pro”, żeby nie kolidowały z kartą Start.
function nazwijPro(kod) {
  return kod
    .split('rotenso-pompa').join('rotenso-pompa-pro')
    .split('rotenso-koszty').join('rotenso-koszty-pro')
    .split('rotenso-raport').join('rotenso-raport-pro');
}

// Wykonanie kodu karty tak, by zarejestrował element pod nazwą „-pro”.
function zarejestruj(kod, nazwaEl) {
  if (customElements.get(nazwaEl)) return true; // już zarejestrowany
  try {
    // eslint-disable-next-line no-new-func
    new Function(nazwijPro(kod))();
    return !!customElements.get(nazwaEl);
  } catch (e) {
    console.error('[rotenso-pro] błąd wykonania kodu karty:', e);
    return false;
  }
}

class RotensoPro extends HTMLElement {
  setConfig(config) {
    if (!config || !config.karta || KARTY_OK.indexOf(config.karta) < 0) {
      throw new Error('rotenso-pro: ustaw `karta: pompa|koszty|raport`');
    }
    this._config = config;
    this._nazwaEl = 'rotenso-' + config.karta + '-pro';
    this._gotowe = false;
    this._zaladuj();
  }

  set hass(h) {
    this._hass = h;
    if (this._dziecko) this._dziecko.hass = h;
  }

  getCardSize() {
    return this._dziecko && this._dziecko.getCardSize ? this._dziecko.getCardSize() : 6;
  }

  async _zaladuj() {
    const { karta, klucz } = this._config;
    if (!klucz) return this._blad('Brak klucza Pro', 'W konfiguracji karty wpisz <code>klucz: RPRO-…</code> z maila po zakupie.');

    // 1) spróbuj z sieci; 2) w razie błędu – z cache (offline)
    const cacheKey = 'rotenso-pro-kod-' + karta;
    let kod = null;
    try {
      const url = SERWER + '/v1/karta/' + karta + '.js?klucz=' + encodeURIComponent(klucz) + '&inst=' + encodeURIComponent(instId());
      const r = await fetch(url, { method: 'GET' });
      if (r.status === 403) {
        let info = {};
        try { info = await r.json(); } catch (e) { /* noop */ }
        return this._bladLicencji(info);
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      kod = await r.text();
      try { localStorage.setItem(cacheKey, JSON.stringify({ kod, czas: Date.now() })); } catch (e) { /* noop */ }
    } catch (e) {
      // offline → cache
      try {
        const c = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if (c && c.kod && Date.now() - c.czas < CACHE_MS) kod = c.kod;
      } catch (e2) { /* noop */ }
      if (!kod) return this._blad('Brak połączenia', 'Nie udało się pobrać karty Pro i nie ma jej w pamięci. Sprawdź internet i odśwież.');
    }

    if (!zarejestruj(kod, this._nazwaEl)) {
      return this._blad('Błąd karty', 'Nie udało się uruchomić karty Pro. Odśwież stronę; jeśli dalej nie działa, napisz do nas.');
    }
    this._utworz();
  }

  _utworz() {
    this.innerHTML = '';
    const el = document.createElement(this._nazwaEl);
    const cfg = { encje: this._config.encje, woleoze: this._config.woleoze };
    if (this._config.taryfa) cfg.taryfa = this._config.taryfa;
    try { el.setConfig(cfg); } catch (e) { console.error('[rotenso-pro] setConfig karty:', e); }
    if (this._hass) el.hass = this._hass;
    this.appendChild(el);
    this._dziecko = el;
    this._gotowe = true;
  }

  _bladLicencji(info) {
    const st = info && info.status;
    if (st === 'wycofany') return this._blad('Licencja wycofana', 'Ta licencja została wycofana (np. po zwrocie płatności).');
    if (st === 'zablokowany_naduzycie') return this._blad('Klucz zablokowany', 'Ten klucz działa na zbyt wielu instalacjach. Napisz do nas, pomożemy.');
    return this._blad('Klucz nieważny', 'Nie rozpoznaję tego klucza. Sprawdź, czy wpisany jest dokładnie tak jak w mailu.');
  }

  _blad(tytul, opis) {
    this.innerHTML =
      '<div style="font-family:system-ui,Arial,sans-serif;background:#0b1424;color:#dbe6ff;border:1px solid #233155;border-radius:16px;padding:20px;max-width:520px">' +
      '<div style="font-size:17px;font-weight:700;margin-bottom:6px">🔒 ' + tytul + '</div>' +
      '<div style="font-size:14px;color:#9fb0d4;line-height:1.5;margin-bottom:14px">' + opis + '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<a href="' + LINK_ZAKUP + '" target="_blank" rel="noopener" style="background:#3b6cff;color:#fff;text-decoration:none;padding:9px 14px;border-radius:10px;font-weight:600;font-size:14px">Kup Pro: 149 zł</a>' +
      '<a href="' + KONTAKT + '" target="_blank" rel="noopener" style="background:#1a2947;color:#cfe0ff;text-decoration:none;padding:9px 14px;border-radius:10px;font-size:14px">Kontakt / pomoc</a>' +
      '</div></div>';
  }
}

if (!customElements.get('rotenso-pro')) customElements.define('rotenso-pro', RotensoPro);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'rotenso-pro')) {
  window.customCards.push({
    type: 'rotenso-pro',
    name: 'Pompa ciepła: Pro',
    description: 'Karty Pro (Pompa / Koszty / Raport) na licencji. Wymaga klucza RPRO-…',
  });
}
