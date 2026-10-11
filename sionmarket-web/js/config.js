/**
 * Configuración pública de Supabase.
 * La "anon key" es pública por diseño: la seguridad real la dan las
 * políticas RLS definidas en supabase/migrations/0001_inicial.sql.
 * NUNCA pongas aquí la service_role key.
 *
 * Supabase Dashboard → Project Settings → API
 */
export const SUPABASE_URL = "https://oqaaxsuhtpmjnwuyqkzd.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xYWF4c3VodHBtam53dXlxa3pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjY5OTcsImV4cCI6MjEwNjYwMjk5N30.lLuwcH7-P0_AUxRQ_KqKoSi6SbTbJjYcGxPp-nGFWHk";

/** Activa el botón "Continuar con Google" cuando configures el proveedor
 *  en Authentication → Providers → Google. */
export const GOOGLE_HABILITADO = false;

/** Ciudad de operación inicial (coincide con la tabla public.ciudades). */
export const CIUDAD_INICIAL = "san-felipe";

/** App del teléfono. Desde un celular, "Pedir ahora" abre la app si está instalada.
 *  Cuando la publiques, pon aquí los enlaces de las tiendas: si la app no está
 *  instalada, el celular va a la tienda; mientras estén vacíos, sigue en la web. */
export const APP_ESQUEMA = "sionmarket";
export const APP_PAQUETE_ANDROID = "com.sionmarket.app";
export const PLAY_STORE_URL = "";
export const APP_STORE_URL = "";
