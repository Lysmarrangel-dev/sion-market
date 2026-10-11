import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { DEMO_PHONES } from '../src/db/seed.js';
import { setup } from './helpers.js';

let ctx: Awaited<ReturnType<typeof setup>>;
before(async () => {
  ctx = await setup();
});
after(async () => {
  await ctx.app.close();
});

const CUSTOMER = '+584141234567';
const inside = { latitude: 10.3399, longitude: -68.7425 };
const outside = { latitude: 10.5, longitude: -66.9 }; // Caracas

describe('sesión', () => {
  test('OTP equivocado se rechaza', async () => {
    await ctx.api.call('POST', '/auth/otp', { phone: CUSTOMER });
    const res = await ctx.api.call('POST', '/auth/otp/verificar', { phone: CUSTOMER, code: '000000' });
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'OTP_INVALID');
  });

  test('refresh rota el token: el viejo deja de servir', async () => {
    const { refreshToken } = await ctx.api.login(CUSTOMER);
    const first = await ctx.api.call('POST', '/auth/refresh', { refreshToken });
    assert.equal(first.status, 200);
    const again = await ctx.api.call('POST', '/auth/refresh', { refreshToken });
    assert.equal(again.status, 401);
  });

  test('rutas privadas piden sesión', async () => {
    const res = await ctx.api.call('GET', '/yo');
    assert.equal(res.status, 401);
  });
});

describe('catálogo', () => {
  test('busca por nombre de plato', async () => {
    const res = await ctx.api.call('GET', '/restaurantes?q=margarita');
    assert.deepEqual(res.body.map((r: any) => r.id), ['pizzeria-don-nicola']);
  });

  test('ficha con menú por secciones y modificadores', async () => {
    const res = await ctx.api.call('GET', '/restaurantes/la-parrilla-yaracuy');
    assert.equal(res.status, 200);
    const burger = res.body.sections[0].products.find((p: any) => p.id === 'p1');
    assert.equal(burger.priceCents, 750);
    assert.deepEqual(burger.modifierGroups.map((g: any) => g.name), ['Término de la carne', 'Adicionales', 'Quitar ingredientes']);
  });
});

