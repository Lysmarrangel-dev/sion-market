import { supabase, configurado, urlDe } from "./supabase.js";
import { mostrarAviso, ocultarAviso, cargando, errorCampo, EMAIL_RE, traducirError, escapar, enfriar } from "./ui.js";

const form = document.getElementById("form-recuperar");
const aviso = document.getElementById("aviso");
const pasoPedir = document.getElementById("paso-pedir");
const pasoEnviado = document.getElementById("paso-enviado");
const btnReenviar = document.getElementById("btn-reenviar");
let emailActual = "";

const guardado = sessionStorage.getItem("sm-email");
if (guardado) form.email.value = guardado;

async function enviar(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: urlDe("restablecer.html") });
  return error;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarAviso(aviso);
  const email = form.email.value.trim().toLowerCase();
  if (!errorCampo(form.email, !EMAIL_RE.test(email) ? "Escribe un correo válido, por ejemplo ana@correo.com." : "")) return form.email.focus();
  if (!configurado) return mostrarAviso(aviso, "error", "Falta conectar Supabase. Edita <code>js/config.js</code>.");

  const boton = form.querySelector('[type="submit"]');
  cargando(boton, true, "Enviando");
  const error = await enviar(email);
  cargando(boton, false);

  // Solo mostramos errores de conexión o de límite; nunca revelamos si el correo existe.
  if (error && /rate|too many|security purposes|fetch|network/i.test(error.message)) {
    return mostrarAviso(aviso, "error", escapar(traducirError(error)));
  }
  emailActual = email;
  sessionStorage.setItem("sm-email", email);
  document.getElementById("email-enviado").textContent = email;
  pasoPedir.hidden = true;
  pasoEnviado.hidden = false;
  document.getElementById("titulo-enviado").focus();
  enfriar(btnReenviar, 60, "Reenviar enlace");
});

btnReenviar.addEventListener("click", async () => {
  const avisoR = document.getElementById("aviso-reenvio");
  ocultarAviso(avisoR);
  cargando(btnReenviar, true, "Enviando");
  const error = await enviar(emailActual);
  cargando(btnReenviar, false);
  if (error && /rate|too many|security purposes/i.test(error.message)) {
    mostrarAviso(avisoR, "error", escapar(traducirError(error)));
  } else {
    mostrarAviso(avisoR, "exito", "Te enviamos otro enlace. Usa el más reciente.");
  }
  enfriar(btnReenviar, 60, "Reenviar enlace");
});

document.getElementById("btn-otro-correo").addEventListener("click", () => {
  pasoEnviado.hidden = true;
  pasoPedir.hidden = false;
  form.email.select();
});
