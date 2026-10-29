import crypto from 'node:crypto';
import { Router } from 'express';
import { all, get, run } from '../db.ts';
import { openDoor } from '../door.ts';
import {
  HttpError,
  body,
  isStaff,
  oneOf,
  requireRole,
  requireUser,
  safeImagePath,
  str,
  wrap,
  type Ctx,
} from '../http.ts';

interface CallRow {
  id: string;
  complex_id: string;
  unit_id: string;
  tower: string;
  unit_number: string;
  resident_name: string;
  visitor_type: string;
  visitor_name: string;
  company: string | null;
  snapshot: string | null;
  status: 'ringing' | 'authorized' | 'rejected' | 'missed';
  created_at: number;
  ended_at: number | null;
  authorized_by: string | null;
  notes: string | null;
  created_by: string | null;
}

const SELECT_CALL = `
  SELECT c.*, u.tower, u.unit_number, u.resident_name
  FROM calls c JOIN units u ON u.id = c.unit_id`;

export function callView(c: CallRow) {
  const end = c.ended_at ?? Date.now();
  return {
    id: c.id,
    unitId: c.unit_id,
    tower: c.tower,
    unitNumber: c.unit_number,
    residentName: c.resident_name,
    visitorType: c.visitor_type,
    visitorName: c.visitor_name,
    company: c.company ?? '',
    cameraSnapshot: c.snapshot ?? '',
    status: c.status,
    createdAt: c.created_at,
    durationSeconds: Math.max(0, Math.round((end - c.created_at) / 1000)),
    authorizedBy: c.authorized_by ?? undefined,
    notes: c.notes ?? '',
    createdBy: c.created_by,
  };
}

const VISITOR_TYPES = ['domiciliario', 'invitado', 'servicio', 'paqueteria', 'otro'] as const;

