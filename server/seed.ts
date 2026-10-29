import crypto from 'node:crypto';
import { hashPassword } from './auth.ts';
import { get, run, type DB } from './db.ts';

const COMPLEX_ID = 'cx-demo';

interface SeedUnit {
  tower: string;
  n: string;
  name: string;
  phone: string;
  parking: string;
  status?: 'al_dia' | 'moroso' | 'desocupado';
  count?: number;
}

// Datos ficticios (teléfonos 300 000 00XX) para demos; nunca datos reales.
const UNITS: SeedUnit[] = [
  { tower: 'Torre 1', n: '101', name: 'Carlos Gómez & Familia', phone: '+57 300 000 0001', parking: 'P-12', count: 3 },
  { tower: 'Torre 1', n: '204', name: 'Valentina Restrepo', phone: '+57 300 000 0002', parking: 'P-18', count: 2 },
  { tower: 'Torre 1', n: '302', name: 'Juan Sebastián Morales', phone: '+57 300 000 0003', parking: 'P-22' },
  { tower: 'Torre 1', n: '405', name: 'Camila & Andrés Duarte', phone: '+57 300 000 0004', parking: 'P-05', count: 4 },
  { tower: 'Torre 2', n: '102', name: 'Dra. Helena Navarro', phone: '+57 300 000 0005', parking: 'P-31', count: 2 },
  { tower: 'Torre 2', n: '203', name: 'Felipe Jaramillo P.', phone: '+57 300 000 0006', parking: 'P-34' },
  { tower: 'Torre 2', n: '402', name: 'Alejandro & Sofía Cadavid', phone: '+57 300 000 0007', parking: 'P-40', count: 2 },
  { tower: 'Torre 2', n: '501', name: 'Mauricio Quintero', phone: '+57 300 000 0008', parking: 'P-44', status: 'moroso', count: 2 },
  { tower: 'Torre 3', n: '103', name: 'Gloria Inés Patiño', phone: '+57 300 000 0009', parking: 'P-50' },
  { tower: 'Torre 3', n: '301', name: 'David & Mariana Rincón', phone: '+57 300 000 0010', parking: 'P-55', count: 3 },
];

export interface DemoCredentials {
  password: string;
  users: Array<{ email: string; role: string; unit?: string }>;
}

