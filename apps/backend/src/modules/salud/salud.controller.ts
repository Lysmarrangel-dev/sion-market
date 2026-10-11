import { Controller, Get } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Public } from '../../common/auth.js';
import { InjectDb } from '../../common/db.module.js';
import type { Db } from '../../db/client.js';

@Controller('salud')
export class SaludController {
  constructor(@InjectDb() private readonly db: Db) {}

  /** Used by Nginx, Docker healthchecks and uptime monitoring. */
  @Public()
  @Get()
  async check() {
    await this.db.execute(sql`select 1`);
    return { ok: true };
  }
}
