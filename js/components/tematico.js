(function () {

    /* 1 — TYPEWRITER */
    function typewriter(el) {
        if (!el) return;
        var texto = el.textContent.trim();
        el.innerHTML = '<span class="tw-texto"></span><span class="tw-cursor">|</span>';
        var span = el.querySelector(".tw-texto");
        var cursor = el.querySelector(".tw-cursor");
        var i = 0;
        setTimeout(function () {
            var iv = setInterval(function () {
                span.textContent += texto[i];
                i++;
                if (i >= texto.length) {
                    clearInterval(iv);
                    setTimeout(function () { cursor.style.display = "none"; }, 2200);
                }
            }, 52);
        }, 600);
    }

    /* 2 — PARTÍCULAS MÁGICAS */
    function initParticles() {
        var banner = document.querySelector(".hero-banner");
        if (!banner) return;

        var container = document.createElement("div");
        container.className = "hero-banner-wrapper";
        banner.parentNode.insertBefore(container, banner);
        container.appendChild(banner);

        var canvas = document.createElement("canvas");
        canvas.className = "hero-particles";
        container.appendChild(canvas);

        var ctx = canvas.getContext("2d");
        var particles = [];

        function resize() {
            canvas.width  = container.offsetWidth;
            canvas.height = container.offsetHeight;
        }
        resize();
        window.addEventListener("resize", resize, { passive: true });

        for (var i = 0; i < 48; i++) {
            particles.push({
                x:       Math.random() * canvas.width,
                y:       Math.random() * canvas.height,
                r:       Math.random() * 1.8 + 0.4,
                vy:      Math.random() * 0.35 + 0.08,
                vx:      (Math.random() - 0.5) * 0.2,
                op:      Math.random() * 0.5 + 0.15,
                phase:   Math.random() * Math.PI * 2,
                gold:    Math.random() > 0.4
            });
        }

        function draw(t) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(function (p) {
                p.y  -= p.vy;
                p.x  += p.vx + Math.sin(t * 0.0008 + p.phase) * 0.25;
                if (p.y < -4) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width; }
                if (p.x < -4) p.x = canvas.width + 4;
                if (p.x > canvas.width + 4) p.x = -4;
                var alpha = p.op * (0.55 + 0.45 * Math.sin(t * 0.0015 + p.phase));
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.gold
                    ? "rgba(201,162,39," + alpha + ")"
                    : "rgba(255,255,220," + alpha * 0.8 + ")";
                ctx.fill();
            });
            requestAnimationFrame(draw);
        }
        requestAnimationFrame(draw);
    }

    /* 6 — RIPPLE MÁGICO */
    function initRipple() {
        document.addEventListener("click", function (e) {
            var btn = e.target.closest("button");
            if (!btn || btn.disabled) return;
            if (btn.classList.contains("btn-cantidad") ||
                btn.classList.contains("dark-mode-toggle") ||
                btn.classList.contains("navbar__toggle") ||
                btn.classList.contains("cart-drawer__close") ||
                btn.classList.contains("lightbox__close")) return;

            var rect = btn.getBoundingClientRect();
            var ripple = document.createElement("span");
            ripple.className = "ripple-magic";
            ripple.style.left = (e.clientX - rect.left) + "px";
            ripple.style.top  = (e.clientY - rect.top)  + "px";
            btn.appendChild(ripple);
            ripple.addEventListener("animationend", function () { ripple.remove(); });
        });
    }

    /* 7 — CURSOR D20 */
    function initCursor() {
        if (window.matchMedia("(hover: none)").matches) return;
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 100 100">' +
            '<polygon points="50,4 96,28 96,72 50,96 4,72 4,28" fill="%232d5016" stroke="%23c9a227" stroke-width="5"/>' +
            '<polygon points="50,4 96,28 50,44" fill="%23c9a227" opacity="0.25"/>' +
            '<text x="50" y="70" text-anchor="middle" font-size="38" font-weight="bold" fill="white" font-family="serif">20</text>' +
            '</svg>';
        var encoded = "data:image/svg+xml," + svg;
        document.documentElement.style.cursor = 'url("' + encoded + '") 14 14, auto';
    }

    /* INIT */
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            typewriter(document.querySelector(".hero-tagline"));
            initParticles();
            initRipple();
            initCursor();
        });
    } else {
        typewriter(document.querySelector(".hero-tagline"));
        initParticles();
        initRipple();
        initCursor();
    }

})();
