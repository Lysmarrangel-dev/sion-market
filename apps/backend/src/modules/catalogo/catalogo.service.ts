import { Injectable } from '@nestjs/common';
import type { ModifierGroup, Product, RestaurantDetail, RestaurantQuery, RestaurantSummary } from '@sionmarket/contracts';
import { and, asc, desc, eq, exists, ilike, inArray, or, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth.js';
import { CacheService } from '../../common/redis.module.js';
import { InjectDb } from '../../common/db.module.js';
import { forbidden, notFound } from '../../common/errors.js';
import type { Db } from '../../db/client.js';
import { categories, modifierGroups, modifierOptions, productModifierGroups, products, restaurants } from '../../db/schema.js';

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

  async assertOwner(user: AuthUser, restaurantId: string) {
    if (user.roles.includes('admin')) return;
    const r = await this.restaurant(restaurantId);
    if (r.ownerUserId !== user.id) throw forbidden('Este restaurante no es tuyo');
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
