import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokens, Role } from '@sionmarket/contracts';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { InjectDb } from '../../common/db.module.js';
import { AppError } from '../../common/errors.js';
import { config } from '../../config.js';
import type { Db } from '../../db/client.js';
import { otpCodes, refreshTokens, users } from '../../db/schema.js';

const OTP_TTL_MS = 5 * 60_000;
const OTP_WINDOW_MS = 15 * 60_000;
const OTP_MAX_PER_WINDOW = 5;
const OTP_MAX_ATTEMPTS = 5;

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const otpHash = (phone: string, code: string) => sha256(`${phone}:${code}:${config().JWT_SECRET}`);

@Injectable()
export class IdentidadService {
  private readonly log = new Logger('identidad');

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly jwt: JwtService,
  ) {}

  /** RF-C01: send a 6-digit code to the phone. SMS/WhatsApp delivery is wired in step 2 (worker). */
  async requestOtp(phone: string) {
    const since = new Date(Date.now() - OTP_WINDOW_MS);
    const recent = await this.db.$count(otpCodes, and(eq(otpCodes.phone, phone), gt(otpCodes.createdAt, since)));
    if (recent >= OTP_MAX_PER_WINDOW) {
      throw new AppError('OTP_RATE_LIMIT', 'Pediste demasiados códigos. Intenta en unos minutos.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const code = config().OTP_DEV_CODE ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.db.insert(otpCodes).values({
      phone,
      codeHash: otpHash(phone, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });
    if (config().NODE_ENV !== 'production') this.log.log(`OTP para ${phone}: ${code}`);
    return { sent: true, expiresIn: OTP_TTL_MS / 1000 };
  }

  async verifyOtp(phone: string, code: string): Promise<AuthTokens> {
    const [otp] = await this.db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    const invalid = new AppError('OTP_INVALID', 'Código incorrecto o vencido', HttpStatus.UNAUTHORIZED);
    if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) throw invalid;

    const ok = timingSafeEqual(Buffer.from(otp.codeHash), Buffer.from(otpHash(phone, code)));
    if (!ok) {
      await this.db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
      throw invalid;
    }
    await this.db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));

    const [user] = await this.db
      .insert(users)
      .values({ phone })
      .onConflictDoUpdate({ target: users.phone, set: { phone } })
      .returning();
    return this.issueTokens(user!);
  }

  /** Rotates the refresh token: the old one stops working once used. */
  async refresh(token: string): Promise<AuthTokens> {
    const [row] = await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.tokenHash, sha256(token)), isNull(refreshTokens.revokedAt), gt(refreshTokens.expiresAt, new Date())),
      )
      .returning();
    if (!row) throw new AppError('UNAUTHORIZED', 'Sesión vencida, inicia sesión de nuevo', HttpStatus.UNAUTHORIZED);
    const [user] = await this.db.select().from(users).where(eq(users.id, row.userId));
    return this.issueTokens(user!);
  }

  async logout(token: string) {
    await this.db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, sha256(token)));
  }

  private async issueTokens(user: typeof users.$inferSelect): Promise<AuthTokens> {
    const roles = user.roles as Role[];
    const expiresIn = config().ACCESS_TOKEN_TTL_SECONDS;
    const accessToken = await this.jwt.signAsync({ sub: user.id, roles }, { expiresIn });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + config().REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    });
    return { accessToken, refreshToken, expiresIn, user: { id: user.id, phone: user.phone, name: user.name, roles } };
  }
}
