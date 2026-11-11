# Stand

## 11.11.2026: Import nach den Korrekturen von Chat 1

Datenstand des Such-Repositories: Commit `0e46d52`. Chat 1 hat 59 Beziehungen nachgetragen (R-0124 bis R-0182), P-0055 in P-0061 zusammengeführt und doppelte Zeilen entfernt.

- 143 Personen mit Karte, davon 57 im Baum (mit Hypothesen 60), 9 Generationen. 30 Paare, 137 Behauptungen, 135 Quellen, 180 Scans.
- Abstammungen im Baum: 19 durch Dokument belegt, 8 Familienwissen, 29 ungeprüft.
- Neu im Baum: Марина Михайловна Сливинская, geb. Ковальчук (P-0065) als Mutter von Семён, und Анна Чуюн (P-0616) als Mutter von Бикенеш. Beide ungeprüft.
- Илья (P-0002) ist jetzt Kind seiner Eltern. Die Ehekarte von Василий und Анастасия Осипчук zeigt 14 Kinder, Христина hat 13 Geschwister.
- `PROBELY.md` listet noch 11 Punkte, keiner davon betrifft den Baum direkt (siehe unten).
- Import angepasst: Widerlegte Beziehungen gelten nicht mehr als Lücke. Kinder und Geschwister sind nach Geburtsjahr sortiert.
- Geprüft im Browser am Desktop und in Handybreite. `tools/check_site.py` meldet keine Fehler und acht Hinweise: Die kopierte Seite `docs/svyazi.html` verweist auf acht gelöschte Beziehungen (R-0035, R-0046, R-0416, R-0601, R-0605, R-0606, R-0607, R-0613). Das behebt Chat 1 im Such-Repository.

## 09.11.2026: Version 1

Gebaut nach `SPEC.md` auf dem Datenstand `f2f3a60` (Bericht 3.20). Geprüft im Browser: Desktop 1440 px und Handy 390 px, Personenkarte, Ehekarte, Aufklappen, Zweig-Knöpfe, Suche, Scans, Tastatur. Der Baum stimmt mit dem Index des Such-Repositories (`docs/ukazatel.json`) überein.

## Offene Punkte in den Registern

- Auf dem Platz des Vaters von Марк Келеш (P-0005) stehen der Platzhalter P-0014 und der Kandidat P-0610. Das ist gewollt, der Kandidat erscheint nur mit dem Schalter „Гипотезы“.
- P-0036, P-0087, P-0401 und P-0414 haben keine Beziehung und sind nur über die Suche zu finden. Es gibt kein Dokument, das eine Verwandtschaft nennt.
- Die übrigen Punkte sind Erwähnungen von Schwiegerverwandten oder möglichen Dubletten im Textfeld, keine fehlenden Beziehungen.

## Nächste Schritte

1. Rostislaw sieht die Seite durch und nennt Änderungswünsche.
2. Freie Lebenstexte für die am besten belegten Personen vorschlagen.
3. Mit dem Webspace: Login, Admin-Bereich (Zugänge, Fotos, Angaben in `podpisi.csv`).
