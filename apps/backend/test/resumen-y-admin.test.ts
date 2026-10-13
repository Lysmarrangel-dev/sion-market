import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { DEMO_USERS } from '../src/db/seed.js';
import { rangeFor } from '../src/modules/estadisticas/estadisticas.service.js';
import { setup, signIn } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setup>>;
let owner: string;
let admin: string;
let customer: string;
let customerId: string;
let addressId: string;

const token = async (phone: string, email?: string) => {
  const { accessToken, user } = await signIn(phone, email);
  await ctx.api.call('GET', '/yo', undefined, accessToken); // creates the profile
  return { accessToken, id: user.id };
};

const order = (lines: { productId: string; quantity: number; optionIds?: string[] }[]) =>
  ctx.api.call(
    'POST',
    '/pedidos',
    { restaurantId: 'la-parrilla-yaracuy', addressId, paymentMethod: 'efectivo', tipCents: 0, lines: lines.map((l) => ({ optionIds: [], ...l })) },
    customer,
  );

before(async () => {
  ctx = await setup();
  owner = (await token(DEMO_USERS.restaurant.phone)).accessToken;
  admin = (await token(DEMO_USERS.admin.phone)).accessToken;
  ({ accessToken: customer, id: customerId } = await token('+584147777777'));
  const address = await ctx.api.call(
    'POST',
    '/yo/direcciones',
    { alias: 'Casa', street: 'Calle 10, San Felipe', reference: 'Portón verde', location: { latitude: 10.3399, longitude: -68.7425 } },
    customer,
  );
  addressId = address.body.id;
});
after(async () => {
  await ctx.app.close();
});

describe('periodos', () => {
  test('el día empieza a medianoche de Caracas', () => {
    const r = rangeFor('dia', new Date('2026-10-12T03:30:00Z')); // 23:30 del 11 en Caracas
    assert.equal(r.from.toISOString(), '2026-10-11T04:00:00.000Z');
    assert.equal(r.prevFrom.toISOString(), '2026-10-10T04:00:00.000Z');
    assert.equal(r.prevTo.toISOString(), '2026-10-11T03:30:00.000Z');
  });

  test('la semana son los últimos 7 días contando hoy', () => {
    const r = rangeFor('semana', new Date('2026-10-12T15:00:00Z'));
    assert.equal(r.from.toISOString(), '2026-10-06T04:00:00.000Z');
  });
});

describe('resumen del restaurante', () => {
  test('cuenta ventas, rechazos y platos más pedidos', async () => {
    const a = await order([{ productId: 'p1', quantity: 2, optionIds: ['la-parrilla-yaracuy.termino.tm'] }]);
    assert.equal(a.status, 201, JSON.stringify(a.body));
    const b = await order([{ productId: 'p3', quantity: 3, optionIds: ['la-parrilla-yaracuy.salsa.ajo'] }]);
    assert.equal(b.status, 201, JSON.stringify(b.body));
    await ctx.api.call('POST', `/pedidos/${a.body.id}/estado`, { status: 'ACEPTADO' }, owner);
    await ctx.api.call('POST', `/pedidos/${b.body.id}/estado`, { status: 'RECHAZADO', reason: 'Sin pan' }, owner);

    const res = await ctx.api.call('GET', '/restaurantes/la-parrilla-yaracuy/resumen?periodo=dia', undefined, owner);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.totals.orders, 2);
    assert.equal(res.body.totals.rejected, 1);
    assert.equal(res.body.totals.salesCents, a.body.totals.restaurantTotalCents);
    assert.equal(res.body.totals.avgTicketCents, a.body.totals.restaurantTotalCents);
    assert.equal(res.body.series.length, 24);
    assert.equal(res.body.series.reduce((n: number, p: any) => n + p.orders, 0), 2);
    assert.deepEqual(res.body.topProducts.map((p: any) => [p.quantity]), [[2]]);
    assert.equal(typeof res.body.acceptMinutes, 'number');
  });

  test('la semana trae 7 barras y el mes 30', async () => {
    const week = await ctx.api.call('GET', '/restaurantes/la-parrilla-yaracuy/resumen?periodo=semana', undefined, owner);
    assert.equal(week.body.series.length, 7);
    assert.equal(week.body.series.at(-1).orders, 2);
    const month = await ctx.api.call('GET', '/restaurantes/la-parrilla-yaracuy/resumen?periodo=mes', undefined, owner);
    assert.equal(month.body.series.length, 30);
  });

  test('otro dueño no ve el resumen', async () => {
    const other = await token('+584148888888');
    await ctx.api.call('PUT', `/admin/usuarios/${other.id}/roles`, { roles: ['restaurante'] }, admin);
    const res = await ctx.api.call('GET', '/restaurantes/la-parrilla-yaracuy/resumen', undefined, other.accessToken);
    assert.equal(res.status, 403);
  });
});

