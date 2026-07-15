(function () {
    var drawer, itemsContainer, totalEl;

    function getBase() {
        return typeof navBasePath !== "undefined" ? navBasePath : "";
    }

    function crearItemDrawer(producto) {
        var precioFmt = producto.precio.toLocaleString("es-AR");
        var base = getBase();
        return '<div class="cart-drawer__item" data-id="' + producto.id + '">' +
            '<img src="' + base + 'images/' + producto.imagen + '" alt="' + producto.titulo + '" class="cart-drawer__item-img">' +
            '<div class="cart-drawer__item-info">' +
                '<p class="cart-drawer__item-title">' + producto.titulo + '</p>' +
                '<p class="cart-drawer__item-precio">$' + precioFmt + ' × ' + producto.cantidad + '</p>' +
                '<div class="cart-drawer__cantidad">' +
                    '<div class="cantidad-container">' +
                        '<button class="btn-cantidad" data-accion="menos">−</button>' +
                        '<span class="cantidad-producto">' + producto.cantidad + '</span>' +
                        '<button class="btn-cantidad" data-accion="mas">+</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<button class="cart-drawer__item-remove" data-id="' + producto.id + '" aria-label="Quitar">✕</button>' +
        '</div>';
    }

    function renderizarItems() {
        var carrito = obtenerCarrito();

        if (carrito.length === 0) {
            itemsContainer.innerHTML = '<p class="cart-drawer__empty">Tu carrito está vacío 🐸</p>';
            totalEl.textContent = "";
            return;
        }

        itemsContainer.innerHTML = carrito.map(crearItemDrawer).join("");

        var total = carrito.reduce(function (acc, i) { return acc + i.precio * i.cantidad; }, 0);
        totalEl.textContent = "Total: $" + total.toLocaleString("es-AR");

        itemsContainer.querySelectorAll(".cart-drawer__item-remove").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var id = this.dataset.id;
                guardarCarrito(obtenerCarrito().filter(function (i) { return i.id !== id; }));
                actualizarContadorCarrito();
                renderizarItems();
            });
        });

        itemsContainer.querySelectorAll(".btn-cantidad").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var itemEl = this.closest(".cart-drawer__item");
                var carrito = obtenerCarrito();
                var idx = carrito.findIndex(function (p) { return p.id === itemEl.dataset.id; });
                if (idx === -1) return;

                if (this.dataset.accion === "mas") {
                    carrito[idx].cantidad++;
                } else if (carrito[idx].cantidad > 1) {
                    carrito[idx].cantidad--;
                } else {
                    carrito.splice(idx, 1);
                }

                guardarCarrito(carrito);
                actualizarContadorCarrito();
                renderizarItems();
            });
        });
    }

    function abrir() {
        drawer.classList.add("cart-drawer--abierto");
        document.body.style.overflow = "hidden";
        renderizarItems();
    }

    function cerrar() {
        drawer.classList.remove("cart-drawer--abierto");
        document.body.style.overflow = "";
    }

    function crearDOM() {
        if (document.getElementById("cartDrawer")) return;

        var base = getBase();
        var cartUrl = base + "pages/carrito/carrito.html";

        drawer = document.createElement("div");
        drawer.id = "cartDrawer";
        drawer.className = "cart-drawer";
        drawer.innerHTML =
            '<div class="cart-drawer__overlay"></div>' +
            '<div class="cart-drawer__panel">' +
                '<div class="cart-drawer__header">' +
                    '<h3 class="cart-drawer__title">🛒 Tu Carrito</h3>' +
                    '<button class="cart-drawer__close" aria-label="Cerrar">✕</button>' +
                '</div>' +
                '<div class="cart-drawer__items" id="cartDrawerItems"></div>' +
                '<div class="cart-drawer__footer">' +
                    '<p class="cart-drawer__total" id="cartDrawerTotal"></p>' +
                    '<a href="' + cartUrl + '" class="cart-drawer__btn-ver">Ver carrito completo →</a>' +
                '</div>' +
            '</div>';

        document.body.appendChild(drawer);
        itemsContainer = document.getElementById("cartDrawerItems");
        totalEl = document.getElementById("cartDrawerTotal");

        drawer.querySelector(".cart-drawer__overlay").addEventListener("click", cerrar);
        drawer.querySelector(".cart-drawer__close").addEventListener("click", cerrar);
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") cerrar();
        });
    }

    window.abrirCarritoDrawer = abrir;
    window.cerrarCarritoDrawer = cerrar;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", crearDOM);
    } else {
        crearDOM();
    }
})();
