function crearItemCarrito(producto) {
    const base = typeof navBasePath !== "undefined" ? navBasePath : "";
    const subtotal = producto.precio * producto.cantidad;

    return `
        <div class="cart-item" data-id="${producto.id}">
            <img src="${base}images/${producto.imagen}" alt="${producto.titulo}" class="cart-item__image">
            <div class="cart-item__info">
                <h3 class="cart-item__title">${producto.titulo}</h3>
                <p class="cart-item__detail">Precio unitario: $${producto.precio}</p>
                <div class="cantidad-container">
                    <button class="btn-cantidad" data-accion="menos">-</button>
                    <span class="cantidad-producto">${producto.cantidad}</span>
                    <button class="btn-cantidad" data-accion="mas">+</button>
                </div>
                <p class="cart-item__subtotal">Subtotal: $${subtotal}</p>
            </div>
            <button class="btn-eliminar" data-id="${producto.id}">Eliminar</button>
        </div>
    `;
}

function activarBotonesEliminar() {
    document.querySelectorAll(".btn-eliminar").forEach((btn) => {
        btn.addEventListener("click", function () {
            const carrito = obtenerCarrito().filter((item) => item.id !== this.dataset.id);
            guardarCarrito(carrito);
            actualizarContadorCarrito();
            generarCarrito();
        });
    });
}

function activarBotonesCantidadCarrito() {
    document.querySelectorAll(".cart-item .btn-cantidad").forEach((btn) => {
        btn.addEventListener("click", function () {
            const item = this.closest(".cart-item");
            const carrito = obtenerCarrito();
            const producto = carrito.find((p) => p.id === item.dataset.id);
            if (!producto) return;

            if (this.dataset.accion === "mas") {
                producto.cantidad++;
            } else if (this.dataset.accion === "menos" && producto.cantidad > 1) {
                producto.cantidad--;
            }

            guardarCarrito(carrito);
            actualizarContadorCarrito();
            generarCarrito();
        });
    });
}

const WHATSAPP_NUMERO = "5492604349945";

function generarMensajeWhatsapp(carrito, total) {
    const usuario = obtenerUsuario();

    let mensaje = "¡Hola! 👋 Quiero realizar este pedido en *LA RANITA 3D*:\n\n";

    carrito.forEach((item) => {
        const subtotal = item.precio * item.cantidad;
        mensaje += `🔹 ${item.titulo}\n`;
        mensaje += `   Cantidad: ${item.cantidad} — Precio unitario: $${item.precio} — Subtotal: $${subtotal}\n\n`;
    });

    mensaje += `💰 *Total: $${total}*\n\n`;

    if (usuario && usuario.nombre) {
        mensaje += `Nombre: ${usuario.nombre}\n\n`;
    }

    mensaje += "¿Podrían confirmarme disponibilidad y forma de pago? ¡Gracias!";

    return mensaje;
}

function activarBotonWhatsapp(carrito, total) {
    const boton = document.getElementById("btnWhatsapp");
    if (!boton) return;

    boton.addEventListener("click", () => {
        const mensaje = generarMensajeWhatsapp(carrito, total);
        const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, "_blank");

        guardarCarrito([]);
        actualizarContadorCarrito();
        generarCarrito();
    });
}

function generarCarrito() {
    const contenedor = document.getElementById("carritoContainer");
    const resumen = document.getElementById("carritoResumen");
    if (!contenedor || !resumen) return;

    const carrito = obtenerCarrito();

    if (carrito.length === 0) {
        contenedor.innerHTML = "<p>Tu carrito está vacío.</p>";
        resumen.innerHTML = "";
        return;
    }

    contenedor.innerHTML = carrito.map(crearItemCarrito).join("");

    const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
    resumen.innerHTML = `
        <p class="cart-total">Total: $${total}</p>
        <button type="button" class="btn-whatsapp" id="btnWhatsapp">Finalizar compra por WhatsApp</button>
    `;

    activarBotonesEliminar();
    activarBotonesCantidadCarrito();
    activarBotonWhatsapp(carrito, total);
}

generarCarrito();
