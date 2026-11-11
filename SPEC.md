# Spezifikation: Stammbaum-Seite

Stand 09.11.2026. Diese Datei hält alle Entscheidungen fest, die Rostislaw im Chat getroffen hat (Fragen Q1 bis Q30). Sie gilt als verbindlich. Wer etwas ändern will, klärt es zuerst mit ihm und trägt die Änderung hier nach.

## Ziel

Eine neue, gut strukturierte Darstellung des Familienstammbaums für Rostislaws Webseite. Ein Klick auf einen Namen oder auf ein Ehepaar blendet weitere Informationen ein. Der bisherige Bericht im Repository `OfficeKnight/stammbaum` (`index.html`) bleibt unverändert bestehen. Diese Seite ist eine komplett eigene Version.

## Zwei Repositories

| Repository | Inhalt | Wer schreibt |
|---|---|---|
| `OfficeKnight/stammbaum` | Suche: Register, Scans, Suchprotokolle, Begründungen, alter Bericht | Die Chats der Suchaufgaben. Nur Chat 1 führt nach `main` zusammen. |
| `OfficeKnight/family` | Diese Seite: Code, Import, Darstellungsdatei, erzeugte Daten | Der Chat der Darstellung, direkt auf `main`. |

- Die Darstellung liest das Such-Repository nur. Sie schreibt dort nie.
- Alle Fakten stammen aus den Registern in `stammbaum/data/*.csv` (Zweig `main`). Die Darstellung hat keine eigenen Fakten.
- Der Import (`tools/import_stammbaum.py`) erzeugt `site/data/derevo.js`, kopiert die verlinkten Scans und Belegseiten und schreibt die Lückenliste `PROBELY.md`. Der Commit-Hash der Quelle steht in den Daten.
- Aktualisiert wird, wenn Rostislaw im Chat der Darstellung „обнови древо“ schreibt, nachdem Chat 1 zusammengeführt hat.
- Auf den Webspace kommt später nur der Ordner `site/`.

## Wer erscheint

- Im Baum stehen Rostislaw, seine Geschwister und alle direkten Vorfahren. Nachkommen, Ehepartner der eigenen Generation und Kinder kommen später.
- Geschwister der Vorfahren stehen nicht im Baum. Am Rand der Karte steht ihre Zahl („+12“), ein Klick öffnet die Geschwisterliste in der Personenkarte. Die Ehekarte der Eltern listet alle Kinder.
- Paten und Trauzeugen bleiben Text in den Karten.
- Unbekannte Personen bekommen keine leere Karte. Ist nur ein Elternteil bekannt, steht daneben ein kleines Fragezeichen.
- Eine eigene Karte (und einen Treffer in der Suche) bekommt jede Person aus dem Personenregister, außer Namensvettern, Ausgeschlossenen und zusammengeführten Dubletten.

## Aufbau des Baums

- Ein Baum von oben nach unten. Die älteste Generation steht oben, Rostislaw unten, die Seite des Vaters links, die der Mutter rechts.
- Ehepaare stehen immer direkt nebeneinander, der Mann links. Zwischen ihnen sitzt der Eheknoten. Von jedem Partner führt eine Winkellinie zum Paar seiner Eltern.
- Standardansicht: vier Generationen (bis zu den Urgroßeltern). Darüber steht je ein Knopf „ещё N предков“, der den Zweig aufklappt. Ein kleiner Knopf an der Karte klappt wieder zu.
- Zweig-Knöpfe („Ветви“) klappen eine Familienlinie auf und zeigen sie. Die übrigen Zweige gehen dabei auf den Standard zurück.
- „Всё древо“ klappt alles auf, „Сначала“ stellt die Standardansicht her.
- Verschieben mit Maus oder Finger, Zoomen mit Rad, Geste oder Knöpfen. Bedienung auch per Tastatur (Tab, Enter, Pfeiltasten, Plus, Minus, Escape).

## Karten

- Jeder Mensch hat eine eigene Karte, in allen Generationen. Sie zeigt Foto oder Initialen, Vorname, Vatersname, Familienname, bei Frauen den Geburtsnamen, darunter Jahre und Ort.
- Frauen stehen unter dem Ehenamen, in der Zeile darunter „урожд.“ mit dem Geburtsnamen. Ein Bindestrich wird nicht verwendet. Ist der Geburtsname unbekannt, steht nur der Ehename. Rostislaws Mutter (Кисир) und Großmutter Надежда (Казас) haben ihren Namen nie geändert.
- Klick auf eine Person öffnet die Personenkarte, Klick auf den Eheknoten die Ehekarte. Am Desktop ist das eine Seitenleiste rechts, am Handy ein Panel von unten, das sich auf volle Höhe ziehen lässt. Der Baum bleibt sichtbar.
- Personenkarte, von oben nach unten: Steckbrief (Daten, Orte, Beruf, Gemeinschaft, Schreibweisen, Eltern, Ehe, Kinder), Geschwister, automatische Chronik „Жизнь“ aus den Behauptungen des Registers, Dokumente mit Scans, eingeklappt Begründungen und offene Fragen.
- Ehekarte: Angaben zur Ehe, alle Kinder (die eigene Linie hervorgehoben), Quellen mit Scans.
- Jede Person und jede Ehe hat eine eigene Adresse, zum Beispiel `#P-0018` oder `#P-0032-P-0033`.
- Daten vor 1918 stehen wie im Dokument nach altem Stil, das neue Datum folgt, wenn das Register es nennt.
- Begründungen und Quellen verlinken auf die vorhandenen Seiten aus `stammbaum/docs/`, die der Import kopiert. Nichts wird doppelt gepflegt.

