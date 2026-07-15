(function () {

    /* ── AUTH ─────────────────────────────────────────── */
    var AUTH_KEY = "laranita-forja-auth";
    var AUTH_PWD = "laranitacotiza";

    function checkAuth() {
        var overlay = document.getElementById("cotizadorAuth");
        var main    = document.getElementById("cotizadorMain");
        if (sessionStorage.getItem(AUTH_KEY) === "1") {
            overlay.style.display = "none";
            main.style.display    = "";
            return true;
        }
        overlay.style.display = "flex";
        main.style.display    = "none";

        var input = document.getElementById("cotizadorPassword");
        var btn   = document.getElementById("cotizadorEntrar");
        var error = document.getElementById("cotizadorError");

        function intentar() {
            if (input.value === AUTH_PWD) {
                sessionStorage.setItem(AUTH_KEY, "1");
                overlay.style.display = "none";
                main.style.display    = "";
                error.style.display   = "none";
            } else {
                error.style.display = "";
                overlay.classList.add("cotizador-auth--shake");
                overlay.addEventListener("animationend", function () {
                    overlay.classList.remove("cotizador-auth--shake");
                }, { once: true });
                input.value = "";
                input.focus();
            }
        }

        btn.addEventListener("click", intentar);
        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") intentar();
        });
        return false;
    }

    if (!checkAuth()) return;

    /* ── COTIZADOR ────────────────────────────────────── */

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
        "ninguno":   "STL listo",
        "adaptacion":"Adaptación",
        "completo":  "Diseño completo"
    };

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
        if (tipo === "ninguno")   return { tipo: tipo, monto: 0 };
        if (tipo === "adaptacion") return { tipo: tipo, monto: getVal("costoAdaptacion", 2000) };
        return { tipo: tipo, monto: getVal("costoDisenoCompleto", 6000) };
    }

    function calcular() {
        var gramos      = getVal("gramos", 0);
        var horas       = getVal("horas", 0);
        var minutos     = getVal("minutos", 0);
        var precioPorKg = getVal("precioPorKg", 27000);
        var precioLuz   = getVal("precioLuz", 268.22);
        var consumo     = getVal("consumoImpresora", 0.12);
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

        var costoHoraMaquina = getVal("costoHoraMaquina", 100);

        var costoFilamento = gramos * (precioPorKg / 1000);
        var costoLuz       = horasTotales * consumo * precioLuz;
        var subtotal       = costoFilamento + costoLuz;
        var conDificultad  = subtotal * factor;
        var produccion     = Math.max(conDificultad, precioMin);
        var margenMonto    = produccion * (margenPct / 100);
        var costoMaquina   = horasTotales * costoHoraMaquina;
        var disenio        = getCostoDisenio();
        var packagingRadio = document.querySelector('input[name="packaging"]:checked');
        var conPackaging   = packagingRadio && packagingRadio.value === "1";
        var costoPackaging = conPackaging ? getVal("costoPackaging", 700) : 0;
        var precioFinal    = produccion + margenMonto + costoMaquina + disenio.monto + costoPackaging;

        mostrarResultado({
            gramos:          gramos,
            horasTotales:    horasTotales,
            horas:           Math.floor(horasTotales),
            minutos:         Math.round((horasTotales % 1) * 60),
            costoFilamento:  costoFilamento,
            costoLuz:        costoLuz,
            costoMaquina:    costoMaquina,
            costoHoraMaquina: costoHoraMaquina,
            subtotal:        subtotal,
            factor:          factor,
            difNombre:       difNombre,
            precioMin:       precioMin,
            floorActivo:     conDificultad < precioMin,
            produccion:      produccion,
            margenPct:       margenPct,
            margenMonto:     margenMonto,
            disenioTipo:     disenio.tipo,
            disenioMonto:    disenio.monto,
            conPackaging:    conPackaging,
            costoPackaging:  costoPackaging,
            precioFinal:     precioFinal
        });
    }

    function mostrarVacio() {
        document.getElementById("estadoVacio").style.display    = "";
        document.getElementById("estadoResultado").style.display = "none";
    }

    function mostrarResultado(d) {
        document.getElementById("estadoVacio").style.display    = "none";
        document.getElementById("estadoResultado").style.display = "";

        document.getElementById("resGramos").textContent =
            d.gramos % 1 === 0 ? d.gramos : d.gramos.toFixed(1);

        var tiempoTexto = "";
        if (d.horas > 0) tiempoTexto += d.horas + "h ";
        if (d.minutos > 0 || d.horas === 0) tiempoTexto += d.minutos + "min";
        document.getElementById("resHoras").textContent = tiempoTexto.trim() || "0min";

        document.getElementById("resCostoFilamento").textContent = "$" + fmt(d.costoFilamento);
        document.getElementById("resCostoLuz").textContent       = "$" + fmt(d.costoLuz);
        document.getElementById("resHorasM").textContent         = tiempoTexto.trim() || "0min";
        document.getElementById("resCostoMaquina").textContent   = "$" + fmt(d.costoMaquina);
        document.getElementById("resSubtotal").textContent       = "$" + fmt(d.subtotal);

        var factorLabel = "×" + d.factor;
        if (d.floorActivo) factorLabel += " → mín $" + fmt(d.precioMin);
        document.getElementById("resDificultadNombre").textContent = d.difNombre;
        document.getElementById("resFactor").textContent           = factorLabel;

        document.getElementById("resMargenPct").textContent  = d.margenPct;
        document.getElementById("resMargenMonto").textContent = "$" + fmt(d.margenMonto);

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

        document.getElementById("resPrecioFinal").textContent = "$" + fmt(d.precioFinal);

        document.getElementById("btnCopiar").dataset.precio         = Math.round(d.precioFinal);
        document.getElementById("btnCompartirWa").dataset.cotizacion = JSON.stringify(d);
    }

    function generarMensajeWa(d) {
        var h = Math.floor(d.horasTotales);
        var m = Math.round((d.horasTotales % 1) * 60);
        var tiempo = (h > 0 ? h + "h " : "") + (m > 0 ? m + "min" : "");
        if (!tiempo) tiempo = "— min";

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

        if (d.disenioMonto > 0) {
            lineas.push("• Diseño (" + (NOMBRE_DISENIO[d.disenioTipo] || d.disenioTipo) + "): $" + fmt(d.disenioMonto));
        }
        if (d.conPackaging) {
            lineas.push("• Packaging (cajita): $" + fmt(d.costoPackaging));
        }

        lineas.push("");
        lineas.push("✅ *Precio estimado: $" + fmt(d.precioFinal) + "*");
        lineas.push("");
        lineas.push("_Cotización generada en laranita3d.netlify.app_");

        return lineas.join("\n");
    }

    function actualizarLabelsDisenio() {
        var labelA = document.getElementById("labelAdaptacion");
        var labelD = document.getElementById("labelDisenoCompleto");
        var labelP = document.getElementById("labelPackaging");
        if (labelA) labelA.textContent = "+$" + fmt(getVal("costoAdaptacion", 2000));
        if (labelD) labelD.textContent = "+$" + fmt(getVal("costoDisenoCompleto", 6000));
        if (labelP) labelP.textContent = "+$" + fmt(getVal("costoPackaging", 700));
    }

    function sincronizarImpresora() {
        var sel    = document.getElementById("impresora");
        var campo  = document.getElementById("consumoImpresora");
        if (!sel || !campo) return;
        if (sel.value !== "custom") {
            campo.value = sel.value;
            campo.readOnly = true;
            campo.style.opacity = "0.6";
        } else {
            campo.readOnly = false;
            campo.style.opacity = "";
        }
    }

    function init() {
        var impresoraSelect = document.getElementById("impresora");
        if (impresoraSelect) {
            impresoraSelect.addEventListener("change", function () {
                sincronizarImpresora();
                calcular();
            });
            sincronizarImpresora();
        }

        var inputs = document.querySelectorAll(
            ".cotizador-input, input[name='dificultad'], input[name='disenio'], input[name='packaging']"
        );
        inputs.forEach(function (el) {
            el.addEventListener("input",  calcular);
            el.addEventListener("change", calcular);
        });

        var costoInputs = document.querySelectorAll("#costoAdaptacion, #costoDisenoCompleto, #costoPackaging");
        costoInputs.forEach(function (el) {
            el.addEventListener("input", actualizarLabelsDisenio);
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
            var d   = JSON.parse(raw);
            var msg = generarMensajeWa(d);
            window.open("https://wa.me/5492604349945?text=" + encodeURIComponent(msg), "_blank");
        });

        calcular();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
