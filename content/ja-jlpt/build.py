import json
import sys

sys.path.insert(0, "gen")

mods = ["w05", "w06", "w07", "w08", "w09", "w10", "w11", "w12", "w13"]
for name in mods:
    try:
        mod = __import__(name)
    except ImportError as e:
        print(f"{name}: NOT WRITTEN YET ({e})")
        continue
    week = mod.WEEK
    num = week["units"][0]["title"].split("주차")[0]
    out = f"units/week-{int(num):02d}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(week, f, ensure_ascii=False, indent=2)
        f.write("\n")
    n = sum(len(l["challenges"]) for l in week["units"][0]["lessons"])
    ex = sum(1 for l in week["units"][0]["lessons"] for c in l["challenges"] if (c.get("meta") or {}).get("explanation"))
    print(f"{out}: {len(week['units'][0]['lessons'])} lessons, {n} items, {ex} explanations")