/** Crea un conjunto de demostración con usuarios, historial, paquetes, avisos y parqueaderos. */
export function seedDemo(db: DB, password: string): DemoCredentials {
  run(db, 'INSERT INTO complexes (id, name) VALUES (?, ?)', COMPLEX_ID, 'Conjunto Residencial Los Nogales (demo)');

  const unitIds = new Map<string, string>();
  for (const u of UNITS) {
    const id = `apt-${u.tower.replace(/\D/g, '')}-${u.n}`;
    unitIds.set(`${u.tower}|${u.n}`, id);
    run(
      db,
      `INSERT INTO units (id, complex_id, tower, unit_number, resident_name, phone, email, status, residents_count, assigned_parking, preferred_channel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'App Móvil')`,
      id,
      COMPLEX_ID,
      u.tower,
      u.n,
      u.name,
      u.phone,
      `apto${u.n}.t${u.tower.replace(/\D/g, '')}@demo.citofonia.local`,
      u.status ?? 'al_dia',
      u.count ?? 1,
      u.parking
    );
  }

  const hash = hashPassword(password);
  const now = Date.now();
  const users: DemoCredentials['users'] = [];
  const addUser = (email: string, name: string, role: string, unitId: string | null, label?: string) => {
    run(
      db,
      `INSERT INTO users (id, complex_id, email, name, password_hash, role, unit_id, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      crypto.randomUUID(),
      COMPLEX_ID,
      email,
      name,
      hash,
      role,
      unitId,
      now
    );
    users.push({ email, role, unit: label });
  };
  addUser('admin@demo.citofonia.local', 'Administración Los Nogales', 'admin', null);
  addUser('guardia@demo.citofonia.local', 'Vigilante de Portería', 'guard', null);
  addUser('residente302@demo.citofonia.local', 'Juan Sebastián Morales', 'resident', unitIds.get('Torre 1|302')!, 'Torre 1 - 302');
  addUser('residente402@demo.citofonia.local', 'Sofía Cadavid', 'resident', unitIds.get('Torre 2|402')!, 'Torre 2 - 402');

  // Parqueaderos de visitantes.
  for (let i = 1; i <= 10; i++) {
    const num = String(i).padStart(2, '0');
    run(
      db,
      `INSERT INTO parking_slots (id, complex_id, slot_number, type, is_occupied) VALUES (?, ?, ?, ?, 0)`,
      `v-${num}`,
      COMPLEX_ID,
      `V-${num}`,
      i === 9 ? 'discapacidad' : 'visitante'
    );
  }

  // Avisos.
  const notice = (title: string, category: string, message: string, ageDays: number) =>
    run(
      db,
      `INSERT INTO notices (id, complex_id, title, category, message, target_towers, author, created_at)
       VALUES (?, ?, ?, ?, ?, '["Todas las torres"]', 'Administración Los Nogales', ?)`,
      crypto.randomUUID(),
      COMPLEX_ID,
      title,
      category,
      message,
      now - ageDays * 86_400_000
    );
  notice(
    'Mantenimiento del tanque de agua',
    'mantenimiento',
    'Se realizará lavado y desinfección preventiva de los tanques. Se solicita almacenar agua de reserva.',
    1
  );
  notice(
    'Protocolo de citofonía y visitantes',
    'informativo',
    'Por política de protección de datos (Ley 1581), el personal de vigilancia nunca suministra teléfonos a terceros. Las autorizaciones se hacen desde la app.',
    3
  );

  // Historial de llamadas determinista (para que la bitácora no esté vacía).
  const types = ['domiciliario', 'invitado', 'servicio', 'paqueteria'] as const;
  const names = ['Repartidor Rappi', 'Visita familiar', 'Técnico de internet', 'Mensajero Servientrega'];
  const statuses = ['authorized', 'authorized', 'authorized', 'rejected', 'missed'] as const;
  const unitList = [...unitIds.values()];
  for (let i = 0; i < 30; i++) {
    const t = now - (i * 7 + 2) * 3_600_000 - (i % 5) * 600_000;
    run(
      db,
      `INSERT INTO calls (id, complex_id, unit_id, visitor_type, visitor_name, company, snapshot, status, created_at, ended_at, authorized_by, notes)
       VALUES (?, ?, ?, ?, ?, '', NULL, ?, ?, ?, ?, '')`,
      crypto.randomUUID(),
      COMPLEX_ID,
      unitList[i % unitList.length],
      types[i % types.length],
      `${names[i % names.length]} #${100 + i}`,
      statuses[i % statuses.length],
      t,
      t + (12 + (i % 20)) * 1000,
      statuses[i % statuses.length] === 'authorized' ? 'Residente desde el celular (apertura remota)' : 'Sin autorización'
    );
  }

  return { password, users };
}

/** Primer arranque en producción: crea sólo el conjunto y un administrador. */
export function bootstrapAdmin(db: DB, opts: { complexName: string; email: string; password: string }): void {
  const id = 'cx-' + crypto.randomUUID().slice(0, 8);
  run(db, 'INSERT INTO complexes (id, name) VALUES (?, ?)', id, opts.complexName);
  run(
    db,
    `INSERT INTO users (id, complex_id, email, name, password_hash, role, unit_id, active, created_at)
     VALUES (?, ?, ?, 'Administrador', ?, 'admin', NULL, 1, ?)`,
    crypto.randomUUID(),
    id,
    opts.email.toLowerCase(),
    hashPassword(opts.password),
    Date.now()
  );
}

export function isEmpty(db: DB): boolean {
  return (get<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM users')?.n ?? 0) === 0;
}
