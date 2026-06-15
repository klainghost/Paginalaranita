function logout() {
    eliminarUsuario();
    const base = typeof navBasePath !== "undefined" ? navBasePath : "";
    window.location.href = base + "pages/auth/login.html";
}
