# La Ranita 3D — Hoja de ruta técnica

Última actualización: 2026-09-10 — sitio online, deploy continuo vía webhook

---

## Qué es esto

Backend propio para La Ranita 3D (@laranita3d), tienda de impresión 3D.  
Corre en la compu Linux del dueño, expuesto a internet con **Cloudflare Tunnel** en el subdominio `api.laranita3d.com.ar`.  
El frontend (sitio estático actual en `laranita3d.com.ar`) consume la API vía `fetch`.

---

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 22 LTS (mínimo 22.5 para `node:sqlite`) |
| Servidor | Express 4 |
| Base de datos | SQLite vía `node:sqlite` (builtin — sin dependencias nativas) |
| Auth | express-session + bcrypt (sesiones en SQLite) |
| Proceso | pm2 o systemd (pendiente configurar en Linux) |

---

## Estructura de archivos

```
REBRANDING WEB Ranita/
├── server.js              ← Entry point (puerto 3001)
├── package.json
├── .gitignore             ← Excluye node_modules/ y data/
│
├── db/
│   ├── database.js        ← Conexión SQLite + esquema + helper p()
│   └── seed.js            ← Datos iniciales (mundos, niveles, admin)
│
├── lib/
│   └── precio.js          ← Motor de precio (función única — nadie la duplica)
│
├── routes/
│   ├── auth.js            ← Login / logout / me
│   ├── mundos.js          ← Catálogo de mundos
│   ├── productos.js       ← Catálogo público/revendedor por mundo
│   └── admin.js           ← CRUD productos, usuarios, parámetros, niveles
│
├── middleware/
│   └── auth.js            ← requireAuth / requireAdmin
│
└── data/                  ← Generado en runtime (gitignoreado)
    ├── ranita.db          ← Base de datos SQLite
    └── sessions.db        ← Sesiones persistidas
```

---

## Base de datos — tablas

```sql
mundos           id, nombre, slug, color_acento, color_fondo, tipografia_display, descripcion, activo
niveles_precio   id, nombre, margen_pct
usuarios         id, email, password_hash, nivel_precio_id, es_admin, creado_en
parametros_costo id(=1), precio_kg, precio_kwh, consumo_impresora_kw, costo_hora_maquina
productos        id, mundo_id, nombre, categoria, descripcion, gramos, horas, minutos, dificultad,
                 precio_override, precio_ajuste_pct, promo_descuento_pct, promo_hasta,
                 makerworld_url, imagen_url, notas, activo
```

---

## Motor de precio (`lib/precio.js`)

Función única `calcularPrecio(producto, parametros, nivel)`. Nadie recalcula el precio fuera de ella.

**Orden de cálculo:**

```
costo_filamento   = gramos × (precio_kg / 1000)
costo_electricidad = horas_total × consumo_kw × precio_kwh
subtotal          = costo_filamento + costo_electricidad

tier (dificultad):
  2.0 Básico    → factor 2.0, mínimo  $600
  2.5 Estándar  → factor 2.5, mínimo $1000
  3.5 Avanzado  → factor 3.5, mínimo $1500
  4.5 Premium   → factor 4.5, mínimo $2500

costo_produccion  = max(subtotal × factor, minimo)
margen            = costo_produccion × (nivel.margen_pct / 100)
costo_maquina     = horas_total × costo_hora_maquina
precio_base       = costo_produccion + margen + costo_maquina

↓ ajuste (uno u otro, no los dos):
  si precio_override != null  → precio_ajustado = precio_override
  si precio_ajuste_pct != 0   → precio_ajustado = precio_base × (1 + pct/100)
  si ninguno                  → precio_ajustado = precio_base

↓ promo (si promo_descuento_pct > 0 y promo_hasta es futuro):
  precio_final = precio_ajustado × (1 - promo_descuento_pct/100)
```

---

## Mundos y paletas de color

| Mundo | Slug | Acento | Fondo | Fuente |
|---|---|---|---|---|
| Rol y Miniaturas | `rol` | `#c9a227` dorado | `#1a2e1a` verde bosque | Cinzel |
| Oficina y Funcional | `oficina` | `#84cc16` verde lima | `#f8fafc` blanco | Plus Jakarta Sans |
| Regalos y Decoración | `regalos` | `#d97706` dorado cálido | `#fdf2f8` rosa pálido | Playfair Display |

