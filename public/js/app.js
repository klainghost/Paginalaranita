'use strict';

const API = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

/* ── Sesión ──────────────────────────────────────────────── */
async function getSession() {
  try {
    const r = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
    if (!r.ok) return null;
    const data = await r.json();
    return data.usuario || null;
  } catch { return null; }
}

async function login(email, password) {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Error al iniciar sesión' }));
    throw new Error(err.error || 'Error al iniciar sesión');
  }
  return r.json();
}

async function logout() {
  await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  location.reload();
}
window.logout = logout;

/* ── API de datos ────────────────────────────────────────── */
async function getCategorias() {
  const r = await fetch(`${API}/api/categorias`);
  if (!r.ok) throw new Error('No se pudo cargar las categorías');
  return r.json();
}

async function getTodosProductos() {
  const r = await fetch(`${API}/api/categorias/todos/productos`, { credentials: 'include' });
  if (!r.ok) throw new Error('No se pudo cargar el catálogo');
  return r.json();
}

async function getProductosByCategoria(slug) {
  const r = await fetch(`${API}/api/categorias/${slug}/productos`, { credentials: 'include' });
  if (!r.ok) throw new Error('No se pudo cargar el catálogo');
  return r.json();
}

// Mantener compatibilidad con mundo.html
async function getMundos() {
  const r = await fetch(`${API}/api/mundos`);
  if (!r.ok) throw new Error('No se pudo cargar');
  return r.json();
}
async function getProductos(slug) {
  const r = await fetch(`${API}/api/mundos/${slug}/productos`, { credentials: 'include' });
  if (!r.ok) throw new Error('No se pudo cargar');
  return r.json();
}

/* ── Mapa de colores hex → nombre ────────────────────────── */
const COLOR_NOMBRES = {
  '#8B7CF6': 'Violeta',
  '#B6E35A': 'Lima',
  '#FF9F43': 'Naranja',
  '#1F1F24': 'Negro',
  '#FAFAF7': 'Blanco',
  '#D62828': 'Rojo',
  '#F5D90A': 'Amarillo',
  '#3A8DDE': 'Azul',
  '#1F3A6B': 'Azul marino',
  '#8A8A8A': 'Gris',
  '#A8A8B3': 'Gris claro',
  '#25D366': 'Verde',
  '#FF6B6B': 'Coral',
  '#C9A227': 'Dorado',
  '#2EC4B6': 'Turquesa',
  '#E76F51': 'Terracota',
  '#FFFFFF': 'Blanco',
  '#000000': 'Negro',
};

function colorNombre(hex) {
  if (!hex) return '';
  const key = hex.toUpperCase();
  return COLOR_NOMBRES[key] || COLOR_NOMBRES[hex] || hex;
}

/* ── Render de cards de producto ─────────────────────────── */
const _colorSeleccion = {};
const _listenedGrids  = new WeakSet();

function renderGridProductos(productos, container) {
  if (!container) return;

  if (!productos.length) {
    container.innerHTML = '<div class="estado-vacio">No hay productos en esta categoría todavía.</div>';
    return;
  }

  container.innerHTML = productos.map(p => _cardHTML(p)).join('');

  if (!_listenedGrids.has(container)) {
    _listenedGrids.add(container);
    container.addEventListener('click', e => _handleCardClick(e, productos));
  }
}

