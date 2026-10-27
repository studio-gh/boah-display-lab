export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  EDIT_PIN: string;
  SESSION_SECRET: string;
  ALLOWED_ORIGIN?: string;
}

const cors = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Edit-Session",
  "Vary": "Origin",
});

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

function b64url(bytes: Uint8Array) {
  let s = "";
  bytes.forEach(b => s += String.fromCharCode(b));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(str: string) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - str.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}
async function makeSession(secret: string) {
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ exp: Date.now() + 1000 * 60 * 60 * 24 * 14, role: "editor" })));
  return payload + "." + await sign(payload, secret);
}
async function validSession(token: string | null, secret: string) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  if (await sign(parts[0], secret) !== parts[1]) return false;
  try { return JSON.parse(new TextDecoder().decode(fromB64url(parts[0]))).exp > Date.now(); } catch { return false; }
}

const now = () => new Date().toISOString();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try { await env.DB.prepare("ALTER TABLE checklist_items ADD COLUMN status TEXT NOT NULL DEFAULT 'Não iniciado'").run(); } catch { /* status column already exists */ }
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";
    const allowedOrigin = env.ALLOWED_ORIGIN || origin;
    const headers = cors(allowedOrigin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    try {
      if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
      if (url.pathname === "/api/session" && request.method === "POST") {
        const body = await request.json() as { pin?: string };
        if (!env.EDIT_PIN || !env.SESSION_SECRET || body.pin !== env.EDIT_PIN) return json({ error: "PIN incorreto" }, 401, headers);
        return json({ session: await makeSession(env.SESSION_SECRET) }, 200, headers);
      }

      // This is a private-by-link team workspace. Writes are open to anyone with the URL.
      // Do not use for sensitive information; anyone who discovers the link can edit.
      
      if (url.pathname === "/api/health" && request.method === "GET") return json({ ok: true, service: "boah-display-lab" }, 200, headers);
      if (url.pathname === "/api/summary" && request.method === "GET") {
        const [displays, decisions, checklist, comments, notes, activity] = await Promise.all([
          env.DB.prepare("SELECT * FROM displays ORDER BY id").all(),
          env.DB.prepare("SELECT * FROM decisions ORDER BY id DESC").all(),
          env.DB.prepare("SELECT * FROM checklist_items ORDER BY id").all(),
          env.DB.prepare("SELECT * FROM comments ORDER BY id DESC LIMIT 100").all(),
          env.DB.prepare("SELECT * FROM notes ORDER BY id DESC LIMIT 100").all(),
          env.DB.prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT 60").all(),
        ]);
        return json({ displays: displays.results, decisions: decisions.results, checklist: checklist.results, comments: comments.results, notes: notes.results, activity: activity.results, serverTime: now() }, 200, headers);
      }
      if (url.pathname === "/api/decisions" && request.method === "POST") {
        const b = await request.json() as Record<string, unknown>;
        if (typeof b.title !== "string" || !b.title.trim()) return json({ error: "Título obrigatório" }, 400, headers);
        const res = await env.DB.prepare("INSERT INTO decisions(display_id,title,detail,status,owner) VALUES(?,?,?,?,?)")
          .bind(typeof b.display_id === "string" ? b.display_id : null, b.title.trim().slice(0,180), String(b.detail || "").slice(0,3000), String(b.status || "Em aberto").slice(0,60), String(b.owner || "Equipe").slice(0,80)).run();
        await env.DB.prepare("INSERT INTO activity_log(display_id,actor,action,detail) VALUES(?,?,?,?)").bind(b.display_id || null, String(b.owner || "Equipe"), "Nova decisão", b.title.trim().slice(0,180)).run();
        return json({ ok: true, id: res.meta.last_row_id }, 201, headers);
      }
      if (url.pathname === "/api/comments" && request.method === "POST") {
        const b = await request.json() as Record<string, unknown>;
        if (typeof b.body !== "string" || !b.body.trim()) return json({ error: "Comentário vazio" }, 400, headers);
        const res = await env.DB.prepare("INSERT INTO comments(display_id,author,body) VALUES(?,?,?)").bind(typeof b.display_id === "string" ? b.display_id : null, String(b.author || "Equipe").slice(0,80), b.body.trim().slice(0,3000)).run();
        await env.DB.prepare("INSERT INTO activity_log(display_id,actor,action,detail) VALUES(?,?,?,?)").bind(b.display_id || null, String(b.author || "Equipe"), "Comentário", b.body.trim().slice(0,180)).run();
        return json({ ok: true, id: res.meta.last_row_id }, 201, headers);
      }
      if (url.pathname === "/api/notes" && request.method === "POST") {
        const b = await request.json() as Record<string, unknown>;
        if (typeof b.body !== "string" || !b.body.trim()) return json({ error: "Nota vazia" }, 400, headers);
        const res = await env.DB.prepare("INSERT INTO notes(body,author) VALUES(?,?)").bind(b.body.trim().slice(0,5000), String(b.author || "Equipe").slice(0,80)).run();
        return json({ ok: true, id: res.meta.last_row_id }, 201, headers);
      }
      if (url.pathname === "/api/checklist" && request.method === "PATCH") {
        const b = await request.json() as { id?: number; done?: boolean; status?: string };
        if (!Number.isInteger(b.id)) return json({ error: "Item inválido" }, 400, headers);
        const allowed = ["Não iniciado","Em andamento","Aguardando","Concluído"];
        if (typeof b.status === "string") {
          if (!allowed.includes(b.status)) return json({ error: "Status inválido" }, 400, headers);
          await env.DB.prepare("UPDATE checklist_items SET status=?, done=?, updated_at=datetime('now') WHERE id=?").bind(b.status, b.status === "Concluído" ? 1 : 0, b.id).run();
          await env.DB.prepare("INSERT INTO activity_log(actor,action,detail) VALUES(?,?,?)").bind("Equipe", "Status da tarefa atualizado", "Checklist #" + b.id + ": " + b.status).run();
          return json({ ok: true }, 200, headers);
        }
        const nextStatus = b.done ? "Concluído" : "Em andamento";
        await env.DB.prepare("UPDATE checklist_items SET done=?, status=?, updated_at=datetime('now') WHERE id=?").bind(b.done ? 1 : 0, nextStatus, b.id).run();
        await env.DB.prepare("INSERT INTO activity_log(actor,action,detail) VALUES(?,?,?)").bind("Equipe", b.done ? "Tarefa concluída" : "Tarefa reaberta", "Checklist #" + b.id).run();
        return json({ ok: true }, 200, headers);
      }
      if (url.pathname === "/api/displays" && request.method === "PATCH") {
        const b = await request.json() as Record<string, unknown>;
        if (typeof b.id !== "string" || !["colares","brincos","aneis"].includes(b.id)) return json({ error: "Display inválido" }, 400, headers);
        const fields = ["status","brief","requirements","open_questions"] as const;
        const sets: string[] = []; const vals: unknown[] = [];
        for (const key of fields) if (typeof b[key] === "string") { sets.push(key + "=?"); vals.push((b[key] as string).slice(0,5000)); }
        sets.push("updated_at=datetime('now')");
        await env.DB.prepare("UPDATE displays SET " + sets.join(",") + " WHERE id=?").bind(...vals, b.id).run();
        await env.DB.prepare("INSERT INTO activity_log(display_id,actor,action,detail) VALUES(?,?,?,?)").bind(b.id, String(b.actor || "Equipe").slice(0,80), "Display atualizado", b.id).run();
        return json({ ok: true }, 200, headers);
      }
      return json({ error: "Rota não encontrada" }, 404, headers);
    } catch (err) {
      return json({ error: "Erro interno na API", detail: err instanceof Error ? err.message : "unknown" }, 500, headers);
    }
  },
};
