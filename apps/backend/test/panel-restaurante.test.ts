import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { DEMO_USERS } from '../src/db/seed.js';
import { setup, signIn } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setup>>;
before(async () => {
  ctx = await setup();
});
after(async () => {
  await ctx.app.close();
});

const token = async (phone: string) => {
  const { accessToken } = await signIn(phone);
  await ctx.api.call('GET', '/yo', undefined, accessToken); // creates the profile
  return accessToken;
};

const nuevo = {
  name: 'Arepera Doña Inés',
  category: 'hamburguesas',
  etaMin: 20,
  etaMax: 35,
  deliveryCents: 150,
  address: 'Av. La Patria, San Felipe',
  schedule: 'Lun a Sáb · 7:00 a 15:00',
  location: { latitude: 10.3399, longitude: -68.7425 },
};

describe('panel del restaurante', () => {
  let owner: string;
  let id: string;
  let productId: string;

  before(async () => {
    owner = await token(DEMO_USERS.restaurant.phone);
  });

  test('un cliente no puede crear restaurantes', async () => {
    const res = await ctx.api.call('POST', '/restaurantes', nuevo, await token('+584141111111'));
    assert.equal(res.status, 403);
  });

  test('lista solo los restaurantes del dueño', async () => {
    const res = await ctx.api.call('GET', '/yo/restaurantes', undefined, owner);
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 5);
  });

  test('crea un restaurante con id legible y lo publica', async () => {
    const res = await ctx.api.call('POST', '/restaurantes', nuevo, owner);
    assert.equal(res.status, 201);
    id = res.body.id;
    assert.equal(id, 'arepera-dona-ines');
    assert.deepEqual(res.body.tags, []);
    const list = await ctx.api.call('GET', '/restaurantes');
    assert.ok(list.body.some((r: any) => r.id === id));
  });

  test('rechaza tiempos al revés y categorías que no existen', async () => {
    assert.equal((await ctx.api.call('POST', '/restaurantes', { ...nuevo, etaMin: 40, etaMax: 30 }, owner)).status, 400);
    assert.equal((await ctx.api.call('POST', '/restaurantes', { ...nuevo, category: 'nada' }, owner)).status, 422);
    assert.equal((await ctx.api.call('PATCH', `/restaurantes/${id}`, { etaMax: 10 }, owner)).status, 422);
  });

  test('edita solo los campos enviados', async () => {
    const res = await ctx.api.call('PATCH', `/restaurantes/${id}`, { promo: 'Envío gratis', location: { latitude: 10.34, longitude: -68.74 } }, owner);
    assert.equal(res.status, 200);
    assert.equal(res.body.promo, 'Envío gratis');
    assert.equal(res.body.name, nuevo.name);
    assert.deepEqual(res.body.location, { latitude: 10.34, longitude: -68.74 });
  });

  test('otro dueño no puede editarlo', async () => {
    const otro = await token('+584142222222');
    const res = await ctx.api.call('PATCH', `/restaurantes/${id}`, { name: 'Mío' }, otro);
    assert.equal(res.status, 403);
  });

  test('agrega, edita y borra platos del menú', async () => {
    const created = await ctx.api.call('POST', `/restaurantes/${id}/productos`, { section: 'Arepas', name: 'Reina pepiada', priceCents: 350 }, owner);
    assert.equal(created.status, 201);
    productId = created.body.id;
    assert.equal(created.body.soldOut, false);

    const edited = await ctx.api.call('PATCH', `/restaurantes/${id}/productos/${productId}`, { priceCents: 400, popular: true }, owner);
    assert.equal(edited.body.priceCents, 400);
    assert.equal(edited.body.name, 'Reina pepiada');

    const detail = await ctx.api.call('GET', `/restaurantes/${id}`);
    assert.deepEqual(detail.body.sections.map((s: any) => s.name), ['Arepas']);
    assert.equal(detail.body.sections[0].products[0].priceCents, 400);

    assert.equal((await ctx.api.call('DELETE', `/restaurantes/${id}/productos/${productId}`, undefined, owner)).status, 200);
    assert.equal((await ctx.api.call('DELETE', `/restaurantes/${id}/productos/${productId}`, undefined, owner)).status, 404);
  });

  test('el admin ve y borra cualquier restaurante sin pedidos', async () => {
    const admin = await token(DEMO_USERS.admin.phone);
    const mine = await ctx.api.call('GET', '/yo/restaurantes', undefined, admin);
    assert.equal(mine.body.length, 6);
    assert.equal((await ctx.api.call('DELETE', `/restaurantes/${id}`, undefined, admin)).status, 200);
    assert.equal((await ctx.api.call('GET', `/restaurantes/${id}`)).status, 404);
  });
});
