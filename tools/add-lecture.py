#!/usr/bin/env python3
"""Turn a lecture PDF into slide images and register it on the Lectures tab.

Needs: Python 3, Pillow, and poppler's `pdftoppm` (Linux: apt install poppler-utils,
macOS: brew install poppler, Windows: install poppler and add it to PATH).

Example:
  python3 tools/add-lecture.py anatomy-1.pdf --id anatomy-1 \
      --subject "Anatomy" --title "Introduction to anatomy" \
      --video "https://youtu.be/XXXXXXXXXXX" --sync "1:0,6:312:Bones,14:905:Joints"

--sync is optional: slide:seconds[:label], comma separated. When a viewer moves to a
slide, the YouTube video jumps to the last entry at or before that slide.
"""
import argparse, json, re, shutil, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "lectures" / "index.js"

def yt_id(v):
    if not v: return None
    m = re.search(r"(?:v=|youtu\.be/|embed/|shorts/)([\w-]{11})", v)
    return m.group(1) if m else (v if re.fullmatch(r"[\w-]{11}", v) else None)

def load():
    if not INDEX.exists(): return []
    t = INDEX.read_text(encoding="utf-8")
    return json.loads(t[t.index("=") + 1 : t.rindex(";")])

def save(items):
    body = json.dumps(items, ensure_ascii=False, indent=1)
    INDEX.write_text("window.LECTURES = " + body + ";\n", encoding="utf-8")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf"); ap.add_argument("--id", required=True)
    ap.add_argument("--subject", required=True); ap.add_argument("--title", required=True)
    ap.add_argument("--video"); ap.add_argument("--sync")
    ap.add_argument("--width", type=int, default=1280)
    a = ap.parse_args()
    if not re.fullmatch(r"[a-z0-9-]+", a.id): sys.exit("--id: use lowercase letters, numbers and dashes")
    if not shutil.which("pdftoppm"): sys.exit("pdftoppm not found (install poppler)")
    out = ROOT / "lectures" / a.id
    if out.exists(): shutil.rmtree(out)
    out.mkdir(parents=True)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["pdftoppm", "-png", "-scale-to-x", str(a.width), "-scale-to-y", "-1", a.pdf, f"{tmp}/p"], check=True)
        pages = sorted(Path(tmp).glob("p-*.png"))
        for n, p in enumerate(pages, 1):
            im = Image.open(p).convert("RGB")
            im.save(out / f"s-{n:03d}.webp", quality=82, method=6)
            t = im.copy(); t.thumbnail((320, 320)); t.save(out / f"t-{n:03d}.webp", quality=70, method=6)
            if n == 1: w, h = im.size
    entry = {"id": a.id, "subject": a.subject, "title": a.title, "slides": len(pages), "aspect": f"{w}/{h}"}
    v = yt_id(a.video)
    if a.video and not v: sys.exit("Could not read a YouTube id from --video")
    if v: entry["video"] = v
    if a.sync:
        entry["sync"] = []
        for part in a.sync.split(","):
            f = part.strip().split(":", 2)
            entry["sync"].append([int(f[0]), int(f[1])] + ([f[2]] if len(f) > 2 else []))
    items = [x for x in load() if x["id"] != a.id] + [entry]
    save(items)
    print(f"Added '{a.title}': {len(pages)} slides -> lectures/{a.id}/")

main()
