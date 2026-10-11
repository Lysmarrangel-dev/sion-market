import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, nextStatusesFor } from './order-status.js';

test('restaurant accepts a pending order, customer cannot', () => {
  assert.equal(canTransition('PENDIENTE', 'ACEPTADO', 'restaurante'), true);
  assert.equal(canTransition('PENDIENTE', 'ACEPTADO', 'cliente'), false);
});

test('customer can cancel only until ACEPTADO', () => {
  assert.equal(canTransition('ACEPTADO', 'CANCELADO', 'cliente'), true);
  assert.equal(canTransition('EN_PREPARACION', 'CANCELADO', 'cliente'), false);
});

test('terminal states have no exits', () => {
  assert.deepEqual(nextStatusesFor('ENTREGADO', 'admin'), []);
});
