import crypto from 'node:crypto';

export interface Config {
  isProd: boolean;
  port: number;
  dbPath: string;
  jwtSecret: string;
  sessionHours: number;
  /** Orígenes extra permitidos para el WebSocket (además del propio host). */
  allowedOrigins: string[];
  relayUrl: string | null;
  relaySecret: string | null;
  doorOpenSeconds: number;
  callTimeoutSeconds: number;
  /** Carpeta con el frontend compilado (vite build). */
  staticDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const isProd = env.NODE_ENV === 'production';
  let jwtSecret = env.JWT_SECRET ?? '';
  if (!jwtSecret) {
    if (isProd) {
      throw new Error('JWT_SECRET es obligatorio en producción (mínimo 32 caracteres).');
    }
    // En desarrollo: secreto efímero; las sesiones se invalidan al reiniciar.
    jwtSecret = crypto.randomBytes(32).toString('hex');
  }
  if (isProd && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  }

  return {
    isProd,
    port: Number(env.PORT) || 3001,
    dbPath: env.DB_PATH || 'data/citofonia.db',
    jwtSecret,
    sessionHours: Number(env.SESSION_HOURS) || 8,
    allowedOrigins: (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    relayUrl: env.RELAY_URL || null,
    relaySecret: env.RELAY_SECRET || null,
    doorOpenSeconds: Number(env.DOOR_OPEN_SECONDS) || 5,
    callTimeoutSeconds: Number(env.CALL_TIMEOUT_SECONDS) || 30,
    staticDir: env.STATIC_DIR || 'dist',
  };
}
