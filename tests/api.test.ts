import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import WebSocket from 'ws';
import { createApp, type AppHandle } from '../server/app.ts';
import { loadConfig } from '../server/config.ts';
import { openDb, run } from '../server/db.ts';
import { SimulatedRelay } from '../server/relay.ts';
import { seedDemo } from '../server/seed.ts';

const PASSWORD = 'clave-de-prueba-123';
const CALL_TIMEOUT_S = 0.4;

let handle: AppHandle;
let relay: SimulatedRelay;
let base = '';
let port = 0;

class Client {
  cookie = '';
  async req(method: string, path: string, data?: unknown) {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null, headers: res.headers };
  }
  get = (p: string) => this.req('GET', p);
  post = (p: string, d: unknown = {}) => this.req('POST', p, d);
  async login(email: string, password = PASSWORD) {
    return this.post('/api/auth/login', { email, password });
  }
  ws(origin?: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
        headers: { Cookie: this.cookie, ...(origin ? { Origin: origin } : {}) },
      });
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
      ws.on('unexpected-response', (_r, res) => reject(new Error(`HTTP ${res.statusCode}`)));
    });
  }
}

async function as(email: string) {
  const c = new Client();
  const r = await c.login(email);
  assert.equal(r.status, 200, `login ${email}`);
  return c;
}

const waitFor = (ws: WebSocket, pred: (m: any) => boolean, ms = 2000) =>
  new Promise<any>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout esperando evento WS')), ms);
    ws.on('message', (raw) => {
      const m = JSON.parse(String(raw));
      if (pred(m)) {
        clearTimeout(t);
        resolve(m);
      }
    });
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  const config = loadConfig({
    NODE_ENV: 'test',
    CALL_TIMEOUT_SECONDS: String(CALL_TIMEOUT_S),
    STATIC_DIR: 'no-existe',
  } as NodeJS.ProcessEnv);
  const db = openDb(':memory:');
  seedDemo(db, PASSWORD);
  relay = new SimulatedRelay();
  handle = createApp(config, { db, relay });
  await new Promise<void>((r) => handle.server.listen(0, '127.0.0.1', r));
  port = (handle.server.address() as AddressInfo).port;
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  await handle.close();
});

describe('autenticación', () => {
  test('rechaza peticiones sin sesión', async () => {
    const c = new Client();
    for (const p of ['/api/units', '/api/calls', '/api/parcels', '/api/alerts']) {
      assert.equal((await c.get(p)).status, 401, p);
    }
  });

  test('login correcto fija cookie httpOnly + SameSite=Strict', async () => {
    const c = new Client();
    const r = await c.login('guardia@demo.citofonia.local');
    assert.equal(r.status, 200);
    assert.equal(r.json.user.role, 'guard');
    const setCookie = r.headers.get('set-cookie') ?? '';
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Strict/i);
    assert.equal((await c.get('/api/auth/me')).json.user.email, 'guardia@demo.citofonia.local');
  });

  test('credenciales incorrectas → 401 con el mismo mensaje exista o no el usuario', async () => {
    const a = await new Client().login('guardia@demo.citofonia.local', 'mala');
    const b = await new Client().login('nadie@demo.citofonia.local', 'mala');
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.json.error, b.json.error);
  });

  test('bloquea tras demasiados intentos fallidos', async () => {
    const c = new Client();
    let last = 0;
    for (let i = 0; i < 10; i++) last = (await c.login('bruteforce@demo.citofonia.local', 'x')).status;
    assert.equal(last, 429);
  });

  test('un token manipulado no sirve', async () => {
    const c = new Client();
    c.cookie = 'cv_token=eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.';
    assert.equal((await c.get('/api/units')).status, 401);
  });
});

describe('minimización de datos por rol', () => {
  test('vigilante: teléfono enmascarado, sin correo ni estado de cartera', async () => {
    const g = await as('guardia@demo.citofonia.local');
    const units = (await g.get('/api/units')).json;
    assert.ok(units.length >= 10);
    for (const u of units) {
      assert.equal(u.realPhone, undefined);
      assert.equal(u.email, undefined);
      assert.equal(u.status, undefined);
      assert.match(u.maskedPhone, /\*\*\*/);
    }
    assert.doesNotMatch(JSON.stringify(units), /300 000 00/);
  });

  test('residente: sólo su unidad', async () => {
    const r = await as('residente302@demo.citofonia.local');
    const units = (await r.get('/api/units')).json;
    assert.equal(units.length, 1);
    assert.equal(units[0].unitNumber, '302');
    assert.ok(units[0].realPhone);
  });

  test('admin ve todo', async () => {
    const a = await as('admin@demo.citofonia.local');
    const units = (await a.get('/api/units')).json;
    assert.ok(units.every((u: any) => u.realPhone && u.email && u.status));
  });

  test('el residente no puede ver el historial de otras unidades', async () => {
    const r = await as('residente302@demo.citofonia.local');
    const calls = (await r.get('/api/calls')).json;
    assert.ok(calls.length > 0);
    assert.ok(calls.every((c: any) => c.unitNumber === '302'));
  });
});

