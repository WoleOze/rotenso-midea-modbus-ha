# Najczęstsze pytania

## 1. Brak komunikacji – wszystkie encje `unavailable`, w logu „timeout” albo „CRC error”

Po kolei:
1. **Zamień A i B.** To najczęstsza przyczyna. Oznaczenia polaryzacji RS‑485 nie są ujednolicone; w tym repo działa A+ → H2, B− → H1, ale spotyka się
   sterowniki z odwrotnym opisem. Zamiana niczego nie uszkodzi.
2. **Właściwe zaciski.** H1/H2 muszą być na płytce **sterownika ściennego** (panelu z wyświetlaczem), nie na płycie głównej jednostki.
3. **Adres.** Menu 17.2 „ADRES HMI DLA BMS” w sterowniku = `address:` w YAML (fabrycznie 1). HMI SET powinno być 0.
4. **Piny.** Jeśli to nie Waveshare ESP32-S3-Relay-1CH, sprawdź `tx_pin`, `rx_pin` i `flow_control_pin` – przetwornik RS‑485 z osobnym DE/RE
   wymaga poprawnego pinu kierunku.
5. **Log ESPHome** (`esphome logs esphome/pompa-modbus.yaml`): komunikaty `modbus_controller` pokażą, czy pompa w ogóle odpowiada (błędne
   CRC = zwykle zła polaryzacja lub zakłócenia; cisza = zły adres lub przewody).
6. **Wyjątek 2 (illegal data address)** przy pojedynczych rejestrach to nie awaria: starsze sterowniki nie znają części adresów (np. 11–12) – te
   są w YAML pominięte.