Cada mundo aplica su paleta como CSS custom properties en el frontend. La lógica de catálogo y motor de precio es la misma para todos.

---

## Niveles de precio

| Nivel | `margen_pct` | Quién |
|---|---|---|
| `publico` | 100% | Cualquier visitante sin login |
| `revendedor` | 50% | Cuenta con login de revendedor |
| `mayorista` | 25% | Cuenta con login de mayorista |

> ⚠ Los valores de `margen_pct` son placeholder. Ajustar con `PUT /api/admin/niveles/:id` antes de usar en producción.

---

## API — endpoints

### Públicos

```
GET  /api/mundos                        Lista mundos activos
GET  /api/mundos/:slug/productos        Catálogo de un mundo
                                        → precio calculado según nivel del caller
                                          (público si no hay sesión)
POST /api/auth/login                    { email, password } → sesión
POST /api/auth/logout                   Cierra sesión
GET  /api/auth/me                       Nivel del usuario actual (null si no hay sesión)
```

### Admin (requiere login con es_admin = true)

```
GET    /api/admin/productos             Lista todos los productos con desglose de precio
POST   /api/admin/productos             Crear producto
PUT    /api/admin/productos/:id         Editar producto
DELETE /api/admin/productos/:id         Desactivar producto (soft delete)

GET    /api/admin/parametros            Ver parámetros de costo actuales
PUT    /api/admin/parametros            Actualizar parámetros de costo
                                        { precio_kg, precio_kwh, consumo_impresora_kw, costo_hora_maquina }

GET    /api/admin/mundos                Lista mundos (con inactivos)

GET    /api/admin/niveles               Lista niveles de precio
PUT    /api/admin/niveles/:id           Actualizar margen de un nivel { margen_pct }

GET    /api/admin/usuarios              Lista usuarios (sin password_hash)
POST   /api/admin/usuarios              Crear cuenta { email, password, nivel_precio_id }
PUT    /api/admin/usuarios/:id          Editar cuenta (email, password o nivel)
DELETE /api/admin/usuarios/:id          Borrar cuenta (no puede borrarse a sí mismo)
```

---

## Poner en marcha (primera vez)

```bash
# En la compu Linux (Node 22 LTS):
git clone <repo>
cd "REBRANDING WEB Ranita"
npm install
node db/seed.js    # crea la DB y carga datos iniciales
npm start          # arranca en puerto 3001
```

**Antes de cargar productos reales, configurar:**

1. **Parámetros de costo** — `PUT /api/admin/parametros`
   ```json
   {
     "precio_kg": 14000,
     "precio_kwh": 130,
     "consumo_impresora_kw": 0.25,
     "costo_hora_maquina": 200
   }
   ```
   *(ajustar a los valores actuales del negocio)*

2. **Márgenes por nivel** — `PUT /api/admin/niveles/:id`
   - id=1 publico, id=2 revendedor, id=3 mayorista

3. **Cambiar contraseña del admin** — `PUT /api/admin/usuarios/1`
   ```json
   { "password": "nueva-clave-segura" }
   ```

4. **Variable de entorno SESSION_SECRET** — en `.env` o en el sistema:
   ```
   SESSION_SECRET=una-cadena-larga-y-aleatoria
   ```

---

## Roadmap por fases

### ✅ Fase 1 — Backend mínimo + catálogo (completa)
- Node + Express + SQLite en la compu del usuario
- Motor de precio único (`lib/precio.js`)
- Un mundo (Rol) como piloto
- API de catálogo pública y CRUD de productos para admin
- Configuración de parámetros de costo desde la API

### ✅ Fase 2 — Niveles de precio (completa)
- Login de revendedor/mayorista con precio calculado por nivel de sesión
- CRUD de cuentas de usuario desde el admin
- Verificado: tres niveles ven precios distintos de la misma pieza

### ✅ Fase 3 — Sistema de mundos + tema claro/oscuro (completa)

#### Frontend multi-mundo
- Landing "elegí tu mundo" (`public/index.html`) con cards dinámicas cargadas desde la API
- Catálogo por mundo (`public/mundo.html`) con filtro por categoría y botón "Pedir por WhatsApp"
- `server.js` sirve `public/` como archivos estáticos — mismo proceso Express sirve API y frontend

