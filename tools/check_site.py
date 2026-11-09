#!/usr/bin/env python3
"""Проверка собранного сайта: ссылки внутри данных, снимки, ссылки страниц с доводами.

Запуск из корня репозитория: python3 tools/check_site.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"


def main() -> int:
    raw = (SITE / "data" / "derevo.js").read_text(encoding="utf-8")
    d = json.loads(raw[raw.index("{"):raw.rindex(";")])
    people, pairs, claims, sources = d["people"], d["pairs"], d["claims"], d["sources"]
    bad: list[str] = []

    def need(cond: bool, msg: str) -> None:
        if not cond:
            bad.append(msg)

    need(d["root"] in people, "корневой человек отсутствует")
    for pid, p in people.items():
        for pair in p["par"]:
            for q in pair:
                need(q is None or q in people, f"{pid}: родитель {q} отсутствует")
                need(q is None or q in p.get("lv", {}), f"{pid}: у родителя {q} нет уровня связи")
        f, m = p["par"][0]
        if f and m:
            need(f"{f}+{m}" in pairs or f"{m}+{f}" in pairs, f"{pid}: нет карточки пары {f}+{m}")
        for key in ("ch", "sb", "xp"):
            for q in p.get(key, {}):
                need(q in people, f"{pid}: {key} {q} отсутствует")
        for q in p.get("sp", []):
            need(q in people, f"{pid}: супруг {q} отсутствует")
        for c in p.get("cl", []):
            need(c in claims, f"{pid}: утверждение {c} отсутствует")
        for a in p.get("src", []):
            need(a in sources, f"{pid}: источник {a} отсутствует")
        if p.get("ph"):
            need((SITE / p["ph"]).is_file(), f"{pid}: нет файла фото {p['ph']}")
    for key, u in pairs.items():
        for q in key.split("+") + u["ch"] + u.get("ch1", []):
            need(q in people, f"пара {key}: {q} отсутствует")
        for a in u.get("src", []):
            need(a in sources, f"пара {key}: источник {a} отсутствует")
    for cid, c in claims.items():
        for a in c.get("a", []):
            need(a in sources, f"{cid}: источник {a} отсутствует")
    for aid, a in sources.items():
        for s in a.get("sc", []):
            need((SITE / s).is_file(), f"{aid}: нет снимка {s}")
    # цикл в родителях
    for mode in (0, 1):
        seen, stack = set(), [(d["root"], ())]
        while stack:
            pid, path = stack.pop()
            need(pid not in path, f"цикл в предках через {pid}")
            if pid in path:
                continue
            seen.add(pid)
            par = people[pid]["par"]
            for q in par[min(mode, len(par) - 1)]:
                if q:
                    stack.append((q, path + (pid,)))
    links = 0
    for page in sorted((SITE / "docs").glob("*.html")):
        html = page.read_text(encoding="utf-8")
        anchors = set(re.findall(r'id="([^"]+)"', html))
        for href in re.findall(r'href="([^"]+)"', html):
            if href.startswith(("http", "mailto")):
                continue
            links += 1
            path, _, frag = href.partition("#")
            if not path:
                need(not frag or frag in anchors, f"{page.name}: нет якоря #{frag}")
                continue
            target = (page.parent / path).resolve()
            need(target.is_file(), f"{page.name}: нет файла {href}")
    for m in re.finditer(r"docs/(\w+\.html)", (SITE / "assets" / "app.js").read_text(encoding="utf-8")):
        need((SITE / "docs" / m.group(1)).is_file(), f"app.js ссылается на docs/{m.group(1)}, файла нет")
    for line in bad[:60]:
        print("ОШИБКА:", line)
    print(f"Людей {len(people)}, пар {len(pairs)}, утверждений {len(claims)}, источников {len(sources)}, ссылок на страницах {links}.")
    print("Ошибок нет." if not bad else f"Ошибок: {len(bad)}.")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
