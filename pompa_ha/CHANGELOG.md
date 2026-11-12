# Zmiany

## 1.4.0
- Inne marki bez naszego modułu: Panasonic Aquarea (HeishaMon), NIBE seria S, Mitsubishi Ecodan (ESPHome Ecodan albo MELCloud), Vaillant aroTHERM (ebusd albo myVAILLANT). Przycisk „Wykryj integrację” znajduje integrację w Home Assistant, a „Użyj” instaluje adapter: karty Pro i alarmy działają na jej encjach. Na start w testach: prosimy o raport z dodatku.
- Daikin Altherma 4 i Altherma 3 z EKRHH przez Modbus TCP: „Szukaj bramki LAN” rozpoznaje pompę Daikin w sieci i odróżnia ją od bramki do Midea.
- NIBE: instalacja włącza wyłączone encje integracji potrzebne kartom.
- Marki bez zapisu zadanej CWU (NIBE, MELCloud, myVAILLANT) nie dostają harmonogramu CWU.
- Diagnostyka i podpowiedzi dla nowych marek oraz LG Therma V (wersja testowa modułu).
- Zmiana marki albo powrót do modułu usuwa pakiet poprzedniego źródła danych (z kopią w pompa_ha_kopia).

## 1.3.2
- Podpowiedzi diagnostyki mówią „17.1 HMI SET = GŁÓWNA”, tak jak pokazuje sterownik (wcześniej „HMI SET = 0”).

## 1.3.1
- Klucz kupiony z wyborem „wykonanie po 14 dniach” pokazuje w instalatorze jasny komunikat i datę z maila, zamiast „Nie znam tego klucza”.

## 1.3.0
- Instalacja klucza zapisuje też program modułu z zapisem nastaw (`esphome/pompa-modbus-pro.yaml`) dla osób z własnym modułem.
- Diagnostyka wykrywa program Start bez zapisu nastaw i mówi, co kliknąć.
- Raport do wsparcia zawiera tylko alarmy pompy, nie alarmy domu.

## 1.2.0
- Diagnostyka rozpoznaje typ pompy z programu modułu (Midea, kolorowy panel Midea, Rotenso Windmi, Rotenso Heatmi) i daje podpowiedzi dla właściwego złącza i adresu.

## 1.1.0
- Ustawienia (kreator w dodatku): licznik prądu, licznik ciepła, czujnik zewnętrzny, powiadomienia na telefon, taryfa i tanie okna wybierane z list. Dodatek sam dopasowuje pakiety i karty.

## 1.0.0
- Pierwsza wersja: instalator z kluczem, pulpit „Pompa”, diagnostyka, raport do wsparcia, poprawki pobierane z serwera, wyszukiwanie bramki LAN.
