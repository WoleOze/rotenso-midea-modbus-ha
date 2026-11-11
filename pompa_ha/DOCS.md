# Pompa w HA

Dodatek instaluje „Pompa w Home Assistant” bez kopiowania plików i bez edycji YAML.

1. Otwórz panel **Pompa – instalator** (pasek boczny).
2. Wklej klucz z maila (`RPRO-…`) i kliknij **Zainstaluj**. Dodatek:
   - pobiera pakiety Pro i zapisuje je w `packages/pompa_ha/`,
   - dopisuje do `configuration.yaml` jedną linię `packages: !include_dir_named packages` (kopia pliku przed zmianą trafia do `pompa_ha_kopia/`),
   - sprawdza konfigurację, rejestruje karty i tworzy pulpit **Pompa**,
   - restartuje Home Assistant.
3. Sekcja **Diagnostyka** pokazuje, czy moduł i pompa odpowiadają. Gdy coś jest czerwone, pod spodem jest podpowiedź.
4. **Wyślij raport** przesyła do wsparcia wynik diagnostyki i stany encji pompy (bez haseł i bez danych z reszty domu).
5. **Poprawki**: dodatek co godzinę pyta serwer, czy wsparcie przygotowało poprawkę dla twojego klucza. Zmienia wyłącznie pliki „Pompa w HA” (`packages/pompa_ha/`, `www/rotenso/`, `raporty/dopisz.py`). Możesz to wyłączyć przełącznikiem.

Nikt nie łączy się z twoim Home Assistant z zewnątrz. To dodatek wysyła zapytania do serwera licencji, tak jak aktualizacje w telefonie.

Pomoc: pompa@woleoze.pl (tylko mailowo).
