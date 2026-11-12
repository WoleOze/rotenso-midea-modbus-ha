#!/usr/bin/env python3
"""Pompa w HA – dodatek Home Assistant: instalator z kluczem, diagnostyka, raport, poprawki.

Zasady:
- tylko biblioteka standardowa Pythona;
- nikt nie łączy się do klienta: dodatek sam pyta serwer licencji (model „pull”);
- zmieniamy wyłącznie własne pliki (packages/pompa_ha/, www/rotenso/, raporty/dopisz.py)
  i jedną linię `packages:` w configuration.yaml (z kopią i kontrolą konfiguracji);
- każda zmiana przechodzi przez check_config, a przy błędzie wraca kopia.
"""
import base64
import concurrent.futures
import datetime
import http.server
import io
import ipaddress
import json
import os
import re
import secrets
import shutil
import socket
import ssl
import struct
import threading
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
import zipfile

WERSJA = "1.4.0"
SERWER = os.environ.get("POMPA_SERWER", "https://rotenso-licencje.strefa-tradingu.workers.dev")
PRO_JS = os.environ.get(
    "POMPA_PRO_JS",
    "https://raw.githubusercontent.com/WoleOze/rotenso-midea-modbus-ha/main/homeassistant/www/rotenso/pro.js",
)
TOKEN = os.environ.get("SUPERVISOR_TOKEN") or os.environ.get("HA_TOKEN", "")
HA_API = os.environ.get("HA_API", "http://supervisor/core/api")
HA_WS = os.environ.get("HA_WS", "ws://supervisor/core/websocket")
SUP_API = os.environ.get("SUP_API", "http://supervisor")
CFG = os.environ.get("HA_CONFIG", "/homeassistant")
DANE = os.environ.get("DANE", "/data")
PORT = int(os.environ.get("PORT", "8099"))

PULPIT = "pompa-ha"
KAT_PAK = "packages/pompa_ha"
DOZWOLONE = ("packages/pompa_ha/", "www/rotenso/", "raporty/dopisz.py", "esphome/pompa-modbus-pro.yaml")
MAPA_ZIP = {  # nazwa w ZIP z serwera → ścieżka względem /config
    "co_cwu_cop.yaml": f"{KAT_PAK}/pompa_ha_co_cwu_cop.yaml",
    "raport.yaml": f"{KAT_PAK}/pompa_ha_raport.yaml",
    "cwu_harmonogram.yaml": f"{KAT_PAK}/pompa_ha_cwu_harmonogram.yaml",
    "dopisz.py": "raporty/dopisz.py",
    "esphome/pompa-modbus.yaml": "esphome/pompa-modbus-pro.yaml",  # program z zapisem nastaw dla własnych modułów (ESPHome → Install)
}
SZABLONY_DO_PLIKOW = {  # szablon z /v1/szablony → plik; wypełniany ustawieniami klienta (kreator w dodatku)
    "co_cwu_cop": f"{KAT_PAK}/pompa_ha_co_cwu_cop.yaml",
    "raport": f"{KAT_PAK}/pompa_ha_raport.yaml",
    "cwu_harmonogram": f"{KAT_PAK}/pompa_ha_cwu_harmonogram.yaml",
}
USTAWIENIA_DOMYSLNE = {
    "prad_moc": "sensor.pompa_modbus_moc_elektryczna_szacowana",
    "prad_licznik": "sensor.pompa_modbus_licznik_pradu_pompy",
    "cieplo_licznik": "sensor.pompa_modbus_licznik_ciepla_pompy",
    "temp_zew": "sensor.pompa_modbus_t4_temperatura_zewnetrzna",
    "cwu_zadana_zapis": "number.pompa_modbus_zadana_cwu_zapis",
    "workday": "binary_sensor.workday_sensor",
    "notify": "persistent_notification",
    "taryfa_tania": 0.7303,
    "taryfa_droga": 1.0729,
    "okno1_od": "13:00",
    "okno1_do": "15:00",
    "okno2_od": "22:00",
    "okno2_do": "06:00",
    "weekend_tani": True,
    "woleoze": True,
}
ENCJE_KART = ("prad_moc", "prad_licznik", "cieplo_licznik", "temp_zew", "cwu_zadana_zapis", "workday")
SZABLON_BRAMKI = "pompa_bramka_lan.szablon.yaml"
PLIK_BRAMKI = f"{KAT_PAK}/pompa_ha_bramka.yaml"
PLIK_ADAPTERA = f"{KAT_PAK}/pompa_ha_adapter.yaml"   # Panasonic, NIBE, Mitsubishi, Vaillant: encje kanoniczne z cudzej integracji
PLIK_DAIKIN = f"{KAT_PAK}/pompa_ha_daikin.yaml"       # Daikin Altherma 4 / Altherma 3 + EKRHH: Modbus TCP bez naszego sprzętu
LINIA_PAKIETOW = "packages: !include_dir_named packages"

blokada = threading.Lock()


class Blad(Exception):
    """Błąd z komunikatem dla klienta (po polsku, z podpowiedzią)."""


# --- stan dodatku ----------------------------------------------------------------
def _sciezka_stanu():
    return os.path.join(DANE, "stan.json")


def wczytaj_stan():
    try:
        with open(_sciezka_stanu(), encoding="utf-8") as f:
            s = json.load(f)
    except Exception:
        s = {}
    s.setdefault("inst", "a." + secrets.token_hex(5))
    s.setdefault("auto_poprawki", True)
    s.setdefault("ostatnia_poprawka", 0)
    s.setdefault("dziennik", [])
    return s


def zapisz_stan():
    os.makedirs(DANE, exist_ok=True)
    tmp = _sciezka_stanu() + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(stan, f, ensure_ascii=False, indent=1)
    os.replace(tmp, _sciezka_stanu())


stan = {}


def log(msg):
    linia = f"{datetime.datetime.now().strftime('%d.%m %H:%M:%S')} {msg}"
    print("[pompa]", linia, flush=True)
    stan.setdefault("dziennik", []).append(linia)
    stan["dziennik"] = stan["dziennik"][-80:]
    try:
        zapisz_stan()
    except Exception:
        pass


# --- HTTP ---------------------------------------------------------------------------
def zapytanie(metoda, url, body=None, naglowki=None, timeout=30, surowe=False):
    dane = None
    h = dict(naglowki or {})
    if body is not None:
        if isinstance(body, (bytes, bytearray)):
            dane = bytes(body)
        else:
            dane = json.dumps(body).encode()
            h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=dane, method=metoda, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            b = r.read()
            return r.status, (b if surowe else (json.loads(b) if b.strip() else None))
    except urllib.error.HTTPError as e:
        b = e.read()
        try:
            return e.code, json.loads(b)
        except Exception:
            return e.code, {"blad": b.decode("utf-8", "replace")[:300]}


def ha(metoda, sciezka, body=None, timeout=60):
    return zapytanie(metoda, HA_API + sciezka, body, {"Authorization": f"Bearer {TOKEN}"}, timeout)


def serwer(metoda, sciezka, body=None, surowe=False, timeout=30):
    return zapytanie(metoda, SERWER + sciezka, body, {"User-Agent": f"pompa-ha/{WERSJA}"}, timeout, surowe)


def q(**kw):
    return urllib.parse.urlencode(kw)


