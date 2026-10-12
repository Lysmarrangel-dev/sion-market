import { HttpStatus, Injectable } from '@nestjs/common';
import { centsToVesCents, type Product, type Quote, type QuoteLine, type QuoteRequest } from '@sionmarket/contracts';
import { desc, eq } from 'drizzle-orm';
import { InjectDb } from '../../common/db.module.js';
import { AppError, notFound } from '../../common/errors.js';
import type { Db } from '../../db/client.js';
import { coupons, exchangeRates } from '../../db/schema.js';
import { CatalogoService } from '../catalogo/catalogo.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';

const pct = (cents: number, percent: number) => Math.round((cents * percent) / 100);

/** Checks the selected options against the product's modifier rules (RF-C04). */
function priceLine(product: Product, optionIds: string[]): { unitCents: number; options: QuoteLine['options'] } {
  const fail = (message: string) => new AppError('MODIFIERS_INVALID', `${product.name}: ${message}`);
  if (new Set(optionIds).size !== optionIds.length) throw fail('opción repetida');

  const selected: QuoteLine['options'] = [];
  for (const id of optionIds) {
    const group = product.modifierGroups.find((g) => g.options.some((o) => o.id === id));
    if (!group) throw fail('opción no disponible');
    const opt = group.options.find((o) => o.id === id)!;
    selected.push({ id: opt.id, groupId: group.id, name: opt.name, priceCents: opt.priceCents });
  }
  for (const g of product.modifierGroups) {
    const count = selected.filter((o) => o.groupId === g.id).length;
    const min = g.required ? Math.max(g.min, 1) : g.min;
    if (count < min) throw fail(`elige al menos ${min} en «${g.name}»`);
    if (count > g.max) throw fail(`máximo ${g.max} en «${g.name}»`);
  }
  return { unitCents: product.priceCents + selected.reduce((s, o) => s + o.priceCents, 0), options: selected };
}

export type PricedCart = Quote & {
  restaurantName: string;
  address: Awaited<ReturnType<UsuariosService['ownedAddress']>>;
};

/**
 * Single source of truth for what an order costs. The app shows these numbers;
 * it never computes the final total itself.
 */
@Injectable()
export class PreciosService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly catalogo: CatalogoService,
    private readonly usuarios: UsuariosService,
  ) {}

  async currentRate() {
    const [row] = await this.db.select().from(exchangeRates).orderBy(desc(exchangeRates.fetchedAt), desc(exchangeRates.id)).limit(1);
    if (!row) throw new AppError('VALIDATION', 'No hay tasa de cambio cargada', HttpStatus.SERVICE_UNAVAILABLE);
    return { rate: row.rate, source: row.source, fetchedAt: row.fetchedAt.toISOString() };
  }

  async quote(userId: string, req: QuoteRequest): Promise<PricedCart> {
    const restaurant = await this.catalogo.restaurant(req.restaurantId);
    if (!restaurant.enabled) throw notFound('El restaurante');
    if (!restaurant.open) throw new AppError('RESTAURANT_CLOSED', `${restaurant.name} está cerrado ahora`);

    const address = await this.usuarios.ownedAddress(userId, req.addressId);
    if (!address.zoneId) throw new AppError('OUT_OF_COVERAGE', 'Esa dirección está fuera de la zona de cobertura');

    const ids = [...new Set(req.lines.map((l) => l.productId))];
    const found = await this.catalogo.productsByIds(restaurant.id, ids);
    const byId = new Map(found.map((p) => [p.id, p]));

    const lines: QuoteLine[] = req.lines.map((l) => {
      const product = byId.get(l.productId);
      if (!product) throw new AppError('NOT_FOUND', 'Un producto del carrito ya no existe', HttpStatus.NOT_FOUND);
      if (product.soldOut) throw new AppError('PRODUCT_SOLD_OUT', `${product.name} está agotado`);
      const { unitCents, options } = priceLine(product, l.optionIds);
      return {
        productId: product.id,
        name: product.name,
        quantity: l.quantity,
        unitCents,
        lineCents: unitCents * l.quantity,
        options,
        note: l.note ?? null,
      };
    });

    const subtotalCents = lines.reduce((s, l) => s + l.lineCents, 0);
    if (subtotalCents < restaurant.minimumCents) {
      throw new AppError('BELOW_MINIMUM', 'El pedido no llega al monto mínimo del restaurante', HttpStatus.UNPROCESSABLE_ENTITY, {
        minimumCents: restaurant.minimumCents,
      });
    }

    let coupon: typeof coupons.$inferSelect | undefined;
    if (req.couponCode) {
      [coupon] = await this.db.select().from(coupons).where(eq(coupons.code, req.couponCode.toUpperCase()));
      if (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt < new Date())) {
        throw new AppError('COUPON_INVALID', 'Ese cupón no es válido');
      }
    }

    const deliveryBaseCents = restaurant.deliveryCents;
    const productDiscountCents = coupon?.target === 'productos' ? pct(subtotalCents, coupon.percent) : 0;
    const deliveryDiscountCents = coupon?.target === 'delivery' ? pct(deliveryBaseCents, coupon.percent) : 0;
    const restaurantTotalCents = subtotalCents - productDiscountCents;
    const deliveryCents = deliveryBaseCents - deliveryDiscountCents;
    const platformTotalCents = deliveryCents + req.tipCents;
    const totalCents = restaurantTotalCents + platformTotalCents;
    const { rate } = await this.currentRate();

    return {
      lines,
      totals: {
        subtotalCents,
        productDiscountCents,
        restaurantTotalCents,
        deliveryBaseCents,
        deliveryDiscountCents,
        deliveryCents,
        tipCents: req.tipCents,
        platformTotalCents,
        totalCents,
        exchangeRate: rate,
        totalVesCents: centsToVesCents(totalCents, rate),
      },
      couponApplied: coupon?.code ?? null,
      etaMin: restaurant.etaMin,
      etaMax: restaurant.etaMax,
      restaurantName: restaurant.name,
      address,
    };
  }
}
