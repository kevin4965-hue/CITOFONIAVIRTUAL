import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Config } from './config.ts';
import type { DB } from './db.ts';
import type { Hub } from './realtime.ts';
import type { DoorRelay } from './relay.ts';

export type Role = 'admin' | 'guard' | 'resident';

export interface AuthUser {
  id: string;
  complexId: string;
  role: Role;
  unitId: string | null;
  name: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface Ctx {
  db: DB;
  hub: Hub;
  relay: DoorRelay;
  config: Config;
  callTimers: Map<string, NodeJS.Timeout>;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

/** Express 4 no captura rechazos de promesas: este wrapper los envía al manejador de errores. */
export const wrap =
  (fn: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function requireUser(req: Request): AuthUser {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  return req.user;
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const user = requireUser(req);
    if (!roles.includes(user.role)) throw new HttpError(403, 'No tienes permiso para esta acción');
    next();
  };
}

const isStaff = (role: Role) => role === 'guard' || role === 'admin';
export { isStaff };

// ---------- Validación mínima de entrada ----------

export function str(
  v: unknown,
  field: string,
  opts: { max?: number; min?: number; optional?: boolean } = {}
): string {
  const { max = 200, min = 1, optional = false } = opts;
  if (v === undefined || v === null || v === '') {
    if (optional) return '';
    throw new HttpError(400, `El campo "${field}" es obligatorio`);
  }
  if (typeof v !== 'string') throw new HttpError(400, `El campo "${field}" debe ser texto`);
  const s = v.trim();
  if (s.length < min && !optional) throw new HttpError(400, `El campo "${field}" es obligatorio`);
  if (s.length > max) throw new HttpError(400, `El campo "${field}" excede ${max} caracteres`);
  return s;
}

export function oneOf<T extends string>(v: unknown, field: string, list: readonly T[]): T {
  if (typeof v !== 'string' || !(list as readonly string[]).includes(v)) {
    throw new HttpError(400, `El campo "${field}" debe ser uno de: ${list.join(', ')}`);
  }
  return v as T;
}

export function intIn(v: unknown, field: string, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `El campo "${field}" debe ser un entero entre ${min} y ${max}`);
  }
  return n;
}

export function body(req: Request): Record<string, unknown> {
  const b = req.body as unknown;
  if (b === null || typeof b !== 'object' || Array.isArray(b)) {
    throw new HttpError(400, 'Cuerpo JSON inválido');
  }
  return b as Record<string, unknown>;
}

/** Enmascara un teléfono: +57 (300) ***-6731 */
export function maskPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length < 10) return '***';
  const cc = d.slice(0, -10);
  return `${cc ? '+' + cc + ' ' : ''}(${d.slice(-10, -7)}) ***-${d.slice(-4)}`;
}

/** Sólo rutas locales o imágenes data: pequeñas; nunca URLs externas arbitrarias. */
export function safeImagePath(v: unknown): string | null {
  if (typeof v !== 'string' || !v) return null;
  if (/^\/[\w\-./]{1,300}$/.test(v) && !v.includes('..')) return v;
  return null;
}
