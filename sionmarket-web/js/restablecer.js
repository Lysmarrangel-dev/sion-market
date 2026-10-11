import { urlInicial } from "./captura-url.js";
import { supabase, configurado } from "./supabase.js";
import { mostrarAviso, ocultarAviso, cargando, activarVerClave, errorCampo, evaluarClave, conectarMedidor, traducirError, escapar } from "./ui.js";

const pasos = {
  verificando: document.getElementById("paso-verificando"),
  clave: document.getElementById("paso-clave"),
  vencido: document.getElementById("paso-vencido"),
};
function mostrarPaso(nombre) {
  for (const [n, el] of Object.entries(pasos)) el.hidden = n !== nombre;
  pasos[nombre].querySelector("h1")?.focus?.();
}

const form = document.getElementById("form-clave");
const aviso = document.getElementById("aviso");
activarVerClave();
conectarMedidor(form.clave, document.getElementById("fuerza"), document.getElementById("reglas-clave"));

let listo = false;
supabase.auth.onAuthStateChange((evento, sesion) => {
  if (!listo && sesion && (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN")) {
    listo = true;
    mostrarPaso("clave");
    form.clave.focus();
  }
});

if (!configurado || urlInicial.error) {
  mostrarPaso("vencido");
} else {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    if (!listo) { listo = true; mostrarPaso("clave"); form.clave.focus(); }
  } else {
    // Damos un margen breve por si el cliente aún está procesando el enlace.
    setTimeout(() => { if (!listo) mostrarPaso("vencido"); }, 2500);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarAviso(aviso);
  const ok = [
    errorCampo(form.clave, !evaluarClave(form.clave.value).valida ? "Usa al menos 8 caracteres con letras y números." : ""),
    errorCampo(form.clave2, form.clave2.value !== form.clave.value ? "Las contraseñas no coinciden." : ""),
  ].every(Boolean);
  if (!ok) return form.querySelector('[aria-invalid="true"]').focus();

  const boton = form.querySelector('[type="submit"]');
  cargando(boton, true, "Guardando");
  const { error } = await supabase.auth.updateUser({ password: form.clave.value });
  if (error) {
    cargando(boton, false);
    if (/session|jwt|token/i.test(error.message)) return mostrarPaso("vencido");
    return mostrarAviso(aviso, "error", escapar(traducirError(error)));
  }
  boton.innerHTML = "Contraseña guardada";
  mostrarAviso(aviso, "exito", "Listo, tu contraseña nueva quedó guardada. Te llevamos a tu cuenta.");
  sessionStorage.removeItem("sm-email");
  setTimeout(() => window.location.replace("/app"), 1600);
});
