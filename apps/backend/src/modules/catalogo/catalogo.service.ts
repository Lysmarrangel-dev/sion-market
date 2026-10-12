import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  ModifierGroup,
  Product,
  ProductInput,
  ProductPatch,
  RestaurantDetail,
  RestaurantInput,
  RestaurantPatch,
  RestaurantQuery,
  RestaurantSummary,
} from '@sionmarket/contracts';
import { and, asc, desc, eq, exists, ilike, inArray, or, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth.js';
import { CacheService } from '../../common/redis.module.js';
import { InjectDb } from '../../common/db.module.js';
import { AppError, forbidden, notFound } from '../../common/errors.js';
import type { Db } from '../../db/client.js';
import { categories, modifierGroups, modifierOptions, orders, productModifierGroups, products, restaurants } from '../../db/schema.js';

type RestaurantRow = typeof restaurants.$inferSelect;

const toSummary = (r: RestaurantRow): RestaurantSummary => ({
  id: r.id,
  name: r.name,
  category: r.categoryId,
  tags: r.tags,
  rating: r.rating,
  reviews: r.reviews,
  etaMin: r.etaMin,
  etaMax: r.etaMax,
  deliveryCents: r.deliveryCents,
  minimumCents: r.minimumCents,
  priceLevel: r.priceLevel,
  imageUrl: r.imageUrl,
  logoUrl: r.logoUrl,
  promo: r.promo,
  open: r.open,
  location: { latitude: r.location.y, longitude: r.location.x },
});

/** URL-friendly id from a name: "Pizzería Don Nicola" → "pizzeria-don-nicola". */
const slug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'restaurante';

/** Panel input → table columns (category and location are named differently in the table). */
function restaurantColumns(input: RestaurantPatch) {
  const { category, location, ...rest } = input;
  return {
    ...rest,
    ...(category !== undefined ? { categoryId: category } : {}),
    ...(location ? { location: { x: location.longitude, y: location.latitude } } : {}),
  };
}

const SORTS = {
  recomendados: [asc(restaurants.recommended)],
  calificacion: [desc(restaurants.rating), desc(restaurants.reviews)],
  rapidez: [asc(restaurants.etaMin)],
  delivery: [asc(restaurants.deliveryCents)],
} as const;

/** Catalog reads are cached in Redis; any edit from the restaurant panel invalidates them. */
const CACHE_NS = 'catalogo';
const CACHE_TTL = 120;

@Injectable()
export class CatalogoService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly cache: CacheService,
  ) {}

  categories() {
    return this.cache.getOrSet(CACHE_NS, 'categorias', CACHE_TTL, () => this.loadCategories());
  }

  list(query: RestaurantQuery) {
    return this.cache.getOrSet(CACHE_NS, `lista:${JSON.stringify(query)}`, CACHE_TTL, () => this.loadList(query));
  }

  detail(id: string) {
    return this.cache.getOrSet(CACHE_NS, `restaurante:${id}`, CACHE_TTL, () => this.loadDetail(id));
  }

  private loadCategories() {
    return this.db.select({ id: categories.id, name: categories.name, icon: categories.icon }).from(categories).orderBy(asc(categories.sort));
  }

  /** RF-C03: search by restaurant or dish name, filter and sort. Open restaurants always come first. */
  private async loadList(query: RestaurantQuery): Promise<RestaurantSummary[]> {
    const term = query.q ? `%${query.q}%` : undefined;
    const rows = await this.db
      .select()
      .from(restaurants)
      .where(
        and(
          query.category ? eq(restaurants.categoryId, query.category) : undefined,
          query.openOnly ? eq(restaurants.open, true) : undefined,
          term
            ? or(
                ilike(restaurants.name, term),
                sql`array_to_string(${restaurants.tags}, ' ') ilike ${term}`,
                exists(
                  this.db
                    .select({ one: sql`1` })
                    .from(products)
                    .where(and(eq(products.restaurantId, restaurants.id), ilike(products.name, term))),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(restaurants.open), ...SORTS[query.sort]);
    return rows.map(toSummary);
  }

  private async loadDetail(id: string): Promise<RestaurantDetail> {
    const [r] = await this.db.select().from(restaurants).where(eq(restaurants.id, id));
    if (!r) throw notFound('El restaurante');
    const menu = await this.loadProducts(eq(products.restaurantId, id));
    const sections = new Map<string, Product[]>();
    for (const p of menu) sections.set(p.section, [...(sections.get(p.section) ?? []), p]);
    return {
      ...toSummary(r),
      address: r.address,
      schedule: r.schedule,
      sections: [...sections].map(([name, list]) => ({ name, products: list })),
    };
  }

  /** Raw restaurant row, for pricing and order rules. */
  async restaurant(id: string) {
    const [r] = await this.db.select().from(restaurants).where(eq(restaurants.id, id));
    if (!r) throw notFound('El restaurante');
    return r;
  }

  /** Products with their modifier groups, for pricing a cart. */
  productsByIds(restaurantId: string, ids: string[]) {
    return this.loadProducts(and(eq(products.restaurantId, restaurantId), inArray(products.id, ids))!);
  }

  async setSoldOut(user: AuthUser, restaurantId: string, productId: string, soldOut: boolean) {
    await this.assertOwner(user, restaurantId);
    const [row] = await this.db
      .update(products)
      .set({ soldOut })
      .where(and(eq(products.id, productId), eq(products.restaurantId, restaurantId)))
      .returning({ id: products.id });
    if (!row) throw notFound('El producto');
    await this.cache.invalidate(CACHE_NS);
    return { id: productId, soldOut };
  }

  async setOpen(user: AuthUser, restaurantId: string, open: boolean) {
    await this.assertOwner(user, restaurantId);
    await this.db.update(restaurants).set({ open }).where(eq(restaurants.id, restaurantId));
    await this.cache.invalidate(CACHE_NS);
    return { id: restaurantId, open };
  }

  /** Restaurants the user manages: their own, or every one for an admin. */
  async mine(user: AuthUser): Promise<RestaurantSummary[]> {
    const rows = await this.db
      .select()
      .from(restaurants)
      .where(user.roles.includes('admin') ? undefined : eq(restaurants.ownerUserId, user.id))
      .orderBy(asc(restaurants.name));
    return rows.map(toSummary);
  }

  async createRestaurant(user: AuthUser, input: RestaurantInput) {
    await this.assertCategory(input.category);
    const base = slug(input.name);
    const [taken] = await this.db.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.id, base));
    const id = taken ? `${base}-${randomUUID().slice(0, 4)}` : base;
    await this.db.insert(restaurants).values({ id, ...restaurantColumns(input), ownerUserId: user.id } as typeof restaurants.$inferInsert);
    await this.cache.invalidate(CACHE_NS);
    return this.loadDetail(id);
  }

  async updateRestaurant(user: AuthUser, id: string, input: RestaurantPatch) {
    const current = await this.assertOwner(user, id);
    if (input.category) await this.assertCategory(input.category);
    const etaMin = input.etaMin ?? current.etaMin;
    const etaMax = input.etaMax ?? current.etaMax;
    if (etaMax < etaMin) throw new AppError('VALIDATION', 'El tiempo máximo debe ser mayor o igual al mínimo');
    const set = restaurantColumns(input);
    if (Object.keys(set).length) await this.db.update(restaurants).set(set).where(eq(restaurants.id, id));
    await this.cache.invalidate(CACHE_NS);
    return this.loadDetail(id);
  }

  /** A restaurant with orders stays for their history; it can only be closed. */
  async deleteRestaurant(user: AuthUser, id: string) {
    await this.assertOwner(user, id);
    const [order] = await this.db.select({ id: orders.id }).from(orders).where(eq(orders.restaurantId, id)).limit(1);
    if (order) throw new AppError('VALIDATION', 'Este restaurante ya tiene pedidos: ciérralo en lugar de borrarlo', HttpStatus.CONFLICT);
    await this.db.delete(restaurants).where(eq(restaurants.id, id));
    await this.cache.invalidate(CACHE_NS);
    return { id, deleted: true };
  }

  async createProduct(user: AuthUser, restaurantId: string, input: ProductInput) {
    await this.assertOwner(user, restaurantId);
    const [max] = await this.db
      .select({ last: sql<number>`coalesce(max(${products.sort}), 0)` })
      .from(products)
      .where(eq(products.restaurantId, restaurantId));
    const id = `${restaurantId.slice(0, 30)}-${slug(input.name).slice(0, 30)}-${randomUUID().slice(0, 4)}`;
    await this.db.insert(products).values({ id, restaurantId, ...input, sort: Number(max?.last ?? 0) + 1 });
    await this.cache.invalidate(CACHE_NS);
    return (await this.loadProducts(eq(products.id, id)))[0];
  }

  async updateProduct(user: AuthUser, restaurantId: string, productId: string, input: ProductPatch) {
    await this.assertOwner(user, restaurantId);
    const where = and(eq(products.id, productId), eq(products.restaurantId, restaurantId))!;
    const [row] = Object.keys(input).length
      ? await this.db.update(products).set(input).where(where).returning({ id: products.id })
      : await this.db.select({ id: products.id }).from(products).where(where);
    if (!row) throw notFound('El producto');
    await this.cache.invalidate(CACHE_NS);
    return (await this.loadProducts(eq(products.id, productId)))[0];
  }

  async deleteProduct(user: AuthUser, restaurantId: string, productId: string) {
    await this.assertOwner(user, restaurantId);
    const [row] = await this.db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.restaurantId, restaurantId)))
      .returning({ id: products.id });
    if (!row) throw notFound('El producto');
    await this.cache.invalidate(CACHE_NS);
    return { id: productId, deleted: true };
  }

  private async assertCategory(id: string) {
    const [c] = await this.db.select({ id: categories.id }).from(categories).where(eq(categories.id, id));
    if (!c) throw new AppError('VALIDATION', 'Esa categoría no existe');
  }

  async assertOwner(user: AuthUser, restaurantId: string) {
    const r = await this.restaurant(restaurantId);
    if (!user.roles.includes('admin') && r.ownerUserId !== user.id) throw forbidden('Este restaurante no es tuyo');
    return r;
  }

  private async loadProducts(where: ReturnType<typeof eq>): Promise<Product[]> {
    const rows = await this.db.select().from(products).where(where).orderBy(asc(products.sort));
    if (!rows.length) return [];
    const links = await this.db
      .select({ productId: productModifierGroups.productId, group: modifierGroups })
      .from(productModifierGroups)
      .innerJoin(modifierGroups, eq(modifierGroups.id, productModifierGroups.groupId))
      .where(inArray(productModifierGroups.productId, rows.map((p) => p.id)))
      .orderBy(asc(productModifierGroups.sort));
    const groupIds = [...new Set(links.map((l) => l.group.id))];
    const options = groupIds.length
      ? await this.db.select().from(modifierOptions).where(inArray(modifierOptions.groupId, groupIds)).orderBy(asc(modifierOptions.sort))
      : [];

    const groups = new Map<string, ModifierGroup>();
    for (const { group: g } of links) {
      groups.set(g.id, {
        id: g.id,
        name: g.name,
        required: g.required,
        min: g.min,
        max: g.max,
        options: options.filter((o) => o.groupId === g.id).map((o) => ({ id: o.id, name: o.name, priceCents: o.priceCents })),
      });
    }
    return rows.map((p) => ({
      id: p.id,
      restaurantId: p.restaurantId,
      section: p.section,
      name: p.name,
      description: p.description,
      priceCents: p.priceCents,
      imageUrl: p.imageUrl,
      popular: p.popular,
      soldOut: p.soldOut,
      modifierGroups: links.filter((l) => l.productId === p.id).map((l) => groups.get(l.group.id)!),
    }));
  }
}
