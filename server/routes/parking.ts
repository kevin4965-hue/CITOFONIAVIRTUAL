import { Router } from 'express';
import { all, get, run } from '../db.ts';
import { HttpError, body, requireRole, str, wrap, requireUser, type Ctx } from '../http.ts';

interface SlotRow {
  id: string;
  slot_number: string;
  type: 'visitante' | 'residente' | 'discapacidad';
  is_occupied: number;
  vehicle_plate: string | null;
  unit_visiting: string | null;
  driver_name: string | null;
  entered_at: number | null;
}

const slotView = (s: SlotRow) => ({
  id: s.id,
  slotNumber: s.slot_number,
  type: s.type,
  isOccupied: s.is_occupied === 1,
  vehiclePlate: s.vehicle_plate ?? undefined,
  unitVisiting: s.unit_visiting ?? undefined,
  driverName: s.driver_name ?? undefined,
  enteredAt: s.entered_at,
});

export function parkingRouter(ctx: Ctx): Router {
  const r = Router();
  const staff = requireRole('guard', 'admin');

  const notify = (complexId: string) =>
    ctx.hub.emit(complexId, { type: 'changed', resource: 'parking' }, { staff: true });

  r.get(
    '/parking',
    staff,
    wrap((req, res) => {
      const user = requireUser(req);
      res.json(
        all<SlotRow>(ctx.db, 'SELECT * FROM parking_slots WHERE complex_id = ? ORDER BY slot_number', user.complexId).map(
          slotView
        )
      );
    })
  );

  r.post(
    '/parking/:id/occupy',
    staff,
    wrap((req, res) => {
      const user = requireUser(req);
      const b = body(req);
      const plate = str(b.vehiclePlate, 'vehiclePlate', { max: 10 }).toUpperCase();
      if (!/^[A-Z0-9-]{3,10}$/.test(plate)) throw new HttpError(400, 'Placa inválida');
      const changed = run(
        ctx.db,
        `UPDATE parking_slots SET is_occupied=1, vehicle_plate=?, unit_visiting=?, driver_name=?, entered_at=?
         WHERE id=? AND complex_id=? AND is_occupied=0`,
        plate,
        str(b.unitVisiting, 'unitVisiting', { max: 60, optional: true }),
        str(b.driverName, 'driverName', { max: 80, optional: true }),
        Date.now(),
        String(req.params.id),
        user.complexId
      );
      if (!changed) throw new HttpError(409, 'El cupo no existe o ya está ocupado');
      notify(user.complexId);
      res.json(slotView(get<SlotRow>(ctx.db, 'SELECT * FROM parking_slots WHERE id = ?', String(req.params.id))!));
    })
  );

  r.post(
    '/parking/:id/free',
    staff,
    wrap((req, res) => {
      const user = requireUser(req);
      const changed = run(
        ctx.db,
        `UPDATE parking_slots SET is_occupied=0, vehicle_plate=NULL, unit_visiting=NULL, driver_name=NULL, entered_at=NULL
         WHERE id=? AND complex_id=?`,
        String(req.params.id),
        user.complexId
      );
      if (!changed) throw new HttpError(404, 'Cupo no encontrado');
      notify(user.complexId);
      res.json({ ok: true });
    })
  );

  return r;
}
