import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { DEMO_PHONES } from '../src/db/seed.js';
import { setup } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setup>>;
before(async () => {
  ctx = await setup();
});
after(async () => {
  await ctx.app.close();
});

const burger = (body: any) => body.sections.flatMap((s: any) => s.products).find((p: any) => p.id === 'p2');

test('marcar agotado se ve de inmediato aunque el menú esté en caché', async () => {
  const first = await ctx.api.call('GET', '/restaurantes/la-parrilla-yaracuy');
  assert.equal(burger(first.body).soldOut, false);

  const resto = (await ctx.api.login(DEMO_PHONES.restaurant)).accessToken;
  const res = await ctx.api.call('PATCH', '/restaurantes/la-parrilla-yaracuy/productos/p2/disponibilidad', { soldOut: true }, resto);
  assert.equal(res.status, 200);

  const after = await ctx.api.call('GET', '/restaurantes/la-parrilla-yaracuy');
  assert.equal(burger(after.body).soldOut, true);
});

test('un cliente no puede tocar el menú', async () => {
  const cliente = (await ctx.api.login('+584140001111')).accessToken;
  const res = await ctx.api.call('PATCH', '/restaurantes/la-parrilla-yaracuy/productos/p2/disponibilidad', { soldOut: false }, cliente);
  assert.equal(res.status, 403);
});

test('registra el token de push del teléfono', async () => {
  const cliente = (await ctx.api.login('+584140002222')).accessToken;
  const ok = await ctx.api.call('POST', '/yo/dispositivos', { token: 'ExponentPushToken[abc123]', platform: 'android' }, cliente);
  assert.equal(ok.status, 204);
  const bad = await ctx.api.call('POST', '/yo/dispositivos', { token: 'cualquier-cosa', platform: 'android' }, cliente);
  assert.equal(bad.status, 400);
});
