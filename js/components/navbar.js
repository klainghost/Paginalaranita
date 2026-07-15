function aplicarTema() {
    var tema = localStorage.getItem("tema-ranita") || "light";
    document.documentElement.setAttribute("data-theme", tema);
}

function toggleDarkMode() {
    var actual = document.documentElement.getAttribute("data-theme");
    var nuevo = actual === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nuevo);
    localStorage.setItem("tema-ranita", nuevo);
    actualizarIconoTema();
}

function actualizarIconoTema() {
    var btn = document.getElementById("darkModeToggle");
    if (!btn) return;
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    btn.textContent = dark ? "☀️" : "🌙";
    btn.setAttribute("aria-label", dark ? "Modo claro" : "Modo oscuro");
}

aplicarTema();

function generarNavbar() {
    const nav = document.getElementById("navbar");
    if (!nav) return;

    const base = typeof navBasePath !== "undefined" ? navBasePath : "";
    const usuario = obtenerUsuario();

    let links = '<ul class="nav-links">';
    navLinks.forEach((link) => {
        if (link.dropdown) {
            const items = link.dropdown.map(c =>
                `<li><a href="${base}${c.url}">${c.titulo}</a></li>`
            ).join('');
            links += `<li class="nav-has-dropdown">
                <button class="nav-dropdown-toggle" aria-haspopup="true" aria-expanded="false">
                    ${link.titulo} <span class="nav-dropdown-arrow" aria-hidden="true">▾</span>
                </button>
                <ul class="nav-dropdown">${items}</ul>
            </li>`;
        } else {
            const id = link.titulo === "Carrito" ? ' id="navCarrito"' : "";
            links += `<li><a href="${base}${link.url}"${id}>${link.titulo}</a></li>`;
        }
    });
    if (esAdmin()) {
        links += `<li><a href="${base}pages/admin/productos.html">Admin</a></li>`;
    }
    links += "</ul>";

    const botonSesion = usuario
        ? `<button class="logout-btn" onclick="logout()">CERRAR SESIÓN</button>`
        : "";

    const botonTema = `<button class="dark-mode-toggle" id="darkModeToggle" onclick="toggleDarkMode()" aria-label="Modo oscuro">🌙</button>`;

    nav.innerHTML = `
        <div class="logo">
            <img src="${base}images/logo.png" alt="Logo La Ranita 3D" width="100" height="100">
            <h2>LA RANITA 3D</h2>
        </div>
        <button class="navbar__toggle" id="navbarToggle" aria-label="Abrir menú" aria-expanded="false">☰</button>
        <div class="navbar__actions">
            ${botonSesion}
            ${botonTema}
        </div>
        <div class="navbar__menu" id="navbarMenu">
            ${links}
        </div>
    `;

    const toggle = document.getElementById("navbarToggle");
    const menu = document.getElementById("navbarMenu");
    toggle.addEventListener("click", () => {
        const abierto = menu.classList.toggle("navbar__menu--abierto");
        toggle.setAttribute("aria-expanded", abierto);
        toggle.textContent = abierto ? "✕" : "☰";
    });

    // Dropdown de categorías
    nav.querySelectorAll(".nav-dropdown-toggle").forEach(btn => {
        btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const li = this.closest(".nav-has-dropdown");
            const isOpen = li.classList.toggle("abierto");
            this.setAttribute("aria-expanded", isOpen);
        });
    });
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".nav-has-dropdown")) {
            nav.querySelectorAll(".nav-has-dropdown").forEach(el => {
                el.classList.remove("abierto");
                const b = el.querySelector(".nav-dropdown-toggle");
                if (b) b.setAttribute("aria-expanded", "false");
            });
        }
    });

    generarCarritoFlotante();
    generarWhatsApp();
    generarToastContainer();
    actualizarContadorCarrito();
    actualizarIconoTema();
}

function generarCarritoFlotante() {
    if (document.getElementById("carritoFlotante")) return;

    var btn = document.createElement("button");
    btn.id = "carritoFlotante";
    btn.className = "carrito-flotante";
    btn.setAttribute("aria-label", "Ver carrito");
    btn.innerHTML = "🛒<span class=\"carrito-flotante__badge\" id=\"carritoFlotanteBadge\"></span>";
    btn.addEventListener("click", function () {
        if (typeof abrirCarritoDrawer === "function") {
            abrirCarritoDrawer();
        }
    });

    document.body.appendChild(btn);
}

function generarToastContainer() {
    if (document.getElementById("toastContainer")) return;
    const container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
}

function mostrarToast(mensaje, icono) {
    icono = icono || "✅";
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = icono + " " + mensaje;
    container.appendChild(toast);

    setTimeout(function () {
        toast.classList.add("toast--saliendo");
        toast.addEventListener("animationend", function () { toast.remove(); }, { once: true });
    }, 2500);
}

function generarWhatsApp() {
    if (document.getElementById("whatsappBtn")) return;

    const link = document.createElement("a");
    link.id = "whatsappBtn";
    link.className = "whatsapp-btn";
    link.href = "https://wa.me/5492604349945?text=Hola%2C+vi+tu+tienda+La+Ranita+3D+y+tengo+una+consulta+%F0%9F%90%B8";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Contactar por WhatsApp");
    link.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;

    document.body.appendChild(link);
}

function actualizarContadorCarrito() {
    const navCarrito = document.getElementById("navCarrito");
    const badge = document.getElementById("carritoFlotanteBadge");
    const cantidad = contarProductosCarrito();

    if (navCarrito) {
        navCarrito.textContent = cantidad > 0 ? `Carrito (${cantidad} productos)` : "Carrito";
    }

    if (badge) {
        badge.textContent = cantidad;
        badge.style.display = cantidad > 0 ? "flex" : "none";
    }
}

generarNavbar();

(function () {
    var nav = document.getElementById("navbar");
    if (!nav) return;
    window.addEventListener("scroll", function () {
        nav.classList.toggle("navbar--compacta", window.scrollY > 60);
    }, { passive: true });
})();