## Belegstatus

Der Status hängt an jeder Abstammung und zusätzlich an einzelnen Angaben in der Karte. Im Baum zeigt ihn der Kartenrahmen, weil Vater und Mutter am selben Knoten verschieden gut belegt sein können.

| Rahmen | Bedeutung | Regel |
|---|---|---|
| durchgezogen | Dokument | Status im Register mindestens `single-source` und mindestens eine Quelle ist das Bild des Originals oder eine amtliche Urkunde (Feld `originality`). |
| gestrichelt | Familienwissen | Status `hypothesis` und Begründung „со слов“ oder Angabe des Nutzers. |
| gepunktet | ungeprüft | Alles andere: fremde Online-Bäume, Abschriften, Indizes ohne Bild, reine Vatersnamen. |
| gestrichelt in Ocker, Etikett „гипотеза“ | Hypothese | Vertrauen `low` im Register. Nur sichtbar, wenn der Schalter „Гипотезы“ an ist. |

- Pro Elternplatz erscheint nur eine Person. Ein belegter Elternteil ersetzt den Platzhalter immer. Ein Kandidat ersetzt ihn nur bei eingeschaltetem Schalter.
- Der Schalter ist standardmäßig aus.

## Darstellungsdatei

`podpisi.csv` legt fest, wie eine Person im Baum beschriftet ist: Vorname, Vatersname, Ehename, Geburtsname, Geschlecht, Familienlinie für die Zweig-Knöpfe, Kurzort, Foto, freier Text. Sie enthält keine Fakten der Forschung. Der geplante Admin-Bereich soll später genau diese Angaben pflegen.

- Fotos: Version 1 zeigt Initialen. Fotos kommen später mit dem Webspace und dem Admin-Bereich. Bis dahin können sie als `site/foto/P-0018.jpg` abgelegt und in `podpisi.csv` eingetragen werden.
- Freie Lebenstexte: nicht in Version 1. Danach Vorschläge für die Personen mit den meisten Belegen, Freigabe durch Rostislaw.

## Lücken in den Registern

Der Baum zeigt nur, was als Beziehung im Register steht. Der Import schreibt alle erkannten Lücken nach `PROBELY.md`. Die Darstellung ändert `stammbaum/data/` nie. Chat 1 trägt die Beziehungen nach.

## Sprache und Gestaltung

- Die Seite ist vollständig russisch. Keine deutsche Umschrift.
- Heller Papierlook wie im Mockup: cremefarbener Grund, Serifenschrift für Namen (PT Serif), PT Sans für Beschriftungen. Kein dunkler Modus in Version 1.
- Reines HTML, CSS und JavaScript ohne Framework, ohne CDN, Schriften liegen im Repository. Die Seite läuft auf jedem Webspace und auch als lokale Datei.
- In allen Texten gilt: keine Gedankenstriche, kein Satzanfang mit Doppelpunkt.

## Veröffentlichung

- Entscheidung vom 11.11.2026: Die Seite geht öffentlich und ohne Login live, unter `family.kazas.dev` auf GitHub Pages. Rostislaw sieht in den Daten nichts Geheimes. Die frühere Entscheidung (erst mit Login ins Netz) ist damit aufgehoben.
- Veröffentlicht wird nur der Ordner `site/`, automatisch bei jedem Push auf `main` (`.github/workflows/pages.yml`).
- Die Seite trägt weiter `noindex`, und `site/robots.txt` verbietet das Indexieren. Sie ist über den Link erreichbar, soll aber nicht in Suchmaschinen erscheinen.
- Später: eigener Webspace (Hetzner oder ähnlich) mit Login und Admin-Bereich für Zugänge, Fotos und weitere Angaben.

## Umfang von Version 1

Enthalten: Baum, Personenkarte, Ehekarte, Suche nach Namen, Schalter für Hypothesen, Zweig-Knöpfe, Handy-Ansicht.

Später: Fotos, freie Texte, Admin-Bereich und Login, Ortskarte, Zeitleiste, GEDCOM-Export, Nachkommen und Ehepartner der eigenen Generation, dunkler Modus.
