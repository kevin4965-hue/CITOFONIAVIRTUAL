import { existsSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import express, { type ErrorRequestHandler } from 'express';
import { authRouter, authenticate } from './auth.ts';
import type { Config } from './config.ts';
import { openDb, type DB } from './db.ts';
import { HttpError, type Ctx } from './http.ts';
import { Hub } from './realtime.ts';
import { createRelay, type DoorRelay } from './relay.ts';
import { alertsRouter } from './routes/alerts.ts';
import { callsRouter, expireStaleCalls } from './routes/calls.ts';
import { noticesRouter } from './routes/notices.ts';
import { parcelsRouter } from './routes/parcels.ts';
import { parkingRouter } from './routes/parking.ts';
import { qrRouter } from './routes/qr.ts';
import { unitsRouter } from './routes/units.ts';

export interface AppHandle {
  ctx: Ctx;
  server: Server;
  close(): Promise<void>;
}

export function createApp(config: Config, opts: { db?: DB; relay?: DoorRelay } = {}): AppHandle {
  const db = opts.db ?? openDb(config.dbPath);
  const hub = new Hub();
  const relay = opts.relay ?? createRelay(config);
  const ctx: Ctx = { db, hub, relay, config, callTimers: new Map() };
  expireStaleCalls(ctx);

  const app = express();
  app.disable('x-powered-by');
  // Detrás de un proxy inverso (Railway, Render, Nginx) para que req.ip y "secure" sean correctos.
  if (config.isProd) app.set('trust proxy', 1);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (config.isProd) {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
      res.setHeader(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "img-src 'self' data:",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "connect-src 'self' ws: wss:",
          "frame-ancestors 'none'",
        ].join('; ')
      );
    }
    next();
  });

  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, relay: relay.kind });
  });

  app.use('/api/auth', authRouter(ctx));

  const api = express.Router();
  api.use(authenticate(ctx));
  api.use(unitsRouter(ctx));
  api.use(callsRouter(ctx));
  api.use(parcelsRouter(ctx));
  api.use(parkingRouter(ctx));
  api.use(noticesRouter(ctx));
  api.use(qrRouter(ctx));
  api.use(alertsRouter(ctx));
  app.use('/api', api);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Ruta no encontrada')));

  // Frontend compilado (producción).
  const staticDir = path.resolve(config.staticDir);
  if (existsSync(path.join(staticDir, 'index.html'))) {
    app.use(express.static(staticDir, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/(api|ws)\b).*/, (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    // Errores de JSON mal formado de express.json()
    const e = err as { type?: string; status?: number };
    if (e.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'JSON inválido' });
      return;
    }
    if (e.type === 'entity.too.large') {
      res.status(413).json({ error: 'Solicitud demasiado grande' });
      return;
    }
    console.error('[error]', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  };
  app.use(onError);

  const server = createServer(app);
  hub.attach(server, ctx);

  return {
    ctx,
    server,
    async close() {
      for (const t of ctx.callTimers.values()) clearTimeout(t);
      ctx.callTimers.clear();
      hub.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      db.close();
    },
  };
}