describe('personalización de un plato', () => {
  const url = '/restaurantes/la-parrilla-yaracuy/productos/p2/personalizacion';

  test('crea grupos con opciones y precios', async () => {
    const res = await ctx.api.call(
      'PUT',
      url,
      {
        groups: [
          { name: 'Tamaño', required: true, max: 1, options: [{ name: 'Normal', priceCents: 0 }, { name: 'Grande', priceCents: 200 }] },
          { name: 'Extras', required: false, max: 2, options: [{ name: 'Tocineta', priceCents: 100 }, { name: 'Huevo', priceCents: 50 }] },
        ],
      },
      owner,
    );
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.modifierGroups.map((g: any) => [g.name, g.min, g.max, g.options.length]), [
      ['Tamaño', 1, 1, 2],
      ['Extras', 0, 2, 2],
    ]);
  });

  test('edita, reordena y quita grupos conservando los ids', async () => {
    const before = (await ctx.api.call('GET', '/yo/restaurantes/la-parrilla-yaracuy', undefined, owner)).body.sections
      .flatMap((s: any) => s.products)
      .find((p: any) => p.id === 'p2');
    const size = before.modifierGroups[0];
    const res = await ctx.api.call(
      'PUT',
      url,
      { groups: [{ ...size, name: 'Tamaño del plato', options: [size.options[1], { name: 'Familiar', priceCents: 500 }] }] },
      owner,
    );
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.modifierGroups.length, 1);
    assert.equal(res.body.modifierGroups[0].id, size.id);
    assert.deepEqual(res.body.modifierGroups[0].options.map((o: any) => o.name), ['Grande', 'Familiar']);
    assert.equal(res.body.modifierGroups[0].options[0].id, size.options[1].id);
  });

  test('el cliente puede pedir con la opción nueva', async () => {
    const detail = await ctx.api.call('GET', '/restaurantes/la-parrilla-yaracuy');
    const dish = detail.body.sections.flatMap((s: any) => s.products).find((p: any) => p.id === 'p2');
    const familiar = dish.modifierGroups[0].options[1];
    const res = await order([{ productId: 'p2', quantity: 1, optionIds: [familiar.id] }]);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.lines[0].unitCents, dish.priceCents + 500);
  });

  test('rechaza un máximo mayor que las opciones y grupos de otro restaurante', async () => {
    const bad = await ctx.api.call('PUT', url, { groups: [{ name: 'X', required: false, max: 3, options: [{ name: 'a', priceCents: 0 }] }] }, owner);
    assert.equal(bad.status, 400);
    const foreign = await ctx.api.call(
      'PUT',
      url,
      { groups: [{ id: 'pizzeria-don-nicola.tamano', name: 'X', required: false, max: 1, options: [{ name: 'a', priceCents: 0 }] }] },
      owner,
    );
    assert.equal(foreign.status, 422);
  });
});

