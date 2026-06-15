const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const USERS_PATH = path.join(__dirname, "api", "users.json");
const DATA_PATH = path.join(__dirname, "api", "data.json");

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || "ranita3d-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 4 } // 4 horas
}));

// Bloquear acceso directo a users.json (contiene contraseñas)
app.get("/api/users.json", (req, res) => res.status(404).end());

app.use(express.static(__dirname));

// --- AUTENTICACIÓN ---

app.post("/api/login", (req, res) => {
    const { email, password } = req.body || {};

    fs.readFile(USERS_PATH, "utf-8", (err, raw) => {
        if (err) return res.status(500).json({ success: false, message: "Error del servidor." });

        const data = JSON.parse(raw);
        const usuario = data.usuarios.find(
            (u) => u.email === email && u.password === password
        );

        if (!usuario) {
            return res.json({ success: false, message: "Email o contraseña incorrectos." });
        }

        req.session.usuario = { nombre: usuario.nombre, rol: usuario.rol };
        res.json({ success: true, usuario: req.session.usuario });
    });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

app.get("/api/sesion", (req, res) => {
    res.json({ usuario: req.session.usuario || null });
});

// --- PRODUCTOS (panel admin) ---

app.put("/api/productos/:id", (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== "admin") {
        return res.status(403).json({ success: false, message: "Acceso solo para administradores." });
    }

    const id = parseInt(req.params.id, 10);
    const { titulo, descripcion, precio } = req.body || {};

    if (precio !== undefined && (isNaN(Number(precio)) || Number(precio) < 0)) {
        return res.status(400).json({ success: false, message: "Precio inválido." });
    }

    fs.readFile(DATA_PATH, "utf-8", (err, raw) => {
        if (err) return res.status(500).json({ success: false, message: "Error del servidor." });

        const data = JSON.parse(raw);
        const producto = data.productos.find((p) => p.id === id);

        if (!producto) {
            return res.status(404).json({ success: false, message: "Producto no encontrado." });
        }

        if (titulo !== undefined) producto.titulo = titulo;
        if (descripcion !== undefined) producto.descripcion = descripcion;
        if (precio !== undefined) producto.precio = Number(precio);

        fs.writeFile(DATA_PATH, JSON.stringify(data, null, 4), "utf-8", (err) => {
            if (err) return res.status(500).json({ success: false, message: "Error al guardar." });
            res.json({ success: true, producto });
        });
    });
});

app.delete("/api/productos/:id", (req, res) => {
    if (!req.session.usuario || req.session.usuario.rol !== "admin") {
        return res.status(403).json({ success: false, message: "Acceso solo para administradores." });
    }

    const id = parseInt(req.params.id, 10);

    fs.readFile(DATA_PATH, "utf-8", (err, raw) => {
        if (err) return res.status(500).json({ success: false, message: "Error del servidor." });

        const data = JSON.parse(raw);
        const index = data.productos.findIndex((p) => p.id === id);

        if (index === -1) {
            return res.status(404).json({ success: false, message: "Producto no encontrado." });
        }

        data.productos.splice(index, 1);

        fs.writeFile(DATA_PATH, JSON.stringify(data, null, 4), "utf-8", (err) => {
            if (err) return res.status(500).json({ success: false, message: "Error al guardar." });
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`LA RANITA 3D corriendo en http://localhost:${PORT}`);
});