#### Sistema de diseño (`public/css/styles.css`)
- Tokens CSS adaptativos: `--mundo-acento`, `--mundo-fondo`, `--mundo-fuente` seteados por JS al cargar el mundo
- **Tema oscuro/claro automático**: JS clasifica cada mundo como oscuro o claro según luminancia del `color_fondo` y agrega clase `mundo-oscuro` / `mundo-claro` a `<html>`
- **Toggle manual** 🌙/☀️ en la navbar: persiste en `localStorage`, se restaura antes de pintar (sin flash)
- Prioridad del tema (mayor a menor): `[data-theme="light"]` → `[data-theme="dark"]` → `.mundo-oscuro` → claro por defecto
- OS dark mode: aplica automáticamente al modal y elementos neutros cuando no hay preferencia manual
- Cards de producto: todos los colores usan tokens (`--card-bg`, `--card-title`, `--card-text-muted`, etc.) — nunca hardcodeados
- Fuentes Google cargadas dinámicamente por mundo (Cinzel / Plus Jakarta Sans / Playfair Display)

#### Correcciones de bugs
- `getSession()` ahora desenvuelve `{ usuario: {...} }` correctamente (antes devolvía `undefined` en navbar)
- `initNavbarSesion()` preserva el botón de tema al reemplazar el contenido de la navbar
- URL de la API auto-detectada: `''` en producción (mismo origen), `http://localhost:3001` en desarrollo

#### Despliegue
- Repo: `github.com/klainghost/Paginalaranita` rama `main`
- Servidor: Linux con Cloudflare Tunnel (dashboard Cloudflare → tunnel `laranita3d`, rutas apuntan a `http://localhost:8080`)
- pm2 arranca el servidor en **puerto 8080** para coincidir con lo configurado en el tunnel remoto
- Sitio online en `https://laranita3d.com.ar` ✓

#### Deploy continuo (workflow actual)
- Desde la compu de desarrollo: `.\deploy.ps1` (o `.\deploy.ps1 "mensaje"`)
- El script hace `git push origin main`
- GitHub llama al webhook `POST /webhook/deploy` en el servidor vía Cloudflare Tunnel
- El servidor verifica la firma HMAC-SHA256 con `WEBHOOK_SECRET` y ejecuta `git pull origin main && pm2 restart ranita3d`
- Para cambios que agregan dependencias nuevas (`npm install`): hacer SSH local o extender el comando del webhook
- `WEBHOOK_SECRET` se pasa inline al arrancar pm2: `PORT=8080 WEBHOOK_SECRET='...' pm2 start server.js --name ranita3d`

### ⬜ Fase 4 — Panel admin + producción (pendiente)
- Panel de admin propio (UI web, no solo API REST)
- Backup automático de `data/ranita.db` (cron diario → repo privado o storage)
- `SESSION_SECRET` configurado en pm2 (actualmente usa el valor por defecto de desarrollo)

---

## Variables de entorno

```
SESSION_SECRET=          # cadena aleatoria larga, requerida en producción
PORT=8080                # en producción debe coincidir con el tunnel de Cloudflare
WEBHOOK_SECRET=          # secreto HMAC para el webhook de GitHub (generado con python3 secrets.token_hex(32))
ALLOWED_ORIGIN=          # origen del frontend, ej: https://laranita3d.com.ar
NODE_ENV=production      # activa cookies secure
```

### Cómo arrancar el servidor en producción

```bash
PORT=8080 WEBHOOK_SECRET='...' SESSION_SECRET='...' pm2 start server.js --name ranita3d
pm2 save
pm2 startup   # solo la primera vez, para que arranque con el sistema
```

---

## Notas de arquitectura

- **Inventario arranca de cero** — los productos del sitio anterior (`data.json`) tienen precios hardcodeados incorrectos y no se migran.
- **El precio nunca se guarda** — siempre se calcula al vuelo; lo que se guarda son los inputs (`gramos`, `horas`, `dificultad`, etc.).
- **El precio de un nivel barato nunca viaja al navegador de otro nivel** — ni oculto en el JSON.
- **SQLite `data/ranita.db` es el único estado persistente** — no hay servidor de DB externo que administrar. Hacer backup de ese archivo es suficiente.
- **`node:sqlite` es experimental** pero estable para este uso. En Node 22+ funciona sin flags adicionales.