describe('administración', () => {
  test('solo un admin entra', async () => {
    assert.equal((await ctx.api.call('GET', '/admin/resumen', undefined, owner)).status, 403);
    assert.equal((await ctx.api.call('GET', '/admin/resumen', undefined, customer)).status, 403);
  });

  test('resumen de la plataforma', async () => {
    const res = await ctx.api.call('GET', '/admin/resumen?periodo=dia', undefined, admin);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.totals.orders, 3);
    assert.equal(res.body.restaurants.total, 5);
    assert.equal(res.body.zones.active, 1);
    assert.ok(res.body.users.admin >= 1);
    assert.equal(res.body.topRestaurants[0].id, 'la-parrilla-yaracuy');
    assert.equal(res.body.pendingRequests, 0);
  });

  test('lista restaurantes con su zona y dueño', async () => {
    const res = await ctx.api.call('GET', '/admin/restaurantes', undefined, admin);
    const parrilla = res.body.find((r: any) => r.id === 'la-parrilla-yaracuy');
    assert.equal(parrilla.zone, 'San Felipe centro');
    assert.equal(parrilla.orders30d, 3);
    assert.equal(parrilla.enabled, true);
  });

  test('la web puede mandar PATCH, PUT y DELETE', async () => {
    const res = await ctx.app.inject({
      method: 'OPTIONS',
      url: '/v1/admin/restaurantes/la-parrilla-yaracuy/habilitado',
      headers: { origin: 'https://www.sionmarket.app', 'access-control-request-method': 'PATCH' },
    });
    const allowed = String(res.headers['access-control-allow-methods']);
    for (const m of ['PATCH', 'PUT', 'DELETE']) assert.ok(allowed.includes(m), `${m} en ${allowed}`);
  });

  test('registrar un restaurante lo deja con su dueño desde el inicio', async () => {
    const nuevo = await token('+584146666666', 'nuevo.dueno@ejemplo.com');
    const input = {
      name: 'Cachapas La Esquina',
      category: 'hamburguesas',
      etaMin: 20,
      etaMax: 30,
      deliveryCents: 150,
      address: 'Av. La Patria, San Felipe',
      schedule: 'Lun a Dom · 8:00 a 14:00',
      location: { latitude: 10.6, longitude: -68.2 }, // outside the demo zone, so the zone counts below stay put
    };
    const sinCuenta = await ctx.api.call('POST', '/admin/restaurantes', { ...input, ownerEmail: 'nadie@ejemplo.com' }, admin);
    assert.equal(sinCuenta.status, 422);
    const created = await ctx.api.call('POST', '/admin/restaurantes', { ...input, ownerEmail: 'Nuevo.Dueno@ejemplo.com' }, admin);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const list = await ctx.api.call('GET', '/admin/restaurantes', undefined, admin);
    const mine = list.body.filter((r: any) => r.name === 'Cachapas La Esquina');
    assert.equal(mine.length, 1, 'el intento sin cuenta no creó nada');
    assert.equal(mine[0].ownerEmail, 'nuevo.dueno@ejemplo.com');
    // The owner gets the restaurant role and sees it in their panel.
    const panel = await ctx.api.call('GET', '/yo/restaurantes', undefined, nuevo.accessToken);
    assert.equal(panel.status, 200);
    assert.deepEqual(panel.body.map((r: any) => r.id), [created.body.id]);
  });

  test('deshabilitar un restaurante lo esconde y no acepta pedidos', async () => {
    const off = await ctx.api.call('PATCH', '/admin/restaurantes/la-parrilla-yaracuy/habilitado', { enabled: false }, admin);
    assert.equal(off.status, 200);
    const list = await ctx.api.call('GET', '/restaurantes');
    assert.ok(!list.body.some((r: any) => r.id === 'la-parrilla-yaracuy'));
    assert.equal((await ctx.api.call('GET', '/restaurantes/la-parrilla-yaracuy')).status, 404);
    assert.equal((await order([{ productId: 'p3', quantity: 3, optionIds: ['la-parrilla-yaracuy.salsa.ajo'] }])).status, 404);
    // The owner still sees it in the panel, marked as disabled.
    const mine = await ctx.api.call('GET', '/yo/restaurantes/la-parrilla-yaracuy', undefined, owner);
    assert.equal(mine.body.enabled, false);
    await ctx.api.call('PATCH', '/admin/restaurantes/la-parrilla-yaracuy/habilitado', { enabled: true }, admin);
    assert.equal((await ctx.api.call('GET', '/restaurantes/la-parrilla-yaracuy')).status, 200);
  });

  test('zonas con conteos y activar o desactivar', async () => {
    const res = await ctx.api.call('GET', '/admin/zonas', undefined, admin);
    assert.equal(res.body[0].id, 'san-felipe-centro');
    assert.equal(res.body[0].restaurants, 5);
    assert.ok(res.body[0].area.length >= 4);
    const off = await ctx.api.call('PATCH', '/admin/zonas/san-felipe-centro/activa', { active: false }, admin);
    assert.equal(off.status, 200);
    const check = await ctx.api.call('POST', '/cobertura/verificar', { latitude: 10.3399, longitude: -68.7425 });
    assert.equal(check.body.covered, false);
    await ctx.api.call('PATCH', '/admin/zonas/san-felipe-centro/activa', { active: true }, admin);
  });

  test('busca usuarios y cambia sus roles', async () => {
    const found = await ctx.api.call('GET', '/admin/usuarios?q=7777777', undefined, admin);
    assert.deepEqual(found.body.map((u: any) => u.id), [customerId]);
    const set = await ctx.api.call('PUT', `/admin/usuarios/${customerId}/roles`, { roles: ['repartidor'] }, admin);
    assert.deepEqual(set.body.roles, ['cliente', 'repartidor']);
    const riders = await ctx.api.call('GET', '/admin/usuarios?rol=repartidor', undefined, admin);
    assert.ok(riders.body.some((u: any) => u.id === customerId));
    const owners = await ctx.api.call('GET', '/admin/usuarios?rol=restaurante', undefined, admin);
    assert.equal(owners.body.find((u: any) => u.id === DEMO_USERS.restaurant.id).restaurants.length, 5);
  });

  test('un admin no puede quitarse su propio acceso', async () => {
    const res = await ctx.api.call('PUT', `/admin/usuarios/${DEMO_USERS.admin.id}/roles`, { roles: ['cliente'] }, admin);
    assert.equal(res.status, 409);
  });

  test('pedidos activos de toda la plataforma', async () => {
    const res = await ctx.api.call('GET', '/admin/pedidos?estado=activos', undefined, admin);
    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 2);
    assert.ok(res.body.every((o: any) => !['ENTREGADO', 'CANCELADO', 'RECHAZADO'].includes(o.status)));
    assert.equal(res.body[0].zone, 'San Felipe centro');
    const done = await ctx.api.call('GET', '/admin/pedidos?estado=terminados', undefined, admin);
    assert.equal(done.body.length, 1);
  });

  test('sin la tabla de solicitudes la lista viene vacía', async () => {
    const res = await ctx.api.call('GET', '/admin/solicitudes', undefined, admin);
    assert.deepEqual(res.body, []);
  });
});
