import crypto from 'node:crypto';
import type { Config } from './config.ts';

export interface RelayResult {
  ok: boolean;
  detail: string;
}

/**
 * Abstracción de la cerradura / relé de la puerta.
 * Implementaciones: simulada (desarrollo y demos) y HTTP firmado (controlador real).
 */
export interface DoorRelay {
  readonly kind: string;
  open(doorId: string, seconds: number): Promise<RelayResult>;
}

export class SimulatedRelay implements DoorRelay {
  readonly kind = 'simulated';
  /** Historial en memoria; útil para pruebas. */
  readonly opened: Array<{ doorId: string; seconds: number; at: number }> = [];
  failNext = false;

  async open(doorId: string, seconds: number): Promise<RelayResult> {
    if (this.failNext) {
      this.failNext = false;
      return { ok: false, detail: 'Fallo simulado del relé' };
    }
    this.opened.push({ doorId, seconds, at: Date.now() });
    return { ok: true, detail: `Relé simulado: ${doorId} abierta ${seconds}s` };
  }
}

/**
 * Controlador real (ESP32, relé IP, etc.) detrás de una URL HTTP(S).
 * Envía POST { doorId, seconds, ts, nonce } con cabecera X-Signature = HMAC-SHA256(body, RELAY_SECRET).
 * El firmware debe verificar la firma y rechazar `ts` con más de unos segundos de antigüedad
 * y `nonce` repetidos (anti-replay).
 */
export class HttpRelay implements DoorRelay {
  readonly kind = 'http';
  private url: string;
  private secret: string;

  constructor(url: string, secret: string) {
    this.url = url;
    this.secret = secret;
  }

  async open(doorId: string, seconds: number): Promise<RelayResult> {
    const payload = JSON.stringify({
      doorId,
      seconds,
      ts: Date.now(),
      nonce: crypto.randomBytes(12).toString('hex'),
    });
    const signature = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
        body: payload,
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return { ok: false, detail: `El controlador respondió ${res.status}` };
      return { ok: true, detail: `Controlador confirmó apertura de ${doorId}` };
    } catch (err) {
      return { ok: false, detail: `Sin respuesta del controlador: ${(err as Error).message}` };
    }
  }
}

export function createRelay(config: Config): DoorRelay {
  if (config.relayUrl) {
    if (!config.relaySecret) throw new Error('RELAY_SECRET es obligatorio cuando se define RELAY_URL.');
    return new HttpRelay(config.relayUrl, config.relaySecret);
  }
  if (config.isProd) {
    console.warn('[relay] ADVERTENCIA: producción sin RELAY_URL; la puerta es SIMULADA y no abre nada real.');
  }
  return new SimulatedRelay();
}
