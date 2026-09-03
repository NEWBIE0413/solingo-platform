# Solingo platform — plan

Fork of [sanidhyy/duolingo-clone](https://github.com/sanidhyy/duolingo-clone) (MIT). The clone gives us
the Duolingo *system*: course → unit → lesson path, hearts, XP, streak-less leaderboard, quests, shop,
admin, Clerk login, Stripe. [solingo](https://github.com/NEWBIE0413/solingo) (static) gives us the
*script-level engine*: kana/hangul-style symbol teaching with 4-round repetition, handwriting, speech,
matching, tile building, pre-rendered neural audio, and JSON courses an LLM can author.

The platform is the union: Duolingo's structure and motivation loop, with our exercise types and
content pipeline underneath.

## Milestone 1 — the path works with our content  (now)
- [x] Fork, rename, node-postgres driver (any Postgres, not only Neon), Docker Postgres for dev
- [x] `scripts/seed-kana.ts`: JSON course → units/lessons/challenges. 5 units, 63 lessons, 674 challenges
- [x] Clerk replaced by Better Auth (self-hosted, email+password); sign-up → courses → learn → lesson verified
- [ ] Deploy on NucBox behind cloudflared (`app.jp.myworld.monster` or similar)

## Milestone 1.5 — the Solingo engine as a tab  (done 2026-09-03)
- `/kana` sidebar tab (히라가나) hosts `public/kana/` (the static engine) in an iframe.
- Engine storage is server-authoritative: `GET/PUT /api/kana/state` → `kana_state(userId, courseId, state, session)`.
  localStorage is only an offline mirror; the account wins on load. Sessions resume on any device.
- Engine XP is credited to `user_progress.points`, so the tab feeds the same leaderboard/quests.

## Milestone 2 — our exercise types inside the clone's lesson runner
The clone's `challenges.type` is `SELECT | ASSIST`. Extend the enum and `app/lesson/quiz.tsx`:
- `LISTEN`   — audio only → pick symbol   (from solingo `listen`)
- `MATCH`    — pair symbols with readings  (from solingo `match`)
- `BUILD`    — order tiles into a word     (from solingo `build`; also the sentence word-bank later)
- `TRACE`    — handwriting canvas          (from solingo `trace`)
- `SPEAK`    — Web Speech grading          (from solingo `speak`)
Each new type is a component under `app/lesson/` reusing `card.tsx` visuals. Options table already
carries `text/audioSrc`; `BUILD` needs an `order` on options and `MATCH` needs a `pair` key → add
nullable columns rather than new tables.

## Milestone 3 — sentences
- `SENTENCE_SELECT` (translate: pick the sentence), `SENTENCE_BUILD` (word bank), `FILL` (cloze).
- Content: extend the course JSON with `sentences: [{ja, ko, tokens[]}]`; `seed` emits the
  three types from each sentence. Unit "문장 1" follows the word unit.
- Sentence audio: same edge-tts pipeline (`solingo/scripts/gen_audio.py`).

## Milestone 4 — our engine's pedagogy on top of the path
The clone marks a challenge complete forever. Ours re-asks weak items. Add `item_mastery`
(userId, itemKey, lvl, lastDay) and a "Practice" lesson generator that builds a session from weak
items across completed lessons — the solingo `buildSession()` logic, server-side. Daily cap of two
levels per item stays.

## Milestone 5 — courses as JSON, forever
- `content/*.json` is the source of truth; seeding is idempotent per course title.
- Hangul course for the TOPIK learner: `content/ko-hangul.json` + audio via edge-tts `ko-KR-SunHiNeural`.
- Admin (react-admin) stays for hand edits; JSON → DB is the bulk path.

## Decisions
- Auth is self-hosted (Better Auth). `lib/session.ts` keeps the Clerk-shaped `auth()` / `currentUser()` API so
  the rest of the app was untouched; social providers are a config line in `lib/auth.ts` when wanted.
- Stripe stays optional: the shop's "unlimited hearts" is the only user of it.
- Korean UI strings are hard-coded like the clone's English ones; i18n is a later pass.
