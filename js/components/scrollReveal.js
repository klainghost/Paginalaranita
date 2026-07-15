(function () {
    var observer;

    function crearObserver() {
        observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry, i) {
                if (entry.isIntersecting) {
                    entry.target.style.transitionDelay = (i * 0.07) + "s";
                    entry.target.classList.add("reveal--visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
    }

    function initScrollReveal(elementos) {
        if (!observer) crearObserver();
        elementos.forEach(function (el) {
            el.classList.add("reveal");
            observer.observe(el);
        });
    }

    window.initScrollReveal = initScrollReveal;
})();
