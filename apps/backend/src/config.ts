import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  /** Fixed OTP for development and tests. Must be empty in production. */
  OTP_DEV_CODE: z.string().regex(/^\d{6}$/).optional(),
  CORS_ORIGINS: z.string().default('*'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REALTIME_PORT: z.coerce.number().default(3001),
  /** Minutes a restaurant has to accept a new order before it is rejected automatically. */
  ACCEPT_TIMEOUT_MIN: z.coerce.number().default(10),
  /** Send real push notifications through Expo. Off in development and tests. */
  PUSH_ENABLED: z.stringbool().default(false),
  EXPO_PUSH_URL: z.string().default('https://exp.host/--/api/v2/push/send'),
});

export type Config = z.infer<typeof Env>;

let cached: Config | undefined;

export function config(): Config {
  if (cached) return cached;
  const parsed = Env.safeParse(process.env);
  if (!parsed.success) {
    console.error('Variables de entorno inválidas:', z.prettifyError(parsed.error));
    process.exit(1);
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.OTP_DEV_CODE) {
    console.error('OTP_DEV_CODE no puede estar definido en producción');
    process.exit(1);
  }
  cached = parsed.data;
  return cached;
}
