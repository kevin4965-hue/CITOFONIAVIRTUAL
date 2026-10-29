import crypto from 'node:crypto';
import { Router } from 'express';
import { all, get, run } from '../db.ts';
import { openDoor } from '../door.ts';
import { HttpError, body, intIn, requireRole, requireUser, str, wrap, type Ctx } from '../http.ts';

interface PassRow {
  id: string;
  unit_id: string;
  tower: string;
  unit_number: string;
  guest_name: string;
  code: string;
  valid_until: number;
  uses_remaining: number;
  notes: string;
}

const SELECT_PASS = `SELECT q.*, u.tower, u.unit_number FROM qr_passes q JOIN units u ON u.id = q.unit_id`;

const view = (q: PassRow) => ({
  id: q.id,
  guestName: q.guest_name,
  tower: q.tower,
  unitNumber: q.unit_number,
  validUntil: q.valid_until,
  qrCode: q.code,
  usesRemaining: q.uses_remaining,
  notes: q.notes,
});

export function qrRouter(ctx: Ctx): Router {
  const r = Router();

  // El residente ve sus propios pases vigentes.
  r.get(
    '/qr',
    requireRole('resident'),
    wrap((req, res) => {
      const user = requireUser(req);
      const rows = all<PassRow>(
        ctx.db,
        `${SELECT_PASS} WHERE q.complex_id = ? AND q.unit_id = ? ORDER BY q.created_at DESC LIMIT 50`,
        user.complexId,
        user.unitId ?? ''
      );
      res.json(rows.map(view));
    })
  );

  r.post(
    '/qr',
    requireRole('resident'),
    wrap((req, res) => {
      const user = requireUser(req);
      const b = body(req);
      const hours = intIn(b.hoursValid ?? 4, 'hoursValid', 1, 72);
      const id = crypto.randomUUID();
      // 72 bits de entropía: no adivinable; se valida en el servidor y es de un solo uso.
      const code = 'CV-' + crypto.randomBytes(9).toString('base64url');
      const now = Date.now();
      run(
        ctx.db,
        `INSERT INTO qr_passes (id, complex_id, unit_id, guest_name, code, valid_until, uses_remaining, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        id,
        user.complexId,
        user.unitId ?? '',
        str(b.guestName, 'guestName', { max: 120 }),
        code,
        now + hours * 3600 * 1000,
        str(b.notes, 'notes', { max: 200, optional: true }),
        now
      );
      ctx.hub.emit(user.complexId, { type: 'changed', resource: 'qr' }, { unitId: user.unitId ?? '' });
      res.status(201).json(view(get<PassRow>(ctx.db, `${SELECT_PASS} WHERE q.id = ?`, id)!));
    })
  );

  // Portería escanea el QR: se consume el uso de forma atómica y se abre la puerta.
  r.post(
    '/qr/validate',
    requireRole('guard', 'admin'),
    wrap(async (req, res) => {
      const user = requireUser(req);
      const code = str(body(req).code, 'code', { max: 60 });
      const pass = get<PassRow>(
        ctx.db,
        `${SELECT_PASS} WHERE q.code = ? AND q.complex_id = ?`,
        code,
        user.complexId
      );
      if (!pass) throw new HttpError(404, 'Pase no válido');
      if (pass.valid_until < Date.now()) throw new HttpError(410, 'El pase está vencido');

      const consumed = run(
        ctx.db,
        'UPDATE qr_passes SET uses_remaining = uses_remaining - 1 WHERE id = ? AND uses_remaining > 0 AND valid_until >= ?',
        pass.id,
        Date.now()
      );
      if (!consumed) throw new HttpError(409, 'El pase ya fue utilizado');

      const callId = crypto.randomUUID();
      const result = await openDoor(ctx, { complexId: user.complexId, source: 'qr', userId: user.id, callId });
      if (!result.ok) {
        // Devuelve el uso si la puerta no abrió.
        run(ctx.db, 'UPDATE qr_passes SET uses_remaining = uses_remaining + 1 WHERE id = ?', pass.id);
        throw new HttpError(502, 'No se pudo abrir la puerta: ' + result.detail);
      }

      const now = Date.now();
      run(
        ctx.db,
        `INSERT INTO calls (id, complex_id, unit_id, visitor_type, visitor_name, company, snapshot, status, created_at, ended_at, authorized_by, notes, created_by)
         VALUES (?, ?, ?, 'invitado', ?, 'Pase QR', NULL, 'authorized', ?, ?, 'Pase QR del residente', ?, ?)`,
        callId,
        user.complexId,
        pass.unit_id,
        pass.guest_name,
        now,
        now,
        pass.notes,
        user.id
      );
      ctx.hub.emit(user.complexId, { type: 'changed', resource: 'calls', id: callId }, { staff: true, unitId: pass.unit_id });
      ctx.hub.emit(user.complexId, { type: 'changed', resource: 'qr' }, { unitId: pass.unit_id });
      res.json({ valid: true, guestName: pass.guest_name, tower: pass.tower, unitNumber: pass.unit_number });
    })
  );

  return r;
}