describe('permisos por rol', () => {
  test('el residente no puede iniciar llamadas ni abrir la puerta', async () => {
    const r = await as('residente302@demo.citofonia.local');
    assert.equal((await r.post('/api/calls', { unitId: 'x' })).status, 403);
    assert.equal((await r.post('/api/door/open', { unitId: 'x' })).status, 403);
    assert.equal((await r.get('/api/parking')).status, 403);
  });

  test('el vigilante no puede crear avisos ni usuarios', async () => {
    const g = await as('guardia@demo.citofonia.local');
    assert.equal((await g.post('/api/notices', { title: 't', category: 'urgente', message: 'm' })).status, 403);
    assert.equal((await g.post('/api/admin/users', {})).status, 403);
  });

  test('el administrador crea un usuario que luego puede iniciar sesión', async () => {
    const a = await as('admin@demo.citofonia.local');
    const bad = await a.post('/api/admin/users', { email: 'x@y.co', name: 'X', role: 'guard', password: 'corta' });
    assert.equal(bad.status, 400);
    const ok = await a.post('/api/admin/users', {
      email: 'Nuevo.Guardia@Demo.Citofonia.local',
      name: 'Nuevo Guardia',
      role: 'guard',
      password: 'otra-clave-larga-1',
    });
    assert.equal(ok.status, 201);
    assert.equal((await new Client().login('nuevo.guardia@demo.citofonia.local', 'otra-clave-larga-1')).status, 200);
    const dup = await a.post('/api/admin/users', {
      email: 'nuevo.guardia@demo.citofonia.local',
      name: 'Dup',
      role: 'guard',
      password: 'otra-clave-larga-1',
    });
    assert.equal(dup.status, 409);
  });

  test('entradas inválidas devuelven 400 (no 500)', async () => {
    const g = await as('guardia@demo.citofonia.local');
    assert.equal((await g.post('/api/calls', { unitId: 'apt-1-302', visitorType: 'hacker', visitorName: 'x' })).status, 400);
    assert.equal((await g.post('/api/calls', { visitorType: 'invitado' })).status, 400);
    const res = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{no es json',
    });
    assert.equal(res.status, 400);
  });
});

