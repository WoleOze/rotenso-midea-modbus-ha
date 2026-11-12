# Pompa w HA

Dodatek instaluje „Pompa w Home Assistant” bez kopiowania plików i bez edycji YAML.

1. Po instalacji kliknij **Otwórz interfejs użytkownika** (albo włącz **Pokaż na pasku bocznym**, a panel „Pompa – instalator” będzie zawsze pod ręką).
2. **Zestaw Wi-Fi:** najpierw dodaj moduł: Ustawienia → Urządzenia i usługi → „Wykryto: Pompa Modbus” → Dodaj. **Zestaw Wi-Fi + LAN:** w panelu kliknij **Szukaj bramki LAN**, a przy znalezionej bramce **Użyj**.
3. Wklej klucz z maila (`RPRO-…`) i kliknij **Zainstaluj**. Dodatek:
   - pobiera pakiety Pro i zapisuje je w `packages/pompa_ha/`,
   - dopisuje do `configuration.yaml` jedną linię `packages: !include_dir_named packages` (kopia pliku przed zmianą trafia do `pompa_ha_kopia/`),
   - zapisuje program modułu z zapisem nastaw jako `esphome/pompa-modbus-pro.yaml` (dla własnych modułów: w dodatku ESPHome kliknij przy nim „Install”; zestawy mają go już wgranego),
   - sprawdza konfigurację, rejestruje karty i tworzy pulpit **Pompa**,
   - restartuje Home Assistant.
4. **Ustawienia** (opcjonalnie): wybierz z listy własny licznik prądu, licznik ciepła, czujnik zewnętrzny, telefon do powiadomień o anomaliach i taryfę. Dodatek sam dopasuje pakiety i karty.
5. **Diagnostyka** pokazuje, czy moduł i pompa odpowiadają, i rozpoznaje typ pompy. Gdy coś jest czerwone, pod spodem jest podpowiedź.
6. **Wyślij raport** przesyła do wsparcia wynik diagnostyki i stany encji pompy (bez haseł i bez danych z reszty domu).
7. **Poprawki**: dodatek co godzinę pyta serwer, czy wsparcie przygotowało poprawkę dla twojego klucza. Zmienia wyłącznie pliki „Pompa w HA” (`packages/pompa_ha/`, `www/rotenso/`, `raporty/dopisz.py`, `esphome/pompa-modbus-pro.yaml`). Możesz to wyłączyć przełącznikiem.

**Program modułu (zestawy):** nowa wersja programu modułu pojawia się w Home Assistant jako aktualizacja **„Program modułu”** (Ustawienia → Urządzenia i usługi → Pompa Modbus albo na górze strony Ustawienia, przy aktualizacjach). Instalujesz ją jednym kliknięciem „Zainstaluj”. Moduł sam się zrestartuje po 1–2 minutach. Nie odłączaj wtedy zasilania. Dotyczy zestawów i modułów wgranych przez nas od tej wersji programu. Starszy moduł trzeba raz wgrać przez USB (https://web.esphome.io), potem aktualizacje przychodzą już same.

Nikt nie łączy się z twoim Home Assistant z zewnątrz. To dodatek wysyła zapytania do serwera licencji, tak jak aktualizacje w telefonie.

Wymaga Home Assistant OS (Raspberry Pi, Home Assistant Green, mini PC z HA OS). Instrukcja montażu: https://pompa.woleoze.pl/instrukcja/

Pomoc: pompa@woleoze.pl (tylko mailowo).
