import crypto from 'node:crypto';
import { Router } from 'express';
import { all, get, run } from '../db.ts';
import {
  HttpError,
  body,
  isStaff,
  requireRole,
  requireUser,
  safeImagePath,
  str,
  wrap,
  type Ctx,
  type Role,
} from '../http.ts';

interface ParcelRow {
  id: string;
  unit_id: string;
  tower: string;
  unit_number: string;
  tracking_code: string;
  recipient_name: string;
  courier: string;
  photo_url: string | null;
  status: 'en_porteria' | 'entregado';
  pickup_pin: string;
  pin_attempts: number;
  arrived_at: number;
  delivered_at: number | null;
}

const SELECT_PARCEL = `SELECT p.*, u.tower, u.unit_number FROM parcels p JOIN units u ON u.id = p.unit_id`;
const MAX_PIN_ATTEMPTS = 5;

/** El PIN de retiro sólo lo ve el residente destinatario; portería lo recibe de él al entregar. */
function parcelView(p: ParcelRow, role: Role) {
  return {
    id: p.id,
    trackingCode: p.tracking_code,
    tower: p.tower,
    unitNumber: p.unit_number,
    recipientName: p.recipient_name,
    courier: p.courier,
    photoUrl: p.photo_url ?? '',
    status: p.status,
    arrivedAt: p.arrived_at,
    deliveredAt: p.delivered_at,
    ...(role === 'resident' ? { pickupPin: p.pickup_pin } : {}),
  };
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function parcelsRouter(ctx: Ctx): Router {
  const r = Router();

  const notify = (complexId: string, unitId: string, id: string) =>
    ctx.hub.emit(complexId, { type: 'changed', resource: 'parcels', id }, { staff: true, unitId });

  r.get(
    '/parcels',
    wrap((req, res) => {
      const user = requireUser(req);
      const rows = isStaff(user.role)
        ? all<ParcelRow>(ctx.db, `${SELECT_PARCEL} WHERE p.complex_id = ? ORDER BY p.arrived_at DESC LIMIT 500`, user.complexId)
        : all<ParcelRow>(
            ctx.db,
            `${SELECT_PARCEL} WHERE p.complex_id = ? AND p.unit_id = ? ORDER BY p.arrived_at DESC LIMIT 200`,
            user.complexId,
            user.unitId ?? ''
          );
      res.json(rows.map((p) => parcelView(p, user.role)));
    })
  );

  r.post(
    '/parcels',
    requireRole('guard', 'admin'),
    wrap((req, res) => {
      const user = requireUser(req);
      const b = body(req);
      const unitId = str(b.unitId, 'unitId', { max: 60 });
      const unit = get<{ resident_name: string }>(
        ctx.db,
        'SELECT resident_name FROM units WHERE id = ? AND complex_id = ?',
        unitId,
        user.complexId
      );
      if (!unit) throw new HttpError(404, 'Unidad no encontrada');

      const id = crypto.randomUUID();
      run(
        ctx.db,
        `INSERT INTO parcels (id, complex_id, unit_id, tracking_code, recipient_name, courier, photo_url, pickup_pin, arrived_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        user.complexId,
        unitId,
        str(b.trackingCode, 'trackingCode', { max: 60, optional: true }) || 'ENV-' + crypto.randomInt(10000, 100000),
        str(b.recipientName, 'recipientName', { max: 120, optional: true }) || unit.resident_name,
        str(b.courier, 'courier', { max: 80 }),
        safeImagePath(b.photoUrl),
        // PIN de 4 dígitos con CSPRNG; el límite de intentos mitiga la fuerza bruta.
        String(crypto.randomInt(1000, 10000)),
        Date.now()
      );
      notify(user.complexId, unitId, id);
      res.status(201).json(parcelView(get<ParcelRow>(ctx.db, `${SELECT_PARCEL} WHERE p.id = ?`, id)!, user.role));
    })
  );

  r.post(
    '/parcels/:id/deliver',
    requireRole('guard', 'admin'),
    wrap((req, res) => {
      const user = requireUser(req);
      const pin = str(body(req).pin, 'pin', { max: 8 });
      const p = get<ParcelRow>(
        ctx.db,
        `${SELECT_PARCEL} WHERE p.id = ? AND p.complex_id = ?`,
        String(req.params.id),
        user.complexId
      );
      if (!p) throw new HttpError(404, 'Paquete no encontrado');
      if (p.status === 'entregado') throw new HttpError(409, 'El paquete ya fue entregado');
      if (p.pin_attempts >= MAX_PIN_ATTEMPTS) {
        throw new HttpError(429, 'Paquete bloqueado por demasiados intentos. Verifica la identidad con administración.');
      }

      if (!safeEqual(pin, p.pickup_pin)) {
        run(ctx.db, 'UPDATE parcels SET pin_attempts = pin_attempts + 1 WHERE id = ?', p.id);
        throw new HttpError(403, `PIN incorrecto. Intentos restantes: ${MAX_PIN_ATTEMPTS - p.pin_attempts - 1}`);
      }
      run(ctx.db, `UPDATE parcels SET status='entregado', delivered_at=? WHERE id=?`, Date.now(), p.id);
      notify(user.complexId, p.unit_id, p.id);
      res.json(parcelView(get<ParcelRow>(ctx.db, `${SELECT_PARCEL} WHERE p.id = ?`, p.id)!, user.role));
    })
  );

  return r;
}
