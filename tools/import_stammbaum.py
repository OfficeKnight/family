#!/usr/bin/env python3
"""Импорт данных из репозитория поиска (stammbaum) в сайт с древом.

Запуск из корня этого репозитория:

    python3 tools/import_stammbaum.py --source ../stammbaum

Скрипт только читает репозиторий поиска. Он собирает site/data/derevo.js,
копирует снимки и страницы с доводами, на которые ссылается древо, и пишет
PROBELY.md со списком пробелов в реестрах. Факты берутся только из реестров
data/*.csv; файл podpisi.csv задаёт лишь то, как человек подписан в древе.
"""
from __future__ import annotations

import argparse
import csv
import datetime
import json
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
ROOT_PERSON = "P-0001"
SKIP_PERSON = {"namesake-unlinked", "notable-namesake", "excluded", "merged"}
OK_STATUS = ("single-source", "corroborated", "strongly-corroborated")
STATUS_ORDER = {"strongly-corroborated": 0, "corroborated": 1, "single-source": 2, "hypothesis": 3}
CONF_ORDER = {"high": 0, "medium": 1, "": 2, "low": 3}
ORIG_PREFIX = ("image-of-original", "official", "original", "notarized", "certified")
DOC_PAGES = ["utverzhdeniya.html", "istochniki.html", "rassuzhdeniya.html", "lyudi.html", "svyazi.html"]
SKIP_CLAIM_TYPES = ("negative", "not found", "source-availability", "surname", "context", "source reliability",
                    "parish jurisdiction", "place-identification", "record-annotation", "candidate-match")
ID_RE = {"P": re.compile(r"P-\d{4}"), "A": re.compile(r"A-\d{4}"), "C": re.compile(r"C-\d{4}")}
YEAR_RE = re.compile(r"(?<!\d)(1[5-9]\d\d|20[0-2]\d)(?!\d)")
MALE_A = {"илья", "савва", "никита", "лука", "фома", "кузьма", "бераха", "шемарья", "иона", "симха", "шелеме", "мордехай"}


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def ids(kind: str, text: str) -> list[str]:
    return ID_RE[kind].findall(text or "")


def clean(text: str) -> str:
    """Приводит рабочую запись реестра к виду для чтения, не меняя смысла."""
    t = (text or "").strip()
    t = re.sub(r"(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)", r"\3.\2.\1", t)
    t = re.sub(r"(?<![\d.])(\d{4})-(0[1-9]|1[0-2])(?![\d-])", r"\2.\1", t)
    t = re.sub(r"\(user\)", "(со слов семьи)", t)
    t = re.sub(r"\buser\b", "со слов семьи", t)
    t = t.replace("Rostik", "Ростислава").replace("(heute)", "(сейчас)")
    t = re.sub(r"\bca\.\s*", "ок. ", t)
    return t


def guess_sex(given: str, patr: str) -> str:
    p = patr.lower()
    if p.endswith(("вна", "чна", "шна", "кызы")):
        return "ж"
    if p.endswith(("вич", "ич", "оглы")):
        return "м"
    g = given.lower()
    if g in MALE_A:
        return "м"
    return "ж" if g.endswith(("а", "я")) else "м"


