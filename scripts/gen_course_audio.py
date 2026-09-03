#!/usr/bin/env python3
"""
Render audio clips for a content course with edge-tts and write the audioSrc fields back.

  python3 scripts/gen_course_audio.py ko-topik ko-KR-SunHiNeural
  python3 scripts/gen_course_audio.py ja-jlpt ja-JP-NanamiNeural

Scans content/<id>.json and content/<id>/units/*.json:
  LISTEN            → meta.say (or question)      → challenge.audioSrc
  BUILD/SPEAK/TRACE → meta.target                 → challenge.audioSrc
  any option with meta.say                        → option.audioSrc
Clips land in public/audio/<id>/<md5>.mp3 (+ index.json). Idempotent: existing clips are reused.
Needs: pip install edge-tts   (a venv is fine)
"""
import asyncio, glob, hashlib, json, os, sys
try:
    import edge_tts
except ImportError:
    sys.exit("pip install edge-tts first")

cid = sys.argv[1]; voice = sys.argv[2] if len(sys.argv) > 2 else "ko-KR-SunHiNeural"
out = f"public/audio/{cid}"; os.makedirs(out, exist_ok=True)
files = [f"content/{cid}.json"] + sorted(glob.glob(f"content/{cid}/units/*.json"))
files = [f for f in files if os.path.exists(f)]
fn = lambda t: hashlib.md5(t.encode()).hexdigest()[:12] + ".mp3"
jobs = {}  # text → path

def walk(doc):
    units = doc.get("units", doc if isinstance(doc, list) else [doc])
    for u in units:
        for l in u.get("lessons", []):
            for ch in l.get("challenges", []):
                m = ch.get("meta") or {}
                say = None
                if ch["type"] == "LISTEN": say = m.get("say") or ch.get("question")
                elif ch["type"] in ("BUILD", "SPEAK", "TRACE"): say = m.get("target")
                if say:
                    jobs[say] = fn(say); ch["audioSrc"] = f"/audio/{cid}/{fn(say)}"
                for o in ch.get("options", []):
                    om = o.get("meta") or {}
                    if om.get("say"):
                        jobs[om["say"]] = fn(om["say"]); o["audioSrc"] = f"/audio/{cid}/{fn(om['say'])}"

docs = {}
for f in files:
    docs[f] = json.load(open(f, encoding="utf-8")); walk(docs[f])

async def one(text, sem):
    p = os.path.join(out, jobs[text])
    if os.path.exists(p) and os.path.getsize(p) > 0: return
    async with sem:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(text, voice, rate="-8%").save(p); return
            except Exception:
                await asyncio.sleep(1.5 * (attempt + 1))
        print("FAIL", text, file=sys.stderr)

async def main():
    sem = asyncio.Semaphore(6)
    await asyncio.gather(*[one(t, sem) for t in jobs])
    idx_path = os.path.join(out, "index.json")
    idx = json.load(open(idx_path, encoding="utf-8")) if os.path.exists(idx_path) else {}
    idx.update({t: p for t, p in jobs.items() if os.path.exists(os.path.join(out, p))})
    json.dump(idx, open(idx_path, "w", encoding="utf-8"), ensure_ascii=False)
    for f, d in docs.items():
        json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(jobs)} clips → {out}; audioSrc written into {len(docs)} file(s)")

asyncio.run(main())
