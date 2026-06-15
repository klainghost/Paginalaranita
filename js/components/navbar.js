function generarNavbar() {
    const nav = document.getElementById("navbar");
    if (!nav) return;

    const base = typeof navBasePath !== "undefined" ? navBasePath : "";
    const usuario = obtenerUsuario();

    let links = '<ul class="nav-links">';
    navLinks.forEach((link) => {
        const id = link.titulo === "Carrito" ? ' id="navCarrito"' : "";
        links += `<li><a href="${base}${link.url}"${id}>${link.titulo}</a></li>`;
    });
    if (esAdmin()) {
        links += `<li><a href="${base}pages/admin/productos.html">Admin</a></li>`;
    }
    links += "</ul>";

    const botonSesion = usuario
        ? `<button class="logout-btn" onclick="logout()">CERRAR SESIÓN</button>`
        : `<button class="login-btn" onclick="window.location.href='${base}pages/auth/login.html'">INICIAR SESIÓN</button>`;

    nav.innerHTML = `
        <div class="logo">
            <img src="${base}images/logo.png" alt="Logo La Ranita 3D" width="100" height="100">
            <h2>LA RANITA 3D</h2>
        </div>
        <button class="navbar__toggle" id="navbarToggle" aria-label="Abrir menú" aria-expanded="false">☰</button>
        <div class="navbar__menu" id="navbarMenu">
            ${links}
            ${botonSesion}
        </div>
    `;

    const toggle = document.getElementById("navbarToggle");
    const menu = document.getElementById("navbarMenu");
    toggle.addEventListener("click", () => {
        const abierto = menu.classList.toggle("navbar__menu--abierto");
        toggle.setAttribute("aria-expanded", abierto);
        toggle.textContent = abierto ? "✕" : "☰";
    });

    actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
    const navCarrito = document.getElementById("navCarrito");
    if (!navCarrito) return;

    const cantidad = contarProductosCarrito();
    navCarrito.textContent = cantidad > 0 ? `Carrito (${cantidad} productos)` : "Carrito";
}

generarNavbar();
