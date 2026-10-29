import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

export type DB = DatabaseSync;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS complexes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  tower TEXT NOT NULL,
  unit_number TEXT NOT NULL,
  resident_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'al_dia' CHECK (status IN ('al_dia','moroso','desocupado')),
  residents_count INTEGER NOT NULL DEFAULT 1,
  assigned_parking TEXT NOT NULL DEFAULT '',
  preferred_channel TEXT NOT NULL DEFAULT 'App Móvil',
  UNIQUE (complex_id, tower, unit_number)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','guard','resident')),
  unit_id TEXT REFERENCES units(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  unit_id TEXT NOT NULL REFERENCES units(id),
  visitor_type TEXT NOT NULL,
  visitor_name TEXT NOT NULL,
  company TEXT,
  snapshot TEXT,
  status TEXT NOT NULL CHECK (status IN ('ringing','authorized','rejected','missed')),
  created_at INTEGER NOT NULL,
  ended_at INTEGER,
  authorized_by TEXT,
  notes TEXT,
  created_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_calls_complex_created ON calls(complex_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_unit ON calls(unit_id, created_at DESC);

CREATE TABLE IF NOT EXISTS parcels (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  unit_id TEXT NOT NULL REFERENCES units(id),
  tracking_code TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  courier TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'en_porteria' CHECK (status IN ('en_porteria','entregado')),
  pickup_pin TEXT NOT NULL,
  pin_attempts INTEGER NOT NULL DEFAULT 0,
  arrived_at INTEGER NOT NULL,
  delivered_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_parcels_complex ON parcels(complex_id, arrived_at DESC);

CREATE TABLE IF NOT EXISTS parking_slots (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  slot_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('visitante','residente','discapacidad')),
  is_occupied INTEGER NOT NULL DEFAULT 0,
  vehicle_plate TEXT,
  unit_visiting TEXT,
  driver_name TEXT,
  entered_at INTEGER
);

CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('mantenimiento','urgente','asamblea','informativo')),
  message TEXT NOT NULL,
  target_towers TEXT NOT NULL DEFAULT '["Todas las torres"]',
  author TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notice_reads (
  notice_id TEXT NOT NULL REFERENCES notices(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (notice_id, user_id)
);

CREATE TABLE IF NOT EXISTS qr_passes (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  unit_id TEXT NOT NULL REFERENCES units(id),
  guest_name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  valid_until INTEGER NOT NULL,
  uses_remaining INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  unit_id TEXT NOT NULL REFERENCES units(id),
  type TEXT NOT NULL CHECK (type IN ('panico','medica','incendio','sospecha')),
  status TEXT NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','en_atencion','resuelta')),
  created_at INTEGER NOT NULL,
  responded_by TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_alerts_complex ON alerts(complex_id, created_at DESC);

CREATE TABLE IF NOT EXISTS door_events (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES complexes(id),
  door_id TEXT NOT NULL,
  source TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  call_id TEXT,
  ok INTEGER NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);
`;

export function openDb(path: string): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  return db;
}

type Param = SQLInputValue;

export function all<T>(db: DB, sql: string, ...params: Param[]): T[] {
  return db.prepare(sql).all(...params) as unknown as T[];
}

export function get<T>(db: DB, sql: string, ...params: Param[]): T | undefined {
  return db.prepare(sql).get(...params) as unknown as T | undefined;
}

export function run(db: DB, sql: string, ...params: Param[]): number {
  return Number(db.prepare(sql).run(...params).changes);
}
