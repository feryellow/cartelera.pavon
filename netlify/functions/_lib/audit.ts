import { controlStore } from "./store.ts";
import type { Actor } from "./auth.ts";

export async function appendAudit(input: {
  actor: Actor | { id: string; email: string; roles?: string[]; mode?: string };
  module: string;
  elementId?: string;
  action: string;
  before?: unknown;
  after?: unknown;
  note?: string;
}) {
  const store = controlStore();
  const at = new Date().toISOString();
  const id = crypto.randomUUID();
  await store.setJSON(`audit_${at}_${id}`, {
    id, at,
    actor: { id: input.actor.id, email: input.actor.email, roles: input.actor.roles || [], mode: input.actor.mode || "system" },
    module: input.module,
    elementId: input.elementId || null,
    action: input.action,
    before: input.before ?? null,
    after: input.after ?? null,
    note: input.note || "",
  });
}

export async function listAudit(limit = 100) {
  const store = controlStore();
  const result = await store.list({ prefix: "audit_" });
  const keys = result.blobs.map((b) => b.key).sort().reverse().slice(0, Math.max(1, Math.min(limit, 500)));
  const rows = [];
  for (const key of keys) {
    const row = await store.get(key, { type: "json" });
    if (row) rows.push(row);
  }
  return rows;
}
