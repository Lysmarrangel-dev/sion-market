import { supabase, configurado, sesionActual, urlDe } from "./supabase.js";
import { GOOGLE_HABILITADO, CIUDAD_INICIAL } from "./config.js";
import {
  mostrarAviso, ocultarAviso, cargando, activarVerClave, errorCampo, EMAIL_RE,
  normalizarTelefono, evaluarClave, conectarMedidor, traducirError, escapar,
} from "./ui.js";

const form = document.getElementById("form-registro");
const aviso = document.getElementById("aviso");
activarVerClave();
conectarMedidor(form.clave, document.getElementById("fuerza"), document.getElementById("reglas-clave"));

if (configurado && (await sesionActual())) window.location.replace("/app");

// Validación al salir de cada campo, sin regañar mientras se escribe
const validadores = {
  nombre: (v) => (v.trim().length < 2 ? "Escribe tu nombre." : ""),
  apellido: (v) => (v.trim().length < 2 ? "Escribe tu apellido." : ""),
  email: (v) => (!EMAIL_RE.test(v.trim()) ? "Escribe un correo válido, por ejemplo ana@correo.com." : ""),
  telefono: (v) => (!normalizarTelefono(v) ? "Escribe un celular venezolano, por ejemplo 412 123 4567." : ""),
  clave: (v) => (!evaluarClave(v).valida ? "Usa al menos 8 caracteres con letras y números." : ""),
  clave2: (v) => (v !== form.clave.value ? "Las contraseñas no coinciden." : ""),
};
for (const [nombre, fn] of Object.entries(validadores)) {
  const input = form.elements[nombre];
  input.addEventListener("blur", () => input.value && errorCampo(input, fn(input.value)));
  input.addEventListener("input", () => input.getAttribute("aria-invalid") && errorCampo(input, fn(input.value)));
}

if (GOOGLE_HABILITADO) {
  document.querySelector("[data-google]").hidden = false;
  document.getElementById("btn-google").addEventListener("click", async (e) => {
    if (!form.terminos.checked) {
      document.getElementById("terminos-error").textContent = "Acepta los términos para continuar con Google.";
      return form.terminos.focus();
    }
    sessionStorage.setItem("sm-terminos-google", "1");
    cargando(e.currentTarget, true, "Abriendo Google");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: urlDe("pronto.html") } });
    if (error) { cargando(e.currentTarget, false); mostrarAviso(aviso, "error", escapar(traducirError(error))); }
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarAviso(aviso);

  const resultados = Object.entries(validadores).map(([n, fn]) => errorCampo(form.elements[n], fn(form.elements[n].value)));
  const terminosOk = form.terminos.checked;
  document.getElementById("terminos-error").textContent = terminosOk ? "" : "Para crear tu cuenta debes aceptar los términos y la política de privacidad.";
  if (!resultados.every(Boolean) || !terminosOk) {
    return (form.querySelector('[aria-invalid="true"]') || form.terminos).focus();
  }
  if (!configurado) return mostrarAviso(aviso, "error", "Falta conectar Supabase. Edita <code>js/config.js</code>.");

  const email = form.email.value.trim().toLowerCase();
  const boton = form.querySelector('[type="submit"]');
  cargando(boton, true, "Creando tu cuenta");

  const { data, error } = await supabase.auth.signUp({
    email,
    password: form.clave.value,
    options: {
      emailRedirectTo: urlDe("pronto.html"),
      // Estos datos los copia a public.perfiles el trigger handle_new_user (ver SQL).
      data: {
        nombre: form.nombre.value.trim(),
        apellido: form.apellido.value.trim(),
        telefono: normalizarTelefono(form.telefono.value),
        ciudad_id: CIUDAD_INICIAL,
        acepta_terminos: true,
        acepta_marketing: form.marketing.checked,
      },
    },
  });
  cargando(boton, false);

  if (error) return mostrarAviso(aviso, "error", escapar(traducirError(error)));

  // Con confirmación de correo activa, Supabase no revela si el correo ya existía:
  // devuelve un usuario sin identidades. Lo detectamos para orientar a la persona.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return mostrarAviso(aviso, "info",
      'Ese correo ya tiene una cuenta. <a href="login.html">Inicia sesión</a> o <a href="recuperar.html">recupera tu contraseña</a>.');
  }

  if (data.session) return window.location.replace("pronto.html?bienvenida=1");

  // Falta confirmar el correo: mostramos la pantalla de próximamente en modo "confirma tu correo".
  sessionStorage.setItem("sm-pendiente", email);
  sessionStorage.setItem("sm-nombre", form.nombre.value.trim());
  window.location.replace("pronto.html?estado=confirmar");
});
