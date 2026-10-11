import { z } from 'zod';
import { LatLng } from './geo.js';

export const UpdateProfile = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.email().optional(),
  photoUrl: z.url().optional(),
});
export type UpdateProfile = z.infer<typeof UpdateProfile>;

// RF-C02: alias, map pin and a mandatory reference.
export const AddressInput = z.object({
  alias: z.string().trim().min(1).max(30),
  street: z.string().trim().min(3).max(200),
  reference: z.string().trim().min(3).max(200),
  location: LatLng,
});
export type AddressInput = z.infer<typeof AddressInput>;

export const Address = AddressInput.extend({ id: z.string(), zoneId: z.string().nullable() });
export type Address = z.infer<typeof Address>;

export const CoverageCheck = z.object({ covered: z.boolean(), zoneId: z.string().nullable(), zoneName: z.string().nullable() });
export type CoverageCheck = z.infer<typeof CoverageCheck>;

/** Expo push token of the device, registered after sign-in. */
export const DeviceToken = z.object({
  token: z.string().regex(/^(Exponent|Expo)PushToken\[.+\]$/, 'Token de Expo inválido'),
  platform: z.enum(['ios', 'android', 'web']),
});
export type DeviceToken = z.infer<typeof DeviceToken>;
