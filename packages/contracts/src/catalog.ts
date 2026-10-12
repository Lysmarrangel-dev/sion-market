import { z } from 'zod';
import { LatLng } from './geo.js';

export const ModifierOption = z.object({ id: z.string(), name: z.string(), priceCents: z.number().int() });
export type ModifierOption = z.infer<typeof ModifierOption>;

// RF-C04: modifier groups with rules. max = 1 means single choice.
export const ModifierGroup = z.object({
  id: z.string(),
  name: z.string(),
  required: z.boolean(),
  min: z.number().int().min(0),
  max: z.number().int().min(1),
  options: z.array(ModifierOption),
});
export type ModifierGroup = z.infer<typeof ModifierGroup>;

export const Product = z.object({
  id: z.string(),
  restaurantId: z.string(),
  section: z.string(),
  name: z.string(),
  description: z.string(),
  priceCents: z.number().int(),
  imageUrl: z.string().nullable(),
  popular: z.boolean(),
  soldOut: z.boolean(),
  modifierGroups: z.array(ModifierGroup),
});
export type Product = z.infer<typeof Product>;

export const RestaurantSummary = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  rating: z.number(),
  reviews: z.number().int(),
  etaMin: z.number().int(),
  etaMax: z.number().int(),
  deliveryCents: z.number().int(),
  minimumCents: z.number().int(),
  priceLevel: z.number().int().min(1).max(3),
  imageUrl: z.string().nullable(),
  logoUrl: z.string().nullable(),
  promo: z.string().nullable(),
  open: z.boolean(),
  location: LatLng,
});
export type RestaurantSummary = z.infer<typeof RestaurantSummary>;

export const RestaurantDetail = RestaurantSummary.extend({
  address: z.string(),
  schedule: z.string(),
  sections: z.array(z.object({ name: z.string(), products: z.array(Product) })),
});
export type RestaurantDetail = z.infer<typeof RestaurantDetail>;

export const Category = z.object({ id: z.string(), name: z.string(), icon: z.string() });
export type Category = z.infer<typeof Category>;

export const RestaurantQuery = z.object({
  q: z.string().trim().max(60).optional(),
  category: z.string().optional(),
  openOnly: z.coerce.boolean().optional(),
  sort: z.enum(['recomendados', 'calificacion', 'rapidez', 'delivery']).default('recomendados'),
});
export type RestaurantQuery = z.infer<typeof RestaurantQuery>;

// Restaurant panel: mark a product as sold out or available again.
export const ProductAvailability = z.object({ soldOut: z.boolean() });
export type ProductAvailability = z.infer<typeof ProductAvailability>;

// Restaurant panel: create and edit a restaurant and its menu. Patches send only the changed
// fields, so their shapes have no defaults.
const OptionalUrl = z.url().max(500).nullable();

const RestaurantFields = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.string().min(1),
  tags: z.array(z.string().trim().min(1).max(30)).max(6),
  etaMin: z.number().int().min(5).max(180),
  etaMax: z.number().int().min(5).max(240),
  deliveryCents: z.number().int().min(0).max(100_000),
  minimumCents: z.number().int().min(0).max(1_000_000),
  priceLevel: z.number().int().min(1).max(3),
  imageUrl: OptionalUrl,
  logoUrl: OptionalUrl,
  promo: z.string().trim().max(60).nullable(),
  address: z.string().trim().min(5).max(200),
  schedule: z.string().trim().min(3).max(120),
  location: LatLng,
});
const etaOrder = (r: { etaMin?: number; etaMax?: number }) => r.etaMin === undefined || r.etaMax === undefined || r.etaMax >= r.etaMin;
const etaIssue = { message: 'El tiempo máximo debe ser mayor o igual al mínimo', path: ['etaMax'] };

export const RestaurantInput = RestaurantFields.extend({
  tags: RestaurantFields.shape.tags.default([]),
  minimumCents: RestaurantFields.shape.minimumCents.default(0),
  priceLevel: RestaurantFields.shape.priceLevel.default(2),
  imageUrl: OptionalUrl.default(null),
  logoUrl: OptionalUrl.default(null),
  promo: RestaurantFields.shape.promo.default(null),
}).refine(etaOrder, etaIssue);
export type RestaurantInput = z.infer<typeof RestaurantInput>;

export const RestaurantPatch = RestaurantFields.partial().refine(etaOrder, etaIssue);
export type RestaurantPatch = z.infer<typeof RestaurantPatch>;

const ProductFields = z.object({
  section: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300),
  priceCents: z.number().int().min(1).max(1_000_000),
  imageUrl: OptionalUrl,
  popular: z.boolean(),
  soldOut: z.boolean(),
});

export const ProductInput = ProductFields.extend({
  description: ProductFields.shape.description.default(''),
  imageUrl: OptionalUrl.default(null),
  popular: z.boolean().default(false),
  soldOut: z.boolean().default(false),
});
export type ProductInput = z.infer<typeof ProductInput>;

export const ProductPatch = ProductFields.partial();
export type ProductPatch = z.infer<typeof ProductPatch>;
