import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";

import { audioFile } from "@/lib/content";

/*
 Course audio at /audio/<course>/<clip>. Clips live next to their course (content/audio/…, or an
 instance's CONTENT_DIR — see lib/content.ts), not in public/, so a private curriculum's audio
 never has to enter this repository.

 Clip names are content hashes (scripts/gen_course_audio.py), so a clip never changes under its
 name and is cached forever. index.json (text → clip map, read by the kana engine) does change and
 is revalidated. Range requests are answered because iOS Safari streams media with them.
*/
const TYPES: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", ogg: "audio/ogg", json: "application/json" };
const SEGMENT = /^[A-Za-z0-9_-]+$/;

const notFound = () => new Response("Not found", { status: 404 });
const stream = (file: string, opts?: { start: number; end: number }) =>
  Readable.toWeb(createReadStream(file, opts)) as unknown as ReadableStream;

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  if (parts.length !== 2) return notFound();
  const [course, name] = parts;
  const m = /^([A-Za-z0-9_-]+)\.([a-z0-9]+)$/.exec(name);
  if (!SEGMENT.test(course) || !m || !TYPES[m[2]]) return notFound();
  if (m[2] === "json" && name !== "index.json") return notFound();

  const file = audioFile(course, name);
  if (!file) return notFound();
  const size = statSync(file).size;
  const headers: Record<string, string> = {
    "Content-Type": TYPES[m[2]],
    "Accept-Ranges": "bytes",
    "Cache-Control": name === "index.json" ? "public, max-age=0, must-revalidate" : "public, max-age=31536000, immutable",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    // "a-b", "a-" (to the end) or "-n" (the last n bytes)
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    }
    return new Response(stream(file, { start, end }), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(stream(file), { headers: { ...headers, "Content-Length": String(size) } });
}

export const HEAD = GET;
