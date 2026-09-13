'use strict';

// En desarrollo: http://localhost:3001
// En producción: el mismo origen (Express sirve frontend y API juntos)
const API = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

/* ------------------------------------------------------------------ */
/* Sesión                                                               */
/* ------------------------------------------------------------------ */
async function getSession() {
  try {
    const r = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
    if (!r.ok) return null;
    const data = await r.json(); // { usuario: {...} | null }
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

/* ------------------------------------------------------------------ */
/* Mundos                                                               */
/* ------------------------------------------------------------------ */
async function getMundos() {
  const r = await fetch(`${API}/api/mundos`);
  if (!r.ok) throw new Error('No se pudo cargar la lista de mundos');
  return r.json();
}

async function getProductos(slug) {
  const r = await fetch(`${API}/api/mundos/${slug}/productos`, { credentials: 'include' });
  if (!r.ok) throw new Error('No se pudo cargar el catálogo');
  return r.json();
}

async function getCategorias() {
  const r = await fetch(`${API}/api/categorias`);
  if (!r.ok) throw new Error('No se pudo cargar las categorías');
  return r.json();
}

async function getProductosByCategoria(slug) {
  const r = await fetch(`${API}/api/categorias/${slug}/productos`, { credentials: 'include' });
  if (!r.ok) throw new Error('No se pudo cargar el catálogo');
  return r.json();
}

/* ------------------------------------------------------------------ */
/* CSS variables de mundo                                               */
/* ------------------------------------------------------------------ */
const FUENTES = {
  'Cinzel':             'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap',
  'Plus Jakarta Sans':  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap',
  'Playfair Display':   'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap',
};

function aplicarMundo(mundo) {
  const r = document.documentElement;
  r.style.setProperty('--mundo-acento', mundo.color_acento);
  r.style.setProperty('--mundo-fondo',  mundo.color_fondo);
  r.style.setProperty('--mundo-fuente', `'${mundo.tipografia_display}', serif`);

  // Clasifica el mundo como oscuro o claro → el CSS aplica los tokens correctos
  const oscuro = esColorOscuro(mundo.color_fondo);
  r.classList.toggle('mundo-oscuro',  oscuro);
  r.classList.toggle('mundo-claro',  !oscuro);

  // Carga la fuente si no está ya
  const url = FUENTES[mundo.tipografia_display];
  if (url && !document.querySelector(`link[data-fuente="${mundo.tipografia_display}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.dataset.fuente = mundo.tipografia_display;
    document.head.appendChild(link);
  }

  document.title = `${mundo.nombre} — La Ranita 3D`;
  actualizarIconoTema();
}

function esColorOscuro(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substr(0,2),16);
  const g = parseInt(c.substr(2,2),16);
  const b = parseInt(c.substr(4,2),16);
  // luminancia perceptual
  return (0.299*r + 0.587*g + 0.114*b) < 128;
}

/* ------------------------------------------------------------------ */
/* Toggle de tema claro / oscuro                                        */
/* ------------------------------------------------------------------ */
const TEMA_KEY = 'ranita-tema'; // valor en localStorage: 'dark' | 'light' | ausente

function _esPantallaOscura() {
  const tema = document.documentElement.getAttribute('data-theme');
  if (tema === 'dark') return true;
  if (tema === 'light') return false;
  // sin preferencia manual → el mundo decide
  return document.documentElement.classList.contains('mundo-oscuro');
}

function actualizarIconoTema() {
  const btn = document.getElementById('btn-tema');
  if (!btn) return;
  const oscuro = _esPantallaOscura();
  btn.textContent = oscuro ? '☀️' : '🌙';
  btn.setAttribute('title', oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  btn.setAttribute('aria-label', oscuro ? 'Tema claro' : 'Tema oscuro');
}

function initToggleTema() {
  // Restaurar preferencia guardada antes de pintar nada (evita flash)
  const guardado = localStorage.getItem(TEMA_KEY);
  if (guardado === 'dark' || guardado === 'light') {
    document.documentElement.setAttribute('data-theme', guardado);
  }
  actualizarIconoTema();

  document.getElementById('btn-tema')?.addEventListener('click', () => {
    const nuevoTema = _esPantallaOscura() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevoTema);
    localStorage.setItem(TEMA_KEY, nuevoTema);
    actualizarIconoTema();
  });
}

/* ------------------------------------------------------------------ */
/* Formato                                                              */
/* ------------------------------------------------------------------ */
function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

/* ------------------------------------------------------------------ */
/* Modal de login                                                       */
/* ------------------------------------------------------------------ */
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
    const email    = form.email.value.trim();
    const password = form.password.value;
    try {
      await login(email, password);
      location.reload();
    } catch (err) {
      errMsg.textContent = err.message;
      errMsg.classList.add('modal__error--visible');
    }
  });
}

/* ------------------------------------------------------------------ */
/* Navbar compacta al hacer scroll                                      */
/* ------------------------------------------------------------------ */
function initNavbarScroll() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('navbar--compacta', window.scrollY > 40);
  }, { passive: true });
}

/* ------------------------------------------------------------------ */
/* Toggle menú mobile                                                   */
/* ------------------------------------------------------------------ */
function initNavToggle() {
  document.querySelector('.navbar__toggle')?.addEventListener('click', () => {
    document.querySelector('.navbar__nav')?.classList.toggle('navbar__nav--abierto');
  });
}

/* ------------------------------------------------------------------ */
/* Estado de sesión en la navbar                                        */
/* ------------------------------------------------------------------ */
async function initNavbarSesion() {
  const sesion    = await getSession();
  const actionsEl = document.querySelector('.navbar__actions');
  if (!actionsEl) return sesion;

  // Preservar botones fijos antes de reemplazar el contenido
  const btnTema    = actionsEl.querySelector('#btn-tema');
  const btnCarrito = actionsEl.querySelector('#btn-carrito');

  if (sesion) {
    actionsEl.innerHTML = '';
    if (btnTema)    actionsEl.appendChild(btnTema);
    if (btnCarrito) actionsEl.appendChild(btnCarrito);

    const span = document.createElement('span');
    span.className = 'navbar__usuario';
    span.textContent = `${sesion.nivel_nombre} — ${sesion.email}`;

    const btnSalir = document.createElement('button');
    btnSalir.className = 'navbar__btn-login';
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

/* Exponer logout globalmente para onclick inline */
window.logout = logout;
