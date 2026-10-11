import { parseArgs } from 'node:util';
import { Role } from '@sionmarket/contracts';
import { eq, or, sql } from 'drizzle-orm';
import { createDb } from './client.js';
import { restaurants, users } from './schema.js';

/**
 * Gives a Supabase account a role, and optionally makes it the owner of a restaurant.
 *   node dist/db/rol.js --correo dueno@ejemplo.com --rol restaurante --restaurante pollos-el-cocuy
 *   node dist/db/rol.js --telefono +584141234567 --rol repartidor
 * The account must exist in Supabase Auth (signed up at least once).
 */
const { values } = parseArgs({
  options: { correo: { type: 'string' }, telefono: { type: 'string' }, rol: { type: 'string' }, restaurante: { type: 'string' } },
});
const role = Role.parse(values.rol);
if (!values.correo && !values.telefono) throw new Error('Indica --correo o --telefono');

const { db, sql: conn } = createDb(process.env.DATABASE_URL!, 1);
try {
  const phone = values.telefono ? `+${values.telefono.replace(/^\+/, '')}` : undefined;
  let [user] = await db
    .select()
    .from(users)
    .where(or(values.correo ? eq(users.email, values.correo) : undefined, phone ? eq(users.phone, phone) : undefined));

  if (!user) {
    // Not seen by the API yet: take the id from Supabase Auth.
    const found = await db.execute<{ id: string; email: string | null; phone: string | null }>(
      sql`select id, email, phone from auth.users where email = ${values.correo ?? null} or phone = ${phone?.slice(1) ?? null} limit 1`,
    );
    const auth = found[0];
    if (!auth) throw new Error('No existe esa cuenta en Supabase Auth');
    [user] = await db
      .insert(users)
      .values({ id: auth.id, email: auth.email, phone: auth.phone ? `+${auth.phone}` : null })
      .returning();
  }

  const roles = [...new Set([...user!.roles, role])];
  await db.update(users).set({ roles }).where(eq(users.id, user!.id));
  if (values.restaurante) {
    const [r] = await db.update(restaurants).set({ ownerUserId: user!.id }).where(eq(restaurants.id, values.restaurante)).returning();
    if (!r) throw new Error(`No existe el restaurante ${values.restaurante}`);
  }
  console.log(`Listo: ${values.correo ?? phone} ahora tiene ${roles.join(', ')}${values.restaurante ? ` y es dueño de ${values.restaurante}` : ''}.`);
  console.log('El cambio aplica en menos de un minuto (caché de sesión).');
} finally {
  await conn.end();
}
