import { z } from 'zod';

/**
 * Sign-in happens in Supabase Auth; the API receives Supabase access tokens and keeps
 * roles in its own users table. Only the phone format is shared here.
 */

/** Venezuelan mobile number in E.164: +58 followed by 10 digits (412, 414, 416, 424, 426…). */
export const VePhone = z.string().regex(/^\+58\d{10}$/, 'Teléfono inválido, usa el formato +58XXXXXXXXXX');
