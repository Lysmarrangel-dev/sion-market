import { supabase, configurado, sesionActual } from "./supabase.js";
import { APP_ESQUEMA, APP_PAQUETE_ANDROID, PLAY_STORE_URL, APP_STORE_URL } from "./config.js";
import { mostrarAviso, ocultarAviso, cargando, errorCampo, normalizarTelefono, EMAIL_RE, traducirError, escapar } from "./ui.js";

// Borde de la cabecera al desplazarse
const cabecera = document.getElementById("cabecera");
const alDesplazar = () => cabecera.classList.toggle("con-borde", window.scrollY > 8);
window.addEventListener("scroll", alDesplazar, { passive: true });
alDesplazar();

// Navegación según sesión
if (configurado) {
  sesionActual().then((s) => {
    if (!s) return;
    document.querySelectorAll("[data-sin-sesion]").forEach((el) => (el.hidden = true));
    document.querySelectorAll("[data-con-sesion]").forEach((el) => (el.hidden = false));
  });
}

// "Pedir ahora": en computadora abre la cuenta en la web (/app); en un celular abre la app del teléfono.
const ua = navigator.userAgent;
const android = /Android/i.test(ua);
const ios = /iPhone|iPod|iPad/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
document.querySelectorAll("[data-pedir]").forEach((a) => {
  if (!android && !ios) return;
  const web = new URL("/app", location.href).href;
  if (android) {
    // Android abre la app si está instalada y, si no, va a la tienda (o a la web mientras no esté publicada).
    const respaldo = encodeURIComponent(PLAY_STORE_URL || web);
    a.href = `intent://#Intent;scheme=${APP_ESQUEMA};package=${APP_PAQUETE_ANDROID};S.browser_fallback_url=${respaldo};end`;
    return;
  }
  // En iPhone solo se intenta abrir la app cuando ya está en la App Store; si no, Safari mostraría un error.
  if (!APP_STORE_URL) return;
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const inicio = Date.now();
    window.location.href = `${APP_ESQUEMA}://`;
    setTimeout(() => {
      if (!document.hidden && Date.now() - inicio < 2500) window.location.href = APP_STORE_URL;
    }, 1200);
  });
});

// Solicitud de afiliación de comercios
const form = document.getElementById("form-comercio");
const aviso = document.getElementById("aviso-comercio");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarAviso(aviso);
  const f = form.elements;

  // Trampa para bots: si el campo oculto viene lleno, fingimos éxito y no guardamos nada.
  if (f.sitio_web.value) { mostrarExito(); return; }

  const telefono = normalizarTelefono(f.telefono.value);
  const ok = [
    errorCampo(f.nombre_comercio, f.nombre_comercio.value.trim().length < 2 ? "Escribe el nombre de tu comercio." : ""),
    errorCampo(f.sector, !f.sector.value ? "Elige el sector de tu comercio." : ""),
    errorCampo(f.contacto, f.contacto.value.trim().length < 2 ? "Escribe tu nombre." : ""),
    errorCampo(f.telefono, !telefono ? "Escribe un número venezolano válido, por ejemplo 412 123 4567." : ""),
    errorCampo(f.email, f.email.value && !EMAIL_RE.test(f.email.value.trim()) ? "Ese correo no parece válido." : ""),
  ].every(Boolean);
  if (!ok) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }

  if (!configurado) {
    mostrarAviso(aviso, "error", "Falta conectar Supabase para guardar solicitudes. Edita <code>js/config.js</code>.");
    return;
  }

  const boton = form.querySelector('button[type="submit"]');
  cargando(boton, true, "Enviando");
  const { error } = await supabase.from("solicitudes_comercio").insert({
    nombre_comercio: f.nombre_comercio.value.trim(),
    sector: f.sector.value,
    contacto: f.contacto.value.trim(),
    telefono,
    email: f.email.value.trim() || null,
  });
  cargando(boton, false);

  if (error) {
    mostrarAviso(aviso, "error", escapar(traducirError(error)));
    return;
  }
  mostrarExito();
});

function mostrarExito() {
  const nombre = escapar(form.elements.contacto.value.trim().split(" ")[0] || "");
  form.reset();
  mostrarAviso(aviso, "exito", `¡Gracias${nombre ? ", " + nombre : ""}! Recibimos tu solicitud. Te escribimos por WhatsApp en los próximos días.`);
}
