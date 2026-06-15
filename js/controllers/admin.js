function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function crearCardAdmin(producto) {
    const base = typeof navBasePath !== "undefined" ? navBasePath : "";

    return `
        <article class="admin-card" data-id="${producto.id}" data-categoria="${producto.categoria}" data-titulo="${escapeHtml(producto.titulo.toLowerCase())}">
            <img src="${base}images/${producto.imagen}" alt="${escapeHtml(producto.titulo)}" class="admin-card__image">

            <div class="admin-card__info">
                <h3 class="admin-card__titulo">${escapeHtml(producto.titulo)}</h3>
                <p class="admin-card__precio">$${producto.precio}</p>
                <div class="admin-card__botones">
                    <button type="button" class="admin-card__editar">Editar</button>
                    <button type="button" class="admin-card__eliminar">Eliminar</button>
                </div>
            </div>

            <form class="admin-card__form" hidden>
                <label>Título
                    <input type="text" name="titulo" value="${escapeHtml(producto.titulo)}" required>
                </label>

                <label>Precio ($)
                    <input type="number" name="precio" value="${producto.precio}" min="0" step="1" required>
                </label>

                <label>Descripción
                    <textarea name="descripcion" rows="3" required>${escapeHtml(producto.descripcion)}</textarea>
                </label>

                <div class="admin-card__actions">
                    <button type="submit">Guardar</button>
                    <button type="button" class="admin-card__cancelar">Cancelar</button>
                </div>

                <span class="admin-card__mensaje"></span>
            </form>
        </article>
    `;
}

function activarCard(card) {
    const id = card.dataset.id;
    const info = card.querySelector(".admin-card__info");
    const form = card.querySelector(".admin-card__form");
    const mensaje = card.querySelector(".admin-card__mensaje");

    card.querySelector(".admin-card__editar").addEventListener("click", () => {
        info.hidden = true;
        form.hidden = false;
    });

    card.querySelector(".admin-card__eliminar").addEventListener("click", () => {
        const titulo = card.querySelector(".admin-card__titulo").textContent;
        if (!confirm(`¿Eliminar "${titulo}"? Esta acción no se puede deshacer.`)) return;

        fetch(`/api/productos/${id}`, { method: "DELETE" })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    card.remove();
                } else {
                    alert(data.message || "Error al eliminar.");
                }
            })
            .catch(() => alert("Error de conexión."));
    });

    card.querySelector(".admin-card__cancelar").addEventListener("click", () => {
        form.hidden = true;
        info.hidden = false;
        mensaje.textContent = "";
        mensaje.className = "admin-card__mensaje";
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const datos = {
            titulo: form.titulo.value.trim(),
            precio: parseFloat(form.precio.value),
            descripcion: form.descripcion.value.trim()
        };

        mensaje.textContent = "Guardando...";
        mensaje.className = "admin-card__mensaje";

        fetch(`/api/productos/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    mensaje.textContent = "Guardado ✓";
                    mensaje.classList.add("admin-card__mensaje--ok");

                    card.querySelector(".admin-card__titulo").textContent = datos.titulo;
                    card.querySelector(".admin-card__precio").textContent = `$${datos.precio}`;
                    card.dataset.titulo = datos.titulo.toLowerCase();

                    form.hidden = true;
                    info.hidden = false;
                } else {
                    mensaje.textContent = data.message || "Error al guardar.";
                    mensaje.classList.add("admin-card__mensaje--error");
                }
            })
            .catch(() => {
                mensaje.textContent = "Error de conexión.";
                mensaje.classList.add("admin-card__mensaje--error");
            });
    });
}

function aplicarFiltros() {
    const texto = document.getElementById("adminBuscar").value.trim().toLowerCase();
    const categoria = document.getElementById("adminCategoria").value;

    document.querySelectorAll(".admin-card").forEach((card) => {
        const coincideTexto = card.dataset.titulo.includes(texto);
        const coincideCategoria = !categoria || card.dataset.categoria === categoria;
        card.style.display = (coincideTexto && coincideCategoria) ? "" : "none";
    });
}

function generarPanelAdmin() {
    const contenedor = document.getElementById("adminContainer");
    if (!contenedor) return;

    const base = typeof navBasePath !== "undefined" ? navBasePath : "";

    fetch("/api/sesion")
        .then((response) => response.json())
        .then((sesion) => {
            if (!sesion.usuario || sesion.usuario.rol !== "admin") {
                window.location.href = "../auth/login.html";
                return;
            }

            return fetch(`${base}api/data.json`)
                .then((response) => response.json())
                .then((data) => {
                    contenedor.innerHTML = data.productos.map(crearCardAdmin).join("");
                    document.querySelectorAll(".admin-card").forEach(activarCard);

                    document.getElementById("adminBuscar").addEventListener("input", aplicarFiltros);
                    document.getElementById("adminCategoria").addEventListener("change", aplicarFiltros);
                });
        });
}

generarPanelAdmin();
