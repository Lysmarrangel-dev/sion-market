// Catalog the screens read. In demo mode it is the bundled mock; online it is filled from
// the API at startup (same shapes, so screens did not change). Arrays are mutated in place
// and the root layout waits for loadCatalog() before rendering, so imports stay live.
import type { RestaurantDetail, RestaurantSummary } from '@sionmarket/contracts';

import { api, online } from '@/lib/api';
import { distanceKm } from '@/lib/geo';
import * as mock from './mock';
import type { Category, ModifierGroup, Product, Restaurant } from './mock';

export * from './mock';

export let TASA_BCV = mock.TASA_BCV;
export const CATEGORIES: Category[] = [...mock.CATEGORIES];
export const RESTAURANTS: Restaurant[] = [...mock.RESTAURANTS];
export const PRODUCTS: Product[] = [...mock.PRODUCTS];

export const getRestaurant = (id: string) => RESTAURANTS.find((r) => r.id === id);
export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);
export const productsOf = (restaurantId: string) => PRODUCTS.filter((p) => p.restaurantId === restaurantId);

const usd = (cents: number) => cents / 100;

function toRestaurant(r: RestaurantSummary & Partial<RestaurantDetail>, rank: number): Restaurant {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    rating: r.rating,
    reviews: r.reviews,
    etaMin: r.etaMin,
    etaMax: r.etaMax,
    deliveryUsd: usd(r.deliveryCents),
    minimumUsd: usd(r.minimumCents),
    priceLevel: r.priceLevel as Restaurant['priceLevel'],
    distanceKm: Math.round(distanceKm(mock.CITY_CENTER, r.location) * 10) / 10,
    image: r.imageUrl ?? '',
    logo: r.logoUrl ?? r.imageUrl ?? '',
    tags: r.tags,
    address: r.address ?? '',
    schedule: r.schedule ?? '',
    location: r.location,
    promo: r.promo ?? undefined,
    open: r.open,
    recommended: rank,
  };
}

function toProducts(detail: RestaurantDetail): Product[] {
  return detail.sections.flatMap((s) =>
    s.products.map((p) => ({
      id: p.id,
      restaurantId: p.restaurantId,
      name: p.name,
      description: p.description,
      priceUsd: usd(p.priceCents),
      image: p.imageUrl ?? '',
      section: p.section,
      popular: p.popular,
      soldOut: p.soldOut,
      modifiers: p.modifierGroups.map(
        (g): ModifierGroup => ({
          id: g.id,
          name: g.name,
          required: g.required,
          min: g.min,
          max: g.max,
          options: g.options.map((o) => ({ id: o.id, name: o.name, priceUsd: usd(o.priceCents) })),
        }),
      ),
    })),
  );
}

const replace = <T>(target: T[], items: T[]) => target.splice(0, target.length, ...items);

/** Loads categories, restaurants, menus and the BCV rate. Keeps the mock if the API is down. */
export async function loadCatalog() {
  if (!online) return;
  try {
    const [categories, list, rate] = await Promise.all([
      api<Category[]>('GET', '/categorias'),
      api<RestaurantSummary[]>('GET', '/restaurantes'),
      api<{ rate: number }>('GET', '/tasa'),
    ]);
    const details = await Promise.all(list.map((r) => api<RestaurantDetail>('GET', `/restaurantes/${r.id}`)));
    replace(CATEGORIES, categories);
    replace(RESTAURANTS, details.map((d, i) => toRestaurant(d, i + 1)));
    replace(PRODUCTS, details.flatMap(toProducts));
    TASA_BCV = rate.rate;
  } catch (err) {
    console.warn('No se pudo cargar el catálogo del API, se usan los datos demo', err);
  }
}