def guess_name(label: str) -> dict:
    """Разбирает рабочее имя из реестра, если для человека нет строки в podpisi.csv."""
    nee = ""
    m = re.search(r"урожд\.\s*([^,)/]+)", label)
    if m:
        nee = m.group(1).strip()
    s = re.sub(r"\([^)]*\)", " ", label)
    s = re.sub(r",\s*урожд\.[^,]*", " ", s)
    s = re.sub(r"\[\?\]", " ", s)
    s = s.split(",")[0].split(";")[0]
    words = [w for w in s.split() if w]
    patr = next((w for w in words if re.search(r"(вич|ич|вна|чна)$", w)), "")
    rest = [w for w in words if w != patr]
    fam, given = "", ""
    if len(rest) >= 2:
        if words.index(rest[0]) < (words.index(patr) if patr else 99) and patr and words.index(patr) == len(words) - 1:
            fam, given = rest[0], rest[1]
        elif patr:
            fam, given = rest[0], rest[1]
        else:
            given, fam = rest[0], rest[1]
    elif rest:
        given = rest[0]
    return dict(imya=given, otchestvo=patr, familiya=fam, urozhd=nee, pol=guess_sex(given, patr), vetv="", mesto="", foto="", tekst="")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="путь к локальной копии репозитория stammbaum (ветка main)")
    args = ap.parse_args()
    src = Path(args.source).resolve()
    data = src / "data"
    persons = {r["person_id"]: r for r in read_csv(data / "person-register.csv")}
    rels = read_csv(data / "relationship-register.csv")
    arts = {r["artifact_id"]: r for r in read_csv(data / "artifact-register.csv")}
    claims = {r["claim_id"]: r for r in read_csv(data / "claims-register.csv")}
    podpisi = {r["id"]: r for r in read_csv(ROOT / "podpisi.csv")}
    commit = subprocess.run(["git", "-C", str(src), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    branch = subprocess.run(["git", "-C", str(src), "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True).stdout.strip()
    if branch != "main":
        print(f"Внимание: источник на ветке {branch}, а не main.", file=sys.stderr)

    gaps: dict[str, list[str]] = defaultdict(list)
    included = {pid for pid, p in persons.items() if p["candidate_status"] not in SKIP_PERSON}

    # ---- подписи ----
    names = {}
    for pid in included:
        if pid in podpisi:
            names[pid] = podpisi[pid]
        else:
            names[pid] = guess_name(persons[pid]["preferred_label"])
            gaps["podpisi"].append(f"{pid}: нет строки в podpisi.csv, имя разобрано автоматически из «{persons[pid]['preferred_label']}».")

    def full(pid: str) -> str:
        n = names[pid]
        s = " ".join(x for x in (n["imya"], n["otchestvo"], n["familiya"]) if x)
        return s + (f", урожд. {n['urozhd']}" if n["urozhd"] else "")

    def tagname(pid: str) -> str:
        return f"{pid} {full(pid)}"

    # ---- источники ----
    def is_orig(aid: str) -> bool:
        a = arts.get(aid)
        return bool(a) and a["originality"].strip().lower().startswith(ORIG_PREFIX)

    def claim_arts(cid: str) -> list[str]:
        return ids("A", claims[cid]["artifact_ids"]) if cid in claims else []

    def rel_arts(r: dict) -> list[str]:
        out = ids("A", r["supporting_artifact_ids"])
        for cid in ids("C", r["claim_ids"]):
            out += claim_arts(cid)
        return list(dict.fromkeys(out))

    def is_family(r: dict) -> bool:
        rat = r["rationale"].strip().lower()
        return rat.startswith("со слов") or "familienwissen" in rat or "angabe des nutzers" in rat

    def is_patr(r: dict) -> bool:
        """Человек выведен только из отчества ребёнка и больше ничем не подтверждён."""
        return r["status"] == "hypothesis" and ("patronymic" in r["biological_legal_household"].lower()
                                                or "отчеств" in r["rationale"].lower())

    def link_level(r: dict) -> str:
        if r["status"] in OK_STATUS:
            return "doc" if any(is_orig(a) for a in rel_arts(r)) else "unv"
        if r["confidence"].strip().lower() == "low":
            return "hyp"
        return "fam" if is_family(r) else "unv"

    live = [r for r in rels if r["status"] != "contradicted" and r["person_a_id"] in included and r["person_b_id"] in included]
    pc = [r for r in live if r["relationship_type"] == "parent-child"]
    sp = [r for r in live if r["relationship_type"] == "spouse"]
    sib = [r for r in live if r["relationship_type"] == "sibling"]

    # ---- выбор родителей: одно место, один человек ----
    by_child = defaultdict(list)
    for r in pc:
        by_child[r["person_b_id"]].append(r)

    def slot_rank(r: dict, hyp_on: bool) -> tuple:
        lv = link_level(r)
        if lv == "doc":
            base = 0
        elif lv == "fam":
            base = 1
        elif lv == "hyp":
            base = 3
        else:
            base = 4 if is_patr(r) else 2
        return (base, STATUS_ORDER.get(r["status"], 9), CONF_ORDER.get(r["confidence"].strip().lower(), 2), r["relationship_id"])

    def choose(child: str, sex: str, hyp_on: bool):
        cand = [r for r in by_child.get(child, []) if names[r["person_a_id"]]["pol"] == sex]
        if not hyp_on:
            cand = [r for r in cand if link_level(r) != "hyp"]
        if not cand:
            return None
        cand.sort(key=lambda r: slot_rank(r, hyp_on))
        return cand[0]

    par = {}  # child -> {"off": (f, m), "on": (f, m)}; links: (child, parent) -> relationship
    link_of = {}
    for child in included:
        entry = {}
        for mode, hyp_on in (("off", False), ("on", True)):
            pair = []
            for sex in ("м", "ж"):
                r = choose(child, sex, hyp_on)
                pair.append(r["person_a_id"] if r else None)
                if r:
                    link_of[(child, r["person_a_id"])] = r
            entry[mode] = pair
        par[child] = entry
        for sex, word in (("м", "отца"), ("ж", "матери")):
            cand = [r for r in by_child.get(child, []) if names[r["person_a_id"]]["pol"] == sex]
            who = list(dict.fromkeys(r["person_a_id"] for r in cand))
            for q in who:
                rows = [r for r in cand if r["person_a_id"] == q]
                if len(rows) > 1:
                    gaps["double"].append(f"{tagname(q)} и {tagname(child)}: связь родитель и ребёнок записана дважды, "
                                          + ", ".join(f"{r['relationship_id']} ({r['status']})" for r in rows) + ".")
            if len(who) > 1:
                shown = par[child]["off"][0 if sex == "м" else 1]
                desc = "; ".join(f"{tagname(r['person_a_id'])} ({r['relationship_id']}, {r['status']}"
                                 f"{', confidence low' if r['confidence'].strip().lower() == 'low' else ''})" for r in cand)
                gaps["slots"].append(f"{tagname(child)}: на месте {word} записано несколько человек. {desc}. "
                                     f"В древе показан {shown or 'никто'}. Если это один и тот же человек, записи стоит слить.")

    def ancestors(mode: str) -> dict:
        gen = {ROOT_PERSON: 0}
        queue = [ROOT_PERSON]
        while queue:
            c = queue.pop(0)
            for p in par[c][mode]:
                if p and p not in gen:
                    gen[p] = gen[c] + 1
                    queue.append(p)
        return gen

    anc_off, anc_on = ancestors("off"), ancestors("on")
    in_tree = set(anc_off) | set(anc_on)

    # ---- дети, братья и сёстры, супруги ----
    children = defaultdict(dict)   # parent -> child -> level
    parents_all = defaultdict(dict)
    for r in pc:
        lv = link_level(r)
        children[r["person_a_id"]][r["person_b_id"]] = lv
        parents_all[r["person_b_id"]][r["person_a_id"]] = lv
    siblings = defaultdict(dict)
    for child, ps in parents_all.items():
        for p, lv in ps.items():
            for other, lv2 in children[p].items():
                if other != child:
                    q = "hyp" if "hyp" in (lv, lv2) else "ok"
                    if siblings[child].get(other) != "ok":
                        siblings[child][other] = q
    for r in sib:
        a, b = r["person_a_id"], r["person_b_id"]
        q = "hyp" if link_level(r) == "hyp" else "ok"
        for x, y in ((a, b), (b, a)):
            if siblings[x].get(y) != "ok":
                siblings[x][y] = q

    def pair_key(a: str, b: str) -> str:
        if names[a]["pol"] == "ж" and names[b]["pol"] != "ж":
            a, b = b, a
        elif names[a]["pol"] == names[b]["pol"] and a > b:
            a, b = b, a
        return f"{a}+{b}"

    pairs = {}
    for r in sp:
        k = pair_key(r["person_a_id"], r["person_b_id"])
        cur = pairs.get(k)
        if cur is None or STATUS_ORDER.get(r["status"], 9) < STATUS_ORDER.get(cur["status"], 9):
            pairs[k] = r
    co_parents = set()
    for child, ps in parents_all.items():
        fs = [p for p in ps if names[p]["pol"] == "м"]
        ms = [p for p in ps if names[p]["pol"] == "ж"]
        for f in fs:
            for m in ms:
                co_parents.add(pair_key(f, m))
    for mode in ("off", "on"):
        for child in in_tree:
            f, m = par[child][mode]
            if f and m:
                co_parents.add(pair_key(f, m))
    spouses = defaultdict(list)
    for k in sorted(set(pairs) | co_parents):
        a, b = k.split("+")
        spouses[a].append(b)
        spouses[b].append(a)

    # ---- утверждения ----
    def claim_level(c: dict) -> str:
        t = c["claim_type"].lower()
        if c["status"] == "contradicted":
            return "no"
        if "family" in t:
            return "fam"
        if c["status"] in OK_STATUS:
            return "doc" if any(is_orig(a) for a in ids("A", c["artifact_ids"])) else "unv"
        if "candidate" in t or c["confidence"].strip().lower() == "low":
            return "hyp"
        return "unv"

    used_claims, used_arts = set(), set()
    claims_of = defaultdict(list)
    for cid, c in claims.items():
        t = c["claim_type"].lower()
        if c["status"] == "unresolved" or any(s in t for s in SKIP_CLAIM_TYPES):
            continue
        for pid in ids("P", c["subject_person_ids"]):
            if pid in included:
                claims_of[pid].append(cid)
                used_claims.add(cid)

    def field(text: str) -> dict | None:
        t = clean(text)
        if not t:
            return None
        a = ids("A", t)
        if any(is_orig(x) for x in a):
            lv = "doc"
        elif re.search(r"со слов|семь", t, re.I) and not a:
            lv = "fam"
        else:
            lv = "unv"
        used_arts.update(x for x in a if x in arts)
        return {"t": t, "l": lv}

    def short_years(p: dict) -> str:
        b, d = p["birth_estimate"], p["death_estimate"]
        by, dy = YEAR_RE.search(b), YEAR_RE.search(d)
        pre = ""
        m = re.match(r"\s*(ок\.|около|после|до|ca\.)", b, re.I)
        if m and by:
            pre = {"около": "ок.", "ca.": "ок."}.get(m.group(1).lower(), m.group(1).lower()) + " "
        if by and dy:
            return f"{pre}{by.group(1)}-{dy.group(1)}"
        if by:
            return f"{pre}{by.group(1)}"
        if dy:
            return f"ум. {dy.group(1)}"
        return ""

    people = {}
    for pid in sorted(included):
        p, n = persons[pid], names[pid]
        src_ids = [a for a in ids("A", p["source_artifact_ids"]) if a in arts]
        for a in arts.values():
            if pid in ids("P", a["person_ids"]) and a["artifact_id"] not in src_ids and a["status"] not in ("namesake-not-linked", "excluded"):
                src_ids.append(a["artifact_id"])
        used_arts.update(src_ids)
        rec = {
            "n": [n["imya"], n["otchestvo"], n["familiya"], n["urozhd"]],
            "s": n["pol"],
            "y": short_years(p),
        }
        for key, val in (("v", n["vetv"]), ("pl", n["mesto"]), ("ph", n["foto"]), ("tx", n["tekst"])):
            if val:
                rec[key] = val
        for key, text in (("b", p["birth_estimate"]), ("d", p["death_estimate"])):
            f = field(text)
            if f:
                rec[key] = f
        for key, text in (("pc", p["places"]), ("oc", p["occupation_or_status"]), ("cf", p["confession_or_community_as_recorded"]),
                          ("wr", p["names_as_written"])):
            t = clean(text)
            if t:
                rec[key] = t
                used_arts.update(x for x in ids("A", t) if x in arts)
        rec["par"] = [par[pid]["off"], par[pid]["on"]] if par[pid]["off"] != par[pid]["on"] else [par[pid]["off"]]
        lv = {}
        for mode in ("off", "on"):
            for q in par[pid][mode]:
                if q:
                    lv[q] = link_level(link_of[(pid, q)])
        if lv:
            rec["lv"] = lv
        extra = {q: l for q, l in parents_all.get(pid, {}).items() if q not in lv}
        if extra:
            rec["xp"] = extra
        if children.get(pid):
            rec["ch"] = dict(sorted(children[pid].items(), key=lambda kv: (persons[kv[0]]["birth_estimate"][:4] or "9999", kv[0])))
        if siblings.get(pid):
            rec["sb"] = dict(sorted(siblings[pid].items(), key=lambda kv: (persons[kv[0]]["birth_estimate"][:4] or "9999", kv[0])))
        if spouses.get(pid):
            rec["sp"] = spouses[pid]
        if claims_of.get(pid):
            rec["cl"] = claims_of[pid]
        if src_ids:
            rec["src"] = src_ids
        if pid in anc_off:
            rec["g"] = anc_off[pid]
        elif pid in anc_on:
            rec["gh"] = anc_on[pid]
        people[pid] = rec

    pair_out = {}
    for k in sorted(set(pairs) | co_parents):
        a, b = k.split("+")
        r = pairs.get(k)
        rec = {}
        if r:
            rec.update({"r": r["relationship_id"], "l": link_level(r), "why": clean(r["rationale"])})
            pa = rel_arts(r)
        else:
            pa = []
        mc = [cid for cid, c in claims.items() if "marriage" in c["claim_type"].lower()
              and a in ids("P", c["subject_person_ids"]) and b in ids("P", c["subject_person_ids"]) and c["status"] != "unresolved"]
        for cid in mc:
            pa += claim_arts(cid)
            used_claims.add(cid)
        pa = [x for x in dict.fromkeys(pa) if x in arts]
        if mc:
            rec["cl"] = mc
        if pa:
            rec["src"] = pa
            used_arts.update(pa)
        both = [c for c in children.get(a, {}) if c in children.get(b, {})]
        only_a = [c for c in children.get(a, {}) if c not in both and not any(names[q]["pol"] == names[b]["pol"] for q in parents_all[c])]
        only_b = [c for c in children.get(b, {}) if c not in both and not any(names[q]["pol"] == names[a]["pol"] for q in parents_all[c])]
        order = lambda c: (persons[c]["birth_estimate"][:4] or "9999", c)
        rec["ch"] = sorted(both, key=order)
        if only_a or only_b:
            rec["ch1"] = sorted(only_a + only_b, key=order)
        pair_out[k] = rec

    claim_out = {}
    for cid in sorted(used_claims):
        c = claims[cid]
        y = YEAR_RE.search(c["claim_text"])
        ca = [a for a in ids("A", c["artifact_ids"]) if a in arts]
        used_arts.update(ca)
        rec = {"t": clean(c["claim_text"]), "l": claim_level(c), "k": c["claim_type"]}
        if y:
            rec["y"] = int(y.group(1))
        if ca:
            rec["a"] = ca
        if c["rationale"].strip():
            rec["why"] = clean(c["rationale"])
        if c["next_action"].strip():
            rec["next"] = clean(c["next_action"])
        claim_out[cid] = rec

    art_out, scan_files = {}, set()
    for a in arts.values():
        for sp_ in re.findall(r"scans/[^\s;,)]+", a["source_url_or_path"]):
            scan_files.add(sp_)
    for aid in sorted(used_arts):
        a = arts[aid]
        scans = [s for s in re.findall(r"scans/[^\s;,)]+", a["source_url_or_path"]) if (src / s).is_file()]
        url = re.search(r"https?://[^\s;,)]+", a["source_url_or_path"])
        rec = {"t": clean(a["source_title"]), "o": 1 if is_orig(aid) else 0}
        for key, val in (("ref", a["archival_reference"]), ("rep", a["repository_or_archive"]), ("d", clean(a["record_date"])),
                         ("sum", clean(a["summary"]))):
            if val.strip():
                rec[key] = val.strip()
        if url:
            rec["url"] = url.group(0)
        if scans:
            rec["sc"] = scans
        art_out[aid] = rec

    # ---- ветви ----
    chips = []
    order = sorted(anc_off, key=lambda q: (anc_off[q], q))
    count = defaultdict(int)
    for q in anc_off:
        if names[q]["vetv"]:
            count[names[q]["vetv"]] += 1
    for q in order:
        v = names[q]["vetv"]
        if v and count[v] >= 2 and v not in chips:
            chips.append(v)

    # ---- пробелы в реестрах ----
    related = defaultdict(set)
    for r in live:
        related[r["person_a_id"]].add(r["person_b_id"])
        related[r["person_b_id"]].add(r["person_a_id"])
    for x, others in siblings.items():
        related[x].update(others)
    for pid in sorted(included):
        text = persons[pid]["relatives_as_reported"]
        text = re.sub(r"P-(\d{4})\.\.P-(\d{4})", lambda m: "; ".join(f"P-{i:04d}" for i in range(int(m.group(1)), int(m.group(2)) + 1)), text)
        missing = [q for q in dict.fromkeys(ids("P", text)) if q in included and q != pid and q not in related[pid]]
        if missing:
            gaps["text"].append(f"{tagname(pid)}: в поле relatives_as_reported упомянуты {', '.join(missing)}, "
                                f"но ни одной связи с ними в relationship-register.csv нет. Запись в поле: «{persons[pid]['relatives_as_reported']}».")
    for child in sorted(in_tree, key=lambda q: (anc_off.get(q, anc_on.get(q, 0)), q)):
        f, m = par[child]["off"]
        if f and not m:
            cand = [s for s in spouses.get(f, [])]
            if cand:
                gaps["mother"].append(f"{tagname(child)}: отец {tagname(f)}, мать не записана. У отца в реестре есть жена: "
                                      f"{'; '.join(tagname(s) for s in cand)}. Если это мать, нужна связь parent-child.")
        if m and not f:
            cand = [s for s in spouses.get(m, [])]
            if cand:
                gaps["mother"].append(f"{tagname(child)}: мать {tagname(m)}, отец не записан. У матери в реестре есть муж: "
                                      f"{'; '.join(tagname(s) for s in cand)}. Если это отец, нужна связь parent-child.")
    linked = set()
    for r in live:
        linked.update((r["person_a_id"], r["person_b_id"]))
    for pid in sorted(included - linked - {ROOT_PERSON}):
        gaps["lonely"].append(f"{tagname(pid)}: нет ни одной связи в relationship-register.csv; человека можно найти только поиском.")

    # ---- запись ----
    out = {
        "meta": {"source": "OfficeKnight/stammbaum", "commit": commit, "made": datetime.date.today().isoformat(),
                 "people": len(people), "tree": len(anc_off)},
        "root": ROOT_PERSON,
        "chips": chips,
        "people": people,
        "pairs": pair_out,
        "claims": claim_out,
        "sources": art_out,
    }
    (SITE / "data").mkdir(parents=True, exist_ok=True)
    (SITE / "data" / "derevo.js").write_text(
        "// Собрано скриптом tools/import_stammbaum.py, вручную не править.\nwindow.DEREVO = "
        + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")

    if (SITE / "scans").exists():
        shutil.rmtree(SITE / "scans")
    for s in sorted(scan_files):
        if (src / s).is_file():
            dst = SITE / s
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src / s, dst)
    if (SITE / "docs").exists():
        shutil.rmtree(SITE / "docs")
    (SITE / "docs").mkdir(parents=True)

    def fix_link(m: re.Match) -> str:
        href, text = m.group(1), m.group(2)
        if href.startswith(("http", "#", "mailto")):
            return m.group(0)
        path = href.split("#")[0]
        if path in DOC_PAGES or path == "../index.html" or (path.startswith("../scans/") and (SITE / path[3:]).is_file()):
            return m.group(0)
        return text

    for page in DOC_PAGES:
        html = (src / "docs" / page).read_text(encoding="utf-8")
        html = re.sub(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>', fix_link, html, flags=re.S)
        (SITE / "docs" / page).write_text(html, encoding="utf-8")

    titles = [
        ("slots", "Несколько человек на одном месте родителя"),
        ("double", "Одна связь записана дважды"),
        ("mother", "Супруг предка не записан родителем"),
        ("text", "Родство записано только текстом"),
        ("lonely", "Люди без связей"),
        ("podpisi", "Нет подписи для древа"),
    ]
    lines = ["# Пробелы в реестрах, которые видны в древе", "",
             f"Собрано скриптом `tools/import_stammbaum.py` из репозитория поиска, коммит `{commit[:7]}`, {datetime.date.today():%d.%m.%Y}. "
             "Файл перезаписывается при каждом импорте.", "",
             "Древо показывает только то, что записано в `data/relationship-register.csv`. "
             "Ниже перечислено, чего в связях не хватает. Правки вносит чат задания 1 в репозитории поиска, "
             "после этого древо обновляется импортом. Последний раздел касается файла `podpisi.csv` в этом репозитории.", ""]
    total = 0
    for key, title in titles:
        items = gaps.get(key, [])
        total += len(items)
        lines += [f"## {title} ({len(items)})", ""]
        lines += [f"- {x}" for x in items] or ["Пробелов нет."]
        lines.append("")
    (ROOT / "PROBELY.md").write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")

    print(f"Источник {commit[:7]} ({branch}). Людей с карточкой: {len(people)}. В древе: {len(anc_off)}, с гипотезами: {len(anc_on)}.")
    print(f"Пар: {len(pair_out)}. Утверждений: {len(claim_out)}. Источников: {len(art_out)}. Снимков: {len(scan_files)}. Пробелов: {total}.")
    print("Ветви:", ", ".join(chips))
    levels = defaultdict(int)
    for child in anc_off:
        for q in par[child]["off"]:
            if q:
                levels[link_level(link_of[(child, q)])] += 1
    print("Связи в древе по уровням:", dict(levels))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
