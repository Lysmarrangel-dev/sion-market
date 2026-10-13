import type { Role } from '@sionmarket/contracts';
import { eq } from 'drizzle-orm';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from 'jose';
import type { Db } from '../db/client.js';
import { users } from '../db/schema.js';

export type AuthUser = { id: string; roles: Role[] };

type SupabaseClaims = JWTPayload & { sub: string; phone?: string; email?: string; role?: string };

/**
 * Verifies Supabase Auth access tokens. Projects with asymmetric signing keys are checked
 * against the project's JWKS; the legacy shared secret (HS256) is accepted when configured.
 */
export class SupabaseTokenVerifier {
  private readonly jwks?: ReturnType<typeof createRemoteJWKSet>;
  private readonly secret?: Uint8Array;
  private readonly issuer?: string;

  constructor(opts: { supabaseUrl?: string; jwtSecret?: string }) {
    if (opts.supabaseUrl) {
      this.issuer = `${opts.supabaseUrl.replace(/\/$/, '')}/auth/v1`;
      // The keys are re-fetched every 10 minutes; a slow answer from Supabase used to fail the request.
      this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`), { timeoutDuration: 10_000 });
    }
    if (opts.jwtSecret) this.secret = new TextEncoder().encode(opts.jwtSecret);
  }

  async verify(token: string): Promise<SupabaseClaims> {
    const options = { audience: 'authenticated', issuer: this.issuer };
    const { alg } = decodeProtectedHeader(token);
    const { payload } =
      alg === 'HS256'
        ? await jwtVerify(token, this.requireSecret(), { ...options, algorithms: ['HS256'] })
        : await jwtVerify(token, this.requireJwks(), options).catch((e: { code?: string; name?: string }) => {
            // Fetching the keys failed (not the token): try once more before turning the user away.
            if (e.code === 'ERR_JWKS_TIMEOUT' || e.name === 'TypeError') return jwtVerify(token, this.requireJwks(), options);
            throw e;
          });
    if (!payload.sub || payload.role !== 'authenticated') throw new Error('token sin usuario');
    return payload as SupabaseClaims;
  }

  private requireSecret() {
    if (!this.secret) throw new Error('SUPABASE_JWT_SECRET no está configurado');
    return this.secret;
  }

  private requireJwks() {
    if (!this.jwks) throw new Error('SUPABASE_URL no está configurado');
    return this.jwks;
  }
}

const CACHE_MS = 30_000;

/**
 * Maps a Supabase user to our own user row and roles, creating the row on first sight.
 * Cached briefly per process so a burst of requests costs one query.
 */
export class UserDirectory {
  private readonly cache = new Map<string, { user: AuthUser; until: number }>();

  constructor(private readonly db: Db) {}

  async resolve(claims: SupabaseClaims): Promise<AuthUser> {
    const hit = this.cache.get(claims.sub);
    if (hit && hit.until > Date.now()) return hit.user;

    let [row] = await this.db.select({ id: users.id, roles: users.roles }).from(users).where(eq(users.id, claims.sub));
    if (!row) {
      [row] = await this.db
        .insert(users)
        .values({ id: claims.sub, phone: claims.phone ? `+${claims.phone.replace(/^\+/, '')}` : null, email: claims.email || null })
        .onConflictDoUpdate({ target: users.id, set: { id: claims.sub } })
        .returning({ id: users.id, roles: users.roles });
    }
    const user = { id: row!.id, roles: row!.roles as Role[] };
    this.cache.set(claims.sub, { user, until: Date.now() + CACHE_MS });
    return user;
  }

  /** Drops a cached user after their roles change (other processes catch up within CACHE_MS). */
  forget(userId: string) {
    this.cache.delete(userId);
  }
}
