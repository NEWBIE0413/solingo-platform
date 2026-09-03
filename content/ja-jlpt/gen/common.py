# Builds ja-jlpt week files from compact content definitions, with rule validation.
# Rules follow BRIEF.md + the runner (app/lesson): BUILD answer == concat of ordered
# correct tiles (join("")), no 3+ same type in a row, 4 options / 1 correct for
# SELECT/ASSIST/LISTEN, MATCH = 4 pairs balanced left/right.
# Choice options are rotated at build time so the correct position cycles 1..4
# (the runner shuffles again at render; this keeps the stored JSON honest too).
import json
import sys

COURSE = {"id": "ja-jlpt", "title": "일본어 JLPT"}
DEFAULT_LEVEL = 5

_rotate = 0


def _rot(options):
    global _rotate
    n = len(options)
    ci = next(i for i, o in enumerate(options) if o["correct"])
    t = _rotate % n
    _rotate += 1
    k = (ci - t) % n
    return [options[(i + k) % n] for i in range(n)]


def _ex(meta, explanation):
    if explanation is None:
        return meta
    m = dict(meta or {})
    m["explanation"] = explanation
    return m


def S(question, options, level=None, tag="grammar", explanation=None):
    opts = [{"text": t, "correct": c} for t, c in options]
    return ("SELECT", question, level, tag, None, _ex(None, explanation), _rot(opts))


def A(question, options, level=None, tag="vocab", explanation=None):
    opts = [{"text": t, "correct": c} for t, c in options]
    return ("ASSIST", question, level, tag, None, _ex(None, explanation), _rot(opts))


def L(say, options, level=None, tag="listening", q="들리는 문장의 뜻은?", explanation=None):
    opts = [{"text": t, "correct": c} for t, c in options]
    return ("LISTEN", q, level, tag, "", _ex({"say": say}, explanation), _rot(opts))


def M(pairs, level=None, tag="vocab"):
    pairs = pairs[_rotate % len(pairs):] + pairs[:_rotate % len(pairs)]
    opts = []
    for left, right in pairs:
        opts.append({"text": left, "correct": False, "meta": {"pair": left, "side": "left"}})
    for left, right in pairs:
        opts.append({"text": right, "correct": False, "meta": {"pair": left, "side": "right"}})
    return ("MATCH", "짝을 맞추세요", level, tag, None, None, opts)


def M2(pairs, level=None, tag="vocab"):
    """MATCH where the right side is a distinct label (form/meaning) not equal to pair key."""
    pairs = pairs[_rotate % len(pairs):] + pairs[:_rotate % len(pairs)]
    opts = []
    for key, left, right in pairs:
        opts.append({"text": left, "correct": False, "meta": {"pair": key, "side": "left"}})
    for key, left, right in pairs:
        opts.append({"text": right, "correct": False, "meta": {"pair": key, "side": "right"}})
    return ("MATCH", "짝을 맞추세요", level, tag, None, None, opts)


def B(prompt, correct, distractors, reading, level=None, tag="grammar"):
    target = "".join(correct)
    opts = [{"text": t, "correct": True, "meta": {"order": i + 1}} for i, t in enumerate(correct)]
    opts += [{"text": t, "correct": False} for t in distractors]
    opts = opts[_rotate % len(opts):] + opts[:_rotate % len(opts)]
    return ("BUILD", prompt, level, tag, "", {
        "target": target, "reading": reading, "meaning": prompt.split(": ", 1)[1], "say": target,
    }, opts)


def K(target, reading, meaning, level=None, tag="vocab"):
    return ("SPEAK", "따라 읽어보세요", level, tag, "", {
        "target": target, "reading": reading, "meaning": meaning, "say": target,
    }, [])


def T(target, reading, level=None, tag="kanji"):
    return ("TRACE", "한자를 손으로 따라 쓰세요", level, tag, "", {"target": target, "reading": reading}, [])


def lesson(title, items):
    return {"title": title, "challenges": [emit(i) for i in items]}


def emit(item):
    kind, question, level, tag, audio, meta, options = item
    out = {"type": kind, "question": question, "level": level, "tag": tag}
    if audio is not None:
        out["audioSrc"] = audio
    if meta is not None:
        out["meta"] = meta
    out["options"] = options
    return out


def week(number, topic, description, lessons, level=DEFAULT_LEVEL):
    for l in lessons:
        for c in l["challenges"]:
            if c["level"] is None:
                c["level"] = level
    validate(lessons)
    return {"id": COURSE["id"], "title": COURSE["title"], "units": [
        {"title": f"{number}주차 · {topic}", "description": description, "lessons": lessons}
    ]}


def validate(lessons):
    n_lessons = len(lessons)
    assert 5 <= n_lessons <= 7, f"unit has {n_lessons} lessons"
    for les in lessons:
        chs = les["challenges"]
        assert 8 <= len(chs) <= 12, f"{les['title']}: {len(chs)} items"
        for i, c in enumerate(chs):
            if i >= 2 and chs[i - 1]["type"] == c["type"] and chs[i - 2]["type"] == c["type"]:
                raise AssertionError(f"{les['title']}: 3 same type in a row at {i} ({c['type']})")
            t = c["type"]
            opts = c["options"]
            if t in ("SELECT", "ASSIST", "LISTEN"):
                assert len(opts) == 4, f"{les['title']}/{c['question'][:20]}: {len(opts)} options"
                assert sum(1 for o in opts if o["correct"]) == 1, f"not exactly 1 correct: {c['question'][:20]}"
                assert all("meta" not in o or "explanation" not in o for o in opts), "no meta on choice options"
                assert len(set(o["text"] for o in opts)) == 4, f"duplicate option texts: {c['question'][:20]}"
            elif t == "MATCH":
                assert len(opts) == 8, f"MATCH needs 8 options, got {len(opts)}"
                lefts = [o["meta"]["pair"] for o in opts if o["meta"]["side"] == "left"]
                rights = [o["meta"]["pair"] for o in opts if o["meta"]["side"] == "right"]
                assert sorted(lefts) == sorted(rights) and len(set(lefts)) == 4, "unbalanced pairs"
                assert len(set(o["text"] for o in opts)) == 8, "duplicate MATCH texts"
                assert all(o["correct"] is False for o in opts)
            elif t == "BUILD":
                correct = [o for o in opts if o["correct"]]
                orders = sorted(o["meta"]["order"] for o in correct)
                assert orders == list(range(1, len(correct) + 1)), "BUILD order gap"
                target = "".join(o["text"] for o in sorted(correct, key=lambda o: o["meta"]["order"]))
                assert target == c["meta"]["target"], f"BUILD target mismatch: {target} != {c['meta']['target']}"
                assert c["meta"]["say"] == target
            elif t in ("SPEAK", "TRACE"):
                assert opts == []
                assert " " not in c["meta"]["target"] or t == "SPEAK"
            assert c["level"] in (4, 5), f"bad level {c['level']}"
            assert c["tag"], "missing tag"


def write_week(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