# --- minimalny klient WebSocket (bez bibliotek) ------------------------------------
class WS:
    def __init__(self, url=HA_WS, token=TOKEN):
        u = urllib.parse.urlparse(url)
        port = u.port or (443 if u.scheme == "wss" else 80)
        s = socket.create_connection((u.hostname, port), timeout=30)
        if u.scheme == "wss":
            s = ssl.create_default_context().wrap_socket(s, server_hostname=u.hostname)
        self.s = s
        klucz = base64.b64encode(os.urandom(16)).decode()
        zad = (
            f"GET {u.path or '/'} HTTP/1.1\r\nHost: {u.hostname}:{port}\r\nUpgrade: websocket\r\n"
            f"Connection: Upgrade\r\nSec-WebSocket-Key: {klucz}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        )
        s.sendall(zad.encode())
        bufor = b""
        while b"\r\n\r\n" not in bufor:
            kaw = s.recv(4096)
            if not kaw:
                raise ConnectionError("WebSocket: brak odpowiedzi")
            bufor += kaw
        glowa, self.buf = bufor.split(b"\r\n\r\n", 1)
        if b" 101 " not in glowa.split(b"\r\n")[0] + b" ":
            raise ConnectionError("WebSocket: " + glowa.split(b"\r\n")[0].decode(errors="replace"))
        self.nr = 0
        m = self.odbierz()
        if m.get("type") == "auth_required":
            self.wyslij({"type": "auth", "access_token": token})
            m = self.odbierz()
        if m.get("type") != "auth_ok":
            raise ConnectionError("WebSocket: brak autoryzacji")

    def _czytaj(self, n):
        while len(self.buf) < n:
            kaw = self.s.recv(65536)
            if not kaw:
                raise ConnectionError("WebSocket zamknięty")
            self.buf += kaw
        d, self.buf = self.buf[:n], self.buf[n:]
        return d

    def _ramka(self, op, p):
        h = bytearray([0x80 | op])
        n = len(p)
        if n < 126:
            h.append(0x80 | n)
        elif n < 65536:
            h.append(0x80 | 126)
            h += struct.pack(">H", n)
        else:
            h.append(0x80 | 127)
            h += struct.pack(">Q", n)
        maska = os.urandom(4)
        h += maska
        zam = bytearray(p)
        for i in range(n):
            zam[i] ^= maska[i & 3]
        self.s.sendall(bytes(h) + bytes(zam))

    def wyslij(self, obj):
        self._ramka(0x1, json.dumps(obj).encode())

    def odbierz(self):
        dane = b""
        while True:
            b1, b2 = self._czytaj(2)
            op, fin = b1 & 0x0F, b1 & 0x80
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._czytaj(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._czytaj(8))[0]
            maska = self._czytaj(4) if b2 & 0x80 else None
            p = bytearray(self._czytaj(n))
            if maska:
                for i in range(n):
                    p[i] ^= maska[i & 3]
            if op == 0x9:
                self._ramka(0xA, bytes(p))
                continue
            if op == 0x8:
                raise ConnectionError("WebSocket zamknięty przez HA")
            if op in (0x0, 0x1, 0x2):
                dane += bytes(p)
                if fin:
                    return json.loads(dane)

    def wywolaj(self, typ, **kw):
        self.nr += 1
        nr = self.nr
        self.wyslij({"id": nr, "type": typ, **kw})
        while True:
            m = self.odbierz()
            if m.get("id") == nr and m.get("type") == "result":
                if not m.get("success"):
                    e = m.get("error") or {}
                    raise RuntimeError(f"{typ}: {e.get('message') or e}")
                return m.get("result")

    def zamknij(self):
        try:
            self.s.close()
        except Exception:
            pass


# --- pliki ------------------------------------------------------------------------
def bezpieczna(wzgl):
    w = os.path.normpath(str(wzgl).lstrip("/")).replace("\\", "/")
    if w.startswith("..") or os.path.isabs(w):
        raise Blad(f"Niedozwolona ścieżka: {wzgl}")
    if not any(w == d or w.startswith(d) for d in DOZWOLONE):
        raise Blad(f"Poza plikami „Pompa w HA”: {wzgl}")
    return os.path.join(CFG, w)


def zapisz_plik(sciezka, tresc):
    os.makedirs(os.path.dirname(sciezka), exist_ok=True)
    tmp = sciezka + ".pompa-tmp"
    with open(tmp, "wb") as f:
        f.write(tresc if isinstance(tresc, bytes) else tresc.encode("utf-8"))
    os.replace(tmp, sciezka)


class Kopia:
    """Kopia plików przed zmianą + przywracanie przy błędzie."""

    def __init__(self, opis):
        znacznik = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        self.kat = os.path.join(CFG, "pompa_ha_kopia", f"{znacznik}-{opis}")
        self.zapisane = []  # (oryginał, kopia albo None gdy pliku nie było)

    def zabezpiecz(self, sciezka):
        if any(o == sciezka for o, _ in self.zapisane):
            return
        if os.path.exists(sciezka):
            cel = os.path.join(self.kat, os.path.relpath(sciezka, CFG))
            os.makedirs(os.path.dirname(cel), exist_ok=True)
            shutil.copy2(sciezka, cel)
            self.zapisane.append((sciezka, cel))
        else:
            self.zapisane.append((sciezka, None))

    def przywroc(self):
        for oryg, kop in reversed(self.zapisane):
            try:
                if kop:
                    shutil.copy2(kop, oryg)
                elif os.path.exists(oryg):
                    os.remove(oryg)
            except Exception as e:
                print("[pompa] przywracanie", oryg, e, flush=True)


# --- configuration.yaml -------------------------------------------------------------
def zapewnij_pakiety(kopia):
    """Dopisuje `packages: !include_dir_named packages` pod `homeassistant:`. Zwraca opis zmiany."""
    p = os.path.join(CFG, "configuration.yaml")
    with open(p, encoding="utf-8") as f:
        t = f.read()
    if re.search(r"^[ \t]+packages:[ \t]*!include_dir_named[ \t]+\.?/?packages/?[ \t]*(#.*)?$", t, re.M):
        return "configuration.yaml: pakiety już włączone"
    if re.search(r"^[ \t]+packages:", t, re.M):
        raise Blad(
            "Twój configuration.yaml ma już inną sekcję `packages:`. Dopisz ręcznie folder "
            "`packages/pompa_ha/` do swoich pakietów albo napisz na pompa@woleoze.pl."
        )
    m = re.search(r"^homeassistant:[ \t]*(#.*)?$", t, re.M)
    if re.search(r"^homeassistant:[ \t]*!", t, re.M):
        raise Blad("Sekcja `homeassistant:` jest w osobnym pliku (!include). Dopisz `" + LINIA_PAKIETOW + "` ręcznie.")
    kopia.zabezpiecz(p)
    if m:
        reszta = t[m.end():]
        wciecie = "  "
        for linia in reszta.split("\n")[1:]:
            if not linia.strip() or linia.lstrip().startswith("#"):
                continue
            if linia[0] not in " \t":
                break  # koniec sekcji homeassistant:
            wciecie = linia[: len(linia) - len(linia.lstrip())]
            break
        nowy = t[: m.end()] + f"\n{wciecie}{LINIA_PAKIETOW}" + reszta
    else:
        nowy = t.rstrip("\n") + f"\n\nhomeassistant:\n  {LINIA_PAKIETOW}\n"
    zapisz_plik(p, nowy)
    return "configuration.yaml: dopisano jedną linię z pakietami (kopia w pompa_ha_kopia/)"


def sprawdz_konfiguracje():
    st, odp = ha("POST", "/config/core/check_config", timeout=180)
    if st == 404:
        return True, "kontrola konfiguracji niedostępna (pominięto)"
    if st != 200 or not isinstance(odp, dict):
        return False, f"kontrola konfiguracji: HTTP {st} {odp}"
    if odp.get("result") == "valid":
        return True, "konfiguracja poprawna"
    return False, str(odp.get("errors") or odp)[:1500]


def restart_ha(opoznienie=3):
    def _r():
        time.sleep(opoznienie)
        log("Restart Home Assistant…")
        try:
            ha("POST", "/services/homeassistant/restart", {}, timeout=20)
        except Exception:
            pass  # połączenie zrywa się przy restarcie – to normalne

    threading.Thread(target=_r, daemon=True).start()


def powiadom(tytul, tresc):
    try:
        ha("POST", "/services/persistent_notification/create", {"title": tytul, "message": tresc, "notification_id": "pompa_ha"})
    except Exception:
        pass


# --- ustawienia klienta (kreator w dodatku) ------------------------------------------
RE_ENCJA = re.compile(r"^(sensor|binary_sensor|number|input_number)\.[a-z0-9_]+$")
RE_CZAS = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def ustawienia():
    u = dict(USTAWIENIA_DOMYSLNE)
    u.update({k: v for k, v in (stan.get("ustawienia") or {}).items() if k in USTAWIENIA_DOMYSLNE})
    return u


def sprawdz_ustawienia(u):
    oczek = {"prad_moc": "sensor.", "prad_licznik": "sensor.", "cieplo_licznik": "sensor.", "temp_zew": "sensor.",
             "cwu_zadana_zapis": "number.", "workday": "binary_sensor."}
    for k, pref in oczek.items():
        if not RE_ENCJA.match(str(u[k])) or not str(u[k]).startswith(pref):
            raise Blad(f"Ustawienie „{k}”: oczekuję encji {pref}… (jest: {u[k]}).")
    if not re.match(r"^[a-z0-9_]+$", str(u["notify"])):
        raise Blad("Powiadomienia: nazwa usługi bez „notify.”, np. mobile_app_telefon.")
    for k in ("okno1_od", "okno1_do", "okno2_od", "okno2_do"):
        if not RE_CZAS.match(str(u[k])):
            raise Blad("Okna taryfy: godziny w formacie GG:MM.")
    for k in ("taryfa_tania", "taryfa_droga"):
        try:
            v = float(u[k])
        except (TypeError, ValueError):
            v = -1
        if not 0 < v < 10:
            raise Blad("Ceny taryfy: zł/kWh brutto, np. 0.73.")
        u[k] = round(v, 4)
    u["weekend_tani"] = bool(u["weekend_tani"])
    u["woleoze"] = bool(u["woleoze"])
    return u


def wypelnij(tekst, u):
    mapa = {
        "PRAD_MOC": u["prad_moc"],
        "NOTIFY": u["notify"],
        "CWU_ZADANA_ZAPIS": u["cwu_zadana_zapis"].split(".", 1)[1],
        "WORKDAY": u["workday"].split(".", 1)[1],
        "OKNO1_OD": u["okno1_od"], "OKNO1_DO": u["okno1_do"], "OKNO2_OD": u["okno2_od"], "OKNO2_DO": u["okno2_do"],
        "WEEKEND_TANI": "true" if u["weekend_tani"] else "false",
    }
    wynik = re.sub(r"__([A-Z0-9_]+?)__", lambda m: str(mapa.get(m.group(1), m.group(0))), tekst)
    zostalo = re.findall(r"__[A-Z0-9_]+__", wynik)
    if zostalo:
        raise Blad("Szablon ma nieznane pola: " + ", ".join(sorted(set(zostalo))) + ". Napisz na pompa@woleoze.pl.")
    return wynik


def propozycje():
    """Listy encji z HA klienta do wyboru w ustawieniach (zamiast wpisywania ręcznie)."""
    st, stany = ha("GET", "/states")
    stany = stany if isinstance(stany, list) else []
    def lista(f):
        return sorted(({"id": s["entity_id"], "nazwa": s.get("attributes", {}).get("friendly_name") or s["entity_id"]}
                       for s in stany if f(s)), key=lambda x: x["id"])
    jedn = lambda s: s.get("attributes", {}).get("unit_of_measurement")
    wyn = {
        "prad_moc": lista(lambda s: s["entity_id"].startswith("sensor.") and jedn(s) in ("W", "kW")),
        "prad_licznik": lista(lambda s: s["entity_id"].startswith("sensor.") and jedn(s) in ("kWh", "Wh")),
        "cieplo_licznik": lista(lambda s: s["entity_id"].startswith("sensor.") and jedn(s) in ("kWh", "Wh", "MWh", "GJ")),
        "temp_zew": lista(lambda s: s["entity_id"].startswith("sensor.") and jedn(s) == "°C"),
        "cwu_zadana_zapis": lista(lambda s: s["entity_id"].startswith("number.")),
        "workday": lista(lambda s: s["entity_id"].startswith("binary_sensor.") and "workday" in s["entity_id"]),
    }
    st, uslugi = ha("GET", "/services")
    notify = []
    for d in uslugi if isinstance(uslugi, list) else []:
        if d.get("domain") == "notify":
            notify = sorted(n for n in (d.get("services") or {}) if n not in ("send_message",))
    wyn["notify"] = [{"id": n, "nazwa": n} for n in notify] or [{"id": "persistent_notification", "nazwa": "persistent_notification"}]
    return wyn


# --- Lovelace -------------------------------------------------------------------------
def widoki(klucz):
    u = ustawienia()
    encje = {k: u[k] for k in ENCJE_KART}

    def karta(k, dodatki=None):
        return {"type": "custom:rotenso-pro", "karta": k, "klucz": klucz, "inst": stan["inst"],
                "woleoze": bool(u["woleoze"]), "encje": {**encje, **(dodatki or {})}}

    taryfa = {"taryfa_tania": u["taryfa_tania"], "taryfa_droga": u["taryfa_droga"]}
    return {
        "title": "Pompa",
        "views": [
            {"title": "Pompa", "path": "pompa", "icon": "mdi:heat-pump", "panel": True, "cards": [karta("pompa")]},
            {"title": "Koszty", "path": "koszty", "icon": "mdi:cash-multiple", "panel": True, "cards": [karta("koszty", taryfa)]},
            {"title": "Raport", "path": "raport", "icon": "mdi:file-chart", "panel": True, "cards": [karta("raport")]},
        ],
    }


def ustaw_lovelace(klucz):
    ws = WS()
    try:
        zasob = f"/local/rotenso/pro.js?v={WERSJA}-{int(time.time()) % 100000}"
        try:
            zasoby = ws.wywolaj("lovelace/resources") or []
        except RuntimeError as e:
            raise Blad(f"Nie mogę odczytać zasobów pulpitów ({e}). Pulpity w trybie YAML? Dodaj zasób ręcznie: /local/rotenso/pro.js")
        nasz = [z for z in zasoby if "/local/rotenso/pro.js" in str(z.get("url", ""))]
        if nasz:
            ws.wywolaj("lovelace/resources/update", resource_id=nasz[0]["id"], res_type="module", url=zasob)
        else:
            ws.wywolaj("lovelace/resources/create", res_type="module", url=zasob)
        pulpity = ws.wywolaj("lovelace/dashboards/list") or []
        if not any(d.get("url_path") == PULPIT for d in pulpity):
            ws.wywolaj(
                "lovelace/dashboards/create",
                url_path=PULPIT,
                title="Pompa",
                icon="mdi:heat-pump",
                show_in_sidebar=True,
                require_admin=False,
                mode="storage",
            )
        ws.wywolaj("lovelace/config/save", url_path=PULPIT, config=widoki(klucz))
    finally:
        ws.zamknij()


# --- instalacja -----------------------------------------------------------------------
RE_KLUCZ = re.compile(r"^RPRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$")


def stan_klucza(klucz):
    st, odp = serwer("GET", "/v1/stan?" + q(klucz=klucz))
    return (odp or {}).get("status") if st in (200, 404) else None


def pobierz_pakiety(klucz):
    st, zipb = serwer("GET", "/v1/pakiety?" + q(klucz=klucz), surowe=True, timeout=60)
    if st != 200:
        raise Blad(f"Serwer licencji nie wydał pakietów (HTTP {st}).")
    return zipfile.ZipFile(io.BytesIO(zipb))


def przenies_reczne_pakiety(kopia):
    """Pakiety Pro wgrane kiedyś ręcznie do packages/ (z naszym znakiem wodnym) → do kopii, żeby nie dublować encji."""
    przen = []
    for n in ("co_cwu_cop.yaml", "raport.yaml", "cwu_harmonogram.yaml"):
        p = os.path.join(CFG, "packages", n)
        if os.path.isfile(p):
            with open(p, encoding="utf-8", errors="replace") as f:
                if "rotenso-pro" in f.read(400):
                    kopia.zabezpiecz(p)
                    os.remove(p)
                    przen.append(n)
    return przen


def instaluj(klucz, tryb_lan_host=None):
    klucz = (klucz or "").strip().upper()
    if not RE_KLUCZ.match(klucz):
        raise Blad("To nie wygląda na klucz. Skopiuj go z maila w całości: RPRO-XXXX-XXXX-XXXX-XXXX.")
    if not TOKEN:
        raise Blad("Brak tokenu Home Assistant (dodatek musi mieć włączony dostęp do API).")
    kroki = []

    def krok(t):
        kroki.append(t)
        log(t)

    st = stan_klucza(klucz)
    if st is None:
        raise Blad("Nie mogę połączyć się z serwerem licencji. Sprawdź internet i spróbuj ponownie.")
    if st != "aktywny":
        raise Blad({"wycofany": "Ten klucz został wycofany (np. po zwrocie).",
                    "zablokowany_naduzycie": "Ten klucz jest zablokowany: działa na zbyt wielu instalacjach. Napisz na pompa@woleoze.pl.",
                    "czeka": "Ten klucz jeszcze nie działa: przy zakupie wybrano wykonanie po 14 dniach od zakupu. Datę startu masz w mailu z kluczem.",
                    }.get(st, "Nie znam tego klucza. Sprawdź, czy jest wpisany dokładnie jak w mailu."))
    krok("Klucz aktywny.")

    z = pobierz_pakiety(klucz)
    kopia = Kopia("instalacja")
    try:
        przen = przenies_reczne_pakiety(kopia)
        if przen:
            krok("Ręcznie wgrane pakiety Pro przeniesione do kopii: " + ", ".join(przen))
        nazwy = set(z.namelist())
        for nazwa, cel in MAPA_ZIP.items():
            if nazwa in nazwy:
                sc = os.path.join(CFG, cel)
                kopia.zabezpiecz(sc)
                zapisz_plik(sc, z.read(nazwa))
        u = sprawdz_ustawienia(ustawienia())
        st_sz, odp_sz = serwer("GET", "/v1/szablony?" + q(klucz=klucz))
        szablony = (odp_sz or {}).get("szablony") or {} if st_sz == 200 else {}
        if all(n in szablony for n in SZABLONY_DO_PLIKOW):
            for n, cel in SZABLONY_DO_PLIKOW.items():
                sc = os.path.join(CFG, cel)
                kopia.zabezpiecz(sc)
                zapisz_plik(sc, wypelnij(szablony[n], u))
            krok("Pakiety dopasowane do twoich ustawień (licznik, powiadomienia, taryfa).")
        else:
            krok("Ustawienia domyślne (serwer nie wydał szablonów).")
        marka = None if tryb_lan_host else stan.get("marka")
        host = tryb_lan_host or (None if marka else stan.get("bramka_host"))
        zostaw = None
        if marka:
            szablon, opis_m, _ = MARKI[marka["id"]]
            if szablon not in nazwy:
                raise Blad(f"Serwer nie ma jeszcze pakietu dla marki {opis_m}. Napisz na pompa@woleoze.pl.")
            t = z.read(szablon).decode("utf-8")
            if marka["id"].startswith("daikin"):
                t, zostaw = t.replace("__DAIKIN_HOST__", marka["host"]), PLIK_DAIKIN
            else:
                for ph in PLACEHOLDERY:
                    t = t.replace(ph, (marka.get("placeholdery") or {}).get(ph) or "brak")
                zostaw = PLIK_ADAPTERA
            sc = os.path.join(CFG, zostaw)
            kopia.zabezpiecz(sc)
            zapisz_plik(sc, t)
            krok(f"Pakiet dla marki {opis_m} zapisany" + (f" (pompa {marka['host']})." if marka.get("host") else "."))
            if marka["id"] == "nibe":
                krok(wlacz_encje_nibe())
            if not zapis_cwu(marka):
                sc = os.path.join(CFG, SZABLONY_DO_PLIKOW["cwu_harmonogram"])
                if os.path.exists(sc):
                    kopia.zabezpiecz(sc)
                    os.remove(sc)
                krok("Harmonogram CWU pominięty: ta integracja nie daje zapisu zadanej CWU.")
        elif host:
            zostaw = PLIK_BRAMKI
            if SZABLON_BRAMKI not in nazwy:
                raise Blad("Serwer nie ma jeszcze pakietu dla bramki LAN. Napisz na pompa@woleoze.pl.")
            sc = os.path.join(CFG, PLIK_BRAMKI)
            kopia.zabezpiecz(sc)
            zapisz_plik(sc, z.read(SZABLON_BRAMKI).decode("utf-8").replace("__BRAMKA_HOST__", host))
            krok(f"Pakiet bramki LAN ustawiony na {host}.")
        for cel in (PLIK_BRAMKI, PLIK_ADAPTERA, PLIK_DAIKIN):  # jeden dostawca danych: stare pliki po zmianie marki albo trybu
            sc = os.path.join(CFG, cel)
            if cel != zostaw and os.path.exists(sc):
                kopia.zabezpiecz(sc)
                os.remove(sc)
                krok(f"Usunięto poprzedni pakiet {os.path.basename(cel)}.")
        krok("Pakiety Pro zapisane w packages/pompa_ha/.")

        st_js, js = zapytanie("GET", PRO_JS, surowe=True, timeout=30)
        if st_js != 200 or b"rotenso-pro" not in js:
            raise Blad("Nie mogę pobrać pliku kart (pro.js). Sprawdź internet.")
        sc = os.path.join(CFG, "www/rotenso/pro.js")
        kopia.zabezpiecz(sc)
        zapisz_plik(sc, js)
        os.makedirs(os.path.join(CFG, "www/raporty"), exist_ok=True)
        krok("Karty zapisane w www/rotenso/.")

        krok(zapewnij_pakiety(kopia))
        ok, opis = sprawdz_konfiguracje()
        if not ok:
            raise Blad("Home Assistant odrzucił konfigurację, więc wszystko cofnąłem. Szczegóły: " + opis)
        krok("Kontrola konfiguracji: " + opis + ".")
    except Exception:
        kopia.przywroc()
        raise

    ustaw_lovelace(klucz)
    krok("Pulpit „Pompa” i zasób kart gotowe.")
    stan.update({"klucz": klucz, "zainstalowano": datetime.datetime.now().isoformat(timespec="seconds"), "wersja_inst": WERSJA})
    if tryb_lan_host:
        stan["bramka_host"] = tryb_lan_host
        stan.pop("marka", None)
    zapisz_stan()
    krok("Restart Home Assistant za chwilę. Po ok. minucie otwórz „Pompa” w pasku bocznym.")
    restart_ha()
    return kroki


def odinstaluj():
    kopia = Kopia("odinstalowanie")
    for wzgl in (KAT_PAK, "www/rotenso/pro.js"):
        p = os.path.join(CFG, wzgl)
        if os.path.isdir(p):
            for kor, _, pliki in os.walk(p):
                for n in pliki:
                    kopia.zabezpiecz(os.path.join(kor, n))
            shutil.rmtree(p)
        elif os.path.isfile(p):
            kopia.zabezpiecz(p)
            os.remove(p)
    ws = WS()
    try:
        for z in ws.wywolaj("lovelace/resources") or []:
            if "/local/rotenso/pro.js" in str(z.get("url", "")):
                ws.wywolaj("lovelace/resources/delete", resource_id=z["id"])
        for d in ws.wywolaj("lovelace/dashboards/list") or []:
            if d.get("url_path") == PULPIT:
                ws.wywolaj("lovelace/dashboards/delete", dashboard_id=d["id"])
    finally:
        ws.zamknij()
    for k in ("klucz", "zainstalowano", "bramka_host"):
        stan.pop(k, None)
    zapisz_stan()
    log("Odinstalowano „Pompa w HA” (kopia w pompa_ha_kopia/). Linia `packages:` w configuration.yaml zostaje.")
    restart_ha()


# --- diagnostyka --------------------------------------------------------------------
NIEDOSTEPNE = ("unavailable", "unknown", "", "None", "nan")

# Tylko alarmy z pakietu „Pompa w HA” (nie alarmy domu): do raportu i diagnostyki.
ALARMY_POMPY = tuple(f"binary_sensor.alarm_{n}" for n in (
    "pompa_blad", "przeplyw_niski", "grzalka_przy_cieple", "dom_wola_a_zimno",
    "czujnik_offline", "bojler_rano_zimny", "dowolny", "anomalia"))

# Typ pompy z programu modułu (ESPHome project: „woleoze.pompa-<wariant>” → urządzenie HA: producent/model).
PLATFORMY = {
    "midea": ("Midea M-Thermal (czarno-biały sterownik)",
              "1) Zamień przewody A i B na module. 2) W menu serwisanta: 17.2 adres = 1, 17.1 HMI SET = GŁÓWNA. "
              "3) Przewody idą do zacisków H1/H2 sterownika ŚCIENNEGO, nie płyty głównej. 4) Pompa musi być zasilona."),
    "midea-120l": ("Midea z kolorowym panelem (wersja testowa)",
                   "1) Zamień przewody A i B na module. 2) W menu serwisanta sprawdź adres Modbus dla BMS = 1. "
                   "3) Przewody idą do zacisków H1/H2 sterownika ściennego. 4) Pompa musi być zasilona. Wyślij raport: to wersja testowa."),
    "windmi": ("Rotenso Windmi (wersja testowa)",
               "1) Przewody idą do złącza CN67 (A, B, E) na płycie jednostki wewnętrznej, NIE do CN63 (H1/H2) ani do sterownika ORIS. "
               "2) Adres Modbus pompy = 11 (fabrycznie). 3) Zamień A i B. 4) Pompa musi być zasilona. Wyślij raport: to wersja testowa."),
    "heatmi": ("Rotenso Heatmi (wersja testowa)",
               "1) Przewody idą do złącza J2, zaciski A2/B2 na płycie jednostki wewnętrznej, NIE A1/B1 (tam jest sterownik). "
               "2) Adres Modbus = 16 (przełącznik SW3 na 0 albo 1). 3) Zamień A i B. 4) Pompa musi być zasilona. Wyślij raport: to wersja testowa."),
    "lg": ("LG Therma V (wersja testowa)",
           "1) Przewody idą do listwy „3rd Party Controller” (DC 5 V): zacisk 21 = A, 22 = B (w części R290 23/24), NIE do 28/29. "
           "2) Na płycie przełącznik SW1-1 = ON (i SW1-2 = ON), potem wyłącz i włącz zasilanie pompy: pompa czyta je tylko przy starcie. "
           "3) Menu instalatora → Modbus Address = 1. Jeśli pompa pokazuje 33, napisz do nas: wgramy program na adres 33. "
           "4) Zamień A i B. 5) CH 03 na sterowniku = moduł milczał ponad 5 min: sprawdź zasilanie modułu, błąd kasuje wyłączenie zasilania pompy. "
           "Wyślij raport: to wersja testowa."),
    # inne marki bez naszego sprzętu (adapter albo pakiet Daikin; dane z ich integracji)
    "panasonic": ("Panasonic Aquarea (HeishaMon)",
                  "Dane idą z HeishaMon przez MQTT. Sprawdź, czy integracja Aquarea ma świeże odczyty (Ustawienia → Urządzenia i usługi). "
                  "Zmieniony prefiks MQTT? W dodatku kliknij „Wykryj integrację” i „Użyj” jeszcze raz."),
    "nibe": ("NIBE seria S (integracja NIBE Heat Pump)",
             "Integracja NIBE tworzy encje wyłączone. „Zainstaluj ponownie” włącza potrzebne; sprawdź też połączenie Modbus TCP pompy (menu 7.5.9)."),
    "mitsubishi": ("Mitsubishi Ecodan",
                   "Sprawdź, czy moduł ESPHome Ecodan (gekkekoe) albo integracja MELCloud ma świeże odczyty. MELCloud odświeża dane co 1–2 h."),
    "vaillant": ("Vaillant aroTHERM",
                 "ebusd: sprawdź dodatek ebusd i filtr MQTT (docs: filter-name z state|flow|consumption|speed|desired). "
                 "myVAILLANT: włącz pobieranie energii w opcjach integracji; częste odpytywanie grozi blokadą konta na 1–3 dni."),
    "daikin-a4": ("Daikin Altherma 4 (Modbus TCP)",
                  "1) Pompa w sieci (kabel LAN) i Modbus TCP włączony w menu. 2) Adres IP pompy stały (rezerwacja w routerze). "
                  "3) Najwyżej 3 połączenia Modbus naraz: wyłącz inne systemy, które czytają pompę. 4) Zmiana IP: „Szukaj bramki LAN” → „Użyj”."),
    "daikin-ekrhh": ("Daikin Altherma 3 + EKRHH (Modbus)",
                     "1) HomeHub EKRHH w sieci (gniazdo LAN1) i Modbus włączony w aplikacji ONECTA. 2) Stały adres IP. "
                     "3) Najwyżej 3 połączenia Modbus naraz. 4) Zmiana IP: „Szukaj bramki LAN” → „Użyj”."),
}

# Inne marki: id → (szablon w ZIP z serwera, opis, zapis zadanej CWU: True/False/None = zależy od integracji)
MARKI = {
    "panasonic": ("adaptery/panasonic.szablon.yaml", "Panasonic Aquarea (HeishaMon)", True),
    "nibe": ("adaptery/nibe.szablon.yaml", "NIBE seria S", False),
    "mitsubishi": ("adaptery/mitsubishi.szablon.yaml", "Mitsubishi Ecodan", None),
    "vaillant": ("adaptery/vaillant.szablon.yaml", "Vaillant aroTHERM", None),
    "daikin-a4": ("daikin_altherma4.szablon.yaml", "Daikin Altherma 4", True),
    "daikin-ekrhh": ("daikin_ekrhh.szablon.yaml", "Daikin Altherma 3 + EKRHH", True),
}
PLACEHOLDERY = ("__HEISHA__", "__ECODAN__", "__MELCLOUD__", "__EBUSD_HMU__", "__EBUSD_CTL__", "__MV_DOM__", "__MV_URZ__")
# NIBE (nibe_heatpump) tworzy wszystkie encje wyłączone; te czytają adapter i karty (docs/adaptery.md w repo Pro)
NIBE_ENCJE = (
    "sensor.current_outdoor_temperature_bt1_30002", "sensor.supply_line_bt2_30006", "sensor.external_supply_line_bt25_30040",
    "sensor.condenser_sensor_supply_line_eb101_bt12_31479", "sensor.condenser_bt12_30013", "sensor.condenser_sensor_supply_line_bt12_30013",
    "sensor.return_line_bt3_30008", "sensor.return_line_eb101_bt3_31476", "sensor.hot_water_top_bt7_30009", "sensor.hot_water_charging_bt6_30010",
    "sensor.calculated_supply_climate_system_1_31018", "sensor.compressor_frequency_current_31047", "sensor.current_compressor_frequency_eb101_31804",
    "sensor.total_run_time_compressor_31088", "sensor.compressor_oper_time_total_eb101_ep14_31492", "sensor.compressor_oper_time_total_eb100_ep14_31537",
    "sensor.flow_sensor_bf1_30041", "sensor.priority_31029", "sensor.defrosting_eb101_31806", "sensor.defrosting_eb100_ep14_31820",
    "sensor.energy_log_current_power_consumption_32306", "sensor.instantaneous_used_power_32167", "sensor.current_power_32177",
    "sensor.tot_production_33822", "sensor.tot_consumption_33824", "sensor.alarm_number_31976", "number.auto_mode_stop_temperature_for_heating_40185",
)


def zapis_cwu(m):
    """Czy marka ma encję zapisu zadanej CWU (wtedy instalujemy harmonogram CWU)."""
    z = MARKI[m["id"]][2]
    if z is not None:
        return z
    ph = m.get("placeholdery") or {}
    klucz = "__ECODAN__" if m["id"] == "mitsubishi" else "__EBUSD_HMU__"
    return (ph.get(klucz) or "brak") != "brak"


def rejestr_encji():
    ws = WS()
    try:
        return ws.wywolaj("config/entity_registry/list") or []
    finally:
        ws.zamknij()


def wykryj_marki():
    """Inne marki po encjach ich integracji (reguły: docs/adaptery.md w repo Pro). Daikin wykrywa „Szukaj bramki LAN”."""
    rej = rejestr_encji()
    po_id = {e.get("entity_id"): e for e in rej}
    modul = any(e.get("entity_id") == "binary_sensor.pompa_modbus_modul_online" and e.get("platform") == "esphome" for e in rej)

    def prefiksy(platforma, wzor):
        rx = re.compile(wzor)
        out = []
        for e in rej:
            if platforma in (None, e.get("platform")):
                m = rx.match(e.get("entity_id") or "")
                if m and m.group(1) not in out:
                    out.append(m.group(1))
        return out

    kand = []
    heisha = prefiksy("aquarea", r"^sensor\.(.+)_main_main_outlet_temp$")
    if heisha:
        kand.append({"id": "panasonic", "opis": "Panasonic Aquarea · HeishaMon", "placeholdery": {"__HEISHA__": heisha[0]}, "uwagi": []})
    if "sensor.current_outdoor_temperature_bt1_30002" in po_id and po_id["sensor.current_outdoor_temperature_bt1_30002"].get("platform") == "nibe_heatpump":
        wyl = sum(1 for e in NIBE_ENCJE if e in po_id and po_id[e].get("disabled_by"))
        kand.append({"id": "nibe", "opis": "NIBE seria S · NIBE Heat Pump (Modbus TCP)", "placeholdery": {},
                     "uwagi": [f"Przy instalacji włączę wyłączone encje NIBE potrzebne kartom (liczba: {wyl})."] if wyl else []})
    ecodan = [x for x in prefiksy("esphome", r"^sensor\.(.+)_(?:feed_temp|temperatura_zasilania)$")
              if f"sensor.{x}_dhw_current_temp" in po_id or f"sensor.{x}_aktualna_temperatura_cwu" in po_id]
    melcloud = prefiksy("melcloud", r"^sensor\.(.+)_tank_temperature$")
    if ecodan or melcloud:
        uw = [] if ecodan else ["MELCloud odświeża dane co 1–2 h, bez odszraniania i kodu błędu. Dokładniej: moduł ESPHome Ecodan (CN105)."]
        kand.append({"id": "mitsubishi", "opis": "Mitsubishi Ecodan · " + " + ".join((["ESPHome Ecodan"] if ecodan else []) + (["MELCloud"] if melcloud else [])),
                     "placeholdery": {"__ECODAN__": ecodan[0] if ecodan else "brak", "__MELCLOUD__": melcloud[0] if melcloud else "brak"}, "uwagi": uw})
    hmu = prefiksy("mqtt", r"^sensor\.(.+_hmu)_(?:currentconsumedpower|rundataflowtemp|flowtemp)$")
    ctl = prefiksy("mqtt", r"^sensor\.(.+_(?:ctlv2|ctlv3|720))_(?:outsidetemp|hwcstoragetemp)(?:_tempv)?$")
    mv_dom = [e["entity_id"][len("sensor."):-len("_outdoor_temperature")] for e in rej
              if e.get("platform") == "mypyllant" and str(e.get("unique_id") or "").endswith("_home_outdoor_temperature")
              and (e.get("entity_id") or "").endswith("_outdoor_temperature")]
    mv_urz = [e["entity_id"][len("sensor."):-len("_consumed_electrical_energy_heating")] for e in rej
              if e.get("platform") == "mypyllant" and (e.get("entity_id") or "").endswith("_consumed_electrical_energy_heating")]
    if hmu or mv_dom:
        uw = []
        if hmu:
            uw.append("ebusd: w opcjach dodatku ebusd poszerz filtr MQTT: --mqttvar=filter-name=status|temp|yield|count|energy|power|runtime|hours|starts|mode|curve|state|flow|consumption|speed|desired")
        if mv_dom and not mv_urz:
            uw.append("myVAILLANT: włącz pobieranie energii w opcjach integracji, inaczej nie będzie liczników prądu i ciepła.")
        kand.append({"id": "vaillant", "opis": "Vaillant aroTHERM · " + " + ".join((["ebusd"] if hmu else []) + (["myVAILLANT"] if mv_dom else [])),
                     "placeholdery": {"__EBUSD_HMU__": hmu[0] if hmu else "brak", "__EBUSD_CTL__": ctl[0] if ctl else "brak",
                                      "__MV_DOM__": mv_dom[0] if mv_dom else "brak", "__MV_URZ__": mv_urz[0] if mv_urz else "brak"}, "uwagi": uw})
    m = stan.get("marka") or {}
    return {"modul": modul, "kandydaci": kand, "obecna": m.get("id"),
            "obecna_opis": MARKI[m["id"]][1] if m.get("id") in MARKI else None}


def wlacz_encje_nibe():
    ws = WS()
    try:
        rej = {e.get("entity_id"): e for e in (ws.wywolaj("config/entity_registry/list") or [])}
        n = 0
        for eid in NIBE_ENCJE:
            e = rej.get(eid)
            if e and e.get("platform") == "nibe_heatpump" and e.get("disabled_by"):
                ws.wywolaj("config/entity_registry/update", entity_id=eid, disabled_by=None)
                n += 1
    finally:
        ws.zamknij()
    return f"NIBE: włączone encje potrzebne kartom (liczba: {n})." if n else "NIBE: potrzebne encje już włączone."


def uzyj_marki(mid, host=None):
    """Wybór innej marki (albo powrót do modułu: mid = None). Zapisuje w stanie i od razu instaluje, jeśli jest klucz."""
    if mid is None:
        stan.pop("marka", None)
        zapisz_stan()
        if stan.get("klucz"):
            return instaluj(stan["klucz"])
        return ["Wrócono do modułu Pompa Modbus."]
    if mid not in MARKI:
        raise Blad("Nie znam tej marki.")
    if mid.startswith("daikin"):
        ipaddress.ip_address(str(host or ""))
        typ = rozpoznaj_daikin(host)
        if not typ:
            raise Blad(f"Pod {host} nie odpowiada Daikin (Modbus TCP, rejestry 21–23). Sprawdź, czy Modbus jest włączony w pompie albo EKRHH.")
        m = {"id": mid, "host": host}
    else:
        w = wykryj_marki()
        if w["modul"]:
            raise Blad("W Home Assistant działa moduł „Pompa Modbus” (ESPHome). Dwa źródła danych nadpisałyby te same encje: "
                       "usuń urządzenie Pompa Modbus albo zostań przy module.")
        k = next((x for x in w["kandydaci"] if x["id"] == mid), None)
        if not k:
            raise Blad("Nie widzę integracji tej marki w Home Assistant. Najpierw dodaj i uruchom jej integrację, potem „Wykryj integrację”.")
        m = {"id": mid, "placeholdery": k["placeholdery"]}
    stan["marka"] = m
    stan.pop("bramka_host", None)  # jeden dostawca danych
    zapisz_stan()
    log(f"Wybrano markę: {MARKI[mid][1]}")
    if not stan.get("klucz"):
        return [f"Zapamiętano: {MARKI[mid][1]}. Teraz wklej klucz i zainstaluj."]
    return instaluj(stan["klucz"])


def platforma():
    m = (stan.get("marka") or {}).get("id")
    if m in PLATFORMY:
        return m
    try:
        ws = WS()
        try:
            for d in ws.wywolaj("config/device_registry/list") or []:
                model = str(d.get("model") or "")
                if str(d.get("manufacturer") or "").lower() == "woleoze" and model.startswith("pompa-"):
                    return model[len("pompa-"):] if model[len("pompa-"):] in PLATFORMY else "midea"
        finally:
            ws.zamknij()
    except Exception:
        pass
    return "midea"


def diagnostyka():
    wyn = {"czas": datetime.datetime.now().isoformat(timespec="seconds"), "wersja_dodatku": WERSJA,
           "inst": stan.get("inst"), "ok": [], "problemy": [], "podpowiedzi": [], "encje": {}}

    def ok(t):
        wyn["ok"].append(t)

    def zle(t, podp=""):
        wyn["problemy"].append(t)
        wyn["podpowiedzi"].append(podp)

    st, cfg = ha("GET", "/config")
    if st == 200 and isinstance(cfg, dict):
        wyn["ha_wersja"] = cfg.get("version")
        ok(f"Home Assistant {cfg.get('version')}")
    else:
        zle("Brak połączenia z Home Assistant", "Uruchom ponownie dodatek.")
        return wyn

    st, stany = ha("GET", "/states")
    stany = stany if isinstance(stany, list) else []
    nasze = {s["entity_id"]: s for s in stany if ".pompa_modbus_" in s["entity_id"]
             or s["entity_id"].startswith(("sensor.pompa_cop_", "sensor.pompa_prad_", "sensor.pompa_cieplo_"))
             or s["entity_id"] in ALARMY_POMPY}
    for eid in sorted(nasze)[:500]:
        s = nasze[eid]
        wyn["encje"][eid] = {"s": s.get("state"), "t": (s.get("last_reported") or s.get("last_updated") or "")[:19]}

    modbus = [e for e in nasze if e.startswith("sensor.pompa_modbus_")]
    if not modbus:
        zle("Home Assistant nie widzi modułu pompy.",
            "Moduł Wi-Fi: Ustawienia → Urządzenia i usługi → u góry „Wykryto: Pompa Modbus” → Dodaj. "
            "Nie ma go tam? Sprawdź zasilanie modułu i czy jest w tej samej sieci co HA. "
            "Bramka LAN: kliknij niżej „Szukaj bramki LAN”.")
    else:
        online = nasze.get("binary_sensor.pompa_modbus_modul_online")
        marka = stan.get("marka")
        if marka:
            zr = nasze.get("sensor.pompa_modbus_zrodlo_danych")
            if online and online.get("state") != "on":
                zle("Brak świeżych danych z integracji pompy.", PLATFORMY.get(marka["id"], ("", ""))[1])
            else:
                ok("Dane z integracji: " + str((zr or {}).get("state") or MARKI[marka["id"]][1]) + ".")
        elif online and online.get("state") != "on" and not stan.get("bramka_host"):
            zle("Moduł jest offline.", "Sprawdź zasilanie modułu i Wi-Fi (sieć „pompa-setup” oznacza, że moduł nie zna twojej sieci).")
        else:
            ok("Moduł połączony z Home Assistant.")
        plat = platforma()
        wyn["platforma"] = plat
        ok(f"Pompa: {PLATFORMY[plat][0]}.")
        liczbowe = [e for e in modbus if "kod_bledu" not in e]
        martwe = [e for e in liczbowe if str(nasze[e].get("state")) in NIEDOSTEPNE]
        if marka:  # adapter: część encji kanonicznych celowo pusta (marka ich nie podaje); liczą się kluczowe
            kluczowe = [e for e in ("sensor.pompa_modbus_t4_temperatura_zewnetrzna", "sensor.pompa_modbus_moc_elektryczna_szacowana") if e in nasze]
            if not kluczowe or all(str(nasze[e].get("state")) in NIEDOSTEPNE for e in kluczowe):
                zle("Brak odczytów z integracji pompy (temperatura zewnętrzna i moc bez wartości).", PLATFORMY[plat][1])
            else:
                ok(f"Pompa odpowiada ({len(liczbowe) - len(martwe)} z {len(liczbowe)} encji ma wartość; puste = marka ich nie podaje).")
        elif liczbowe and len(martwe) / len(liczbowe) > 0.7:
            zle(f"Brak odczytów z pompy ({len(martwe)} z {len(liczbowe)} encji bez wartości).", PLATFORMY[plat][1])
        else:
            ok(f"Pompa odpowiada ({len(liczbowe) - len(martwe)} z {len(liczbowe)} odczytów ma wartość).")
        if stan.get("klucz") and not marka and not any(e.startswith("number.pompa_modbus_") for e in nasze):
            zle("Moduł ma program bez zapisu nastaw (wersja Start).",
                "Żeby zmieniać nastawy i harmonogram CWU z HA, wgraj raz program Pro: dodatek ESPHome Device Builder → "
                "pompa-modbus-pro.yaml → Install (zapisaliśmy go przy instalacji klucza). Zestawy mają go już wgranego.")
        kod = nasze.get("sensor.pompa_modbus_kod_bledu")
        if kod and str(kod.get("state")).lower() not in ("brak", "0", "e0", "ok") + NIEDOSTEPNE:
            zle(f"Pompa zgłasza błąd: {kod.get('state')}", "Sprawdź kod w instrukcji pompy albo wyślij raport do wsparcia.")

    if stan.get("klucz"):
        s_kl = stan_klucza(stan["klucz"])
        if s_kl == "aktywny":
            ok("Klucz Pro aktywny.")
        elif s_kl is None:
            zle("Brak połączenia z serwerem licencji.", "Karty działają z kopii do 7 dni. Sprawdź internet.")
        else:
            zle(f"Klucz Pro: {s_kl}.", "Napisz na pompa@woleoze.pl.")
        if "sensor.pompa_cop_co_dzis" in nasze or any(e.startswith("sensor.pompa_prad_") for e in nasze):
            ok("Pakiety Pro wczytane.")
        else:
            zle("Pakiety Pro nie są wczytane.", "Kliknij „Zainstaluj ponownie”. Jeśli nie pomoże, wyślij raport.")
        try:
            ws = WS()
            try:
                pulp = [d for d in (ws.wywolaj("lovelace/dashboards/list") or []) if d.get("url_path") == PULPIT]
                zas = [z for z in (ws.wywolaj("lovelace/resources") or []) if "/local/rotenso/pro.js" in str(z.get("url", ""))]
            finally:
                ws.zamknij()
            if pulp and zas:
                ok("Pulpit „Pompa” i karty zarejestrowane.")
            else:
                zle("Brak pulpitu albo zasobu kart.", "Kliknij „Zainstaluj ponownie”.")
        except Exception as e:
            zle(f"Nie mogę sprawdzić pulpitów: {e}", "")
    else:
        zle("Pro nie jest zainstalowane.", "Wklej klucz z maila i kliknij „Zainstaluj”.")
    return wyn


def wyslij_raport():
    if not stan.get("klucz"):
        raise Blad("Najpierw zainstaluj klucz. Bez klucza wyślij maila na pompa@woleoze.pl.")
    wyn = diagnostyka()
    wyn["dziennik"] = stan.get("dziennik", [])[-30:]
    st, odp = serwer("POST", "/v1/raport?" + q(klucz=stan["klucz"], inst=stan["inst"]), wyn)
    if st != 200:
        raise Blad(f"Serwer nie przyjął raportu: {(odp or {}).get('blad', st)}")
    log("Raport wysłany do wsparcia.")
    return {"ok": True, "id": (odp or {}).get("id")}


# --- poprawki (pull) ------------------------------------------------------------------
def sprawdz_poprawki(recznie=False):
    if not stan.get("klucz"):
        return {"poprawki": 0}
    st, odp = serwer("GET", "/v1/poprawki?" + q(klucz=stan["klucz"], inst=stan["inst"], po=stan.get("ostatnia_poprawka", 0)))
    if st != 200:
        if recznie:
            raise Blad(f"Serwer nie odpowiedział (HTTP {st}).")
        return {"poprawki": 0}
    lista = (odp or {}).get("poprawki") or []
    zastosowane = 0
    for p in lista:
        try:
            potrzebny_restart = zastosuj_poprawke(p)
            serwer("POST", "/v1/poprawki/potwierdz?" + q(klucz=stan["klucz"], inst=stan["inst"]), {"id": p["id"], "wynik": "ok"})
            zastosowane += 1
            powiadom("Pompa w HA", f"Zastosowano poprawkę od wsparcia: {p.get('opis', '')}")
            if potrzebny_restart:
                restart_ha()
                break  # kolejne po restarcie
        except Exception as e:
            # Zła poprawka: zgłoś raz i pomiń (wsparcie wyda nową). Bez ponawiania co godzinę.
            log(f"Poprawka {p.get('id')} pominięta: {e}")
            serwer("POST", "/v1/poprawki/potwierdz?" + q(klucz=stan["klucz"], inst=stan["inst"]),
                   {"id": p.get("id"), "wynik": "blad", "blad": str(e)[:1000]})
            stan["ostatnia_poprawka"] = max(stan.get("ostatnia_poprawka", 0), int(p.get("id") or 0))
            zapisz_stan()
    return {"poprawki": zastosowane, "czeka": len(lista) - zastosowane}


def zastosuj_poprawke(p):
    kopia = Kopia(f"poprawka-{p.get('id')}")
    try:
        for wzgl, tresc in (p.get("pliki") or {}).items():
            sc = bezpieczna(wzgl)
            kopia.zabezpiecz(sc)
            zapisz_plik(sc, tresc)
        for wzgl in p.get("usun") or []:
            sc = bezpieczna(wzgl)
            if os.path.exists(sc):
                kopia.zabezpiecz(sc)
                os.remove(sc)
        if any(w.endswith((".yaml", ".yml")) for w in (p.get("pliki") or {})) or p.get("usun"):
            ok, opis = sprawdz_konfiguracje()
            if not ok:
                raise Blad("konfiguracja odrzucona, cofnięto: " + opis)
    except Exception:
        kopia.przywroc()
        raise
    stan["ostatnia_poprawka"] = p["id"]
    log(f"Zastosowano poprawkę {p['id']}: {p.get('opis', '')}")
    return bool(p.get("restart", True))


def petla_poprawek():
    time.sleep(300)
    while True:
        try:
            if stan.get("auto_poprawki") and stan.get("klucz"):
                with blokada:
                    sprawdz_poprawki()
        except Exception as e:
            print("[pompa] pętla poprawek:", e, flush=True)
        time.sleep(3600)


# --- bramka LAN (USR-DR404 i podobne: Modbus TCP) --------------------------------------
def podsieci():
    sieci = []
    try:
        ws = WS()
        try:
            for a in (ws.wywolaj("network") or {}).get("adapters", []):
                if a.get("enabled"):
                    for ip in a.get("ipv4", []):
                        sieci.append(f"{ip['address']}/{ip.get('network_prefix', 24)}")
        finally:
            ws.zamknij()
    except Exception:
        pass
    if not sieci:
        st, odp = zapytanie("GET", SUP_API + "/network/info", naglowki={"Authorization": f"Bearer {TOKEN}"})
        for i in ((odp or {}).get("data") or {}).get("interfaces", []):
            for a in (i.get("ipv4") or {}).get("address", []) or []:
                sieci.append(a)
    wynik = []
    for s in sieci:
        try:
            n = ipaddress.ip_interface(s).network
            if n.prefixlen < 24:
                n = ipaddress.ip_interface(f"{ipaddress.ip_interface(s).ip}/24").network
            if not n.is_loopback and n.version == 4 and str(n) not in wynik:
                wynik.append(str(n))
        except ValueError:
            pass
    return wynik


def modbus_tcp_odczyt(host, rejestr=0, ile=1, unit=1, timeout=1.5):
    """Odczyt rejestrów holding przez Modbus TCP. Zwraca listę wartości albo napis z kodem wyjątku."""
    with socket.create_connection((host, 502), timeout=timeout) as s:
        s.settimeout(timeout)
        s.sendall(struct.pack(">HHHBBHH", 0x5050, 0, 6, unit, 3, rejestr, ile))
        b = s.recv(260)
    if len(b) >= 9 and b[7] == 3:
        return [struct.unpack(">H", b[9 + 2 * i: 11 + 2 * i])[0] for i in range(b[8] // 2)]
    if len(b) >= 9 and b[7] == 0x83:
        return f"wyjątek {b[8]}"
    return "brak odpowiedzi Modbus"


def modbus_tcp(host, funkcja, rejestr, ile, unit=1, timeout=1.5):
    """Odczyt Modbus TCP dowolną funkcją 01–04. Zwraca bajty danych albo None (wyjątek, brak odpowiedzi)."""
    try:
        with socket.create_connection((host, 502), timeout=timeout) as s:
            s.settimeout(timeout)
            s.sendall(struct.pack(">HHHBBHH", 0x5051, 0, 6, unit, funkcja, rejestr, ile))
            b = s.recv(260)
    except OSError:
        return None
    if len(b) >= 9 and b[7] == funkcja and len(b) >= 9 + b[8]:
        return b[9: 9 + b[8]]
    return None


def rozpoznaj_daikin(host):
    """Daikin: input 21–23 (stan błędu 0–2, kod ASCII, podkod 32766 albo 0–99). A4 ma cewki (funkcja 01), EKRHH nie (docs/daikin.md)."""
    d = modbus_tcp(host, 4, 20, 3)
    if not d or len(d) < 6:
        return None
    st, kod, pod = struct.unpack(">HHH", d[:6])
    znaki = bytes([kod >> 8, kod & 0xFF]).decode("ascii", "replace")
    if st not in (0, 1, 2) or not (pod == 32766 or pod <= 99) or not all(c.isdigit() or c.isupper() or c in "- " for c in znaki):
        return None
    return "daikin-a4" if modbus_tcp(host, 1, 0, 3) else "daikin-ekrhh"


def szukaj_bramki():
    sieci = podsieci()
    if not sieci:
        raise Blad("Nie znam adresu sieci domowej. Wpisz adres bramki ręcznie.")
    hosty = [str(h) for n in sieci for h in ipaddress.ip_network(n).hosts()][:1024]

    def otwarty(h):
        try:
            with socket.create_connection((h, 502), timeout=0.6):
                return h
        except OSError:
            return None

    with concurrent.futures.ThreadPoolExecutor(64) as ex:
        kand = [h for h in ex.map(otwarty, hosty) if h]
    wynik = []
    for h in kand:
        try:
            r = modbus_tcp_odczyt(h, 0, 10)
            pompa = isinstance(r, list)
        except OSError as e:
            r, pompa = f"błąd: {e}", False
        daikin = rozpoznaj_daikin(h)
        wynik.append({"host": h, "pompa_odpowiada": pompa or bool(daikin), "odczyt": r if pompa else str(r),
                      "daikin": daikin, "daikin_opis": MARKI[daikin][1] if daikin else None})
    log(f"Szukanie bramki: sieci {sieci}, port 502 otwarty na {len(kand)} adresach.")
    return {"sieci": sieci, "bramki": wynik}


# --- serwer panelu (ingress) -------------------------------------------------------------
PANEL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "panel.html")


def stan_publiczny():
    k = stan.get("klucz") or ""
    return {
        "wersja": WERSJA,
        "klucz": (k[:9] + "…" + k[-4:]) if k else "",
        "zainstalowano": stan.get("zainstalowano"),
        "auto_poprawki": stan.get("auto_poprawki"),
        "ostatnia_poprawka": stan.get("ostatnia_poprawka"),
        "bramka_host": stan.get("bramka_host"),
        "marka": (stan.get("marka") or {}).get("id"),
        "marka_opis": MARKI[stan["marka"]["id"]][1] if (stan.get("marka") or {}).get("id") in MARKI else None,
        "dziennik": stan.get("dziennik", [])[-25:],
    }


class Obsluga(http.server.BaseHTTPRequestHandler):
    server_version = "pompa-ha"

    def log_message(self, *a):
        pass

    def _odp(self, kod, obj, typ="application/json; charset=utf-8"):
        b = obj if isinstance(obj, bytes) else json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(kod)
        self.send_header("Content-Type", typ)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _dozwolony(self):
        ip = self.client_address[0]
        return ip in ("172.30.32.2", "127.0.0.1", "::1") or os.environ.get("POMPA_DEV") == "1"

    def _cialo(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(min(n, 100_000)))
        except Exception:
            return {}

    def do_GET(self):
        if not self._dozwolony():
            return self._odp(403, {"blad": "tylko przez panel Home Assistant"})
        p = self.path.split("?")[0].rstrip("/").rsplit("/api/", 1)
        if len(p) == 1:
            with open(PANEL, "rb") as f:
                return self._odp(200, f.read(), "text/html; charset=utf-8")
        akcja = p[1]
        try:
            if akcja == "stan":
                return self._odp(200, stan_publiczny())
            if akcja == "diagnostyka":
                return self._odp(200, diagnostyka())
            if akcja == "ustawienia":
                return self._odp(200, {"ustawienia": ustawienia(), "domyslne": USTAWIENIA_DOMYSLNE, "propozycje": propozycje()})
            if akcja == "marki":
                return self._odp(200, wykryj_marki())
        except Blad as e:
            return self._odp(400, {"blad": str(e)})
        except Exception as e:
            traceback.print_exc()
            return self._odp(500, {"blad": f"Nieoczekiwany błąd: {e}"})
        return self._odp(404, {"blad": "nie ma takiej akcji"})

    def do_POST(self):
        if not self._dozwolony():
            return self._odp(403, {"blad": "tylko przez panel Home Assistant"})
        p = self.path.split("?")[0].rstrip("/").rsplit("/api/", 1)
        akcja = p[1] if len(p) == 2 else ""
        dane = self._cialo()
        if not blokada.acquire(timeout=1):
            return self._odp(409, {"blad": "Trwa inna operacja. Poczekaj chwilę."})
        try:
            if akcja == "instaluj":
                return self._odp(200, {"ok": True, "kroki": instaluj(dane.get("klucz") or stan.get("klucz"), dane.get("bramka"))})
            if akcja == "odinstaluj":
                odinstaluj()
                return self._odp(200, {"ok": True})
            if akcja == "raport":
                return self._odp(200, wyslij_raport())
            if akcja == "poprawki":
                return self._odp(200, sprawdz_poprawki(recznie=True))
            if akcja == "ustawienia":
                nowe = ustawienia()
                nowe.update({k: v for k, v in dane.items() if k in USTAWIENIA_DOMYSLNE})
                nowe = sprawdz_ustawienia(nowe)
                stan["ustawienia"] = {k: v for k, v in nowe.items() if v != USTAWIENIA_DOMYSLNE[k]}
                zapisz_stan()
                log("Zapisano ustawienia: " + (", ".join(sorted(stan["ustawienia"])) or "domyślne"))
                if stan.get("klucz"):
                    return self._odp(200, {"ok": True, "kroki": instaluj(stan["klucz"])})
                return self._odp(200, {"ok": True, "kroki": ["Zapisano. Zastosuję je przy instalacji klucza."]})
            if akcja == "auto":
                stan["auto_poprawki"] = bool(dane.get("wl"))
                zapisz_stan()
                return self._odp(200, stan_publiczny())
            if akcja == "marka/uzyj":
                mid = dane.get("id")
                return self._odp(200, {"ok": True, "kroki": uzyj_marki(str(mid) if mid else None, (str(dane.get("host") or "").strip() or None))})
            if akcja == "bramka/szukaj":
                return self._odp(200, szukaj_bramki())
            if akcja == "bramka/uzyj":
                host = str(dane.get("host") or "").strip()
                ipaddress.ip_address(host)
                if rozpoznaj_daikin(host):
                    raise Blad(f"Pod {host} jest pompa Daikin, nie bramka do Midea. Kliknij przy niej przycisk „Użyj (Daikin)”.")
                r = modbus_tcp_odczyt(host, 0, 10)
                if not isinstance(r, list):
                    raise Blad(f"Bramka {host} nie przekazuje odczytów z pompy ({r}). Sprawdź przewody A/B i ustawienia bramki.")
                if not stan.get("klucz"):
                    stan["bramka_host"] = host
                    zapisz_stan()
                    return self._odp(200, {"ok": True, "kroki": [f"Zapamiętano bramkę {host}. Teraz wklej klucz i zainstaluj."]})
                return self._odp(200, {"ok": True, "kroki": instaluj(stan["klucz"], host)})
            return self._odp(404, {"blad": "nie ma takiej akcji"})
        except Blad as e:
            log("Błąd: " + str(e))
            return self._odp(400, {"blad": str(e)})
        except ValueError:
            return self._odp(400, {"blad": "To nie jest poprawny adres IP."})
        except Exception as e:
            traceback.print_exc()
            log(f"Nieoczekiwany błąd: {e}")
            return self._odp(500, {"blad": f"Nieoczekiwany błąd: {e}. Wyślij raport albo napisz na pompa@woleoze.pl."})
        finally:
            blokada.release()


def main():
    global stan
    stan = wczytaj_stan()
    zapisz_stan()
    log(f"Start dodatku Pompa w HA {WERSJA}.")
    threading.Thread(target=petla_poprawek, daemon=True).start()
    http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Obsluga).serve_forever()


if __name__ == "__main__":
    main()
