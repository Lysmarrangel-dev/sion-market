import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { config } from '../config.js';

export const REDIS = Symbol('REDIS');
export const InjectRedis = () => Inject(REDIS);

/** Channel the api and worker publish to; every realtime instance relays it to its sockets. */
export const RT_CHANNEL = 'rt:eventos';

export type RealtimeMessage = { rooms: string[]; event: string; data: unknown };

export const rooms = {
  user: (id: string) => `user:${id}`,
  order: (id: string) => `order:${id}`,
  restaurant: (id: string) => `restaurant:${id}`,
};

@Injectable()
export class RealtimePublisher {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async publish(msg: RealtimeMessage) {
    await this.redis.publish(RT_CHANNEL, JSON.stringify(msg));
  }
}

/** Small read-through cache. Invalidation bumps a namespace version instead of scanning keys. */
@Injectable()
export class CacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async getOrSet<T>(namespace: string, key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const version = (await this.redis.get(`v:${namespace}`)) ?? '0';
    const full = `c:${namespace}:${version}:${key}`;
    const hit = await this.redis.get(full);
    if (hit) return JSON.parse(hit) as T;
    const value = await load();
    await this.redis.set(full, JSON.stringify(value), 'EX', ttlSeconds);
    return value;
  }

  async invalidate(namespace: string) {
    await this.redis.incr(`v:${namespace}`);
  }
}

@Global()
@Module({
  providers: [
    { provide: REDIS, useFactory: () => new Redis(config().REDIS_URL, { maxRetriesPerRequest: 3, family: 0 }) },
    RealtimePublisher,
    CacheService,
  ],
  exports: [REDIS, RealtimePublisher, CacheService],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit();
  }
}
