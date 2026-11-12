# Film „Pompa w Home Assistant · montaż w 15 minut”

Rysunkowy film instruktażowy (animacja wektorowa, bez zdjęć, bez lektora) do strony `pompa.woleoze.pl/instrukcja`.
16:9, 1920×1080, 30 kl/s, H.264 yuv420p z `faststart`, cicha muzyka tła.

## Pliki

| Plik | Co to jest |
|---|---|
| `montaz.mp4` | gotowy film |
| `montaz-poster.jpg` | plakat (klatka planszy tytułowej z kartami „Przygotuj”) |
| `montaz.vtt` | napisy WebVTT po polsku (te same teksty co na ekranie) |
| `montaz-sceny.json` | lista scen z czasami (do raportu i rozdziałów) |
| `scena.html` | strona z filmem: wygląd, kolory, kroje (barwy jak pompa.woleoze.pl) |
| `sceny.js` | treść scen, czasy, polecenia na ekranie, animacje; `window.klatka(t)` |
| `rysunki.js` | rysunki SVG: sterownik (przód, tył płytki), moduł ESP32 z RS-485, bramka RS-485 → LAN, router, ładowarka |
| `nagraj.mjs` | nagrywarka: Chrome bez okna przez DevTools, klatka po klatce → ffmpeg |
| `fonty/` | Inter i IBM Plex Mono (licencja OFL), żeby render nie zależał od systemu |
| `kontrola/` | klatki kontrolne i arkusze klatek PNG (można usunąć, nie są potrzebne na stronie; w `.gitignore`) |

## Przebudowa

Wymagane: Node 22+ (wbudowany `WebSocket` i `fetch`), Google Chrome, ffmpeg.

```bash
cd film
node nagraj.mjs --sceny                 # klatki kontrolne: 3 chwile z każdej sceny → kontrola/
node nagraj.mjs --klatki=12.5,40        # wybrane chwile → kontrola/
node nagraj.mjs                         # pełny film (ok. 3–4 min): montaz.mp4 + poster + vtt
```

Opcje: `--crf=24` (jakość obrazu; większa liczba = mniejszy plik), `--lufs=-20` (głośność końcowa muzyki),
`--bez-muzyki`, `--muzyka=ścieżka.mp3`.

Podgląd jednej chwili w przeglądarce: otwórz `scena.html?t=42.5`.

Chrome jest zawsze zamykany (blok `finally` i `pkill` po własnym profilu); cudzy Chrome nie jest ruszany.

## Jak zmienić treść

- Tekst polecenia albo jego czas: `sceny.js`, tablica `kroki: [[czas, "tekst"], …]` danej sceny.
  Znaczniki na początku słowa: `^` niebieski, `!` czerwony, `+` zielony, `~` pomarańczowy, `%` brązowy.
  Napisy WebVTT powstają z tych samych tekstów, więc po zmianie wystarczy pełny render.
- Długość sceny: pole `dl` (sekundy). Kolejne sceny przesuną się same.
- Wygląd sprzętu: `rysunki.js` (współrzędne zacisków opisane przy każdej funkcji).

## Muzyka

`AKADEMIA-PRODUKCJA/zwiastun/muzyka/soundsurfer-crypto-255273.mp3` (Pixabay, spokojny utwór 90 BPM,
wcześniej wybrany do spokojnego zwiastuna KNL). Wejście 1,5 s, wyciszenie 3 s, głośność dwuprzebiegowo
(loudnorm liniowy) do −20 LUFS, szczyt −1,5 dBTP. Film nie ma lektora, więc −14 LUFS dałoby pełną głośność muzyki;
cichsze tło: `--lufs=-20` (domyślnie), pełna głośność platform: `--lufs=-14`.

## Zasady treści

- Bez nazw modeli modułu i bramki (piszemy typami: „moduł ESP32 z RS-485”, „bramka RS-485 → LAN”).
- Makiety telefonu i Home Assistant mają etykietę ILUSTRACJA.
- Plansza końcowa bez przycisków: pomoc mailowa i adres instrukcji.
