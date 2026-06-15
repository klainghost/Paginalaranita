const CARRITO_KEY = "carrito";
const USUARIO_KEY = "usuario";

function obtenerCarrito() {
    return JSON.parse(localStorage.getItem(CARRITO_KEY)) || [];
}

function guardarCarrito(carrito) {
    localStorage.setItem(CARRITO_KEY, JSON.stringify(carrito));
}

function contarProductosCarrito() {
    return obtenerCarrito().reduce((total, item) => total + item.cantidad, 0);
}

function obtenerUsuario() {
    const data = sessionStorage.getItem(USUARIO_KEY);
    return data ? JSON.parse(data) : null;
}

function guardarUsuario(usuario) {
    sessionStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

function eliminarUsuario() {
    sessionStorage.removeItem(USUARIO_KEY);
}

function esAdmin() {
    const usuario = obtenerUsuario();
    return usuario !== null && usuario.rol === "admin";
}
