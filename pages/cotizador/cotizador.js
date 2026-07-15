(function () {

    /* ── CONSTANTES ──────────────────────────────────────── */
    var AUTH_KEY = "laranita-forja-auth";
    var AUTH_PWD = "laranitacotiza";

    var PRECIO_MIN = {
        "2.0": 600,
        "2.5": 1000,
        "3.5": 1500,
        "4.5": 2500
    };

    var NOMBRE_DIF = {
        "2.0": "Básico",
        "2.5": "Estándar",
        "3.5": "Avanzado",
        "4.5": "Premium"
    };

    var NOMBRE_DISENIO = {
        "ninguno":    "STL listo",
        "adaptacion": "Adaptación",
        "completo":   "Diseño completo"
    };

    /* ── UTILS ───────────────────────────────────────────── */
    function getVal(id, fallback) {
        var v = parseFloat(document.getElementById(id).value);
        return isNaN(v) ? fallback : v;
    }

    function fmt(n) {
        return Math.round(n).toLocaleString("es-AR");
    }

    function getCostoDisenio() {
        var radio = document.querySelector('input[name="disenio"]:checked');
        var tipo  = radio ? radio.value : "ninguno";
        if (tipo === "adaptacion") return { tipo: tipo, monto: getVal("costoAdaptacion", 2000) };
        if (tipo === "completo")   return { tipo: tipo, monto: getVal("costoDisenoCompleto", 6000) };
        return { tipo: "ninguno", monto: 0 };
    }

    /* ── CÁLCULO ─────────────────────────────────────────── */
    function calcular() {
        var gramos      = getVal("gramos", 0);
        var horas       = getVal("horas", 0);
        var minutos     = getVal("minutos", 0);
        var precioPorKg = getVal("precioPorKg", 27000);
        var precioLuz   = getVal("precioLuz", 268.22);
        var consumo     = getVal("consumoImpresora", 0.18);
        var margenPct   = getVal("margen", 40);

        var factorEl  = document.querySelector('input[name="dificultad"]:checked');
        var factor    = factorEl ? parseFloat(factorEl.value) : 2.5;
        var difNombre = NOMBRE_DIF[String(factor)] || "Estándar";
        var precioMin = PRECIO_MIN[String(factor)] || 1000;

        var horasTotales = horas + minutos / 60;

        if (gramos <= 0 && horasTotales <= 0) {
            mostrarVacio();
            return;
        }

        var costoHoraMaquina = getVal("costoHoraMaquina", 1000);
        var costoFilamento   = gramos * (precioPorKg / 1000);
        var costoLuz         = horasTotales * consumo * precioLuz;
        var subtotal         = costoFilamento + costoLuz;
        var conDificultad    = subtotal * factor;
        var produccion       = Math.max(conDificultad, precioMin);
        var margenMonto      = produccion * (margenPct / 100);
        var costoMaquina     = horasTotales * costoHoraMaquina;
        var disenio          = getCostoDisenio();
        var packagingRadio   = document.querySelector('input[name="packaging"]:checked');
        var conPackaging     = packagingRadio && packagingRadio.value === "1";
        var costoPackaging   = conPackaging ? getVal("costoPackaging", 700) : 0;
        var precioFinal      = produccion + margenMonto + costoMaquina + disenio.monto + costoPackaging;

        mostrarResultado({
            gramos:           gramos,
            horasTotales:     horasTotales,
            horas:            Math.floor(horasTotales),
            minutos:          Math.round((horasTotales % 1) * 60),
            costoFilamento:   costoFilamento,
            costoLuz:         costoLuz,
            costoMaquina:     costoMaquina,
            costoHoraMaquina: costoHoraMaquina,
            subtotal:         subtotal,
            factor:           factor,
            difNombre:        difNombre,
            precioMin:        precioMin,
            floorActivo:      conDificultad < precioMin,
            produccion:       produccion,
            margenPct:        margenPct,
            margenMonto:      margenMonto,
            disenioTipo:      disenio.tipo,
            disenioMonto:     disenio.monto,
            conPackaging:     conPackaging,
            costoPackaging:   costoPackaging,
            precioFinal:      precioFinal
        });
    }

    function mostrarVacio() {
        document.getElementById("estadoVacio").style.display     = "";
        document.getElementById("estadoResultado").style.display = "none";
    }

    function mostrarResultado(d) {
        document.getElementById("estadoVacio").style.display     = "none";
        document.getElementById("estadoResultado").style.display = "";

        document.getElementById("resGramos").textContent =
            d.gramos % 1 === 0 ? d.gramos : d.gramos.toFixed(1);

        var tiempoTexto = "";
        if (d.horas > 0) tiempoTexto += d.horas + "h ";
        if (d.minutos > 0 || d.horas === 0) tiempoTexto += d.minutos + "min";
        tiempoTexto = tiempoTexto.trim() || "0min";

        document.getElementById("resHoras").textContent       = tiempoTexto;
        document.getElementById("resCostoFilamento").textContent = "$" + fmt(d.costoFilamento);
        document.getElementById("resCostoLuz").textContent       = "$" + fmt(d.costoLuz);
        document.getElementById("resHorasM").textContent         = tiempoTexto;
        document.getElementById("resCostoMaquina").textContent   = "$" + fmt(d.costoMaquina);
        document.getElementById("resSubtotal").textContent       = "$" + fmt(d.subtotal);

        var factorLabel = "×" + d.factor;
        if (d.floorActivo) factorLabel += " → mín $" + fmt(d.precioMin);
        document.getElementById("resDificultadNombre").textContent = d.difNombre;
        document.getElementById("resFactor").textContent           = factorLabel;
        document.getElementById("resMargenPct").textContent        = d.margenPct;
        document.getElementById("resMargenMonto").textContent      = "$" + fmt(d.margenMonto);

        var filaDisenio = document.getElementById("filaDisenio");
        if (d.disenioMonto > 0) {
            filaDisenio.style.display = "";
            document.getElementById("resDisenoNombre").textContent = NOMBRE_DISENIO[d.disenioTipo] || d.disenioTipo;
            document.getElementById("resCostoDisenio").textContent = "$" + fmt(d.disenioMonto);
        } else {
            filaDisenio.style.display = "none";
        }

        var filaPackaging = document.getElementById("filaPackaging");
        if (d.conPackaging) {
            filaPackaging.style.display = "";
            document.getElementById("resCostoPackaging").textContent = "$" + fmt(d.costoPackaging);
        } else {
            filaPackaging.style.display = "none";
        }

        document.getElementById("resPrecioFinal").textContent       = "$" + fmt(d.precioFinal);
        document.getElementById("btnCopiar").dataset.precio          = Math.round(d.precioFinal);
        document.getElementById("btnCompartirWa").dataset.cotizacion = JSON.stringify(d);
    }

    /* ── TEXTOS DE SALIDA ────────────────────────────────── */
    function generarPresupuesto(d) {
        var h = Math.floor(d.horasTotales);
        var m = Math.round((d.horasTotales % 1) * 60);
        var tiempo = (h > 0 ? h + "h " : "") + (m > 0 ? m + "min" : "0min");

        var lineas = [
            "📄 PRESUPUESTO – LA RANITA 3D",
            "",
            "Detalle del trabajo:",
            "• Peso estimado: " + (d.gramos % 1 === 0 ? d.gramos : d.gramos.toFixed(1)) + " g",
            "• Tiempo estimado de impresión: " + tiempo,
            "• Nivel de detalle: " + d.difNombre
        ];

        if (d.disenioMonto > 0) {
            lineas.push("• Diseño incluido: " + (NOMBRE_DISENIO[d.disenioTipo] || d.disenioTipo));
        }

        lineas.push("", "💰 Precio final: $" + fmt(d.precioFinal) + " ARS", "", "Incluye:");
        lineas.push("• Impresión 3D de la pieza");
        if (d.disenioMonto > 0) lineas.push("• " + (NOMBRE_DISENIO[d.disenioTipo] || "Diseño"));
        lineas.push("• Configuración y preparación del archivo");
        lineas.push("• Consumo de material y electricidad");
        lineas.push("• Uso de máquina y postprocesado básico");
        if (d.conPackaging) lineas.push("• Packaging (cajita de presentación)");
        lineas.push("", "Gracias por elegir La Ranita 3D 🐸");

        return lineas.join("\n");
    }

    function generarMensajeWa(d) {
        var h = Math.floor(d.horasTotales);
        var m = Math.round((d.horasTotales % 1) * 60);
        var tiempo = (h > 0 ? h + "h " : "") + (m > 0 ? m + "min" : "0min");

        var lineas = [
            "🐸 *Cotización La Ranita 3D*\n",
            "📦 *Detalles de la pieza:*",
            "• Filamento: " + (d.gramos || 0) + " g",
            "• Tiempo de impresión: " + tiempo,
            "• Dificultad: " + d.difNombre + " (×" + d.factor + ")" + (d.floorActivo ? " — precio mínimo aplicado" : ""),
            ""
        ];

        if (d.disenioMonto > 0) {
            lineas.push("✏️ *Diseño:* " + (NOMBRE_DISENIO[d.disenioTipo] || d.disenioTipo) + " — $" + fmt(d.disenioMonto));
            lineas.push("");
        }

        lineas = lineas.concat([
            "💰 *Desglose:*",
            "• Filamento: $" + fmt(d.costoFilamento),
            "• Electricidad: $" + fmt(d.costoLuz),
            "• Subtotal: $" + fmt(d.subtotal),
            "• Factor dificultad (×" + d.factor + "): $" + fmt(d.produccion),
            "• Margen (" + d.margenPct + "%): $" + fmt(d.margenMonto),
            "• Hora máquina ($" + fmt(d.costoHoraMaquina) + "/h × " + tiempo + "): $" + fmt(d.costoMaquina)
        ]);

        if (d.disenioMonto > 0) lineas.push("• Diseño (" + (NOMBRE_DISENIO[d.disenioTipo] || d.disenioTipo) + "): $" + fmt(d.disenioMonto));
        if (d.conPackaging)     lineas.push("• Packaging (cajita): $" + fmt(d.costoPackaging));

        lineas.push("", "✅ *Precio estimado: $" + fmt(d.precioFinal) + "*", "", "_Cotización generada en laranita3d.netlify.app_");
        return lineas.join("\n");
    }

    /* ── LABELS EN TIEMPO REAL ───────────────────────────── */
    function actualizarLabelsDisenio() {
        var labelA = document.getElementById("labelAdaptacion");
        var labelD = document.getElementById("labelDisenoCompleto");
        var labelP = document.getElementById("labelPackaging");
        if (labelA) labelA.textContent = "+$" + fmt(getVal("costoAdaptacion", 2000));
        if (labelD) labelD.textContent = "+$" + fmt(getVal("costoDisenoCompleto", 6000));
        if (labelP) labelP.textContent = "+$" + fmt(getVal("costoPackaging", 700));
    }

    function sincronizarImpresora() {
        var sel   = document.getElementById("impresora");
        var campo = document.getElementById("consumoImpresora");
        if (!sel || !campo) return;
        if (sel.value !== "custom") {
            campo.value    = sel.value;
            campo.readOnly = true;
            campo.style.opacity = "0.6";
        } else {
            campo.readOnly = false;
            campo.style.opacity = "";
        }
    }

    /* ── INIT ────────────────────────────────────────────── */
    function init() {
        var impresoraSelect = document.getElementById("impresora");
        if (impresoraSelect) {
            impresoraSelect.addEventListener("change", function () {
                sincronizarImpresora();
                calcular();
            });
            sincronizarImpresora();
        }

        document.querySelectorAll(
            ".cotizador-input, input[name='dificultad'], input[name='disenio'], input[name='packaging']"
        ).forEach(function (el) {
            el.addEventListener("input",  calcular);
            el.addEventListener("change", calcular);
        });

        document.querySelectorAll("#costoAdaptacion, #costoDisenoCompleto, #costoPackaging").forEach(function (el) {
            el.addEventListener("input", actualizarLabelsDisenio);
        });

        document.getElementById("btnPresupuesto").addEventListener("click", function () {
            var raw = document.getElementById("btnCompartirWa").dataset.cotizacion;
            if (!raw) return;
            navigator.clipboard.writeText(generarPresupuesto(JSON.parse(raw))).then(function () {
                mostrarToast("Presupuesto copiado al portapapeles", "📄");
            }).catch(function () {
                mostrarToast("No se pudo copiar, intentá de nuevo", "⚠️");
            });
        });

        document.getElementById("btnCopiar").addEventListener("click", function () {
            var precio = this.dataset.precio;
            if (!precio) return;
            navigator.clipboard.writeText("$" + parseInt(precio).toLocaleString("es-AR")).then(function () {
                mostrarToast("Precio copiado al portapapeles", "📋");
            }).catch(function () {
                mostrarToast("$" + parseInt(precio).toLocaleString("es-AR"), "📋");
            });
        });

        document.getElementById("btnCompartirWa").addEventListener("click", function () {
            var raw = this.dataset.cotizacion;
            if (!raw) return;
            window.open("https://wa.me/5492604349945?text=" + encodeURIComponent(generarMensajeWa(JSON.parse(raw))), "_blank");
        });

        calcular();
    }

    /* ── AUTH (al final para que todo lo anterior esté definido) ── */
    (function () {
        var overlay = document.getElementById("cotizadorAuth");
        var main    = document.getElementById("cotizadorMain");

        function arrancar() {
            if (overlay) overlay.style.display = "none";
            if (main)    main.style.display    = "";
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", init);
            } else {
                init();
            }
        }

        if (sessionStorage.getItem(AUTH_KEY) === "1") {
            arrancar();
            return;
        }

        if (overlay) overlay.style.display = "flex";
        if (main)    main.style.display    = "none";

        var input = document.getElementById("cotizadorPassword");
        var btn   = document.getElementById("cotizadorEntrar");
        var error = document.getElementById("cotizadorError");
        if (!input || !btn) return;

        function intentar() {
            if (input.value === AUTH_PWD) {
                sessionStorage.setItem(AUTH_KEY, "1");
                if (error) error.style.display = "none";
                arrancar();
            } else {
                if (error) error.style.display = "";
                if (overlay) {
                    overlay.classList.add("cotizador-auth--shake");
                    overlay.addEventListener("animationend", function () {
                        overlay.classList.remove("cotizador-auth--shake");
                    }, { once: true });
                }
                input.value = "";
                input.focus();
            }
        }

        btn.addEventListener("click", intentar);
        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") intentar();
        });
    })();

})();
