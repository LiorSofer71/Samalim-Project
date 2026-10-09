import { getStore } from "@netlify/blobs";

const KEYS = ["P", "A", "E", "I"];
const RANKS = [8, 4, 2, 1];

// בדיקת תקינות: 20 שאלות, בכל אחת דירוג 8/4/2/1 לארבעת הסגנונות
function validate(body) {
  const name = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  if (name.length < 2 || name.length > 100) return null;
  const answers = body.answers;
  if (!Array.isArray(answers) || answers.length !== 20) return null;
  const totals = { P: 0, A: 0, E: 0, I: 0 };
  const clean = [];
  for (let i = 0; i < 20; i++) {
    const r = answers[i]?.ranks;
    if (!r) return null;
    const vals = KEYS.map((k) => r[k]);
    if ([...vals].sort((a, b) => b - a).join() !== RANKS.join()) return null;
    KEYS.forEach((k) => (totals[k] += r[k]));
    clean.push({ num: i + 1, ranks: { P: r.P, A: r.A, E: r.E, I: r.I } });
  }
  // הסגנון הבולט והמשני מחושבים מחדש בשרת
  const sorted = [...KEYS].sort((a, b) => totals[b] - totals[a]);
  return {
    fullName: name,
    submittedAt: new Date().toISOString(),
    answers: clean,
    totals,
    dominant: sorted[0],
    secondary: sorted[1],
  };
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  let body;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
  const record = validate(body);
  if (!record) return new Response("Invalid data", { status: 400 });
  const store = getStore("results");
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await store.setJSON(key, record);
  return Response.json({ ok: true });
};

export const config = { path: "/api/submit" };