describe('pedido de punta a punta', () => {
  let token: string;
  let addressId: string;
  let orderId: string;

  const cart = () => ({
    restaurantId: 'la-parrilla-yaracuy',
    addressId,
    lines: [
      { productId: 'p1', quantity: 2, optionIds: ['la-parrilla-yaracuy.termino.tm', 'la-parrilla-yaracuy.extras.queso'] },
      { productId: 'p3', quantity: 1, optionIds: ['la-parrilla-yaracuy.salsa.ajo'] },
    ],
    tipCents: 100,
    couponCode: 'SION10',
  });

  before(async () => {
    token = (await ctx.api.login(CUSTOMER)).accessToken;
  });

  test('dirección fuera de cobertura se rechaza', async () => {
    const res = await ctx.api.call('POST', '/yo/direcciones', { alias: 'Caracas', street: 'Av. Urdaneta', reference: 'Frente a la plaza', location: outside }, token);
    assert.equal(res.body.code, 'OUT_OF_COVERAGE');
  });

  test('guarda dirección dentro de la zona', async () => {
    const res = await ctx.api.call('POST', '/yo/direcciones', { alias: 'Casa', street: 'Calle 10, San Felipe', reference: 'Portón verde', location: inside }, token);
    assert.equal(res.status, 201);
    assert.equal(res.body.zoneId, 'san-felipe-centro');
    addressId = res.body.id;
  });

  test('modificador obligatorio faltante se rechaza', async () => {
    const bad = { ...cart(), lines: [{ productId: 'p1', quantity: 1, optionIds: [] }] };
    const res = await ctx.api.call('POST', '/cotizar', bad, token);
    assert.equal(res.body.code, 'MODIFIERS_INVALID');
  });

  test('producto agotado se rechaza', async () => {
    const bad = { ...cart(), lines: [{ productId: 'p9', quantity: 1, optionIds: [] }] };
    const res = await ctx.api.call('POST', '/cotizar', bad, token);
    assert.equal(res.body.code, 'PRODUCT_SOLD_OUT');
  });

  test('cotiza con montos del servidor', async () => {
    const res = await ctx.api.call('POST', '/cotizar', cart(), token);
    assert.equal(res.status, 200);
    const t = res.body.totals;
    // 2 × (7,50 + 0,80) + 2,50 = 19,10; cupón 10 % = 1,91
    assert.equal(t.subtotalCents, 1910);
    assert.equal(t.productDiscountCents, 191);
    assert.equal(t.restaurantTotalCents, 1719);
    assert.equal(t.deliveryCents, 150);
    assert.equal(t.platformTotalCents, 250);
    assert.equal(t.totalCents, 1969);
    assert.equal(t.totalVesCents, Math.round(1969 * 185.4));
  });

  test('crea el pedido en PENDIENTE', async () => {
    const res = await ctx.api.call('POST', '/pedidos', { ...cart(), paymentMethod: 'pago_movil', generalNote: 'Sin picante' }, token);
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'PENDIENTE');
    assert.match(res.body.code, /^SM-[A-Z0-9]{6}$/);
    assert.equal(res.body.pickupPin, undefined, 'el cliente no ve el PIN');
    assert.deepEqual(res.body.allowedNext, ['CANCELADO']);
    orderId = res.body.id;
  });

  test('el cliente no puede aceptar su propio pedido', async () => {
    const res = await ctx.api.call('POST', `/pedidos/${orderId}/estado`, { status: 'ACEPTADO' }, token);
    assert.equal(res.status, 409);
  });

  test('restaurante → repartidor → entregado', async () => {
    const resto = (await ctx.api.login(DEMO_PHONES.restaurant)).accessToken;
    const admin = (await ctx.api.login(DEMO_PHONES.admin)).accessToken;
    const rider = await ctx.api.login(DEMO_PHONES.rider);

    const inbox = await ctx.api.call('GET', '/restaurantes/la-parrilla-yaracuy/pedidos?estado=PENDIENTE', undefined, resto);
    assert.equal(inbox.body.length, 1);
    const pin = inbox.body[0].pickupPin;

    for (const status of ['ACEPTADO', 'EN_PREPARACION', 'LISTO']) {
      const r = await ctx.api.call('POST', `/pedidos/${orderId}/estado`, { status }, resto);
      assert.equal(r.status, 201, JSON.stringify(r.body));
    }
    const late = await ctx.api.call('POST', `/pedidos/${orderId}/estado`, { status: 'CANCELADO' }, token);
    assert.equal(late.status, 409, 'el cliente ya no puede cancelar en LISTO');

    const assigned = await ctx.api.call('POST', `/pedidos/${orderId}/asignar`, { riderId: rider.user.id }, admin);
    assert.equal(assigned.status, 201);

    const wrongPin = await ctx.api.call('POST', `/pedidos/${orderId}/estado`, { status: 'ENTREGADO_AL_DELIVERY', pickupPin: pin === '0000' ? '1111' : '0000' }, rider.accessToken);
    assert.equal(wrongPin.body.code, 'PICKUP_PIN_INVALID');

    for (const body of [{ status: 'ENTREGADO_AL_DELIVERY', pickupPin: pin }, { status: 'EN_CAMINO' }, { status: 'LLEGANDO' }, { status: 'ENTREGADO' }]) {
      const r = await ctx.api.call('POST', `/pedidos/${orderId}/estado`, body, rider.accessToken);
      assert.equal(r.status, 201, JSON.stringify(r.body));
    }

    const final = await ctx.api.call('GET', `/pedidos/${orderId}`, undefined, token);
    assert.equal(final.body.status, 'ENTREGADO');
    assert.deepEqual(
      final.body.history.map((h: any) => h.status),
      ['PENDIENTE', 'ACEPTADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO_AL_DELIVERY', 'EN_CAMINO', 'LLEGANDO', 'ENTREGADO'],
    );
  });

  test('otro cliente no ve el pedido', async () => {
    const other = (await ctx.api.login('+584161112233')).accessToken;
    const res = await ctx.api.call('GET', `/pedidos/${orderId}`, undefined, other);
    assert.equal(res.status, 404);
  });
});
