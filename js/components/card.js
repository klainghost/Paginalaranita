function crearCard(producto) {
    const base = typeof navBasePath !== "undefined" ? navBasePath : "";

    return `
        <div class="product-card">
            <img src="${base}images/${producto.imagen}" alt="${producto.titulo}" class="product-card__image">
            <div class="product-card__body">
                <h3 class="product-card__title">${producto.titulo}</h3>
                <p class="product-card__description">${producto.descripcion}</p>
                <p class="product-card__price">$${producto.precio}</p>
                <div class="cantidad-container">
                    <button class="btn-cantidad" data-accion="menos">-</button>
                    <span class="cantidad-producto">1</span>
                    <button class="btn-cantidad" data-accion="mas">+</button>
                </div>
                <button class="product-card__button btn-agregar-carrito"
                    data-id="${producto.id}"
                    data-titulo="${producto.titulo}"
                    data-precio="${producto.precio}"
                    data-imagen="${producto.imagen}">
                    Añadir al Carrito
                </button>
            </div>
        </div>
    `;
}

function activarBotonesCantidad() {
    document.querySelectorAll(".btn-cantidad").forEach((btn) => {
        btn.addEventListener("click", function () {
            const card = this.closest(".product-card");
            const cantidadSpan = card.querySelector(".cantidad-producto");
            let cantidad = parseInt(cantidadSpan.textContent);

            if (this.dataset.accion === "mas") {
                cantidad++;
            } else if (this.dataset.accion === "menos" && cantidad > 1) {
                cantidad--;
            }

            cantidadSpan.textContent = cantidad;
        });
    });
}

function agregarAlCarrito(producto) {
    const carrito = obtenerCarrito();
    const existente = carrito.find((item) => item.id === producto.id);

    if (existente) {
        existente.cantidad += producto.cantidad;
    } else {
        carrito.push(producto);
    }

    guardarCarrito(carrito);
    actualizarContadorCarrito();
    alert(`${producto.titulo} se agregó al carrito.`);
}

function activarBotonesCarrito() {
    document.querySelectorAll(".btn-agregar-carrito").forEach((btn) => {
        btn.addEventListener("click", function () {
            const card = this.closest(".product-card");
            const cantidadSpan = card.querySelector(".cantidad-producto");
            const cantidad = parseInt(cantidadSpan.textContent);

            agregarAlCarrito({
                id: this.dataset.id,
                titulo: this.dataset.titulo,
                precio: parseFloat(this.dataset.precio),
                imagen: this.dataset.imagen,
                cantidad: cantidad
            });

            cantidadSpan.textContent = "1";
        });
    });
}

function generarCards() {
    const contenedores = document.querySelectorAll("[data-categoria]");
    if (contenedores.length === 0) return;

    const base = typeof navBasePath !== "undefined" ? navBasePath : "";

    fetch(`${base}api/data.json`)
        .then((response) => response.json())
        .then((data) => {
            contenedores.forEach((contenedor) => {
                const categoria = contenedor.dataset.categoria;
                const limite = parseInt(contenedor.dataset.limite);

                let productos = data.productos.filter((p) => p.categoria === categoria);
                if (!isNaN(limite)) {
                    productos = productos.slice(0, limite);
                }

                productos.forEach((producto) => {
                    contenedor.innerHTML += crearCard(producto);
                });
            });

            activarBotonesCantidad();
            activarBotonesCarrito();
        });
}

generarCards();
