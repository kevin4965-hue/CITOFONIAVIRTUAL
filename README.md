# Citofonía Virtual

Sistema de citofonía virtual en la nube para propiedad horizontal: el vigilante llama desde la portería, el residente contesta en su celular y abre la puerta de forma remota. Incluye bitácora de accesos, paquetería con PIN, parqueaderos de visitantes, pases QR para invitados, avisos y botón SOS.

## Qué incluye

- **Backend** (`server/`): Express + SQLite (`node:sqlite`), autenticación con JWT en cookie `httpOnly`, roles, WebSocket en tiempo real y un driver de relé para la puerta.
- **Frontend** (`src/`): React 19 + Vite + Tailwind. Una vista por rol: consola de portería (vigilante), celular (residente) y administración.
- **Pruebas** (`tests/`): 29 pruebas de API con `node:test` (seguridad, permisos, flujo de llamada, PIN, QR, relé).

## Inicio rápido

Requiere **Node 22.5 o superior**.

```bash
npm install
npm run dev          # web en :3000, API en :3001
```

En el primer arranque (base vacía, modo desarrollo) se crean datos de demostración y la consola imprime los usuarios y una contraseña aleatoria (o la que definas en `DEMO_PASSWORD`):

| Rol | Correo |
| --- | --- |
| Administración | `admin@demo.citofonia.local` |
| Portería | `guardia@demo.citofonia.local` |
| Residente (T1-302) | `residente302@demo.citofonia.local` |
| Residente (T2-402) | `residente402@demo.citofonia.local` |

Para ver el flujo completo, abre dos navegadores (o una ventana privada): uno como guardia y otro como residente.

```bash
npm test             # pruebas del backend
npm run lint         # typecheck de frontend y backend
npm run build        # frontend (dist/) + servidor (server.js)
npm start            # producción: node server.js
```

## Roles y permisos

| Acción | Residente | Vigilante | Admin |
| --- | :-: | :-: | :-: |
| Ver unidades | solo la suya | todas, teléfono enmascarado, sin correo ni cartera | todo |
| Llamar al residente / abrir puerta manual | – | sí | sí |
| Contestar, autorizar o rechazar llamada | solo de su unidad | – | – |
| Registrar y entregar paquetes | ver los suyos (con PIN) | sí (sin ver el PIN) | sí |
| Parqueaderos | – | sí | sí |
| Pases QR | crear y ver los suyos | validar | validar |
| Alerta SOS | enviar | ver y atender (con teléfono de emergencia) | ídem |
| Avisos | leer | leer | publicar |
| Crear usuarios y unidades | – | – | sí (`POST /api/admin/...`) |

## Seguridad

- Contraseñas con bcrypt; límite de intentos de login; mensaje idéntico si el usuario no existe.
- Sesión en cookie `httpOnly` + `SameSite=Strict` (+ `Secure` en producción). Cada petición revalida al usuario en la base de datos, así que desactivar un usuario o cambiarle el rol surte efecto de inmediato.
- WebSocket con autenticación por cookie y verificación de `Origin`.
- PIN de paquetes y códigos QR generados con `crypto` (CSPRNG) y validados **en el servidor**; el PIN se bloquea tras 5 intentos fallidos; los QR son de un solo uso y vencen.
- Minimización de datos (Ley 1581): el vigilante nunca recibe el teléfono real ni el correo del residente, salvo el teléfono de emergencia dentro de una alerta SOS.
- Todas las aperturas de puerta quedan registradas (tabla `door_events`) con origen, usuario y resultado.

## Puerta / relé

Por defecto la puerta es **simulada** (`/api/health` responde `"relay":"simulated"`). Para conectar un controlador real define `RELAY_URL` y `RELAY_SECRET`: el servidor hace un `POST` con `{doorId, seconds, ts, nonce}` y la cabecera `X-Signature` (HMAC-SHA256 del cuerpo). El firmware debe verificar la firma, rechazar `ts` antiguos y `nonce` repetidos, y cerrar solo tras `seconds`. Si el relé falla, la llamada sigue sonando y el residente puede reintentar.

## Despliegue

1. Genera un secreto: `openssl rand -hex 32` y defínelo como `JWT_SECRET`.
2. Define `ADMIN_EMAIL` y `ADMIN_PASSWORD` para crear el primer administrador (base vacía).
3. Ejecuta detrás de HTTPS (Railway, Render, Fly.io, un VPS con Caddy/Nginx). La app confía en un proxy (`trust proxy`) en producción.
4. **Monta un volumen persistente** para `DB_PATH` y programa copias de seguridad del archivo SQLite.

Con Docker: `docker build -t citofonia . && docker run -p 3001:3001 -v citofonia-data:/data -e JWT_SECRET=... -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... citofonia`. (El `Dockerfile` está escrito pero no se ha probado en este entorno.)

SQLite sirve para un conjunto o un grupo pequeño de conjuntos en una sola instancia. Para muchos conjuntos o varias réplicas, migra a Postgres.

## Limitaciones conocidas

- **Sin audio/video real.** La llamada es señalización en tiempo real (timbre, contestar, abrir). El sonido del timbre es sintetizado y la imagen de la "cámara tótem" es una foto de ejemplo. Falta WebRTC (con servidor TURN) y captura de cámara.
- **Sin notificaciones push.** El residente debe tener la app abierta; para producción añade PWA con Web Push o una app móvil (FCM/APNs) para que el celular suene con la app cerrada.
- La interfaz del residente aún usa el marco de teléfono de la maqueta.
- No hay pantallas de administración para crear usuarios/unidades (existen los endpoints).
- Los textos de la bitácora incluyen etiquetas de desarrollo ("DashboardAnalytics", "callHistory") pendientes de pulir.
- El paquete JS pesa ~750 kB (gráficas); conviene dividirlo con imports dinámicos.
- Falta una licencia de producto explícita (el encabezado de los archivos dice Apache-2.0).
