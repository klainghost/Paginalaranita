function generarFooter() {
    const footer = document.getElementById("footer");
    if (!footer) return;

    footer.innerHTML = `
        <p>&copy; 2026 LA RANITA 3D. Todos los derechos reservados.</p>
        <p>Tienda especializada en impresión 3D y merchandising personalizado</p>
    `;
}

generarFooter();
