import crypto from 'node:crypto';
import { run } from './db.ts';
import type { Ctx } from './http.ts';
import type { RelayResult } from './relay.ts';

export const MAIN_DOOR = 'principal';

/** Abre la puerta vía relé, deja evidencia en door_events y avisa a la UI. */
export async function openDoor(
  ctx: Ctx,
  opts: { complexId: string; source: string; userId: string | null; callId?: string | null }
): Promise<RelayResult> {
  const seconds = ctx.config.doorOpenSeconds;
  const result = await ctx.relay.open(MAIN_DOOR, seconds);
  run(
    ctx.db,
    `INSERT INTO door_events (id, complex_id, door_id, source, user_id, call_id, ok, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    opts.complexId,
    MAIN_DOOR,
    opts.source,
    opts.userId,
    opts.callId ?? null,
    result.ok ? 1 : 0,
    result.detail,
    Date.now()
  );
  if (result.ok) {
    const until = Date.now() + seconds * 1000;
    ctx.hub.emit(opts.complexId, { type: 'door', open: true, until }, { staff: true });
    const t = setTimeout(() => {
      ctx.hub.emit(opts.complexId, { type: 'door', open: false }, { staff: true });
    }, seconds * 1000);
    t.unref();
  }
  return result;
}
