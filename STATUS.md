# Stand

## 09.11.2026: Version 1

Gebaut nach `SPEC.md`. Datenstand des Such-Repositories: Commit `f2f3a60` (Bericht 3.20).

- 144 Personen mit Karte, davon 55 im Baum (mit Hypothesen 57), 9 Generationen.
- 28 Paare, 136 Behauptungen, 135 Quellen, 180 Scans.
- Abstammungen im Baum: 19 durch Dokument belegt, 8 Familienwissen, 27 ungeprüft.
- Der Baum stimmt mit dem Index des Such-Repositories (`docs/ukazatel.json`) überein. Einzige Abweichung: der Platzhalter P-0055 fehlt, weil auf seinem Platz der belegte P-0061 steht. P-0610, P-0611 und P-0613 erscheinen nur mit eingeschaltetem Schalter „Гипотезы“.
- Geprüft im Browser: Desktop 1440 px und Handy 390 px, Personenkarte, Ehekarte, Aufklappen, Zweig-Knöpfe, Suche, Scans, Tastatur. `tools/check_site.py` meldet keine Fehler.

## Bekannte Lücken

`PROBELY.md` listet 81 Lücken in den Registern. Die wichtigsten für den Baum:

- Илья Казас (P-0002) hat keine Eltern-Beziehung, nur eine Geschwister-Beziehung zu Ростислав.
- Die zwölf Geschwister von Христина Осипчук (P-0034, P-0035, P-0037 bis P-0046) haben keine Beziehung zu ihren Eltern P-0032 und P-0033. Deshalb zeigt die Ehekarte nur zwei Kinder.
- Bei den Geschwistern von Василий Крестьянинов fehlt die Beziehung zur Mutter P-0023.
- Марина Ковальчук (P-0065) ist als Ehefrau von P-0061 belegt, aber nicht als Mutter von Семён (P-0050) eingetragen.
- Mehrere Abstammungen stehen doppelt im Register (zum Beispiel R-0034 und R-0035).

## Nächste Schritte

1. Chat 1 trägt die Lücken aus `PROBELY.md` nach, danach Import neu laufen lassen.
2. Rostislaw sieht Version 1 durch und nennt Änderungswünsche.
3. Freie Lebenstexte für die am besten belegten Personen vorschlagen.
4. Mit dem Webspace: Login, Admin-Bereich (Zugänge, Fotos, Angaben in `podpisi.csv`).
