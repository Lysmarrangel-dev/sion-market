/* Utilidades de interfaz compartidas. Voz de marca: clara, cercana y útil. */

const MENSAJES = [
  [/invalid login credentials/i, "El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo."],
  [/email not confirmed/i, "Aún no confirmas tu correo. Abre el enlace que te enviamos para activar tu cuenta."],
  [/user already registered|already been registered/i, "Ese correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña."],
  [/password should be at least|weak password|password is too weak/i, "La contraseña es muy débil. Usa al menos 8 caracteres con letras y números."],
  [/new password should be different/i, "La nueva contraseña debe ser distinta de la anterior."],
  [/rate limit|too many requests|security purposes/i, "Hiciste varios intentos seguidos. Espera un minuto y vuelve a intentarlo."],
  [/unable to validate email|invalid email|email address .* is invalid/i, "Ese correo no parece válido. Revisa que esté bien escrito."],
  [/signups not allowed|signup is disabled/i, "El registro está cerrado por ahora. Vuelve pronto."],
  [/perfiles_telefono_uidx|duplicate key.*telefono/i, "Ese teléfono ya está registrado en otra cuenta."],
  [/failed to fetch|network|load failed/i, "No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo."],
  [/jwt expired|token has expired|otp_expired|invalid.*token/i, "El enlace venció. Pide uno nuevo y ábrelo en los próximos minutos."],
];

export function traducirError(error) {
  const texto = typeof error === "string" ? error : error?.message || "";
  for (const [patron, mensaje] of MENSAJES) if (patron.test(texto)) return mensaje;
  console.error(error);
  return "Algo no salió bien. Inténtalo de nuevo en un momento.";
}

export function mostrarAviso(el, tipo, html) {
  if (!el) return;
  el.className = `aviso aviso-${tipo} visible`;
  el.innerHTML = html;
  el.setAttribute("role", tipo === "error" ? "alert" : "status");
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: false });
}

export function ocultarAviso(el) {
  if (!el) return;
  el.className = "aviso";
  el.textContent = "";
}

export function escapar(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Pone un botón en estado de carga con las tres ruedas. */
export function cargando(boton, activo, textoCarga = "Un momento") {
  if (!boton) return;
  if (activo) {
    boton.dataset.texto = boton.innerHTML;
    boton.disabled = true;
    boton.setAttribute("aria-busy", "true");
    boton.innerHTML = `<span class="ruedas girando" aria-hidden="true"><i></i><i></i><i></i></span><span>${textoCarga}</span>`;
  } else {
    boton.disabled = false;
    boton.removeAttribute("aria-busy");
    if (boton.dataset.texto) boton.innerHTML = boton.dataset.texto;
  }
}

/** Botones "Mostrar / Ocultar" para campos de contraseña. */
export function activarVerClave(raiz = document) {
  raiz.querySelectorAll("[data-ver-clave]").forEach((btn) => {
    const input = document.getElementById(btn.dataset.verClave);
    btn.addEventListener("click", () => {
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      btn.textContent = visible ? "Mostrar" : "Ocultar";
      btn.setAttribute("aria-pressed", String(!visible));
      input.focus();
    });
  });
}

export function errorCampo(input, mensaje) {
  const id = `${input.id}-error`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("p");
    el.id = id;
    el.className = "error-campo";
    input.closest(".campo")?.appendChild(el);
  }
  el.textContent = mensaje || "";
  if (mensaje) {
    input.setAttribute("aria-invalid", "true");
    const desc = new Set((input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean));
    desc.add(id);
    input.setAttribute("aria-describedby", [...desc].join(" "));
  } else {
    input.removeAttribute("aria-invalid");
  }
  return !mensaje;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Teléfono venezolano: acepta 0412-1234567, 4121234567, +58 412 1234567. Devuelve +58XXXXXXXXXX o null. */
export function normalizarTelefono(valor) {
  let d = String(valor || "").replace(/\D/g, "");
  if (d.startsWith("58")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (!/^(2\d{2}|4(12|14|16|22|24|26))\d{7}$/.test(d)) return null;
  return `+58${d}`;
}

/** Evalúa la contraseña: devuelve nivel 0-4 y reglas cumplidas. */
export function evaluarClave(clave) {
  const reglas = {
    largo: clave.length >= 8,
    letra: /[a-záéíóúñ]/i.test(clave),
    numero: /\d/.test(clave),
    mayus: /[A-ZÁÉÍÓÚÑ]/.test(clave) && /[a-záéíóúñ]/.test(clave),
  };
  let nivel = Object.values(reglas).filter(Boolean).length;
  if (clave.length >= 12 && nivel >= 3) nivel = 4;
  if (!clave) nivel = 0;
  return { nivel, reglas, valida: reglas.largo && reglas.letra && reglas.numero };
}

export function conectarMedidor(input, medidor, listaReglas) {
  const actualizar = () => {
    const { nivel, reglas } = evaluarClave(input.value);
    medidor.dataset.nivel = String(nivel);
    medidor.setAttribute("aria-label", ["", "Muy débil", "Débil", "Aceptable", "Fuerte"][nivel] || "Sin contraseña");
    listaReglas?.querySelectorAll("[data-regla]").forEach((li) => li.classList.toggle("ok", !!reglas[li.dataset.regla]));
  };
  input.addEventListener("input", actualizar);
  actualizar();
}

/** Cuenta regresiva para botones de reenvío. */
export function enfriar(boton, segundos, textoBase) {
  let s = segundos;
  boton.disabled = true;
  const tick = () => {
    if (s <= 0) { boton.disabled = false; boton.textContent = textoBase; return; }
    boton.textContent = `${textoBase} (${s} s)`;
    s -= 1;
    setTimeout(tick, 1000);
  };
  tick();
}
