'use strict';

const CARRITO_LS_KEY = 'ranita-carrito-v1';

/* ------------------------------------------------------------------ */
/* Módulo Carrito                                                        */
/* Detecta automáticamente si el usuario tiene sesión:                  */
/*   - Con sesión  → persiste en el servidor (tabla carrito_items)      */
/*   - Sin sesión  → persiste en localStorage                           */
/* ------------------------------------------------------------------ */
const Carrito = (() => {
  let _sesion = null;
  let _items  = [];

  const _isServer = () => !!_sesion;

  const _notify = () =>
    document.dispatchEvent(new CustomEvent('carrito:actualizado', { detail: [..._items] }));

  // ── localStorage ────────────────────────────────────────────────────
  const _lsRead  = () => { try { return JSON.parse(localStorage.getItem(CARRITO_LS_KEY) || '[]'); } catch { return []; } };
  const _lsWrite = items => { try { localStorage.setItem(CARRITO_LS_KEY, JSON.stringify(items)); } catch {} };

  // ── API helpers ──────────────────────────────────────────────────────
  const _call = (method, path, body) =>
    fetch(`${API}/api/carrito${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });

  const _serverLoad = async () => {
    const r = await _call('GET', '/');
    return r.ok ? r.json() : [];
  };

  // Al iniciar sesión: migra items de LS al servidor (sin pisar lo que ya tenía)
  const _mergeLS = async () => {
    const ls = _lsRead();
    if (!ls.length) return;
    const serverIds = new Set(_items.map(i => i.producto_id));
    for (const item of ls) {
      if (!serverIds.has(item.producto_id)) {
        await _call('POST', '/items', { producto_id: item.producto_id, cantidad: item.cantidad });
      }
    }
    _lsWrite([]);
  };

  return {
    async init(sesion) {
      _sesion = sesion;
      if (_isServer()) {
        _items = await _serverLoad();
        await _mergeLS();
        _items = await _serverLoad();
      } else {
        _items = _lsRead();
      }
      _notify();
    },

    getItems: () => [..._items],
    getCount: () => _items.reduce((s, i) => s + i.cantidad, 0),
    getTotal: () => _items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0),

    async agregar(producto) {
      if (_isServer()) {
        const existing      = _items.find(i => i.producto_id === producto.id);
        const nuevaCantidad = existing ? existing.cantidad + 1 : 1;
        await _call('POST', '/items', { producto_id: producto.id, cantidad: nuevaCantidad });
        _items = await _serverLoad();
      } else {
        const existing = _items.find(i => i.producto_id === producto.id);
        if (existing) {
          existing.cantidad += 1;
        } else {
          _items.push({
            producto_id:     producto.id,
            nombre:          producto.nombre,
            imagen_url:      producto.imagen_url || null,
            categoria:       producto.categoria  || null,
            cantidad:        1,
            precio_unitario: producto.precio,
          });
        }
        _lsWrite(_items);
      }
      _notify();
    },

    async setCantidad(producto_id, cantidad) {
      if (cantidad < 1) return this.quitar(producto_id);
      if (_isServer()) {
        await _call('POST', '/items', { producto_id, cantidad });
        _items = await _serverLoad();
      } else {
        const item = _items.find(i => i.producto_id === producto_id);
        if (item) item.cantidad = cantidad;
        _lsWrite(_items);
      }
      _notify();
    },

    async quitar(producto_id) {
      if (_isServer()) {
        await _call('DELETE', `/items/${producto_id}`);
        _items = await _serverLoad();
      } else {
        _items = _items.filter(i => i.producto_id !== producto_id);
        _lsWrite(_items);
      }
      _notify();
    },

    async vaciar() {
      if (_isServer()) {
        await _call('DELETE', '/');
        _items = [];
      } else {
        _items = [];
        _lsWrite([]);
      }
      _notify();
    },
  };
})();

/* ------------------------------------------------------------------ */
/* Drawer UI                                                             */
/* ------------------------------------------------------------------ */
function initCarritoDrawer() {
  const drawer  = document.getElementById('carrito-drawer');
  const overlay = document.getElementById('carrito-overlay');
  if (!drawer || !overlay) return;

  const open  = () => { drawer.classList.add('carrito-drawer--abierto'); overlay.classList.add('carrito-overlay--visible'); };
  const close = () => { drawer.classList.remove('carrito-drawer--abierto'); overlay.classList.remove('carrito-overlay--visible'); };

  document.getElementById('btn-carrito')?.addEventListener('click', open);
  document.getElementById('btn-cerrar-carrito')?.addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  document.getElementById('btn-finalizar')?.addEventListener('click', () => {
    const items = Carrito.getItems();
    if (!items.length) return;
    const lineas = items.map(i =>
      `• ${i.cantidad}x ${i.nombre} — ${formatPrecio(i.precio_unitario * i.cantidad)}`
    ).join('\n');
    const total = formatPrecio(Carrito.getTotal());
    const txt   = encodeURIComponent(`Hola! Quiero hacer un pedido:\n\n${lineas}\n\nTotal: ${total}`);
    window.open(`https://wa.me/5492604581757?text=${txt}`, '_blank', 'noopener');
  });

  document.addEventListener('carrito:actualizado', e => _renderDrawer(e.detail));
}

function _renderDrawer(items) {
  // Badge en el botón de la navbar
  const badge = document.getElementById('carrito-badge');
  const count = items.reduce((s, i) => s + i.cantidad, 0);
  if (badge) {
    badge.textContent = count;
    badge.hidden = count === 0;
  }

  const listaEl   = document.getElementById('carrito-lista');
  const vacioEl   = document.getElementById('carrito-vacio');
  const footerEl  = document.getElementById('carrito-footer');
  const totalEl   = document.getElementById('carrito-total-monto');
  if (!listaEl) return;

  if (!items.length) {
    listaEl.innerHTML = '';
    if (vacioEl)  vacioEl.hidden  = false;
    if (footerEl) footerEl.hidden = true;
    return;
  }

  if (vacioEl)  vacioEl.hidden  = true;
  if (footerEl) footerEl.hidden = false;

  listaEl.innerHTML = items.map(item => `
    <div class="c-item">
      <div class="c-item__img">
        ${item.imagen_url
          ? `<img src="${item.imagen_url}" alt="${item.nombre}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=c-item__placeholder>🐸</span>'">`
          : '<span class="c-item__placeholder">🐸</span>'}
      </div>
      <div class="c-item__info">
        <div class="c-item__nombre">${item.nombre}</div>
        <div class="c-item__precio">${formatPrecio(item.precio_unitario)}</div>
        <div class="c-item__qty">
          <button class="c-qty-btn" onclick="Carrito.setCantidad(${item.producto_id}, ${item.cantidad - 1})">−</button>
          <span class="c-qty-valor">${item.cantidad}</span>
          <button class="c-qty-btn" onclick="Carrito.setCantidad(${item.producto_id}, ${item.cantidad + 1})">+</button>
        </div>
      </div>
      <div class="c-item__derecha">
        <div class="c-item__subtotal">${formatPrecio(item.precio_unitario * item.cantidad)}</div>
        <button class="c-item__del" onclick="Carrito.quitar(${item.producto_id})" title="Quitar">✕</button>
      </div>
    </div>
  `).join('');

  const total = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
  if (totalEl) totalEl.textContent = formatPrecio(total);
}

/* Exponer globalmente */
window.Carrito = Carrito;
