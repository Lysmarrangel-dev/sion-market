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
