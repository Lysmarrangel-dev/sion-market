import { supabase, configurado, sesionActual, urlDe, destinoSeguro } from "./supabase.js";
import { GOOGLE_HABILITADO } from "./config.js";
import { mostrarAviso, ocultarAviso, cargando, activarVerClave, errorCampo, EMAIL_RE, traducirError, escapar, enfriar } from "./ui.js";

const form = document.getElementById("form-login");
const aviso = document.getElementById("aviso");
const destino = destinoSeguro();
activarVerClave();

if (configurado && (await sesionActual())) window.location.replace(destino);

// Recordar el correo entre login y recuperación
const emailGuardado = sessionStorage.getItem("sm-email");
if (emailGuardado) form.email.value = emailGuardado;
document.getElementById("enlace-recuperar").addEventListener("click", () => {
  if (form.email.value) sessionStorage.setItem("sm-email", form.email.value.trim());
});

const motivo = new URLSearchParams(location.search).get("motivo");
if (motivo === "sesion") mostrarAviso(aviso, "info", "Inicia sesión para ver tu cuenta.");
if (motivo === "enlace") mostrarAviso(aviso, "info", "El enlace de confirmación venció o ya se usó. Inicia sesión; si tu correo sigue sin confirmar, te ofrecemos reenviarlo.");

configurarGoogle();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarAviso(aviso);
  const email = form.email.value.trim().toLowerCase();
  const clave = form.clave.value;
  const ok = [
    errorCampo(form.email, !EMAIL_RE.test(email) ? "Escribe un correo válido, por ejemplo ana@correo.com." : ""),
    errorCampo(form.clave, !clave ? "Escribe tu contraseña." : ""),
  ].every(Boolean);
  if (!ok) return form.querySelector('[aria-invalid="true"]').focus();
  if (!configurado) return mostrarAviso(aviso, "error", "Falta conectar Supabase. Edita <code>js/config.js</code>.");

  const boton = form.querySelector('[type="submit"]');
  cargando(boton, true, "Entrando");
  const { error } = await supabase.auth.signInWithPassword({ email, password: clave });
  cargando(boton, false);

  if (!error) {
    sessionStorage.removeItem("sm-email");
    return window.location.replace(destino);
  }

  if (/email not confirmed/i.test(error.message)) {
    mostrarAviso(aviso, "info",
      `Aún no confirmas tu correo. Abre el enlace que te enviamos a <strong>${escapar(email)}</strong>. <button type="button" class="enlace" id="reenviar">Reenviar correo</button>`);
    document.getElementById("reenviar").addEventListener("click", async (ev) => {
      const b = ev.currentTarget;
      const { error: e2 } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: urlDe("pronto.html") } });
      if (e2) return mostrarAviso(aviso, "error", escapar(traducirError(e2)));
      enfriar(b, 60, "Reenviar correo");
    });
    return;
  }
  mostrarAviso(aviso, "error", escapar(traducirError(error)));
  form.clave.select();
});

function configurarGoogle() {
  if (!GOOGLE_HABILITADO) return;
  document.querySelector("[data-google]").hidden = false;
  document.getElementById("btn-google").addEventListener("click", async (e) => {
    cargando(e.currentTarget, true, "Abriendo Google");
    // Vuelve por pronto.html: si es una cuenta nueva de Google pide teléfono y términos, y luego sigue al destino.
    sessionStorage.setItem("sm-siguiente", destino);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: urlDe("pronto.html") } });
    if (error) { cargando(e.currentTarget, false); mostrarAviso(aviso, "error", escapar(traducirError(error))); }
  });
}
