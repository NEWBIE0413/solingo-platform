/*
 Builds content/ja-kana.json — a Duolingo-shaped kana course — from content/ja-kana.src.json (the Solingo
 engine's course data: items, order, words) and the pre-rendered audio index.

 Shape: units of 6–10 new kana → 5 lessons of ~10 exercises. Within a lesson every new kana is met 3+ times in
 different forms (see it/pick reading, hear it/pick it, read it, match, trace) and ~30% of items reach back to
 earlier units so nothing goes cold. Words appear the moment their kana are known and are built from tiles,
 spoken, and traced. Distractors prefer look-alikes (ぬ/め, わ/ね/れ, シ/ツ …) so the choice actually tests something.

 pnpm exec tsx scripts/build-kana-course.ts
*/
import { readFileSync, writeFileSync } from "node:fs";

type Src = { items: Record<string, { r: string; free?: boolean }>; order: string[]; words: { t: string; m: string }[]; tokenize: { joiners: string } };
const src: Src = JSON.parse(readFileSync("content/ja-kana.src.json", "utf8"));
const audioIdx: Record<string, string> = JSON.parse(readFileSync("public/audio/ja-kana/index.json", "utf8"));
const audio = (t: string) => (audioIdx[t] ? `/audio/ja-kana/${audioIdx[t]}` : null);
const rom = (k: string) => src.items[k]?.r ?? k;
const J = src.tokenize.joiners;
const tok = (w: string) => { const o: string[] = []; for (let i = 0; i < w.length; i++) { if (i + 1 < w.length && J.includes(w[i + 1])) { o.push(w[i] + w[i + 1]); i++; } else o.push(w[i]); } return o; };
const free = new Set(Object.keys(src.items).filter((k) => src.items[k].free));
const wordKana = (w: string) => tok(w).filter((k) => !free.has(k));

let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; // deterministic
const shuffle = <T,>(a: T[]) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = <T,>(a: T[], n: number) => shuffle(a).slice(0, n);

const LOOKALIKE: Record<string, string[]> = { ぬ: ["め", "ね"], め: ["ぬ", "の"], わ: ["ね", "れ"], ね: ["わ", "れ"], れ: ["ね", "わ"], さ: ["き", "ち"], き: ["さ"], ち: ["さ", "ら"], は: ["ほ", "ま"], ほ: ["は", "ま"], る: ["ろ"], ろ: ["る"], い: ["り"], り: ["い"], こ: ["に"], に: ["こ"], シ: ["ツ", "ン"], ツ: ["シ", "ソ"], ソ: ["ン", "ツ"], ン: ["ソ", "シ"], ア: ["マ"], マ: ["ア"], ク: ["ケ", "タ"], ケ: ["ク"], タ: ["ク", "ナ"], ナ: ["タ", "メ"], メ: ["ナ", "ノ"], ノ: ["メ"], コ: ["ユ", "ロ"], ユ: ["コ"], ロ: ["コ"], ウ: ["ワ", "フ"], ワ: ["ウ", "フ"], フ: ["ワ", "ウ"], チ: ["テ"], テ: ["チ"] };

// ---- unit plan: rows of the gojūon per unit
const H = { a: "あいうえお", k: "かきくけこ", s: "さしすせそ", t: "たちつてと", n: "なにぬねの", h: "はひふへほ", m: "まみむめも", y: "やゆよ", r: "らりるれろ", w: "わをん", g: "がぎぐげご", z: "ざじずぜぞ", d: "だぢづでど", b: "ばびぶべぼ", p: "ぱぴぷぺぽ" };
const YO_H = ["きゃ","きゅ","きょ","しゃ","しゅ","しょ","ちゃ","ちゅ","ちょ","にゃ","にゅ","にょ","ひゃ","ひゅ","ひょ","みゃ","みゅ","みょ","りゃ","りゅ","りょ","ぎゃ","ぎゅ","ぎょ","じゃ","じゅ","じょ","びゃ","びゅ","びょ","ぴゃ","ぴゅ","ぴょ"];
const K = (s: string) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
const PLAN: { title: string; desc: string; kana: string[] }[] = [
  { title: "히라가나 1", desc: "あ행 · か행", kana: [...H.a, ...H.k] },
  { title: "히라가나 2", desc: "さ행 · た행", kana: [...H.s, ...H.t] },
  { title: "히라가나 3", desc: "な행 · は행", kana: [...H.n, ...H.h] },
  { title: "히라가나 4", desc: "ま행 · や행 · ら행", kana: [...H.m, ...H.y, ...H.r] },
  { title: "히라가나 5", desc: "わ · を · ん + 46자 총정리", kana: [...H.w] },
  { title: "탁음 1", desc: "が · ざ · だ행", kana: [...H.g, ...H.z, ...H.d] },
  { title: "탁음 2", desc: "ば · ぱ행", kana: [...H.b, ...H.p] },
  { title: "요음 1", desc: "きゃ · しゃ · ちゃ · にゃ · ひゃ", kana: YO_H.slice(0, 15) },
  { title: "요음 2", desc: "みゃ · りゃ · ぎゃ · じゃ · びゃ · ぴゃ", kana: YO_H.slice(15) },
  { title: "가타카나 1", desc: "ア행 · カ행", kana: [...K(H.a), ...K(H.k)] },
  { title: "가타카나 2", desc: "サ행 · タ행", kana: [...K(H.s), ...K(H.t)] },
  { title: "가타카나 3", desc: "ナ행 · ハ행", kana: [...K(H.n), ...K(H.h)] },
  { title: "가타카나 4", desc: "マ행 · ヤ행 · ラ행", kana: [...K(H.m), ...K(H.y), ...K(H.r)] },
  { title: "가타카나 5", desc: "ワ · ヲ · ン + 탁음", kana: [...K(H.w), ...K(H.g), ...K(H.z), ...K(H.d), ...K(H.b), ...K(H.p)] },
  { title: "가타카나 6", desc: "요음 + 외래어", kana: YO_H.map(K) },
];

