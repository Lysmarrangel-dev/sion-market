import { Injectable, Logger } from '@nestjs/common';
import type { DeviceToken } from '@sionmarket/contracts';
import { eq, inArray } from 'drizzle-orm';
import { InjectDb } from '../../common/db.module.js';
import { config } from '../../config.js';
import type { Db } from '../../db/client.js';
import { deviceTokens } from '../../db/schema.js';

export type PushMessage = { userId: string; title: string; body: string; data?: Record<string, unknown> };

@Injectable()
export class NotificacionesService {
  private readonly log = new Logger('notificaciones');

  constructor(@InjectDb() private readonly db: Db) {}

  async registerDevice(userId: string, input: DeviceToken) {
    await this.db
      .insert(deviceTokens)
      .values({ token: input.token, userId, platform: input.platform })
      .onConflictDoUpdate({ target: deviceTokens.token, set: { userId, platform: input.platform, updatedAt: new Date() } });
  }

  /** Sends through Expo Push (FCM + APNs). Tokens Expo reports as unregistered are deleted. */
  async send(msg: PushMessage) {
    const tokens = (await this.db.select({ token: deviceTokens.token }).from(deviceTokens).where(eq(deviceTokens.userId, msg.userId))).map(
      (t) => t.token,
    );
    if (!tokens.length) return { sent: 0 };
    if (!config().PUSH_ENABLED) {
      this.log.log(`[push simulado] ${msg.title}: ${msg.body} → ${tokens.length} dispositivo(s)`);
      return { sent: 0 };
    }
    const res = await fetch(config().EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(tokens.map((to) => ({ to, title: msg.title, body: msg.body, data: msg.data, sound: 'default' }))),
    });
    if (!res.ok) throw new Error(`Expo push respondió ${res.status}`);
    const { data } = (await res.json()) as { data: { status: string; details?: { error?: string } }[] };
    const dead = tokens.filter((_, i) => data[i]?.details?.error === 'DeviceNotRegistered');
    if (dead.length) await this.db.delete(deviceTokens).where(inArray(deviceTokens.token, dead));
    return { sent: tokens.length - dead.length };
  }
}
