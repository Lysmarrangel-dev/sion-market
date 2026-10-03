// Se evalúa antes que supabase.js para conservar los parámetros del enlace
// (el cliente de Supabase limpia la URL al procesarla).
const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const query = new URLSearchParams(window.location.search);
export const urlInicial = {
  tipo: hash.get("type") || query.get("type"),
  error: hash.get("error_code") || hash.get("error") || query.get("error_code") || query.get("error"),
  descripcionError: hash.get("error_description") || query.get("error_description"),
};
