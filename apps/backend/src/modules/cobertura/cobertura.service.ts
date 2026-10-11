import { Injectable } from '@nestjs/common';
import type { CoverageCheck, LatLng } from '@sionmarket/contracts';
import { and, eq, sql } from 'drizzle-orm';
import { InjectDb } from '../../common/db.module.js';
import type { Db } from '../../db/client.js';
import { coverageWaitlist, zones } from '../../db/schema.js';

export const pointSql = (p: LatLng) => sql`ST_SetSRID(ST_MakePoint(${p.longitude}, ${p.latitude}), 4326)`;

@Injectable()
export class CoberturaService {
  constructor(@InjectDb() private readonly db: Db) {}

  /** RF-C02: which active zone (if any) covers this point. */
  async check(p: LatLng): Promise<CoverageCheck> {
    const [zone] = await this.db
      .select({ id: zones.id, name: zones.name })
      .from(zones)
      .where(and(eq(zones.active, true), sql`ST_Contains(${zones.area}, ${pointSql(p)})`))
      .limit(1);
    return { covered: !!zone, zoneId: zone?.id ?? null, zoneName: zone?.name ?? null };
  }

  /** «Avísame cuando lleguen a mi zona». */
  async joinWaitlist(userId: string, p: LatLng) {
    await this.db.insert(coverageWaitlist).values({ userId, location: { x: p.longitude, y: p.latitude } });
  }
}
