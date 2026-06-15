const formulario = document.getElementById("formLogin");

formulario.addEventListener("submit", (event) => {
    event.preventDefault();

    const emailIngresado = document.getElementById("txtemail").value.trim();
    const passwordIngresada = document.getElementById("password").value.trim();

    fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailIngresado, password: passwordIngresada })
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                guardarUsuario(data.usuario);
                window.location.href = "../../index.html";
            } else {
                document.getElementById("mensajeError").textContent = data.message || "Email o contraseña incorrectos.";
            }
        });
});