function _cardHTML(p) {
  const colores = (() => { try { return JSON.parse(p.colores_json || '[]'); } catch { return []; } })();
  const selIdx  = _colorSeleccion[p.id] ?? 0;

  const badge = (() => {
    if (p.tipo === 'pedido') return '<span class="badge badge--pedido">Por encargo</span>';
    if (p.stock <= 0)        return '';
    if (p.stock <= (p.stock_minimo || 1)) return '<span class="badge badge--low">¡Últimos!</span>';
    return '<span class="badge badge--stock">✓ Disponible</span>';
  })();

  const colorDots = colores.length ? `
    <div class="card__colors">
      ${colores.map((c, i) =>
        `<button class="color-dot ${i === selIdx ? 'sel' : ''}"
                 style="background:${c}"
                 data-pid="${p.id}" data-idx="${i}"
                 aria-label="${colorNombre(c)}"
                 title="${colorNombre(c)}"></button>`
      ).join('')}
    </div>` : '';

  const precioTachado = p.promo_activa
    ? `<span class="card__price-tachado">${formatPrecio(p.precio_sin_promo)}</span>` : '';

  return `
    <article class="card">
      <div class="card__thumb">
        ${badge}
        ${p.imagen_url
          ? `<img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy">`
          : `<span aria-hidden="true">🐸</span>`}
      </div>
      <div class="card__body">
        <div class="card__cat">${esc(p.categoria || '')}</div>
        <h3 class="card__nombre">${esc(p.nombre)}</h3>
        ${colorDots}
        <div class="card__foot">
          <div>
            ${precioTachado}
            <div class="card__price">${formatPrecio(p.precio)}</div>
          </div>
          <button class="card__add" data-pid="${p.id}">Agregar</button>
        </div>
      </div>
    </article>`;
}

function _handleCardClick(e, productos) {
  // Color dot
  const dot = e.target.closest('.color-dot');
  if (dot) {
    const pid = Number(dot.dataset.pid);
    const idx = Number(dot.dataset.idx);
    _colorSeleccion[pid] = idx;
    // Actualizar visual dentro de la misma card
    const card = dot.closest('.card');
    card?.querySelectorAll('.color-dot').forEach((d, i) => d.classList.toggle('sel', i === idx));
    return;
  }

  // Botón agregar
  const btn = e.target.closest('.card__add');
  if (btn) {
    const pid = Number(btn.dataset.pid);
    const producto = productos.find(p => p.id === pid);
    if (!producto) return;

    const colores  = (() => { try { return JSON.parse(producto.colores_json || '[]'); } catch { return []; } })();
    const selIdx   = _colorSeleccion[pid] ?? 0;
    const colorHex = colores[selIdx] || null;

    Carrito.agregar({ ...producto, color_elegido: colorHex ? colorNombre(colorHex) : null });
    mostrarToast('Agregado a la consulta 🐸');
    return;
  }
}

/* ── Formato de precio ───────────────────────────────────── */
function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

/* ── Hero blobs con imágenes de productos al azar ────────── */
function initHeroImages(productos) {
  const blobs = document.querySelectorAll('.blob');
  if (!blobs.length) return;

  const conImg = productos.filter(p => p.imagen_url);
  if (!conImg.length) return;

  const pool = [...conImg].sort(() => Math.random() - 0.5);

  blobs.forEach((blob, i) => {
    const prod = pool[i % pool.length];
    blob.textContent = '';                            // quita el emoji
    blob.style.backgroundImage    = `url('${prod.imagen_url}')`;
    blob.style.backgroundSize     = 'cover';
    blob.style.backgroundPosition = 'center';
  });
}

/* ── Escape HTML ─────────────────────────────────────────── */
function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Toast ───────────────────────────────────────────────── */
function mostrarToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

/* ── Toggle tema ─────────────────────────────────────────── */
const TEMA_KEY = 'ranita-tema';

function _esTemaOscuro() {
  // Solo responde al atributo manual — nunca al sistema operativo
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function actualizarIconoTema() {
  const btn = document.getElementById('btn-tema');
  if (!btn) return;
  const oscuro = _esTemaOscuro();
  btn.textContent = oscuro ? '☀️' : '🌙';
  btn.title = oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
  btn.setAttribute('aria-label', oscuro ? 'Tema claro' : 'Tema oscuro');
}

function initToggleTema() {
  // Por defecto siempre light; solo cambia si el usuario lo guardó manualmente
  let guardado = 'light';
  try { guardado = localStorage.getItem(TEMA_KEY) || 'light'; } catch {}
  document.documentElement.setAttribute('data-theme', guardado === 'dark' ? 'dark' : 'light');
  actualizarIconoTema();

  document.getElementById('btn-tema')?.addEventListener('click', () => {
    const nuevo = _esTemaOscuro() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevo);
    try { localStorage.setItem(TEMA_KEY, nuevo); } catch {}
    actualizarIconoTema();
  });
}

/* ── Navbar mobile toggle ────────────────────────────────── */
function initNavToggle() {
  document.querySelector('.navbar__toggle')?.addEventListener('click', () => {
    document.querySelector('.navbar__nav')?.classList.toggle('navbar__nav--abierto');
  });
}

/* ── Modal login ─────────────────────────────────────────── */
function initLoginModal() {
  const overlay  = document.getElementById('modal-login');
  const form     = document.getElementById('form-login');
  const errMsg   = document.getElementById('login-error');
  const btnLogin = document.getElementById('btn-login');
  const btnClose = document.getElementById('modal-cerrar');
  if (!overlay) return;

  btnLogin?.addEventListener('click', () => {
    overlay.classList.add('modal-overlay--visible');
    form?.querySelector('input[name="email"]')?.focus();
  });
  btnClose?.addEventListener('click', () => overlay.classList.remove('modal-overlay--visible'));
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('modal-overlay--visible');
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    errMsg.classList.remove('modal__error--visible');
    try {
      await login(form.email.value.trim(), form.password.value);
      location.reload();
    } catch (err) {
      errMsg.textContent = err.message;
      errMsg.classList.add('modal__error--visible');
    }
  });
}

/* ── Estado de sesión en navbar ──────────────────────────── */
async function initNavbarSesion() {
  const sesion    = await getSession();
  const actionsEl = document.querySelector('.navbar__actions');
  if (!actionsEl) return sesion;

  const btnTema    = actionsEl.querySelector('#btn-tema');
  const btnCarrito = actionsEl.querySelector('#btn-carrito');

  if (sesion) {
    actionsEl.innerHTML = '';
    if (btnTema)    actionsEl.appendChild(btnTema);
    if (btnCarrito) actionsEl.appendChild(btnCarrito);

    const span = document.createElement('span');
    span.className = 'navbar__usuario';
    span.textContent = sesion.email;

    const btnSalir = document.createElement('button');
    btnSalir.className = 'icon-btn';
    btnSalir.style = 'font-size:.8rem;width:auto;padding:0 14px;';
    btnSalir.textContent = 'Salir';
    btnSalir.addEventListener('click', logout);

    actionsEl.appendChild(span);
    actionsEl.appendChild(btnSalir);
  } else {
    const btnLogin = actionsEl.querySelector('#btn-login');
    if (btnTema && btnLogin && actionsEl.firstChild !== btnTema) {
      actionsEl.insertBefore(btnTema, btnLogin);
    }
    if (btnCarrito && btnLogin) {
      actionsEl.insertBefore(btnCarrito, btnLogin);
    }
  }

  return sesion;
}

// Compatibilidad con mundo.html
function aplicarMundo(mundo) {
  document.documentElement.style.setProperty('--lila', mundo.color_acento || '#c9a227');
}
function esColorOscuro(hex) {
  const c = hex.replace('#', '');
  return (0.299*parseInt(c.substr(0,2),16) + 0.587*parseInt(c.substr(2,2),16) + 0.114*parseInt(c.substr(4,2),16)) < 128;
}
