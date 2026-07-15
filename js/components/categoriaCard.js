function generarCategorias() {
    const contenedor = document.getElementById("categoriasContainer");
    if (!contenedor) return;

    const base = typeof navBasePath !== "undefined" ? navBasePath : "";

    contenedor.innerHTML = categorias.map((cat, i) => `
        <a class="category-card" href="${base}${cat.url}">
            <div class="category-card__img-wrapper">
                <img
                    src="${base}images/${cat.imagen}"
                    alt="${cat.titulo} — La Ranita 3D"
                    class="category-card__image"
                    loading="lazy"
                >
                <div class="category-card__overlay"></div>
                <span class="category-card__badge">${cat.icono} ${cat.titulo}</span>
            </div>
            <div class="category-card__body">
                <h3 class="category-card__title">${cat.titulo}</h3>
                <p class="category-card__description">${cat.descripcion}</p>
                <span class="category-card__cta">Explorar →</span>
            </div>
        </a>
    `).join("");

    if (typeof initScrollReveal === "function") {
        initScrollReveal(Array.from(contenedor.querySelectorAll(".category-card")));
    }
}

generarCategorias();
