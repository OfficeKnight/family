# Stammbaum-Seite der Familien Kazas und Kisir

Klickbarer Familienstammbaum. Die Forschung selbst liegt im privaten Repository `OfficeKnight/stammbaum`, diese Seite zeigt deren Ergebnis. Alle Entscheidungen stehen in [`SPEC.md`](SPEC.md), der aktuelle Stand in [`STATUS.md`](STATUS.md).

Die Seite ist seit dem 11.11.2026 öffentlich unter `family.kazas.dev` erreichbar (Entscheidung von Rostislaw, siehe `SPEC.md`). Sie enthält Angaben zu lebenden Verwandten und Scans von Familiendokumenten.

## Ansehen

`site/index.html` im Browser öffnen. Die Seite braucht keinen Server und kein Internet.

## Was wo liegt

| Pfad | Inhalt |
|---|---|
| `site/` | Die fertige Seite. Nur dieser Ordner kommt später auf den Webspace. |
| `site/index.html`, `site/assets/` | Seite, Gestaltung, Programm, Schriften (PT Serif und PT Sans, OFL-Lizenz). |
| `site/data/derevo.js` | Alle Daten des Baums. Wird vom Import erzeugt, nicht von Hand ändern. |
| `site/docs/`, `site/scans/` | Belegseiten und Scans, vom Import aus dem Such-Repository kopiert. |
| `site/foto/` | Platz für Fotos (`P-0018.jpg`). |
| `podpisi.csv` | Beschriftung der Personen im Baum. Von Hand gepflegt, später vom Admin-Bereich. |
| `PROBELY.md` | Lücken in den Registern, die im Baum sichtbar werden. Wird vom Import erzeugt. |
| `tools/import_stammbaum.py` | Import aus dem Such-Repository. |
| `tools/check_site.py` | Prüft die erzeugte Seite auf fehlende Verweise, Scans und Links. |

## Aktualisieren

Das Such-Repository muss lokal auf dem Zweig `main` liegen.

```bash
python3 tools/import_stammbaum.py --source ../stammbaum
python3 tools/check_site.py
```

Danach `PROBELY.md` ansehen und committen. Neue Personen ohne Zeile in `podpisi.csv` stehen dort im letzten Abschnitt.

## Veröffentlichung

Jeder Push auf `main`, der `site/` ändert, veröffentlicht die Seite über GitHub Pages (`.github/workflows/pages.yml`). Die eigene Domain steht in den Einstellungen des Repositories unter Pages, im DNS zeigt ein CNAME-Eintrag `family` auf `officeknight.github.io`.

Die Seite trägt `noindex`, `site/robots.txt` verbietet das Indexieren.
