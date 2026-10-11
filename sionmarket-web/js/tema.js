// Tema claro / oscuro. Se carga sin "defer" en el <head> para fijar el tema antes de pintar.
// La app web (/app) lee la misma clave, así que el tema se mantiene al pasar de una a otra.
(function () {
  var CLAVE = "sm-tema";
  var raiz = document.documentElement;
  function guardado() {
    try { return localStorage.getItem(CLAVE); } catch (e) { return null; }
  }
  function actual() {
    var t = guardado();
    if (t === "light" || t === "dark") return t;
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function aplicar(t) {
    raiz.setAttribute("data-theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#000000" : "#FB6301");
  }
  aplicar(actual());

  var SOL = '<svg class="icono-sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var LUNA = '<svg class="icono-luna" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-tema]").forEach(function (b) {
      b.innerHTML = SOL + LUNA;
      function etiqueta() {
        b.setAttribute("aria-label", actual() === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
      }
      etiqueta();
      b.addEventListener("click", function () {
        var t = actual() === "dark" ? "light" : "dark";
        try { localStorage.setItem(CLAVE, t); } catch (e) {}
        aplicar(t);
        etiqueta();
      });
    });
  });
})();
