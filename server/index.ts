import crypto from 'node:crypto';
import 'dotenv/config';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { openDb } from './db.ts';
import { bootstrapAdmin, isEmpty, seedDemo } from './seed.ts';

const config = loadConfig();
const db = openDb(config.dbPath);

if (isEmpty(db)) {
  if (config.isProd) {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password || password.length < 12) {
      console.error('Base de datos vacía: define ADMIN_EMAIL y ADMIN_PASSWORD (mín. 12 caracteres) para crear el primer administrador.');
      process.exit(1);
    }
    bootstrapAdmin(db, { complexName: process.env.COMPLEX_NAME || 'Mi conjunto', email, password });
    console.log(`[seed] Administrador creado: ${email}`);
  } else {
    const password = process.env.DEMO_PASSWORD || crypto.randomBytes(9).toString('base64url');
    const creds = seedDemo(db, password);
    console.log('\n[seed] Datos de demostración creados. Usuarios (misma contraseña):');
    for (const u of creds.users) console.log(`  - ${u.role.padEnd(8)} ${u.email}${u.unit ? '  (' + u.unit + ')' : ''}`);
    console.log(`  Contraseña: ${creds.password}\n`);
  }
}

const { server } = createApp(config, { db });
server.listen(config.port, () => {
  console.log(`[server] Citofonía Virtual escuchando en http://localhost:${config.port} (${config.isProd ? 'producción' : 'desarrollo'})`);
});
