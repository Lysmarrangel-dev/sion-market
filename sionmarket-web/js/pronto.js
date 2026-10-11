import { urlInicial } from "./captura-url.js";
import { supabase, configurado, sesionActual, urlDe, APP } from "./supabase.js";
import { mostrarAviso, ocultarAviso, cargando, errorCampo, normalizarTelefono, traducirError, escapar, enfriar } from "./ui.js";

const vistas = ["cargando", "confirmar", "cuenta"].reduce((o, n) => ({ ...o, [n]: document.getElementById(`vista-${n}`) }), {});
function ver(nombre) {
  for (const [n, el] of Object.entries(vistas)) el.hidden = n !== nombre;
  document.getElementById(`titulo-${nombre}`)?.focus({ preventScroll: true });
}

const params = new URLSearchParams(location.search);
const sesion = configurado ? await sesionActual() : null;

if (!sesion) {
  const pendiente = sessionStorage.getItem("sm-pendiente");
  if (params.get("estado") === "confirmar" && pendiente) {
    mostrarConfirmacion(pendiente);
  } else {
    const motivo = urlInicial.error ? "enlace" : "sesion";
    window.location.replace(`login.html?motivo=${motivo}&siguiente=pronto.html`);
  }
} else {
  sessionStorage.removeItem("sm-pendiente");
  await mostrarCuenta(sesion);
}

// Si el usuario confirma el correo en otra pestaña, esta se actualiza sola.
supabase.auth.onAuthStateChange((evento, s) => {
  if (evento === "SIGNED_OUT") window.location.replace("index.html");
  if (evento === "SIGNED_IN" && s && !vistas.confirmar.hidden) window.location.reload();
});

function mostrarConfirmacion(email) {
  document.getElementById("email-pendiente").textContent = email;
  const nombre = sessionStorage.getItem("sm-nombre");
  if (nombre) document.getElementById("titulo-confirmar").textContent = `Ya casi, ${nombre}. Confirma tu correo.`;
  ver("confirmar");
  const btn = document.getElementById("btn-reenviar");
  const aviso = document.getElementById("aviso-confirmar");
  btn.addEventListener("click", async () => {
    ocultarAviso(aviso);
    cargando(btn, true, "Enviando");
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: urlDe("pronto.html") } });
    cargando(btn, false);
    if (error) mostrarAviso(aviso, "error", escapar(traducirError(error)));
    else mostrarAviso(aviso, "exito", "Te enviamos otro correo. Usa el enlace más reciente.");
    enfriar(btn, 60, "Reenviar correo");
  });
}

async function mostrarCuenta(s) {
  const { data: perfil, error } = await supabase
    .from("perfiles")
    .select("nombre, apellido, telefono, intereses, acepta_marketing, acepta_terminos_en")
    .eq("id", s.user.id)
    .maybeSingle();

  if (error) console.error(error);
  const meta = s.user.user_metadata || {};
  const nombre = perfil?.nombre || meta.nombre || (meta.full_name || meta.name || "").split(" ")[0] || "";
  const apellido = perfil?.apellido || meta.apellido || "";

  document.getElementById("usuario").hidden = false;
  document.getElementById("avatar").textContent = ((nombre[0] || s.user.email[0]) + (apellido[0] || "")).toUpperCase();
  document.getElementById("btn-salir").addEventListener("click", async (e) => {
    cargando(e.currentTarget, true, "Saliendo");
    await supabase.auth.signOut();
    window.location.replace("index.html");
  });

  if (nombre) document.getElementById("titulo-cuenta").textContent = `Hola, ${nombre}. Ya casi terminas.`;
  history.replaceState(null, "", "pronto.html");

  const form = document.getElementById("form-intereses");
  (perfil?.intereses || []).forEach((v) => { const c = form.querySelector(`[value="${CSS.escape(v)}"]`); if (c) c.checked = true; });
  form.marketing.checked = !!perfil?.acepta_marketing;

  // Datos faltantes (cuentas de Google o perfiles incompletos)
  const faltaTelefono = !perfil?.telefono;
  const faltaTerminos = !perfil?.acepta_terminos_en;
  // Con la cuenta completa no hay nada que hacer aquí: la cuenta del cliente es la app web.
  if (!error && !faltaTelefono && !faltaTerminos) return window.location.replace(APP);
  document.getElementById("datos-faltantes").hidden = !(faltaTelefono || faltaTerminos);
  document.getElementById("campo-telefono").hidden = !faltaTelefono;
  document.getElementById("campo-terminos").hidden = !faltaTerminos;
  if (faltaTerminos && sessionStorage.getItem("sm-terminos-google")) form.terminos.checked = true;

  ver("cuenta");

  const aviso = document.getElementById("aviso-intereses");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarAviso(aviso);
    const intereses = [...form.querySelectorAll('[name="intereses"]:checked')].map((c) => c.value);
    const cambios = { intereses, acepta_marketing: form.marketing.checked };

    if (faltaTelefono && form.telefono.value) {
      const tel = normalizarTelefono(form.telefono.value);
      if (!errorCampo(form.telefono, tel ? "" : "Escribe un celular venezolano, por ejemplo 412 123 4567.")) return form.telefono.focus();
      cambios.telefono = tel;
    }
    if (faltaTerminos && !form.terminos.checked) {
      document.getElementById("terminos-error").textContent = "Acepta los términos para completar tu cuenta.";
      return form.terminos.focus();
    }

    const boton = form.querySelector('[type="submit"]');
    cargando(boton, true, "Guardando");
    let { error: err } = await supabase.from("perfiles").update(cambios).eq("id", s.user.id);
    if (!err && faltaTerminos) ({ error: err } = await supabase.rpc("aceptar_terminos"));
    cargando(boton, false);

    if (err) return mostrarAviso(aviso, "error", escapar(traducirError(err)));
    sessionStorage.removeItem("sm-terminos-google");
    window.location.replace(APP);
  });
}
