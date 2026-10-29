import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Router, type Request, type RequestHandler } from 'express';
import { get } from './db.ts';
import { HttpError, body, str, wrap, type AuthUser, type Ctx, type Role } from './http.ts';

export const COOKIE_NAME = 'cv_token';

interface UserRow {
  id: string;
  complex_id: string;
  email: string;
  name: string;
  password_hash: string;
  role: Role;
  unit_id: string | null;
  active: number;
}

export const hashPassword = (pw: string): string => bcrypt.hashSync(pw, 10);

// Hash ficticio para igualar tiempos cuando el correo no existe (evita enumeración de usuarios).
const DUMMY_HASH = bcrypt.hashSync('no-such-user-password', 10);

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      /* cookie malformada: se ignora */
    }
  }
  return out;
}

export function userFromToken(ctx: Ctx, token: string | undefined): AuthUser | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, ctx.config.jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    // Se consulta la BD en cada petición: un usuario desactivado o con rol cambiado pierde acceso de inmediato.
    const row = get<UserRow>(ctx.db, 'SELECT * FROM users WHERE id = ? AND active = 1', payload.sub);
    if (!row) return null;
    return {
      id: row.id,
      complexId: row.complex_id,
      role: row.role,
      unitId: row.unit_id,
      name: row.name,
      email: row.email,
    };
  } catch {
    return null;
  }
}

export function authenticate(ctx: Ctx): RequestHandler {
  return (req, _res, next) => {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    const user = userFromToken(ctx, token);
    if (!user) return next(new HttpError(401, 'Sesión no válida o expirada'));
    req.user = user;
    next();
  };
}

// ---------- Límite de intentos de login (en memoria) ----------

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function createLoginLimiter(now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  const prune = (key: string) => {
    const t = now();
    const arr = (hits.get(key) ?? []).filter((x) => t - x < WINDOW_MS);
    if (arr.length) hits.set(key, arr);
    else hits.delete(key);
    return arr;
  };
  return {
    blocked: (key: string) => prune(key).length >= MAX_ATTEMPTS,
    fail: (key: string) => {
      // Tope de memoria: ante una avalancha de claves distintas se descarta el historial.
      if (hits.size > 10_000) hits.clear();
      const arr = prune(key);
      arr.push(now());
      hits.set(key, arr);
    },
    reset: (key: string) => hits.delete(key),
  };
}

function toPublicUser(ctx: Ctx, u: AuthUser) {
  const cx = get<{ name: string }>(ctx.db, 'SELECT name FROM complexes WHERE id = ?', u.complexId);
  return { id: u.id, name: u.name, email: u.email, role: u.role, unitId: u.unitId, complexName: cx?.name ?? '' };
}

export function authRouter(ctx: Ctx): Router {
  const r = Router();
  const limiter = createLoginLimiter();

  r.post(
    '/login',
    wrap((req: Request, res) => {
      const b = body(req);
      const email = str(b.email, 'email', { max: 200 }).toLowerCase();
      const password = str(b.password, 'password', { max: 200 });
      const key = `${req.ip}|${email}`;
      if (limiter.blocked(key)) {
        throw new HttpError(429, 'Demasiados intentos. Intenta de nuevo en unos minutos.');
      }

      const row = get<UserRow>(ctx.db, 'SELECT * FROM users WHERE email = ? AND active = 1', email);
      const ok = bcrypt.compareSync(password, row?.password_hash ?? DUMMY_HASH) && !!row;
      if (!ok || !row) {
        limiter.fail(key);
        throw new HttpError(401, 'Correo o contraseña incorrectos');
      }
      limiter.reset(key);

      const token = jwt.sign({ sub: row.id }, ctx.config.jwtSecret, {
        algorithm: 'HS256',
        expiresIn: `${ctx.config.sessionHours}h`,
      });
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: ctx.config.isProd,
        maxAge: ctx.config.sessionHours * 3600 * 1000,
        path: '/',
      });
      res.json({
        user: toPublicUser(ctx, {
          id: row.id,
          complexId: row.complex_id,
          role: row.role,
          unitId: row.unit_id,
          name: row.name,
          email: row.email,
        }),
      });
    })
  );

  r.post('/logout', (_req, res) => {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict', secure: ctx.config.isProd, path: '/' });
    res.json({ ok: true });
  });

  r.get('/me', authenticate(ctx), (req, res) => {
    res.json({ user: toPublicUser(ctx, req.user!) });
  });

  return r;
}
