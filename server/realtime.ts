import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import { COOKIE_NAME, parseCookies, userFromToken } from './auth.ts';
import type { AuthUser, Ctx } from './http.ts';

export type Resource = 'calls' | 'parcels' | 'parking' | 'notices' | 'alerts' | 'qr' | 'units';

export type ServerEvent =
  | { type: 'changed'; resource: Resource; id?: string }
  | { type: 'ring'; callId: string }
  | { type: 'door'; open: boolean; until?: number };

interface Client {
  ws: WebSocket;
  user: AuthUser;
  alive: boolean;
}

export interface Audience {
  /** Vigilantes y administradores del conjunto. */
  staff?: boolean;
  /** Residentes de esta unidad. */
  unitId?: string;
  /** Todos los usuarios del conjunto. */
  everyone?: boolean;
}

export class Hub {
  private clients = new Set<Client>();
  private wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
  private heartbeat?: NodeJS.Timeout;

  emit(complexId: string, event: ServerEvent, to: Audience): void {
    const msg = JSON.stringify(event);
    for (const c of this.clients) {
      if (c.user.complexId !== complexId || c.ws.readyState !== c.ws.OPEN) continue;
      const staff = c.user.role === 'guard' || c.user.role === 'admin';
      const match =
        to.everyone ||
        (to.staff && staff) ||
        (to.unitId !== undefined && c.user.role === 'resident' && c.user.unitId === to.unitId);
      if (match) c.ws.send(msg);
    }
  }

  attach(server: Server, ctx: Ctx): void {
    server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      const reject = (code: number, text: string) => {
        socket.write(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\n\r\n`);
        socket.destroy();
      };

      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname !== '/ws') return reject(404, 'Not Found');

      // Protección contra Cross-Site WebSocket Hijacking: el Origin debe ser el propio host o estar permitido.
      const origin = req.headers.origin;
      if (origin) {
        let originHost = '';
        try {
          originHost = new URL(origin).host;
        } catch {
          return reject(403, 'Forbidden');
        }
        const allowed = originHost === req.headers.host || ctx.config.allowedOrigins.includes(origin);
        if (!allowed) return reject(403, 'Forbidden');
      }

      const user = userFromToken(ctx, parseCookies(req.headers.cookie)[COOKIE_NAME]);
      if (!user) return reject(401, 'Unauthorized');

      this.wss.handleUpgrade(req, socket, head, (ws) => {
        const client: Client = { ws, user, alive: true };
        this.clients.add(client);
        ws.on('pong', () => (client.alive = true));
        ws.on('close', () => this.clients.delete(client));
        ws.on('error', () => this.clients.delete(client));
        // El cliente no envía mensajes de control: se ignora todo lo entrante.
        ws.on('message', () => undefined);
        ws.send(JSON.stringify({ type: 'hello' }));
      });
    });

    this.heartbeat = setInterval(() => {
      for (const c of this.clients) {
        if (!c.alive) {
          c.ws.terminate();
          this.clients.delete(c);
          continue;
        }
        c.alive = false;
        c.ws.ping();
      }
    }, 30_000);
    this.heartbeat.unref();
  }

  close(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const c of this.clients) c.ws.terminate();
    this.clients.clear();
    this.wss.close();
  }
}
