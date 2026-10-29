import crypto from 'node:crypto';
import { Router } from 'express';
import { all, get, run } from '../db.ts';
import {
  HttpError,
  body,
  isStaff,
  oneOf,
  requireRole,
  requireUser,
  str,
  wrap,
  type Ctx,
  type Role,
} from '../http.ts';

interface AlertRow {
  id: string;
  unit_id: string;
  tower: string;
  unit_number: string;
  resident_name: string;
  phone: string;
  type: 'panico' | 'medica' | 'incendio' | 'sospecha';
  status: 'activa' | 'en_atencion' | 'resuelta';
  created_at: number;
  responded_by: string | null;
  notes: string | null;
}

const SELECT_ALERT = `SELECT a.*, u.tower, u.unit_number, u.resident_name, u.phone
  FROM alerts a JOIN units u ON u.id = a.unit_id`;

/** El teléfono de emergencia sólo se entrega a portería: es el único caso donde necesita el número real. */
const view = (a: AlertRow, role: Role) => ({
  id: a.id,
  unitId: a.unit_id,
  tower: a.tower,
  unitNumber: a.unit_number,
  residentName: a.resident_name,
  type: a.type,
  status: a.status,
  createdAt: a.created_at,
  respondedBy: a.responded_by ?? undefined,
  notes: a.notes ?? '',
  ...(isStaff(role) ? { emergencyPhone: a.phone } : {}),
});

export function alertsRouter(ctx: Ctx): Router {
  const r = Router();

  const notify = (complexId: string, unitId: string, id: string) =>
    ctx.hub.emit(complexId, { type: 'changed', resource: 'alerts', id }, { staff: true, unitId });

  r.get(
    '/alerts',
    wrap((req, res) => {
      const user = requireUser(req);
      const rows = isStaff(user.role)
        ? all<AlertRow>(ctx.db, `${SELECT_ALERT} WHERE a.complex_id = ? ORDER BY a.created_at DESC LIMIT 300`, user.complexId)
        : all<AlertRow>(
            ctx.db,
            `${SELECT_ALERT} WHERE a.complex_id = ? AND a.unit_id = ? ORDER BY a.created_at DESC LIMIT 50`,
            user.complexId,
            user.unitId ?? ''
          );
      res.json(rows.map((a) => view(a, user.role)));
    })
  );

  // Botón SOS del residente.
  r.post(
    '/alerts',
    requireRole('resident'),
    wrap((req, res) => {
      const user = requireUser(req);
      const b = body(req);
      const type = b.type ? oneOf(b.type, 'type', ['panico', 'medica', 'incendio', 'sospecha'] as const) : 'panico';

      // Antirrebote: si ya hay una alerta activa del mismo tipo en el último minuto, se reutiliza.
      const recent = get<AlertRow>(
        ctx.db,
        `${SELECT_ALERT} WHERE a.unit_id = ? AND a.type = ? AND a.status != 'resuelta' AND a.created_at > ?`,
        user.unitId ?? '',
        type,
        Date.now() - 60_000
      );
      if (recent) return res.json(view(recent, user.role));

      const id = crypto.randomUUID();
      run(
        ctx.db,
        `INSERT INTO alerts (id, complex_id, unit_id, type, status, created_at, notes)
         VALUES (?, ?, ?, ?, 'activa', ?, ?)`,
        id,
        user.complexId,
        user.unitId ?? '',
        type,
        Date.now(),
        str(b.notes, 'notes', { max: 300, optional: true }) || 'Alerta activada desde el botón SOS del residente'
      );
      notify(user.complexId, user.unitId ?? '', id);
      res.status(201).json(view(get<AlertRow>(ctx.db, `${SELECT_ALERT} WHERE a.id = ?`, id)!, user.role));
    })
  );

  r.post(
    '/alerts/:id/dispatch',
    requireRole('guard', 'admin'),
    wrap((req, res) => {
      const user = requireUser(req);
      const a = get<AlertRow>(ctx.db, `${SELECT_ALERT} WHERE a.id = ? AND a.complex_id = ?`, String(req.params.id), user.complexId);
      if (!a) throw new HttpError(404, 'Alerta no encontrada');
      const changed = run(
        ctx.db,
        `UPDATE alerts SET status='en_atencion', responded_by=? WHERE id=? AND status='activa'`,
        `${user.name}: ronda de vigilancia despachada`,
        a.id
      );
      if (!changed) throw new HttpError(409, 'La alerta ya está en atención o resuelta');
      notify(user.complexId, a.unit_id, a.id);
      res.json({ ok: true });
    })
  );

  r.post(
    '/alerts/:id/resolve',
    requireRole('guard', 'admin'),
    wrap((req, res) => {
      const user = requireUser(req);
      const b = body(req);
      const a = get<AlertRow>(ctx.db, `${SELECT_ALERT} WHERE a.id = ? AND a.complex_id = ?`, String(req.params.id), user.complexId);
      if (!a) throw new HttpError(404, 'Alerta no encontrada');
      const notes = str(b.notes, 'notes', { max: 300, optional: true });
      const changed = run(
        ctx.db,
        `UPDATE alerts SET status='resuelta', responded_by=?, notes=COALESCE(NULLIF(?, ''), notes) WHERE id=? AND status!='resuelta'`,
        `${user.name}: novedad verificada`,
        notes,
        a.id
      );
      if (!changed) throw new HttpError(409, 'La alerta ya estaba resuelta');
      notify(user.complexId, a.unit_id, a.id);
      res.json({ ok: true });
    })
  );

  return r;
}
