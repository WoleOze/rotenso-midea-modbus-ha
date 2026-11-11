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

## 🟡 Prawdopodobne (ta sama platforma, mogą być różnice w rejestrach)

| Marka | Seria | Uwaga |
|---|---|---|
| Ferroli | Omnia M 3.2 / S 3.2 | menu 17.x i tabela Modbus w instrukcji; część rejestrów dodatkowa |
| Clivet | EDGE (WiSAN-YME 1 S) | menu 17.2 i rozdział Modbus w instrukcji |
| Airwell | Wellea | autor projektu odniesienia ma taką pompę |
| Baxi / Inventor | HP40-XX-MB, ATS/ATM/ATMH | starsza wersja: adres ustawiany przełącznikiem S3 |
| Sinclair | pompy ze sterownikiem SWC-120F | instrukcja sterownika ma 17.2 |
| Midea Arctic R290, Kaysun Aquantia R290 | kolorowy panel KJRH-120L / L2 | inna wersja protokołu: działa najwyżej część odczytów, potrzebny osobny plik |

## ❌ Nie pasuje (inna platforma)

- **Rotenso Windmi** (WIM…, sterownik ORIS): inny producent płyty i inna mapa rejestrów.
- **Rotenso Heatmi, Rotenso Airmi**, **Kaisai KHX R290**: inne mapy rejestrów.
- **Kospel** HPMI2/HPMO2, **Hewalex** PCCO MONO, **Galmet Airmax3**, **Viessmann Vitocal 100-A**, **Immergas Magis Pro V2 / Combo V2** (jednostka Samsung).

Masz pompę z listy „prawdopodobne” albo spoza listy i sprawdziłeś, że działa (albo nie)? Napisz w [Discussions](https://github.com/WoleOze/rotenso-midea-modbus-ha/discussions), dopiszemy.
