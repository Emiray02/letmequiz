"""
Parses all telc PDFs in public/materials into structured JSON datasets
written to src/lib/materials-data/*.json. These JSON files are imported
by Next.js pages so we never re-parse at runtime.

Output files:
- lesetexte.json      — Einfach gut Lesetext per Lektion (level, topic, body)
- wortschatz.json     — Einfach gut Wortschatzlisten (level, entries[])
- hoertexte.json      — Auf jeden Fall Hörtext transkripte (level, lektion, track, text)
- video-transkripte.json — Auf jeden Fall video transkripte
- loesungen.json      — Lösungen anahtarları (level, body)
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
MAT_DIR = ROOT / "public" / "materials"
OUT_DIR = ROOT / "src" / "lib" / "materials-data"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def read_pdf(path: Path) -> str:
    r = PdfReader(str(path))
    parts: list[str] = []
    for p in r.pages:
        try:
            parts.append(p.extract_text() or "")
        except Exception:
            parts.append("")
    text = "\n".join(parts)
    # Clean common artefacts
    text = text.replace("\u00ad", "")  # soft hyphens
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ---------- Lesetexte (Einfach gut) ----------
LESETEXT_RE = re.compile(
    r"Einfach_gut_(A[12])\.(\d)_Lektion_(\d+)_Lesetext_([^.]+)\.pdf",
    re.IGNORECASE,
)


HEADER_NOISE = re.compile(
    r"^("
    r"Einfach gut!?.*|"
    r"Auf jeden Fall!?.*|"
    r"©?\s*telc gGmbH.*|"
    r"Bildquellen:.*|"
    r"Quelle:.*|"
    r"\d+\s*(Lesen|Ergänzen|Beantworten|Schreiben|Markieren|Ordnen|Notieren|Sammeln|Was ist|Welche|Wer|Wo|Wann|Wie|Warum|Was)\s.*|"
    r"\d+\s*(Wie heißt|Welche Sprachen|Woher kommt|Wer ist|Was macht|Was sagt|Was machen|Was sehen|Was lesen).*|"
    r"Lesetext.*|"
    r"Aufgabe \d+.*|"
    r"\s*\d+\s*$|"
    r"\d+\s*[a-z]\)\s.*"
    r")",
    re.IGNORECASE,
)


def clean_body(text: str) -> str:
    out_lines: list[str] = []
    for raw in text.split("\n"):
        s = raw.strip()
        if not s:
            out_lines.append("")
            continue
        if HEADER_NOISE.match(s):
            continue
        out_lines.append(s)
    body = "\n".join(out_lines).strip()
    body = re.sub(r"\n{3,}", "\n\n", body)
    return body


def parse_lesetexte() -> list[dict]:
    out: list[dict] = []
    for f in sorted(os.listdir(MAT_DIR)):
        m = LESETEXT_RE.match(f)
        if not m:
            continue
        level = f"{m.group(1)}.{m.group(2)}"
        lektion = int(m.group(3))
        topic = m.group(4).replace("_", " ")
        body = clean_body(read_pdf(MAT_DIR / f))
        out.append(
            {
                "id": f"{level.replace('.', '_')}-l{lektion:02d}",
                "level": level,
                "lektion": lektion,
                "topic": topic,
                "fileName": f,
                "url": f"/materials/{f}",
                "text": body,
                "wordCount": len(re.findall(r"\w+", body)),
            }
        )
    out.sort(key=lambda x: (x["level"], x["lektion"]))
    return out


# ---------- Wortschatz (Einfach gut) ----------
WORTSCHATZ_RE = re.compile(
    r"(?:Einfach_gut|Auf_jeden_Fall)_(A[12])\.(\d)_Wortschatzliste_(Tuerkisch|Deutsch)\.pdf",
    re.IGNORECASE,
)

# Regex: "Wort  ... Türkçe karşılık" — Wortschatz PDFs typically have
# "deutsche Form ... türkische Übersetzung" per line. We'll best-effort split.
ENTRY_SPLIT = re.compile(r"\s{2,}|\t+")


def parse_wortschatz() -> list[dict]:
    """Parse Einfach gut Wortschatzlisten.

    Deutsch list rows look like: "der Abend Abende Guten Abend!"
        → artikel="der", word="Abend", plural="Abende", example="Guten Abend!"
    Verbs rows look like: "antworten (Sie antworten)" → word, conjugation hint.
    Türkisch list rows look like: "der Abend ‧ akşam"
        → de + tr split by 2+ spaces.
    """
    out: list[dict] = []
    artikel_re = re.compile(r"^(der|die|das)\s+([A-ZÄÖÜß][\w-]*)(?:\s+([\w-]+))?(?:\s+(.+))?$")
    section_re = re.compile(r"^Wortschatz zu Lektion\s+(\d+)", re.IGNORECASE)

    for f in sorted(os.listdir(MAT_DIR)):
        m = WORTSCHATZ_RE.match(f)
        if not m:
            continue
        level = f"{m.group(1)}.{m.group(2)}"
        lang = m.group(3).lower()
        text = read_pdf(MAT_DIR / f)
        entries: list[dict] = []
        current_lektion: int | None = None
        for raw in text.split("\n"):
            line = raw.strip()
            if not line:
                continue
            if re.fullmatch(r"\d+", line):
                continue
            if re.search(r"telc gGmbH", line, re.IGNORECASE):
                continue
            sec = section_re.match(line)
            if sec:
                current_lektion = int(sec.group(1))
                continue
            if re.match(r"^Artikel\s+Deutsch\s+Plural", line, re.IGNORECASE):
                continue
            if re.match(r"^Lektion\s+\d+", line, re.IGNORECASE):
                current_lektion = int(re.match(r"^Lektion\s+(\d+)", line, re.IGNORECASE).group(1))
                continue

            if lang == "tuerkisch":
                # Tokenise: Turkish translation = trailing all-lowercase tokens
                # (allowing Turkish-only chars). German part = the rest.
                tokens = line.split()
                # Find last index where token is "German-like" (capitalised noun
                # or article). Anything after that is Turkish.
                de_end = -1
                for i, tok in enumerate(tokens):
                    if tok in ("der", "die", "das"):
                        de_end = i
                    elif re.match(r"^[A-ZÄÖÜ]", tok):
                        de_end = i  # capitalised → German noun
                    elif i == 0 and re.match(r"^[a-zäöüß][\w-]*$", tok):
                        de_end = i  # lowercase verb / adj at start
                if de_end < 0 or de_end == len(tokens) - 1:
                    # No clear split — keep raw
                    entries.append({"raw": line, "lektion": current_lektion})
                    continue
                de = " ".join(tokens[: de_end + 1])
                tr = " ".join(tokens[de_end + 1 :])
                # Detect article in de prefix
                art = None
                de_tokens = de.split()
                if de_tokens and de_tokens[0] in ("der", "die", "das"):
                    art = de_tokens[0]
                    word = de_tokens[1] if len(de_tokens) > 1 else ""
                    plural = " ".join(de_tokens[2:]) if len(de_tokens) > 2 else None
                    entries.append(
                        {
                            "artikel": art,
                            "word": word,
                            "plural": plural,
                            "tr": tr,
                            "lektion": current_lektion,
                        }
                    )
                else:
                    entries.append({"de": de, "tr": tr, "lektion": current_lektion})
                continue

            # Deutsch list — try to split into structured fields
            am = artikel_re.match(line)
            if am:
                entries.append(
                    {
                        "artikel": am.group(1),
                        "word": am.group(2),
                        "plural": am.group(3),
                        "example": (am.group(4) or "").strip() or None,
                        "lektion": current_lektion,
                    }
                )
                continue
            # Verb / adverb / connector lines (no article)
            if re.match(r"^[a-zäöüß]", line):
                # Maybe verb with optional inflection in parens
                vmatch = re.match(r"^([a-zäöüß][\w-]+)(?:\s+\(([^)]+)\))?(?:\s+(.+))?$", line)
                if vmatch:
                    entries.append(
                        {
                            "word": vmatch.group(1),
                            "inflection": vmatch.group(2),
                            "example": (vmatch.group(3) or "").strip() or None,
                            "lektion": current_lektion,
                        }
                    )
                    continue
            # Fallback — keep whole line
            if 1 < len(line) < 120:
                entries.append({"raw": line, "lektion": current_lektion})

        out.append(
            {
                "id": f"ws-{level.replace('.', '_')}-{lang}",
                "level": level,
                "language": lang,
                "fileName": f,
                "url": f"/materials/{f}",
                "entries": entries,
                "entryCount": len(entries),
            }
        )
    out.sort(key=lambda x: (x["level"], x["language"]))
    return out


# ---------- Hörtexte (Auf jeden Fall transkripte) ----------
HOER_RE = re.compile(
    r"Auf_jeden_Fall_(A[12])\.(\d)_Hoertexte_KB_AB\.pdf",
    re.IGNORECASE,
)


def parse_hoertexte() -> list[dict]:
    """Return list of { level, lektion, aufgabe, track, text } items."""
    items: list[dict] = []
    for f in sorted(os.listdir(MAT_DIR)):
        m = HOER_RE.match(f)
        if not m:
            continue
        level = f"{m.group(1)}.{m.group(2)}"
        text = read_pdf(MAT_DIR / f)

        # Split by Lektion headers
        lektion_blocks = re.split(r"\n(?=Lektion\s+\d+\s*$)", text, flags=re.MULTILINE)
        for block in lektion_blocks:
            lk_m = re.match(r"Lektion\s+(\d+)", block, re.IGNORECASE)
            if not lk_m:
                continue
            lektion = int(lk_m.group(1))
            # Within a lektion, items begin with "Aufgabe ... (Track NN)"
            chunks = re.split(
                r"\n(?=Aufgabe\s+[\w\d]+(?:\s*\([^)]*\))?\s*$)",
                block,
                flags=re.MULTILINE,
            )
            for ch in chunks[1:]:
                head_match = re.match(
                    r"Aufgabe\s+([\w\d]+)\s*(?:\((Track\s+\d+)\))?",
                    ch,
                    re.IGNORECASE,
                )
                if not head_match:
                    continue
                aufgabe = head_match.group(1)
                track = head_match.group(2) or ""
                body = ch[head_match.end():].strip()
                # Trim down to next major section
                body = re.split(r"\n(?:Kursbuch|Arbeitsbuch)\s*$", body, flags=re.MULTILINE)[0]
                body = body.strip()
                if not body:
                    continue
                items.append(
                    {
                        "id": f"{level.replace('.', '_')}-l{lektion:02d}-a{aufgabe}",
                        "level": level,
                        "lektion": lektion,
                        "aufgabe": aufgabe,
                        "track": track,
                        "fileName": f,
                        "url": f"/materials/{f}",
                        "text": body,
                        "wordCount": len(re.findall(r"\w+", body)),
                    }
                )
    items.sort(key=lambda x: (x["level"], x["lektion"], x["aufgabe"]))
    return items


# ---------- Video transkripte ----------
VIDEO_RE = re.compile(
    r"Auf_jeden_Fall_(A[12])\.(\d)_Transkripte_Videos\.pdf",
    re.IGNORECASE,
)


def parse_videos() -> list[dict]:
    items: list[dict] = []
    for f in sorted(os.listdir(MAT_DIR)):
        m = VIDEO_RE.match(f)
        if not m:
            continue
        level = f"{m.group(1)}.{m.group(2)}"
        text = read_pdf(MAT_DIR / f)
        parts = re.split(r"\n(?=Lektion\s+\d+)", text, flags=re.MULTILINE)
        for p in parts:
            lk = re.match(r"Lektion\s+(\d+)", p, re.IGNORECASE)
            if not lk:
                continue
            body = p[lk.end():].strip()
            if not body:
                continue
            items.append(
                {
                    "id": f"video-{level.replace('.', '_')}-l{int(lk.group(1)):02d}",
                    "level": level,
                    "lektion": int(lk.group(1)),
                    "fileName": f,
                    "url": f"/materials/{f}",
                    "text": body,
                    "wordCount": len(re.findall(r"\w+", body)),
                }
            )
    items.sort(key=lambda x: (x["level"], x["lektion"]))
    return items


# ---------- Lösungen ----------
LOES_RE = re.compile(
    r"Auf_jeden_Fall_(A[12])\.(\d)_Loesungen_KB_AB\.pdf",
    re.IGNORECASE,
)


def parse_loesungen() -> list[dict]:
    items: list[dict] = []
    for f in sorted(os.listdir(MAT_DIR)):
        m = LOES_RE.match(f)
        if not m:
            continue
        level = f"{m.group(1)}.{m.group(2)}"
        text = read_pdf(MAT_DIR / f)
        items.append(
            {
                "id": f"loes-{level.replace('.', '_')}",
                "level": level,
                "fileName": f,
                "url": f"/materials/{f}",
                "text": text,
                "wordCount": len(re.findall(r"\w+", text)),
            }
        )
    return items


def main() -> None:
    datasets = {
        "lesetexte.json": parse_lesetexte(),
        "wortschatz.json": parse_wortschatz(),
        "hoertexte.json": parse_hoertexte(),
        "video-transkripte.json": parse_videos(),
        "loesungen.json": parse_loesungen(),
    }
    for name, data in datasets.items():
        out_path = OUT_DIR / name
        out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"wrote {out_path.relative_to(ROOT)} — {len(data)} items")


if __name__ == "__main__":
    main()
