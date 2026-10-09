import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

const sha = (s) => createHash("sha256").update(s).digest();

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return "missing";
  const given = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  return timingSafeEqual(sha(given), sha(expected));
}

export default async (req) => {
  const auth = authorized(req);
  if (auth === "missing") return new Response("ADMIN_PASSWORD is not set", { status: 500 });
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const store = getStore("results");

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const rows = await Promise.all(
      blobs.map(async (b) => {
        const v = await store.get(b.key, { type: "json" });
        return v ? { key: b.key, ...v } : null;
      })
    );
    return Response.json(rows.filter(Boolean));
  }

  if (req.method === "DELETE") {
    const key = new URL(req.url).searchParams.get("key");
    if (!key) return new Response("Missing key", { status: 400 });
    await store.delete(key);
    return Response.json({ ok: true });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = { path: "/api/results" };
