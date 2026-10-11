import { createServer } from 'node:http';
import { Redis } from 'ioredis';
import { config } from './config.js';
import { SupabaseTokenVerifier } from './common/supabase-auth.js';
import { createDb } from './db/client.js';
import { createRealtimeServer } from './realtime/server.js';

const cfg = config();
const { db, sql } = createDb(cfg.DATABASE_URL, 5);
const redis = new Redis(cfg.REDIS_URL);
const http = createServer((req, res) => {
  // Healthcheck for Docker and Nginx; everything else is Socket.IO on /ws.
  if (req.url === '/salud') return res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
  res.writeHead(404).end();
});
const rt = createRealtimeServer({
  http,
  db,
  redis,
  verifier: new SupabaseTokenVerifier({ supabaseUrl: cfg.SUPABASE_URL, jwtSecret: cfg.SUPABASE_JWT_SECRET }),
  corsOrigin: cfg.CORS_ORIGINS === '*' ? true : cfg.CORS_ORIGINS.split(','),
});
await rt.ready;
http.listen(cfg.REALTIME_PORT, '0.0.0.0', () => console.log(`Tiempo real SionMarket en :${cfg.REALTIME_PORT}/ws`));

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await rt.close();
    await redis.quit();
    await sql.end({ timeout: 5 });
    process.exit(0);
  });
}
