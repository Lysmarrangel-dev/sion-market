import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const configurado =
  !SUPABASE_URL.includes("TU-PROYECTO") && !SUPABASE_ANON_KEY.includes("TU-ANON-KEY");

export const supabase = createClient(
  configurado ? SUPABASE_URL : "https://placeholder.supabase.co",
  configurado ? SUPABASE_ANON_KEY : "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "sionmarket-auth",
    },
  }
);

/** URL absoluta de una página del sitio (para los enlaces de los correos). */
export function urlDe(pagina) {
  return new URL(pagina, window.location.href).href.split("#")[0].split("?")[0];
}

/** Sesión actual o null. */
export async function sesionActual() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/** Destino tras iniciar sesión: solo rutas internas para evitar redirecciones abiertas. */
export function destinoSeguro(porDefecto = "pronto.html") {
  const siguiente = new URLSearchParams(window.location.search).get("siguiente");
  if (siguiente && /^[a-z0-9-]+\.html$/i.test(siguiente)) return siguiente;
  return porDefecto;
}

if (!configurado) {
  window.addEventListener("DOMContentLoaded", () => {
    const b = document.createElement("div");
    b.className = "banner-config";
    b.setAttribute("role", "status");
    b.innerHTML =
      "Falta conectar Supabase. Edita <code>js/config.js</code> con la URL y la anon key de tu proyecto.";
    document.body.appendChild(b);
  });
}
