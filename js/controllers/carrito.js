function crearItemCarrito(producto) {
    const base = typeof navBasePath !== "undefined" ? navBasePath : "";
    const subtotal = producto.precio * producto.cantidad;

    return `
        <div class="cart-item">
            <img src="${base}images/${producto.imagen}" alt="${producto.titulo}" class="cart-item__image">
            <div class="cart-item__info">
                <h3 class="cart-item__title">${producto.titulo}</h3>
                <p class="cart-item__detail">Precio unitario: $${producto.precio}</p>
                <p class="cart-item__detail">Cantidad: ${producto.cantidad}</p>
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
    resumen.innerHTML = `<p class="cart-total">Total: $${total}</p>`;

    activarBotonesEliminar();
}

generarCarrito();
