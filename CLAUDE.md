# La Ranita 3D — Contexto del proyecto

## Qué es esto
Tienda online de impresiones 3D (@laranita3d). Dueño: Cristián Gabriel Moya (monotributista,
CUIT propio — habilita circuito comercial completo de Correo Argentino).
Sitio en producción: `laranita3d.com.ar`
Repo GitHub: `klainghost/Paginalaranita` (branch `main`)

## Stack actual
- **Lenguaje/runtime:** Node.js 22 + Express 4
- **Base de datos:** SQLite vía `node:sqlite` (DatabaseSync), WAL mode, foreign keys ON
- **Sesiones:** express-session + connect-sqlite3 (archivo `data/sessions.db`)
- **Hosting:** VPS propio — acceso via GitHub webhook auto-deploy
- **Deploy automático:** `git push origin main` → webhook GitHub → servidor corre:
  `git pull origin main && npm install --omit=dev && pm2 restart ranita3d && pm2 save`
- **Archivos subidos:** `public/uploads/productos/` (excluido del repo, creado al arrancar)

## Reglas de trabajo con Claude Code
- Empezar SIEMPRE leyendo este archivo y verificando el "Estado actual".
- Al cerrar una sesión, actualizar la sección "Estado actual" antes de terminar.
- Nunca commitear credenciales — van en variables de entorno del servidor (`.env` local).
- Mantener funciones cortas y con un solo propósito.
- El webhook hace `npm install` automáticamente — no hay que SSH para nuevas dependencias.

## Arquitectura de archivos clave
```
server.js                  — entrada, monta todas las rutas
db/database.js             — initSchema() + runMigrations() (patrón: check → ALTER/INSERT)
lib/precio.js              — motor de precios, NO modificar lógica interna
routes/
  auth.js                  — login/logout/me
  admin.js                 — CRUD productos/mundos/categorías/parámetros/niveles/usuarios/pedidos/nav-links + upload imagen
  categorias.js            — GET /api/categorias, /api/categorias/:slug/productos, /todos/productos
  config.js                — GET /api/config/nav-links (público)
  carrito.js               — pedidos WA
  pedidos.js               — seguimiento
public/
  index.html               — home con hero + catálogo filtrado
  catalogo.html            — catálogo completo con chips de categoría
  admin.html               — panel de administración
  js/app.js                — lógica pública: fetch, renderGridProductos, initNavLinks, initHeroImages
  js/carrito.js            — drawer "Tu consulta", mensaje WA, colores por ítem
  css/styles.css           — design system completo (tokens CSS, dark mode manual)
```

## Modelo de datos relevante

### productos
`id, nombre, descripcion, gramos, horas, minutos, dificultad, precio_override,
precio_ajuste_pct, promo_descuento_pct, promo_hasta, makerworld_url, imagen_url,
notas, activo, mundo_id (FK, legacy), categoria_id (FK), categoria (sub-etiqueta libre),
tipo (stock|pedido), stock, stock_minimo, colores_json, imagenes_json,
licencia, extras_json, destacado`

### categorias
`id, nombre, slug, icono, descripcion, orden, activo`

### nav_links
`id, label, url, icono, orden, activo`
Controlado desde admin → pestaña "Navegación". El sitio carga los links dinámicamente
vía `GET /api/config/nav-links`.

### niveles_precio
`id, nombre, margen_pct`
Valores por defecto: publico (100%), revendedor (50%), mayorista (25%)

## Motor de precios (lib/precio.js)
`calcularPrecio(producto, parametros, nivel)` — nunca modificar su lógica interna.
Parámetros editables desde admin → Parámetros: `precio_kg`, `precio_kwh`,
`consumo_impresora_kw`, `costo_hora_maquina`.

## Design system
- **Fuentes:** Fredoka (headings) + Nunito (body) + Cinzel (solo tema Rol)
- **Colores:** `--lima:#B6E35A`, `--lila:#8B7CF6`, `--naranja:#FF9F43`, `--carbon:#1F1F24`
- **Tema oscuro:** SOLO manual vía `[data-theme="dark"]` — NUNCA `@media (prefers-color-scheme: dark)`
- **Tema Rol:** clase `.tema-rol` en `<body>` — dark bg, Cinzel, gold accent
  - Solo se activa si el usuario entra por `catalogo.html?categoria=rol&tematico=1`
- **Hero blobs:** `background-image` CSS con fotos de productos al azar (no `<img>`)
- **Carrito:** se llama "Tu consulta" — flujo WhatsApp, sin pago online por ahora

## Subida de imágenes (multer)
- Endpoint: `POST /api/admin/upload-imagen` (solo admin autenticado)
- Destino: `public/uploads/productos/` (creado automáticamente al arrancar)
- Límite: 8 MB, formatos: jpg/png/webp/gif
- La URL resultante (`/uploads/productos/archivo.jpg`) se guarda en `imagen_url`

## Estado actual (sesión 2026-09-28)

### Completado ✅
- Servidor Express + SQLite funcional en producción (`laranita3d.com.ar`)
- Auto-deploy via webhook GitHub → pm2
- Admin panel completo:
  - Productos (CRUD + activar/desactivar + **duplicar** + **subir imagen**)
  - Categorías (CRUD)
  - Mundos (CRUD, legacy — no visible en el sitio público)
  - Parámetros de costo
  - Niveles de precio
  - Usuarios (CRUD)
  - Pedidos (listado + detalle + cambio de estado)
  - **Navegación** (CRUD de nav_links — controla el navbar del sitio)
- Sitio público rediseñado (v4):
  - Navbar dinámico desde BD
  - Hero con fotos de productos al azar
  - Catálogo con chips de categoría
  - Carrito "Tu consulta" con selección de color por ítem → mensaje WA
  - Tema claro por defecto (nunca automático desde OS)
  - Experiencia Rolera: toggle solo en `?categoria=rol&tematico=1`

### Pendiente ⏳
- **Carga de productos** — trabajo manual en curso (Gaby agrega desde el admin)
- **Multer en servidor**: la primera vez después de agregar la dependencia hay que SSH
  y correr `npm install --omit=dev && pm2 restart ranita3d` (una sola vez)
- Integración Mercado Pago (Checkout Pro + webhook de pago)
- Integración Correo Argentino:
  - MiCorreo (cotización `/rates`) — requiere registro con CUIT + customerId
  - PAQ.ar (envíos comerciales) — requiere agreement + API-Key (en trámite)

## Variables de entorno necesarias
```
SESSION_SECRET=          # generado automáticamente si no existe (data/session.secret)
WEBHOOK_SECRET=          # secret del webhook de GitHub
ALLOWED_ORIGIN=          # ej: https://laranita3d.com.ar
# Futuras (aún no usadas):
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_PUBLIC_KEY=
CORREOARGENTINO_MICORREO_USER=
CORREOARGENTINO_MICORREO_PASSWORD=
CORREOARGENTINO_MICORREO_CUSTOMERID=
CORREOARGENTINO_PAQAR_AGREEMENT=
CORREOARGENTINO_PAQAR_APIKEY=
ORIGIN_POSTAL_CODE=      # CP de despacho: Malargüe
```

## Próximos pasos sugeridos
1. Terminar la carga manual de productos
2. Integración Mercado Pago (Checkout Pro — crear preferencia + webhook de confirmación)
3. Cotización de envío con tabla propia (fallback sin depender de APIs externas)
4. Cotización en vivo con MiCorreo (cuando lleguen las credenciales)
5. Alta automática de envío con PAQ.ar (cuando llegue el agreement)