describe('flujo de llamada y apertura de puerta', () => {
  test('timbra al residente, autoriza, abre el relé una sola vez y queda en bitácora', async () => {
    const guard = await as('guardia@demo.citofonia.local');
    const res302 = await as('residente302@demo.citofonia.local');
    const unitId = (await guard.get('/api/units')).json.find((u: any) => u.unitNumber === '302').id;

    const ws = await res302.ws();
    const ring = waitFor(ws, (m) => m.type === 'ring');
    const before = relay.opened.length;

    const created = await guard.post('/api/calls', {
      unitId,
      visitorType: 'domiciliario',
      visitorName: 'Repartidor Rappi',
      company: 'Rappi',
      notes: 'Pedido',
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.status, 'ringing');
    const callId = created.json.id;
    assert.equal((await ring).callId, callId);

    const ok = await res302.post(`/api/calls/${callId}/authorize`);
    assert.equal(ok.status, 200);
    assert.equal(ok.json.status, 'authorized');
    assert.equal(relay.opened.length, before + 1);

    // Segunda autorización (doble clic / replay): no vuelve a abrir.
    assert.equal((await res302.post(`/api/calls/${callId}/authorize`)).status, 409);
    assert.equal(relay.opened.length, before + 1);

    const log = (await guard.get('/api/calls')).json;
    assert.equal(log.find((c: any) => c.id === callId).status, 'authorized');
    ws.close();
  });

  test('un residente de otra unidad no puede contestar ni autorizar', async () => {
    const guard = await as('guardia@demo.citofonia.local');
    const unitId = (await guard.get('/api/units')).json.find((u: any) => u.unitNumber === '302').id;
    const callId = (await guard.post('/api/calls', { unitId, visitorType: 'invitado', visitorName: 'Visita' })).json.id;

    const other = await as('residente402@demo.citofonia.local');
    const before = relay.opened.length;
    assert.equal((await other.post(`/api/calls/${callId}/authorize`)).status, 404);
    assert.equal(relay.opened.length, before);
    assert.equal((await guard.post(`/api/calls/${callId}/authorize`)).status, 403);

    // y el residente de 402 no recibe el timbre de 302
    const ws = await other.ws();
    let got = false;
    ws.on('message', (raw) => {
      if (JSON.parse(String(raw)).type === 'ring') got = true;
    });
    await guard.post('/api/calls', { unitId, visitorType: 'invitado', visitorName: 'Otra visita' });
    await sleep(150);
    assert.equal(got, false);
    ws.close();
  });

  test('si el relé falla, la llamada sigue sonando y se informa 502', async () => {
    const guard = await as('guardia@demo.citofonia.local');
    const res302 = await as('residente302@demo.citofonia.local');
    const unitId = (await guard.get('/api/units')).json.find((u: any) => u.unitNumber === '302').id;
    const callId = (await guard.post('/api/calls', { unitId, visitorType: 'invitado', visitorName: 'Visita' })).json.id;

    relay.failNext = true;
    assert.equal((await res302.post(`/api/calls/${callId}/authorize`)).status, 502);
    const st = (await res302.get('/api/calls')).json.find((c: any) => c.id === callId).status;
    assert.equal(st, 'ringing');
    // reintento
    assert.equal((await res302.post(`/api/calls/${callId}/authorize`)).status, 200);
  });

  test('una llamada sin respuesta pasa a "perdida" por tiempo', async () => {
    const guard = await as('guardia@demo.citofonia.local');
    const unitId = (await guard.get('/api/units')).json.find((u: any) => u.unitNumber === '204').id;
    const callId = (await guard.post('/api/calls', { unitId, visitorType: 'servicio', visitorName: 'Técnico' })).json.id;
    await sleep(CALL_TIMEOUT_S * 1000 + 300);
    const st = (await guard.get('/api/calls')).json.find((c: any) => c.id === callId).status;
    assert.equal(st, 'missed');
  });

  test('rechazar y colgar', async () => {
    const guard = await as('guardia@demo.citofonia.local');
    const res302 = await as('residente302@demo.citofonia.local');
    const unitId = (await guard.get('/api/units')).json.find((u: any) => u.unitNumber === '302').id;
    const a = (await guard.post('/api/calls', { unitId, visitorType: 'invitado', visitorName: 'A' })).json.id;
    assert.equal((await res302.post(`/api/calls/${a}/reject`)).json.status, 'rejected');
    const b = (await guard.post('/api/calls', { unitId, visitorType: 'invitado', visitorName: 'B' })).json.id;
    assert.equal((await guard.post(`/api/calls/${b}/hangup`)).json.status, 'missed');
  });

  test('apertura manual de portería queda registrada y exige relé OK', async () => {
    const guard = await as('guardia@demo.citofonia.local');
    const unitId = (await guard.get('/api/units')).json[0].id;
    const before = relay.opened.length;
    assert.equal((await guard.post('/api/door/open', { unitId, reason: 'Supervisión' })).status, 200);
    assert.equal(relay.opened.length, before + 1);
    const log = (await guard.get('/api/calls')).json;
    assert.equal(log[0].visitorName, 'Apertura manual de portería');
    relay.failNext = true;
    assert.equal((await guard.post('/api/door/open', { unitId })).status, 502);
  });
});

describe('paquetería y PIN', () => {
  async function newParcel(guard: Client) {
    const unitId = (await guard.get('/api/units')).json.find((u: any) => u.unitNumber === '302').id;
    const r = await guard.post('/api/parcels', { unitId, courier: 'Servientrega', trackingCode: 'T-1' });
    assert.equal(r.status, 201);
    return r.json;
  }

  test('el PIN sólo lo ve el residente destinatario', async () => {
    const guard = await as('guardia@demo.citofonia.local');
    const p = await newParcel(guard);
    assert.equal(p.pickupPin, undefined);
    assert.equal((await guard.get('/api/parcels')).json.some((x: any) => x.pickupPin), false);

    const res = await as('residente302@demo.citofonia.local');
    const mine = (await res.get('/api/parcels')).json.find((x: any) => x.id === p.id);
    assert.match(mine.pickupPin, /^\d{4}$/);

    const other = await as('residente402@demo.citofonia.local');
    assert.equal((await other.get('/api/parcels')).json.some((x: any) => x.id === p.id), false);
  });

  test('PIN correcto entrega; incorrecto cuenta intentos y bloquea al 5.º', async () => {
    const guard = await as('guardia@demo.citofonia.local');
    const res = await as('residente302@demo.citofonia.local');

    const good = await newParcel(guard);
    const pin = (await res.get('/api/parcels')).json.find((x: any) => x.id === good.id).pickupPin;
    const wrongPin = pin === '1234' ? '4321' : '1234';
    assert.equal((await guard.post(`/api/parcels/${good.id}/deliver`, { pin: wrongPin })).status, 403);
    assert.equal((await guard.post(`/api/parcels/${good.id}/deliver`, { pin })).json.status, 'entregado');
    assert.equal((await guard.post(`/api/parcels/${good.id}/deliver`, { pin })).status, 409);

    const locked = await newParcel(guard);
    const lockedPin = (await res.get('/api/parcels')).json.find((x: any) => x.id === locked.id).pickupPin;
    const bad = lockedPin === '0000' ? '1111' : '0000';
    for (let i = 0; i < 5; i++) assert.equal((await guard.post(`/api/parcels/${locked.id}/deliver`, { pin: bad })).status, 403);
    // Ya bloqueado: ni siquiera el PIN correcto entrega.
    assert.equal((await guard.post(`/api/parcels/${locked.id}/deliver`, { pin: lockedPin })).status, 429);
  });
});

describe('pases QR', () => {
  test('un solo uso, abre la puerta y registra la entrada', async () => {
    const res = await as('residente302@demo.citofonia.local');
    const guard = await as('guardia@demo.citofonia.local');
    const pass = await res.post('/api/qr', { guestName: 'Laura', notes: 'Almuerzo', hoursValid: 4 });
    assert.equal(pass.status, 201);
    assert.match(pass.json.qrCode, /^CV-[\w-]{12}$/);

    assert.equal((await guard.post('/api/qr/validate', { code: 'CV-inventado' })).status, 404);
    const before = relay.opened.length;
    const v = await guard.post('/api/qr/validate', { code: pass.json.qrCode });
    assert.equal(v.status, 200);
    assert.equal(v.json.guestName, 'Laura');
    assert.equal(relay.opened.length, before + 1);
    assert.equal((await guard.post('/api/qr/validate', { code: pass.json.qrCode })).status, 409);
    assert.equal(relay.opened.length, before + 1);
  });

  test('un pase vencido no abre', async () => {
    const res = await as('residente302@demo.citofonia.local');
    const guard = await as('guardia@demo.citofonia.local');
    const pass = (await res.post('/api/qr', { guestName: 'Tarde', hoursValid: 1 })).json;
    run(handle.ctx.db, 'UPDATE qr_passes SET valid_until = ? WHERE code = ?', Date.now() - 1000, pass.qrCode);
    assert.equal((await guard.post('/api/qr/validate', { code: pass.qrCode })).status, 410);
  });

  test('horas de validez fuera de rango → 400; el vigilante no puede crear pases', async () => {
    const res = await as('residente302@demo.citofonia.local');
    const guard = await as('guardia@demo.citofonia.local');
    assert.equal((await res.post('/api/qr', { guestName: 'X', hoursValid: 9999 })).status, 400);
    assert.equal((await guard.post('/api/qr', { guestName: 'X' })).status, 403);
  });
});

describe('alertas SOS', () => {
  test('la alerta llega a portería en tiempo real con el teléfono de emergencia', async () => {
    const guard = await as('guardia@demo.citofonia.local');
    const res = await as('residente302@demo.citofonia.local');
    const ws = await guard.ws();
    const evt = waitFor(ws, (m) => m.type === 'changed' && m.resource === 'alerts');

    const created = await res.post('/api/alerts', { type: 'medica' });
    assert.equal(created.status, 201);
    assert.equal(created.json.emergencyPhone, undefined); // el residente no recibe el campo
    await evt;

    const list = (await guard.get('/api/alerts')).json;
    const a = list.find((x: any) => x.id === created.json.id);
    assert.ok(a.emergencyPhone);

    // antirrebote
    const again = await res.post('/api/alerts', { type: 'medica' });
    assert.equal(again.json.id, created.json.id);

    assert.equal((await guard.post(`/api/alerts/${a.id}/dispatch`)).status, 200);
    assert.equal((await guard.post(`/api/alerts/${a.id}/dispatch`)).status, 409);
    assert.equal((await guard.post(`/api/alerts/${a.id}/resolve`, { notes: 'Todo en orden' })).status, 200);
    ws.close();
  });
});

describe('WebSocket', () => {
  test('rechaza conexiones sin sesión', async () => {
    await assert.rejects(new Client().ws());
  });

  test('rechaza un Origin ajeno (anti Cross-Site WebSocket Hijacking)', async () => {
    const g = await as('guardia@demo.citofonia.local');
    await assert.rejects(g.ws('https://evil.example.com'));
    const ok = await g.ws(`http://127.0.0.1:${port}`);
    ok.close();
  });
});

describe('avisos', () => {
  test('el administrador publica y el residente lo ve; puede marcarlo como leído', async () => {
    const admin = await as('admin@demo.citofonia.local');
    const res = await as('residente302@demo.citofonia.local');
    const n = await admin.post('/api/notices', {
      title: 'Corte de agua',
      category: 'urgente',
      message: 'Mañana 8am',
      targetTowers: ['Torre 1'],
    });
    assert.equal(n.status, 201);
    const mine = (await res.get('/api/notices')).json.find((x: any) => x.id === n.json.id);
    assert.ok(mine);
    assert.equal(mine.isRead, false);
    await res.post(`/api/notices/${n.json.id}/read`);
    assert.equal((await res.get('/api/notices')).json.find((x: any) => x.id === n.json.id).isRead, true);

    // un aviso sólo para Torre 1 no lo ve el de Torre 2
    const t2 = await as('residente402@demo.citofonia.local');
    assert.equal((await t2.get('/api/notices')).json.some((x: any) => x.id === n.json.id), false);
  });
});

describe('aislamiento entre conjuntos', () => {
  test('un vigilante de otro conjunto no ve ni toca datos del primero', async () => {
    const db = handle.ctx.db;
    run(db, "INSERT INTO complexes (id, name) VALUES ('cx-otro', 'Otro Conjunto')");
    run(
      db,
      `INSERT INTO units (id, complex_id, tower, unit_number, resident_name, phone) VALUES ('u-otro', 'cx-otro', 'T9', '1', 'Otro', '+57 300 000 9999')`
    );
    const { hashPassword } = await import('../server/auth.ts');
    run(
      db,
      `INSERT INTO users (id, complex_id, email, name, password_hash, role, active, created_at) VALUES ('g-otro', 'cx-otro', 'guardia-otro@x.co', 'Guardia Otro', ?, 'guard', 1, ?)`,
      hashPassword(PASSWORD),
      Date.now()
    );
    const other = await as('guardia-otro@x.co');
    const mine = await as('guardia@demo.citofonia.local');
    const firstUnit = (await mine.get('/api/units')).json[0].id;
    const callId = (await mine.post('/api/calls', { unitId: firstUnit, visitorType: 'invitado', visitorName: 'V' })).json.id;
    const parcel = (await mine.post('/api/parcels', { unitId: firstUnit, courier: 'X' })).json;

    assert.equal((await other.get('/api/units')).json.length, 1);
    assert.equal((await other.get('/api/calls')).json.some((c: any) => c.id === callId), false);
    assert.equal((await other.get('/api/parcels')).json.some((p: any) => p.id === parcel.id), false);
    assert.equal((await other.get('/api/parking')).json.length, 0);
    assert.equal((await other.post(`/api/calls/${callId}/hangup`)).status, 404);
    assert.equal((await other.post(`/api/parcels/${parcel.id}/deliver`, { pin: '0000' })).status, 404);
    assert.equal((await other.post('/api/calls', { unitId: firstUnit, visitorType: 'invitado', visitorName: 'V' })).status, 404);
    assert.equal((await other.post('/api/door/open', { unitId: firstUnit })).status, 404);
  });
});

describe('cabeceras y errores', () => {
  test('cabeceras de seguridad y 404 JSON', async () => {
    const res = await fetch(base + '/api/health');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-powered-by'), null);
    const c = await as('guardia@demo.citofonia.local');
    const nf = await c.get('/api/no-existe');
    assert.equal(nf.status, 404);
  });
});
