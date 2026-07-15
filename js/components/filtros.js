(function () {
    var contenedor;
    var countEl;
    var listo = false;

    function getPrecio(card) {
        var btn = card.querySelector(".btn-agregar-carrito");
        return btn ? parseFloat(btn.dataset.precio) || 0 : 0;
    }

    function getNombre(card) {
        var t = card.querySelector(".product-card__title");
        return t ? t.textContent.trim() : "";
    }

    function aplicarOrden() {
        var criterio = document.getElementById("filtroOrden").value;
        var cards = Array.from(contenedor.querySelectorAll(".product-card"));
        if (cards.length === 0) return;

        switch (criterio) {
            case "precio-asc":
                cards.sort(function (a, b) { return getPrecio(a) - getPrecio(b); });
                break;
            case "precio-desc":
                cards.sort(function (a, b) { return getPrecio(b) - getPrecio(a); });
                break;
            case "nombre-az":
                cards.sort(function (a, b) { return getNombre(a).localeCompare(getNombre(b), "es"); });
                break;
        }

        var frag = document.createDocumentFragment();
        cards.forEach(function (c) {
            c.style.transitionDelay = "0s";
            frag.appendChild(c);
        });
        contenedor.appendChild(frag);
    }

    function actualizarConteo() {
        if (!countEl) return;
        var n = contenedor.querySelectorAll(".product-card").length;
        countEl.textContent = n + " producto" + (n !== 1 ? "s" : "");
    }

    function inyectarBarra() {
        if (document.getElementById("filterBar")) return;

        var barra = document.createElement("div");
        barra.id = "filterBar";
        barra.className = "filter-bar";
        barra.innerHTML =
            '<div class="filter-bar__group">' +
                '<label class="filter-bar__label" for="filtroOrden">Ordenar por:</label>' +
                '<select class="filter-bar__select" id="filtroOrden">' +
                    '<option value="precio-asc">Precio: menor a mayor</option>' +
                    '<option value="precio-desc">Precio: mayor a menor</option>' +
                    '<option value="nombre-az">Nombre: A → Z</option>' +
                '</select>' +
            '</div>' +
            '<div class="filter-bar__count" id="filtroCount"></div>';

        contenedor.parentNode.insertBefore(barra, contenedor);
        countEl = document.getElementById("filtroCount");

        document.getElementById("filtroOrden").addEventListener("change", aplicarOrden);
    }

    function inicializar() {
        contenedor = document.getElementById("productosContainer");
        if (!contenedor) return;

        inyectarBarra();

        var obs = new MutationObserver(function () {
            actualizarConteo();
            if (!listo && contenedor.querySelectorAll(".product-card").length > 0) {
                listo = true;
            }
        });
        obs.observe(contenedor, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inicializar);
    } else {
        inicializar();
    }
})();
