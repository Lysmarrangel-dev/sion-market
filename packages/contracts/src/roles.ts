import { z } from 'zod';

export const Role = z.enum(['cliente', 'restaurante', 'repartidor', 'admin']);
export type Role = z.infer<typeof Role>;

/** Who moved an order: a signed-in role, or the platform itself (timers, assignment engine). */
export type Actor = Role | 'sistema';
