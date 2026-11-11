# Z jakimi pompami to działa

O zgodności decyduje **sterownik**, nie marka na obudowie. Pasują pompy z płytą **Midea M-Thermal** i przewodowym sterownikiem Midea (KJRH-120x / KJR-120x, czarno-biały ekran), który ma zaciski **H1/H2** i w menu serwisanta pozycję **„17.2 ADRES HMI DLA BMS”** („HMI ADDRESS FOR BMS”).

Szybki test u siebie: wejdź w menu serwisanta (hasło z instrukcji, zwykle 234) i poszukaj pozycji 17.2. Jest? Prawie na pewno zadziała. Za darmo sprawdzisz to w wersji Start.

Stan badania: 11.11.2026. Źródła: instrukcje producentów i zgłoszenia użytkowników (GitHub, forum Home Assistant, ArturHome).

## ✅ Potwierdzone

| Marka | Seria / modele | Skąd wiemy |
|---|---|---|
| Rotenso | Aquami AQM40X1–AQM160X3 (monoblok) | działa u nas na żywo (AQM120X3, sterownik KJRH-120H) |
| Midea | M-Thermal R32: MHC-V4–16W/D2(R)N8, split MHA-V… z modułem HB-A | instrukcja (menu 17.2) + zgłoszenia użytkowników |
| Kaisai | Arctic KHC / KHA (czarno-biały panel) | instrukcja sterownika (17.2) + zgłoszenia użytkowników |
| Galmet | Prima 6–16 GT | instrukcja „M-thermal Mono ATW Heat Pump”, menu 17.2 |
| De Dietrich | Modena Mono 2 AWHP 4-10MR, 12-16TR | polska instrukcja: „17.2 ADRES HMI DLA BMS” |
| York | YKF (6, 9, 14 kW R32) | zgłoszenia użytkowników (sterownik YKF-KJRH-120F) |
| Immergas | Magis M (M14T, M30) | zgłoszenia użytkowników |
| Mitsui, Vivax / Hyundai, Kosner | monobloki na płycie Midea | zgłoszenia użytkowników |

## 🟡 Powinno działać (ta sama płyta, ale nikt jeszcze nie potwierdził; mogą być różnice w rejestrach)

| Marka | Seria | Uwaga |
|---|---|---|
| Ferroli | Omnia M 3.2 / S 3.2 | menu 17.x i tabela Modbus w instrukcji; część rejestrów dodatkowa |
| Clivet | EDGE (WiSAN-YME 1 S) | menu 17.2 i rozdział Modbus w instrukcji |
| Airwell | Wellea | autor projektu odniesienia ma taką pompę |
| Baxi / Inventor | HP40-XX-MB, ATS/ATM/ATMH | starsza wersja: adres ustawiany przełącznikiem S3 |
| Sinclair | pompy ze sterownikiem SWC-120F | instrukcja sterownika ma 17.2 |

## 🧪 Jeszcze nie wiemy, czy działa (szukamy testerów)

Program jest napisany, ale nikt go jeszcze nie podłączył do prawdziwej pompy. Dlatego tego nie sprzedajemy.

| Pompa | Gdzie się podpinasz | Uwaga |
|---|---|---|
| Rotenso Windmi (sterownik ORIS) | złącze CN67 (A, B, E) na płycie jednostki wewnętrznej, adres 11 | inna płyta i własna mapa rejestrów, osobny program |
| Rotenso Heatmi | złącze J2, zaciski A2/B2, adres 16 | własna mapa rejestrów, osobny program |
| Midea Arctic R290, Kaysun Aquantia R290 (kolorowy panel KJRH-120L / L2) | H1/H2 sterownika, jak przy czarno-białym | te same numery rejestrów, inne skale; osobny program |

Podłączenie Windmi i Heatmi: [instrukcja, punkt 3b](https://pompa.woleoze.pl/instrukcja/#rotenso-testy). Masz taką pompę i Home Assistant OS? Napisz na [pompa@woleoze.pl](mailto:pompa@woleoze.pl?subject=Czy%20moja%20pompa%20pasuje%3F).

## ❄️ Klimatyzatory: w przygotowaniu

Rotenso Mirai, Versu, Revio, Imoto, Ukura i klimatyzatory Midea (później Elis, Roni, Teta). Chcesz klimatyzację w HA? Napisz na [pompa@woleoze.pl](mailto:pompa@woleoze.pl?subject=Czy%20moja%20pompa%20pasuje%3F).

## ❌ Nie pasuje (inna platforma)

- **Rotenso Airmi**, **Kaisai KHX R290**: inne mapy rejestrów.
- **Thermatec** (PREMIUM to płyta PHNIX, PLUS to Solareast): inna platforma.
- **Kospel** HPMI2/HPMO2, **Hewalex** PCCO MONO, **Galmet Airmax3**, **Viessmann Vitocal 100-A**, **Immergas Magis Pro V2 / Combo V2** (jednostka Samsung).

Masz pompę z listy „prawdopodobne” albo spoza listy i sprawdziłeś, że działa (albo nie)? Napisz na [pompa@woleoze.pl](mailto:pompa@woleoze.pl?subject=Czy%20moja%20pompa%20pasuje%3F), dopiszemy.
