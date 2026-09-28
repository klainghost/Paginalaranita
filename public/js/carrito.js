'use strict';

const CARRITO_LS_KEY = 'ranita-carrito-v2';
const WA_NUM         = '5492604581757';

/* ──────────────────────────────────────────────────────────
   Módulo Carrito
   - Sin sesión → localStorage
   - Con sesión → servidor (tabla carrito_items)
   Cada item puede tener `color_elegido` (nombre del color)
   ────────────────────────────────────────────────────────── */
const Carrito = (() => {
  let _sesion = null;
  let _items  = [];

  const _isServer = () => !!_sesion;
  const _notify   = () =>
    document.dispatchEvent(new CustomEvent('carrito:actualizado', { detail: [..._items] }));

  const _lsRead  = () => { try { return JSON.parse(localStorage.getItem(CARRITO_LS_KEY) || '[]'); } catch { return []; } };
  const _lsWrite = items => { try { localStorage.setItem(CARRITO_LS_KEY, JSON.stringify(items)); } catch {} };

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

    getItems:  () => [..._items],
    getCount:  () => _items.reduce((s, i) => s + i.cantidad, 0),
    getTotal:  () => _items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0),
    getSesion: () => _sesion,

    async agregar(producto) {
      if (_isServer()) {
        const existing      = _items.find(i => i.producto_id === producto.id);
        const nuevaCantidad = existing ? existing.cantidad + 1 : 1;
        await _call('POST', '/items', { producto_id: producto.id, cantidad: nuevaCantidad });
        _items = await _serverLoad();
        // El color se guarda solo en LS como metadata visual (el server no lo necesita)
        _guardarColorMeta(producto.id, producto.color_elegido);
      } else {
        const existing = _items.find(i => i.producto_id === producto.id);
        if (existing) {
          existing.cantidad += 1;
          if (producto.color_elegido) existing.color_elegido = producto.color_elegido;
        } else {
          _items.push({
            producto_id:     producto.id,
            nombre:          producto.nombre,
            imagen_url:      producto.imagen_url || null,
            categoria:       producto.categoria  || null,
            cantidad:        1,
            precio_unitario: producto.precio,
            color_elegido:   producto.color_elegido || null,
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

    getColorMeta(producto_id) {
      return _leerColorMeta(producto_id);
    },
  };

  function _guardarColorMeta(pid, color) {
    if (!color) return;
    try {
      const meta = JSON.parse(localStorage.getItem('ranita-color-meta') || '{}');
      meta[pid] = color;
      localStorage.setItem('ranita-color-meta', JSON.stringify(meta));
    } catch {}
  }

  function _leerColorMeta(pid) {
    try {
      const meta = JSON.parse(localStorage.getItem('ranita-color-meta') || '{}');
      return meta[pid] || null;
    } catch { return null; }
  }
})();

/* ──────────────────────────────────────────────────────────
   Drawer UI — "Tu consulta"
   ────────────────────────────────────────────────────────── */
function initCarritoDrawer() {
  const drawer  = document.getElementById('carrito-drawer');
  const overlay = document.getElementById('carrito-overlay');
  if (!drawer || !overlay) return;

  const open  = () => {
    drawer.classList.add('carrito-drawer--abierto');
    overlay.classList.add('carrito-overlay--visible');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    drawer.classList.remove('carrito-drawer--abierto');
    overlay.classList.remove('carrito-overlay--visible');
    document.body.style.overflow = '';
  };

  document.getElementById('btn-carrito')?.addEventListener('click', open);
  document.getElementById('btn-cerrar-carrito')?.addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  document.getElementById('btn-finalizar')?.addEventListener('click', async () => {
    const items = Carrito.getItems();
    if (!items.length) return;

    const btn = document.getElementById('btn-finalizar');
    btn.disabled = true;
    btn.textContent = 'Preparando consulta…';

    // Intentar crear el pedido en el servidor (no falla si hay error)
    let codigo = null;
    try {
      const r = await fetch(`${API}/api/pedidos`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          total:      Carrito.getTotal(),
          usuario_id: Carrito.getSesion()?.id || null,
        }),
      });
      const data = await r.json();
      if (data.ok) codigo = data.codigo;
    } catch {}

    btn.disabled = false;
    btn.textContent = '💬 Consultar por WhatsApp';

    // Construir mensaje WA
    const lineas = items.map(i => {
      const color = i.color_elegido || Carrito.getColorMeta?.(i.producto_id);
      const colorStr = color ? ` (color: ${color})` : '';
      return `• ${i.cantidad}x ${i.nombre}${colorStr} — ${formatPrecio(i.precio_unitario * i.cantidad)}`;
    });
    const total  = formatPrecio(Carrito.getTotal());
    const codStr = codigo ? `\n\n🔖 Referencia: *${codigo}*` : '';
    const msg    = `Hola Ranita! 🐸 Quiero consultar por estos productos:\n\n${lineas.join('\n')}\n\nTotal estimado: ${total} (sin envío)\n¿Están disponibles?${codStr}`;

    window.open(`https://wa.me/${WA_NUM}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  });

  document.addEventListener('carrito:actualizado', e => _renderDrawer(e.detail));
}

function _renderDrawer(items) {
  const badge  = document.getElementById('carrito-badge');
  const count  = items.reduce((s, i) => s + i.cantidad, 0);
  if (badge) {
    badge.textContent = count;
    badge.hidden = count === 0;
  }

  const listaEl  = document.getElementById('carrito-lista');
  const vacioEl  = document.getElementById('carrito-vacio');
  const footerEl = document.getElementById('carrito-footer');
  const totalEl  = document.getElementById('carrito-total-monto');
  if (!listaEl) return;

  if (!items.length) {
    listaEl.innerHTML = '';
    if (vacioEl)  vacioEl.style.display  = 'block';
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  if (vacioEl)  vacioEl.style.display  = 'none';
  if (footerEl) footerEl.style.display = 'flex';

  listaEl.innerHTML = items.map(item => {
    const color = item.color_elegido || Carrito.getColorMeta?.(item.producto_id);
    return `
    <div class="c-item">
      <div class="c-item__img">
        ${item.imagen_url
          ? `<img src="${item.imagen_url}" alt="${item.nombre}" loading="lazy">`
          : '<span>🐸</span>'}
      </div>
      <div class="c-item__info">
        <div class="c-item__nombre">${item.nombre}</div>
        ${color ? `<div class="c-item__color">Color: ${color}</div>` : ''}
        <div class="c-item__precio">${formatPrecio(item.precio_unitario)}</div>
        <div class="c-item__qty">
          <button class="c-qty-btn" onclick="Carrito.setCantidad(${item.producto_id}, ${item.cantidad - 1})">−</button>
          <span>${item.cantidad}</span>
          <button class="c-qty-btn" onclick="Carrito.setCantidad(${item.producto_id}, ${item.cantidad + 1})">+</button>
        </div>
      </div>
      <div class="c-item__derecha">
        <div class="c-item__subtotal">${formatPrecio(item.precio_unitario * item.cantidad)}</div>
        <button class="c-item__del" onclick="Carrito.quitar(${item.producto_id})" title="Quitar">✕</button>
      </div>
    </div>`;
  }).join('');

  if (totalEl) totalEl.textContent = formatPrecio(items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0));
}

window.Carrito = Carrito;
