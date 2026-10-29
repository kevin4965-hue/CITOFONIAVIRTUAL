import crypto from 'node:crypto';
import { Router } from 'express';
import { hashPassword } from '../auth.ts';
import { all, get, run } from '../db.ts';
import {
  HttpError,
  body,
  maskPhone,
  oneOf,
  requireRole,
  requireUser,
  str,
  wrap,
  type Ctx,
} from '../http.ts';

interface UnitRow {
  id: string;
  complex_id: string;
  tower: string;
  unit_number: string;
  resident_name: string;
  phone: string;
  email: string;
  status: 'al_dia' | 'moroso' | 'desocupado';
  residents_count: number;
  assigned_parking: string;
  preferred_channel: string;
}

/**
 * Minimización de datos (Ley 1581):
 *  - admin: ve todo.
 *  - vigilante: sólo teléfono enmascarado; sin correo ni estado de cartera.
 *  - residente: sólo su propia unidad.
 */
export function unitView(row: UnitRow, role: 'admin' | 'guard' | 'resident') {
  const base = {
    id: row.id,
    tower: row.tower,
    unitNumber: row.unit_number,
    residentName: row.resident_name,
    maskedPhone: maskPhone(row.phone),
    residentsCount: row.residents_count,
    assignedParking: row.assigned_parking,
    preferredChannel: row.preferred_channel,
  };
  if (role === 'guard') return base;
  return { ...base, realPhone: row.phone, email: row.email, status: row.status };
}

export function unitsRouter(ctx: Ctx): Router {
  const r = Router();

  r.get(
    '/units',
    wrap((req, res) => {
      const user = requireUser(req);
      const rows =
        user.role === 'resident'
          ? all<UnitRow>(ctx.db, 'SELECT * FROM units WHERE id = ? AND complex_id = ?', user.unitId ?? '', user.complexId)
          : all<UnitRow>(
              ctx.db,
              'SELECT * FROM units WHERE complex_id = ? ORDER BY tower, CAST(unit_number AS INTEGER)',
              user.complexId
            );
      res.json(rows.map((u) => unitView(u, user.role)));
    })
  );

  // ---- Administración de unidades y usuarios ----

  r.post(
    '/admin/units',
    requireRole('admin'),
    wrap((req, res) => {
      const user = requireUser(req);
      const b = body(req);
      const id = crypto.randomUUID();
      try {
        run(
          ctx.db,
          `INSERT INTO units (id, complex_id, tower, unit_number, resident_name, phone, email, status, residents_count, assigned_parking, preferred_channel)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          user.complexId,
          str(b.tower, 'tower', { max: 40 }),
          str(b.unitNumber, 'unitNumber', { max: 10 }),
          str(b.residentName, 'residentName', { max: 120 }),
          str(b.phone, 'phone', { max: 30, optional: true }),
          str(b.email, 'email', { max: 120, optional: true }).toLowerCase(),
          b.status ? oneOf(b.status, 'status', ['al_dia', 'moroso', 'desocupado'] as const) : 'al_dia',
          Number.isInteger(b.residentsCount) ? (b.residentsCount as number) : 1,
          str(b.assignedParking, 'assignedParking', { max: 20, optional: true }),
          'App Móvil'
        );
      } catch (e) {
        if (String(e).includes('UNIQUE')) throw new HttpError(409, 'Ya existe esa unidad');
        throw e;
      }
      ctx.hub.emit(user.complexId, { type: 'changed', resource: 'units' }, { staff: true });
      res.status(201).json({ id });
    })
  );

  r.post(
    '/admin/users',
    requireRole('admin'),
    wrap((req, res) => {
      const admin = requireUser(req);
      const b = body(req);
      const role = oneOf(b.role, 'role', ['admin', 'guard', 'resident'] as const);
      const password = str(b.password, 'password', { min: 10, max: 200 });
      const email = str(b.email, 'email', { max: 200 }).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Correo inválido');

      let unitId: string | null = null;
      if (role === 'resident') {
        unitId = str(b.unitId, 'unitId', { max: 60 });
        const unit = get<{ id: string }>(
          ctx.db,
          'SELECT id FROM units WHERE id = ? AND complex_id = ?',
          unitId,
          admin.complexId
        );
        if (!unit) throw new HttpError(400, 'La unidad no existe en este conjunto');
      }
      const id = crypto.randomUUID();
      try {
        run(
          ctx.db,
          `INSERT INTO users (id, complex_id, email, name, password_hash, role, unit_id, active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          id,
          admin.complexId,
          email,
          str(b.name, 'name', { max: 120 }),
          hashPassword(password),
          role,
          unitId,
          Date.now()
        );
      } catch (e) {
        if (String(e).includes('UNIQUE')) throw new HttpError(409, 'Ya existe un usuario con ese correo');
        throw e;
      }
      res.status(201).json({ id });
    })
  );

  return r;
}