export function callsRouter(ctx: Ctx): Router {
  const r = Router();

  const findCall = (id: string, complexId: string) =>
    get<CallRow>(ctx.db, `${SELECT_CALL} WHERE c.id = ? AND c.complex_id = ?`, id, complexId);

  const notify = (call: CallRow) => {
    ctx.hub.emit(call.complex_id, { type: 'changed', resource: 'calls', id: call.id }, { staff: true, unitId: call.unit_id });
  };

  /** Si nadie contesta en callTimeoutSeconds, la llamada queda como perdida. */
  const armTimeout = (callId: string, complexId: string) => {
    const t = setTimeout(() => {
      ctx.callTimers.delete(callId);
      const changed = run(
        ctx.db,
        `UPDATE calls SET status='missed', ended_at=?, authorized_by='Sin respuesta del residente'
         WHERE id=? AND status='ringing'`,
        Date.now(),
        callId
      );
      if (changed) {
        const call = findCall(callId, complexId);
        if (call) notify(call);
      }
    }, ctx.config.callTimeoutSeconds * 1000);
    t.unref();
    ctx.callTimers.set(callId, t);
  };

  const clearTimer = (callId: string) => {
    const t = ctx.callTimers.get(callId);
    if (t) clearTimeout(t);
    ctx.callTimers.delete(callId);
  };

  r.get(
    '/calls',
    wrap((req, res) => {
      const user = requireUser(req);
      const rows = isStaff(user.role)
        ? all<CallRow>(ctx.db, `${SELECT_CALL} WHERE c.complex_id = ? ORDER BY c.created_at DESC LIMIT 500`, user.complexId)
        : all<CallRow>(
            ctx.db,
            `${SELECT_CALL} WHERE c.complex_id = ? AND c.unit_id = ? ORDER BY c.created_at DESC LIMIT 200`,
            user.complexId,
            user.unitId ?? ''
          );
      res.json(rows.map(callView));
    })
  );

  // Vigilante inicia la llamada al residente.
  r.post(
    '/calls',
    requireRole('guard', 'admin'),
    wrap((req, res) => {
      const user = requireUser(req);
      const b = body(req);
      const unitId = str(b.unitId, 'unitId', { max: 60 });
      const unit = get<{ id: string }>(
        ctx.db,
        'SELECT id FROM units WHERE id = ? AND complex_id = ?',
        unitId,
        user.complexId
      );
      if (!unit) throw new HttpError(404, 'Unidad no encontrada');

      const id = crypto.randomUUID();
      run(
        ctx.db,
        `INSERT INTO calls (id, complex_id, unit_id, visitor_type, visitor_name, company, snapshot, status, created_at, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ringing', ?, ?, ?)`,
        id,
        user.complexId,
        unitId,
        oneOf(b.visitorType, 'visitorType', VISITOR_TYPES),
        str(b.visitorName, 'visitorName', { max: 120 }),
        str(b.company, 'company', { max: 120, optional: true }),
        safeImagePath(b.snapshot),
        Date.now(),
        str(b.notes, 'notes', { max: 300, optional: true }),
        user.id
      );
      armTimeout(id, user.complexId);
      const call = findCall(id, user.complexId)!;
      ctx.hub.emit(user.complexId, { type: 'ring', callId: id }, { unitId });
      notify(call);
      res.status(201).json(callView(call));
    })
  );

  // El residente autoriza: se abre la puerta por el relé.
  r.post(
    '/calls/:id/authorize',
    requireRole('resident'),
    wrap(async (req, res) => {
      const user = requireUser(req);
      const call = findCall(String(req.params.id), user.complexId);
      if (!call || call.unit_id !== user.unitId) throw new HttpError(404, 'Llamada no encontrada');

      const changed = run(
        ctx.db,
        `UPDATE calls SET status='authorized', ended_at=?, authorized_by=? WHERE id=? AND status='ringing'`,
        Date.now(),
        `Residente ${user.name} desde el celular (apertura remota)`,
        call.id
      );
      if (!changed) throw new HttpError(409, 'La llamada ya no está activa');
      clearTimer(call.id);

      const result = await openDoor(ctx, {
        complexId: user.complexId,
        source: 'resident_call',
        userId: user.id,
        callId: call.id,
      });
      if (!result.ok) {
        // La puerta no abrió: la llamada vuelve a sonar para que se pueda reintentar.
        run(ctx.db, `UPDATE calls SET status='ringing', ended_at=NULL, authorized_by=NULL WHERE id=?`, call.id);
        armTimeout(call.id, user.complexId);
        notify(call);
        throw new HttpError(502, 'No se pudo abrir la puerta. Intenta de nuevo o avisa a portería.');
      }
      const updated = findCall(call.id, user.complexId)!;
      notify(updated);
      res.json(callView(updated));
    })
  );

  r.post(
    '/calls/:id/reject',
    requireRole('resident'),
    wrap((req, res) => {
      const user = requireUser(req);
      const call = findCall(String(req.params.id), user.complexId);
      if (!call || call.unit_id !== user.unitId) throw new HttpError(404, 'Llamada no encontrada');
      const changed = run(
        ctx.db,
        `UPDATE calls SET status='rejected', ended_at=?, authorized_by='Rechazado por el residente' WHERE id=? AND status='ringing'`,
        Date.now(),
        call.id
      );
      if (!changed) throw new HttpError(409, 'La llamada ya no está activa');
      clearTimer(call.id);
      const updated = findCall(call.id, user.complexId)!;
      notify(updated);
      res.json(callView(updated));
    })
  );

  // Respuesta rápida del residente (cierra la llamada sin abrir).
  r.post(
    '/calls/:id/reply',
    requireRole('resident'),
    wrap((req, res) => {
      const user = requireUser(req);
      const message = str(body(req).message, 'message', { max: 140 });
      const call = findCall(String(req.params.id), user.complexId);
      if (!call || call.unit_id !== user.unitId) throw new HttpError(404, 'Llamada no encontrada');
      const changed = run(
        ctx.db,
        `UPDATE calls SET status='rejected', ended_at=?, authorized_by='Respuesta rápida del residente', notes=? WHERE id=? AND status='ringing'`,
        Date.now(),
        `Mensaje del residente: ${message}`,
        call.id
      );
      if (!changed) throw new HttpError(409, 'La llamada ya no está activa');
      clearTimer(call.id);
      const updated = findCall(call.id, user.complexId)!;
      notify(updated);
      res.json(callView(updated));
    })
  );

  // El vigilante cuelga antes de que contesten.
  r.post(
    '/calls/:id/hangup',
    requireRole('guard', 'admin'),
    wrap((req, res) => {
      const user = requireUser(req);
      const call = findCall(String(req.params.id), user.complexId);
      if (!call) throw new HttpError(404, 'Llamada no encontrada');
      const changed = run(
        ctx.db,
        `UPDATE calls SET status='missed', ended_at=?, authorized_by='Llamada finalizada por portería' WHERE id=? AND status='ringing'`,
        Date.now(),
        call.id
      );
      if (!changed) throw new HttpError(409, 'La llamada ya no está activa');
      clearTimer(call.id);
      const updated = findCall(call.id, user.complexId)!;
      notify(updated);
      res.json(callView(updated));
    })
  );

  // Apertura manual de contingencia por portería; queda registrada en la bitácora.
  r.post(
    '/door/open',
    requireRole('guard', 'admin'),
    wrap(async (req, res) => {
      const user = requireUser(req);
      const b = body(req);
      const unitId = str(b.unitId, 'unitId', { max: 60 });
      const unit = get<{ id: string }>(
        ctx.db,
        'SELECT id FROM units WHERE id = ? AND complex_id = ?',
        unitId,
        user.complexId
      );
      if (!unit) throw new HttpError(404, 'Unidad no encontrada');

      const callId = crypto.randomUUID();
      const result = await openDoor(ctx, { complexId: user.complexId, source: 'manual', userId: user.id, callId });
      if (!result.ok) throw new HttpError(502, 'No se pudo abrir la puerta: ' + result.detail);

      const now = Date.now();
      run(
        ctx.db,
        `INSERT INTO calls (id, complex_id, unit_id, visitor_type, visitor_name, company, snapshot, status, created_at, ended_at, authorized_by, notes, created_by)
         VALUES (?, ?, ?, 'otro', 'Apertura manual de portería', 'Seguridad', NULL, 'authorized', ?, ?, ?, ?, ?)`,
        callId,
        user.complexId,
        unitId,
        now,
        now,
        `${user.name} (apertura manual)`,
        str(b.reason, 'reason', { max: 200, optional: true }) || 'Apertura de contingencia / supervisión',
        user.id
      );
      notify(findCall(callId, user.complexId)!);
      res.json({ ok: true });
    })
  );

  return r;
}

/** Al arrancar: las llamadas que quedaron sonando por un reinicio se marcan como perdidas. */
export function expireStaleCalls(ctx: Ctx): void {
  run(
    ctx.db,
    `UPDATE calls SET status='missed', ended_at=?, authorized_by='Sin respuesta (reinicio del servidor)' WHERE status='ringing'`,
    Date.now()
  );
}
