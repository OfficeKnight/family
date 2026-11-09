# Regeln für Claude in diesem Repository

- Vor jeder Arbeit `SPEC.md` und `STATUS.md` lesen. Die Entscheidungen in `SPEC.md` nicht neu aufrollen, ohne Rostislaw zu fragen.
- Committen und pushen im Namen von Rostislaw, als würde er es selbst tun. Autor und Committer `Rostislaw Kazas <rostislaw.kazas@gmail.com>`, Commits ohne Signatur, keine Zeilen `Co-Authored-By` und `Claude-Session`. Vor dem ersten Commit ausführen:

```bash
git config user.name "Rostislaw Kazas"
git config user.email "rostislaw.kazas@gmail.com"
git config commit.gpgsign false
```

- Das Repository `OfficeKnight/stammbaum` nur lesen. Dort nichts ändern, nichts committen.
- Fakten kommen nur aus den Registern des Such-Repositories. `podpisi.csv` enthält nur die Beschriftung.
- `site/data/derevo.js`, `site/docs/`, `site/scans/` und `PROBELY.md` erzeugt der Import. Nicht von Hand ändern.
- Nach jeder Änderung an Import oder Seite `python3 tools/check_site.py` ausführen und die Seite im Browser ansehen, am Desktop und in Handybreite.
- Die Seite ist russisch. In allen Texten keine Gedankenstriche und kein Satzanfang mit Doppelpunkt.
- Kein Framework, kein CDN, keine Schriften von fremden Servern.