type Opt = { text: string; correct: boolean; audioSrc?: string | null; meta?: Record<string, unknown> };
type Ch = { type: string; question: string; tag?: string; audioSrc?: string | null; meta?: Record<string, unknown>; options: Opt[] };

const distract = (k: string, pool: string[], n: number) => {
  const look = (LOOKALIKE[k] ?? []).filter((x) => pool.includes(x) && x !== k);
  const rest = pool.filter((x) => x !== k && !look.includes(x) && rom(x) !== rom(k));
  return [...pick(look, Math.min(look.length, 2)), ...pick(rest, n)].slice(0, n);
};
const exSelect = (k: string, pool: string[]): Ch => ({ type: "SELECT", question: `「${rom(k)}」 소리는 어떤 글자?`, tag: "kana", options: shuffle([k, ...distract(k, pool, 3)]).map((x) => ({ text: x, correct: x === k, audioSrc: audio(x) })) });
const exAssist = (k: string, pool: string[]): Ch => ({ type: "ASSIST", question: k, tag: "kana", options: shuffle([k, ...distract(k, pool, 3)]).map((x) => ({ text: rom(x), correct: x === k, audioSrc: x === k ? audio(k) : null })) });
const exListen = (k: string, pool: string[]): Ch => ({ type: "LISTEN", question: "들리는 글자를 고르세요", tag: "kana", audioSrc: audio(k), options: shuffle([k, ...distract(k, pool, 3)]).map((x) => ({ text: x, correct: x === k, audioSrc: null })) });
const exMatch = (ks: string[]): Ch => ({ type: "MATCH", question: "짝을 맞추세요", tag: "kana", options: [...ks.map((k) => ({ text: k, correct: false, audioSrc: audio(k), meta: { pair: k, side: "left" } })), ...ks.map((k) => ({ text: rom(k), correct: false, meta: { pair: k, side: "right" } }))] });
const exTrace = (k: string): Ch => ({ type: "TRACE", question: "따라 써보세요", tag: "kana", audioSrc: audio(k), meta: { target: k, reading: rom(k) }, options: [] });
const exBuild = (w: { t: string; m: string }, pool: string[]): Ch => { const parts = tok(w.t); const extra = pick(pool.filter((k) => !parts.includes(k)), 3); return { type: "BUILD", question: `단어를 만드세요: ${w.m}`, tag: "word", audioSrc: audio(w.t), meta: { target: w.t, reading: parts.map(rom).join(" "), meaning: w.m }, options: shuffle([...parts.map((p, i) => ({ text: p, correct: true, meta: { order: i + 1 } })), ...extra.map((k) => ({ text: k, correct: false }))]) }; };
const exSpeak = (w: { t: string; m: string }): Ch => ({ type: "SPEAK", question: "따라 읽어보세요", tag: "word", audioSrc: audio(w.t), meta: { target: w.t, reading: tok(w.t).map(rom).join(" "), meaning: w.m }, options: [] });
const exWordMean = (w: { t: string; m: string }, words: { t: string; m: string }[]): Ch => ({ type: "ASSIST", question: w.t, tag: "word", audioSrc: audio(w.t), options: shuffle([w, ...pick(words.filter((x) => x !== w), 3)]).map((x) => ({ text: x.m, correct: x === w, audioSrc: x === w ? audio(w.t) : null })) });

