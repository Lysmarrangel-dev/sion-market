import { Injectable, Logger } from '@nestjs/common';
import { sql as dsql } from 'drizzle-orm';
import type postgres from 'postgres';
import { InjectDb, InjectSql } from '../common/db.module.js';
import type { Db } from '../db/client.js';
import { outboxEvents } from '../db/schema.js';
import { EventHandlers } from './event-handlers.js';

const BATCH = 100;
const POLL_MS = 2000;

/**
 * Delivers outbox events in order. Rows are locked with SKIP LOCKED, so several worker
 * copies can run at once without handling the same event twice. A NOTIFY trigger wakes
 * the relay immediately; the poll is only a safety net.
 */
@Injectable()
export class OutboxRelay {
  private readonly log = new Logger('outbox');
  private running = false;
  private pending = false;
  private timer?: NodeJS.Timeout;
  private unlisten?: () => Promise<void>;

  constructor(
    @InjectDb() private readonly db: Db,
    @InjectSql() private readonly sql: postgres.Sql,
    private readonly handlers: EventHandlers,
  ) {}

  /** Processes everything pending. Returns how many events were delivered. */
  async drain(): Promise<number> {
    let total = 0;
    for (;;) {
      const n = await this.runBatch();
      total += n;
      if (n < BATCH) return total;
    }
  }

  async start() {
    const listener = await this.sql.listen('outbox', () => this.kick());
    this.unlisten = listener.unlisten;
    this.timer = setInterval(() => this.kick(), POLL_MS);
    this.kick();
  }

  async stop() {
    clearInterval(this.timer);
    await this.unlisten?.();
  }

  private kick() {
    if (this.running) {
      this.pending = true;
      return;
    }
    this.running = true;
    this.drain()
      .catch((err) => this.log.error(err))
      .finally(() => {
        this.running = false;
        if (this.pending) {
          this.pending = false;
          this.kick();
        }
      });
  }

  private runBatch() {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(outboxEvents)
        .where(dsql`${outboxEvents.processedAt} is null`)
        .orderBy(outboxEvents.id)
        .limit(BATCH)
        .for('update', { skipLocked: true });
      for (const row of rows) {
        // A failing event stays pending and is retried on the next pass; later events wait
        // behind it so per-order ordering is preserved.
        await this.handlers.handle(row);
        await tx.update(outboxEvents).set({ processedAt: new Date() }).where(dsql`${outboxEvents.id} = ${row.id}`);
      }
      return rows.length;
    });
  }
}