Dalej nic? Kliknij w dodatku „Pompa w HA” → „Wyślij raport” i napisz na pompa@woleoze.pl. Nie chcesz grzebać sam? [Zestaw gotowy do podpięcia](https://buy.stripe.com/cNieVd2qg9sI7jK6aL3Je05) albo [wgranie twojego modułu](https://buy.stripe.com/3cIfZh6Gw0Wc6fGbv53Je07).

## 2. Czy mogę pomylić A z B i coś spalić?

Nie. RS‑485 jest odporny na zamianę przewodów – po prostu nie będzie odczytów. Nie wolno natomiast podać na H1/H2 zasilania ani łączyć ich
z masą modułu. Moduł zasilaj wyłącznie z 5 V przez USB‑C.

## 3. COP jest ujemny albo ciepło „ucieka” – co się dzieje?

To odszranianie. Pompa odwraca obieg i przez kilka minut pobiera ciepło z instalacji, żeby roztopić szron na wymienniku zewnętrznym. W tym czasie
ciepło według pompy jest ujemne, a chwilowy COP spada poniżej zera. Dobowy i miesięczny COP pozostają wiarygodne – odszranianie jest realnym kosztem.
Karta Pompa zaznacza odszraniania fioletowym pasem na wykresie doby. Jeśli są bardzo częste (kilkanaście dziennie przy temperaturze powyżej 0 °C),
sprawdź czystość wymiennika i odpływ skroplin.

## 4. Moc szacowana vs licznik – jak bardzo się mylę bez licznika?

`sensor.pompa_modbus_moc_elektryczna_szacowana` = napięcie × prąd jednostki zewnętrznej × 1,73 × 0,95. Pompa podaje prąd z rozdzielczością **1 A**,
więc przy 400 V krok wynosi ok. 650 W, a błąd typowo ±400 W. Przy pracy 2–3 kW to 15–20 %; przy biegu minimalnym nawet więcej. Dodatkowo nie
widać poboru pompy obiegowej, sterownika ani grzałek (te liczy osobno rejestr 129). Do porównań dobowych i trendów wystarczy; jeśli chcesz
rozliczać się co do kilowatogodziny, zamontuj licznik (patrz pyt. 6). Karta „Pompa” podpisuje wtedy COP „(moc szacowana z U×I)”.

## 5. Po co dzielić prąd i ciepło na dom i CWU?

Bo to dwie różne sprawy. Grzanie domu (CO) pracuje na niskiej temperaturze wody (30–40 °C) i ma COP 3–4; ładowanie bojlera (CWU) na 45–55 °C
i COP 2–2,5. Jedna wspólna liczba zamazuje, gdzie ucieka prąd: czy zima jest droga przez pogodę, czy przez zbyt wysoką zadaną CWU i częste
doładowania. W wersji Start widzisz na karcie Pompa, kiedy zawór SV1 kieruje ciepło na bojler (pas CWU na wykresie doby). Liczniki prądu, ciepła
i COP osobno dla domu i CWU oraz harmonogram CWU na tanie godziny to wersja [Pro](https://github.com/WoleOze/rotenso-midea-modbus-ha#pro).

## 6. Mam własny licznik prądu pompy – jak go podłączyć?

W karcie Pompa podaj encję **mocy chwilowej w W** w konfiguracji karty:
```yaml
type: custom:rotenso-pompa
encje:
  prad_moc: sensor.moj_licznik_moc
```
Wtedy COP „teraz” i wykres doby liczą się z licznika zamiast z szacunku U×I. Licznik trójfazowy, który podaje moc na każdej fazie osobno, zsumuj
wcześniej sensorem `template`. Podstawienie licznika do podziału dom/CWU, kosztów i raportu (kreator) to wersja [Pro](https://github.com/WoleOze/rotenso-midea-modbus-ha#pro).

## 7. Czy to działa z Midea M‑Thermal bez logo Rotenso?

Tak, o ile sterownik ścienny to Midea KJRH‑120H (albo nowszy z tej rodziny) z wyjściem BMS na H1/H2. Rotenso Aquami to Midea M‑Thermal pod inną
marką; identyczne sterowniki mają m.in. Kaisai, Sinclair, Inventor, Mundoclima, Carrier/Toshiba Estia (część modeli). Mapa rejestrów jest ta sama –
różnią się tylko obsługiwane adresy (starsze panele zgłaszają wyjątek 2 dla nowszych rejestrów). Jeśli masz inny sterownik (np. z ekranem
dotykowym, nowszy protokół), rejestry mogą być inne – sprawdź w instrukcji serwisowej swojego modelu rozdział „Lista Modbus”.

## 8. Czy to bezpieczne dla pompy?

Wersja Start tylko czyta: plik ESPHome nie ma żadnej encji `number`, więc moduł niczego do pompy nie zapisuje. Odczyt rejestrów, które producent
udostępnia dla BMS, nie zmienia pracy pompy. Przełączniki na karcie Start (strefa 1, CWU, ECO, cichy) pochodzą z integracji Midea i działają tak samo
jak w aplikacji producenta.

Zapis nastaw instalatora z HA jest w wersji [Pro](https://github.com/WoleOze/rotenso-midea-modbus-ha#pro). Warto wiedzieć: po zapisie nastawy
serwisowej pompa potrafi wyłączyć grzanie CWU, a zmiana krzywej czy histerezy to ingerencja w pracę instalacji – rób to świadomie i zapisz sobie
wartości fabryczne (karta Pompa pokazuje je obok obecnych).

## 9. Czy mogę równolegle używać aplikacji Midea (moduł Wi‑Fi) i chmury?

Tak. Karta Start wręcz na tym działa (integracja `midea_ac_lan`). Modbus na H1/H2 to osobne wyjście sterownika – nie koliduje z modułem Wi‑Fi
(SmartHome / MSmartHome) ani z integracjami chmurowymi. Oba widzą te same liczniki kWh (rejestry 143–146 zgadzają się co do kWh z aplikacją).
Uważaj tylko, żeby dwie automatyzacje nie ustawiały na przemian tej samej nastawy – wybierz jedno źródło zmian.

## 10. Czy mogę podłączyć moduł do H1/H2 na płycie głównej jednostki zamiast do sterownika ściennego?

U nas (AQM120X3, sterownik KJRH-120H) działa **tylko przez zaciski H1/H2 sterownika ściennego**. Płyty głównej nie testowaliśmy.

W instrukcjach Midea zaciski H1/H2 na płycie modułu hydraulicznego są zwykle opisane jako połączenie „równoległe”, czyli magistrala do kaskady kilku pomp albo drugiego sterownika, a nie wyjście Modbus dla BMS. To częsta przyczyna braku komunikacji. W części nowszych płyt (np. seria Arctic) Modbus bywa wyprowadzony także na płytę: zależy to od generacji płyty, nie od tego, czy masz monoblok, czy split.

Zasada: podłącz do sterownika ściennego. Na płycie próbuj tylko wtedy, gdy instrukcja twojego modelu przy tych zaciskach wprost pisze „Modbus” albo „BMS”. Sterownik ścienny ma mieć wtedy HMI SET = 0.
