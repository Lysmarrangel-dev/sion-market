import { z } from 'zod';
import { Role } from './roles.js';

/** Venezuelan mobile number in E.164: +58 followed by 10 digits (412, 414, 416, 424, 426…). */
export const VePhone = z.string().regex(/^\+58\d{10}$/, 'Teléfono inválido, usa el formato +58XXXXXXXXXX');

export const OtpRequest = z.object({ phone: VePhone });
export type OtpRequest = z.infer<typeof OtpRequest>;

export const OtpVerify = z.object({ phone: VePhone, code: z.string().regex(/^\d{6}$/) });
export type OtpVerify = z.infer<typeof OtpVerify>;

export const RefreshRequest = z.object({ refreshToken: z.string().min(20) });
export type RefreshRequest = z.infer<typeof RefreshRequest>;

export const AuthTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: z.object({ id: z.string(), phone: z.string(), name: z.string().nullable(), roles: z.array(Role) }),
});
export type AuthTokens = z.infer<typeof AuthTokens>;