const units: { title: string; description: string; lessons: { title: string; challenges: Ch[] }[] }[] = [];
let known: string[] = [];
for (const u of PLAN) {
  const fresh = u.kana;
  const older = known.filter((k) => !fresh.includes(k));
  const pool = [...fresh, ...older];
  const knownAfter = [...known, ...fresh];
  const words = src.words.filter((w) => wordKana(w.t).every((k) => knownAfter.includes(k)));
  const freshWords = words.filter((w) => wordKana(w.t).some((k) => fresh.includes(k)));
  // lessons 1..3 introduce thirds of the unit; 4 mixes the whole unit; 5 mixes unit + older
  const thirds = [0, 1, 2].map((i) => fresh.slice(Math.floor((i * fresh.length) / 3), Math.floor(((i + 1) * fresh.length) / 3)));
  const lessons: { title: string; challenges: Ch[] }[] = [];
  const usedWords = new Set<string>();
  const wordFor = (prefer: string[]) => { const cands = freshWords.filter((w) => !usedWords.has(w.t) && wordKana(w.t).some((k) => prefer.includes(k))); const c = cands.length ? cands : words.filter((w) => !usedWords.has(w.t)); const w = c.length ? pick(c, 1)[0] : (words.length ? pick(words, 1)[0] : null); if (w) usedWords.add(w.t); return w; };
  for (let li = 0; li < 5; li++) {
    const news = li < 3 ? thirds[li] : fresh;
    const seenSoFar = li < 3 ? fresh.slice(0, fresh.indexOf(news[news.length - 1]) + 1) : fresh;
    const back = li === 4 ? older : older.slice(-10);
    const ch: Ch[] = [];
    // distractor pool: what's been met so far + a little from earlier units; topped up from the unit so early lessons still get 4 choices
    const localPool = [...new Set([...seenSoFar, ...back, ...(seenSoFar.length + back.length < 6 ? fresh : [])])];
    if (li < 3) {
      // meet each new kana: see→pick, hear→pick, read; then trace one, match, and a word
      for (const k of news) ch.push(exSelect(k, localPool));
      for (const k of shuffle(news)) ch.push(exListen(k, localPool));
      for (const k of shuffle(news)) ch.push(exAssist(k, localPool));
      ch.push(exTrace(pick(news, 1)[0]));
      { const mk = pick([...news, ...pick(localPool.filter((k) => !news.includes(k)), 4)], 5); if (mk.length >= 3) ch.push(exMatch(mk)); }
      const w = wordFor(news); if (w) { ch.push(exBuild(w, localPool)); ch.push(exWordMean(w, words)); }
      if (back.length) ch.push(exSelect(pick(back, 1)[0], localPool));
    } else {
      // review lessons: everything mixed, heavier on words and listening
      const focus = pick(fresh, Math.min(6, fresh.length));
      for (const k of focus) ch.push(rnd() < 0.5 ? exListen(k, localPool) : exAssist(k, localPool));
      { const mk = pick([...fresh, ...pick(back, 3)], 5); if (mk.length >= 3) ch.push(exMatch(mk)); }
      for (let i = 0; i < 2; i++) { const w = wordFor(fresh); if (w) { ch.push(exBuild(w, localPool)); ch.push(rnd() < 0.5 ? exSpeak(w) : exWordMean(w, words)); } }
      for (const k of pick(back, Math.min(3, back.length))) ch.push(rnd() < 0.5 ? exSelect(k, localPool) : exListen(k, localPool));
      if (li === 4) ch.push(exMatch(pick([...fresh, ...back], Math.min(5, localPool.length))));
    }
    lessons.push({ title: li < 3 ? `${news[0]} …` : li === 3 ? "복습" : "총복습", challenges: shuffle(ch).slice(0, 12) });
  }
  units.push({ title: u.title, description: u.desc, lessons });
  known = knownAfter;
}
const course = { id: "ja-kana", title: "일본어 가나", imageSrc: "/jp.svg", units };
writeFileSync("content/ja-kana.json", JSON.stringify(course, null, 1));
const n = units.reduce((a, u) => a + u.lessons.reduce((b, l) => b + l.challenges.length, 0), 0);
const byType: Record<string, number> = {}; units.forEach((u) => u.lessons.forEach((l) => l.challenges.forEach((c) => (byType[c.type] = (byType[c.type] ?? 0) + 1))));
console.log(`${units.length} units, ${units.length * 5} lessons, ${n} challenges`, byType);
