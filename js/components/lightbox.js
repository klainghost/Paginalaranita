(function () {
    function crearDOM() {
        if (document.getElementById("lightbox")) return;

        const el = document.createElement("div");
        el.id = "lightbox";
        el.className = "lightbox";
        el.setAttribute("role", "dialog");
        el.setAttribute("aria-modal", "true");
        el.setAttribute("aria-label", "Vista ampliada del producto");
        el.innerHTML = `
            <div class="lightbox__overlay" id="lightboxOverlay"></div>
            <div class="lightbox__content">
                <button class="lightbox__close" id="lightboxClose" aria-label="Cerrar">✕</button>
                <img class="lightbox__image" id="lightboxImage" src="" alt="">
                <div class="lightbox__info">
                    <h3 class="lightbox__title" id="lightboxTitle"></h3>
                    <p class="lightbox__price" id="lightboxPrice"></p>
                </div>
            </div>
        `;
        document.body.appendChild(el);

        document.getElementById("lightboxOverlay").addEventListener("click", cerrar);
        document.getElementById("lightboxClose").addEventListener("click", cerrar);
    }

    function abrir(src, titulo, precio) {
        const lb = document.getElementById("lightbox");
        document.getElementById("lightboxImage").src = src;
        document.getElementById("lightboxImage").alt = titulo;
        document.getElementById("lightboxTitle").textContent = titulo;
        document.getElementById("lightboxPrice").textContent =
            "$ " + Number(precio).toLocaleString("es-AR");
        lb.classList.add("lightbox--visible");
        document.body.style.overflow = "hidden";
    }

    function cerrar() {
        const lb = document.getElementById("lightbox");
        if (!lb) return;
        lb.classList.remove("lightbox--visible");
        document.body.style.overflow = "";
        // Limpia la imagen para evitar flash del src anterior al reabrir
        setTimeout(() => {
            if (!lb.classList.contains("lightbox--visible")) {
                document.getElementById("lightboxImage").src = "";
            }
        }, 300);
    }

    // Event delegation — click en el wrapper de imagen de cualquier product card
    document.addEventListener("click", function (e) {
        const wrapper = e.target.closest(".product-card__img-wrapper");
        if (!wrapper) return;

        const img = wrapper.querySelector(".product-card__image");
        const card = wrapper.closest(".product-card");
        if (!img || !card) return;

        const titulo = card.querySelector(".product-card__title")?.textContent?.trim() || "";
        const precio = card.querySelector(".btn-agregar-carrito")?.dataset.precio || 0;

        abrir(img.src, titulo, precio);
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") cerrar();
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", crearDOM);
    } else {
        crearDOM();
    }
})();
