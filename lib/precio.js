// Motor de precio único. NADIE recalcula el precio fuera de esta función.
const DIFICULTADES = {
  '2.0': { nombre: 'Básico',    factor: 2.0, minimo: 600  },
  '2.5': { nombre: 'Estándar',  factor: 2.5, minimo: 1000 },
  '3.5': { nombre: 'Avanzado',  factor: 3.5, minimo: 1500 },
  '4.5': { nombre: 'Premium',   factor: 4.5, minimo: 2500 },
};

// producto  — fila de la tabla productos
// parametros — fila de parametros_costo (id=1)
// nivel      — { margen_pct } de niveles_precio
function calcularPrecio(producto, parametros, nivel) {
  const totalHoras     = Number(producto.horas || 0) + Number(producto.minutos || 0) / 60;
  const costoFilamento = Number(producto.gramos || 0) * (parametros.precio_kg / 1000);
  const costoElectric  = totalHoras * parametros.consumo_impresora_kw * parametros.precio_kwh;
  const subtotal       = costoFilamento + costoElectric;

  const tier           = DIFICULTADES[String(producto.dificultad)] || DIFICULTADES['2.5'];
  const costoProduccion = Math.max(subtotal * tier.factor, tier.minimo);
  const margenMonto    = costoProduccion * (nivel.margen_pct / 100);
  const costoMaquina   = totalHoras * parametros.costo_hora_maquina;

  const precioBase     = costoProduccion + margenMonto + costoMaquina;

  // Override fijo tiene prioridad sobre ajuste porcentual
  let precioAjustado;
  if (producto.precio_override != null) {
    precioAjustado = Number(producto.precio_override);
  } else if (Number(producto.precio_ajuste_pct) !== 0) {
    precioAjustado = precioBase * (1 + Number(producto.precio_ajuste_pct) / 100);
  } else {
    precioAjustado = precioBase;
  }

  // Promoción activa si tiene descuento y la fecha no venció
  let precioFinal  = precioAjustado;
  let promoActiva  = false;
  if (Number(producto.promo_descuento_pct) > 0 && producto.promo_hasta) {
    if (new Date(producto.promo_hasta) > new Date()) {
      precioFinal = precioAjustado * (1 - Number(producto.promo_descuento_pct) / 100);
      promoActiva = true;
    }
  }

  return {
    totalHoras,
    costoFilamento:   Math.round(costoFilamento),
    costoElectric:    Math.round(costoElectric),
    subtotal:         Math.round(subtotal),
    tier,
    costoProduccion:  Math.round(costoProduccion),
    margenMonto:      Math.round(margenMonto),
    costoMaquina:     Math.round(costoMaquina),
    precioBase:       Math.round(precioBase),
    precioAjustado:   Math.round(precioAjustado),
    precioFinal:      Math.round(precioFinal),
    promoActiva,
  };
}

module.exports = { calcularPrecio, DIFICULTADES };
