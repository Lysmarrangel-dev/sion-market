import { Injectable } from '@nestjs/common';
import type { PeriodTotals, RestaurantStats, StatsPeriod, StatsPoint } from '@sionmarket/contracts';
import { sql, type SQL } from 'drizzle-orm';
import { InjectDb } from '../../common/db.module.js';
import type { Db } from '../../db/client.js';

/** Venezuela has no daylight saving time: Caracas is always UTC−4. */
const TZ = 'America/Caracas';
const TZ_OFFSET_MS = -4 * 3_600_000;
const DAY_MS = 86_400_000;
const DAYS: Record<StatsPeriod, number> = { dia: 1, semana: 7, mes: 30 };
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** Orders that count as sales: everything except rejected and cancelled ones. */
const VALID = sql`status not in ('RECHAZADO', 'CANCELADO')`;

export type Range = { period: StatsPeriod; from: Date; to: Date; prevFrom: Date; prevTo: Date };

/**
 * "dia" is today since midnight, "semana" and "mes" the last 7 and 30 days including today.
 * The previous range is the same stretch just before, cut at the same time of day, so a
 * morning is compared with the morning before.
 */
export function rangeFor(period: StatsPeriod, now = new Date()): Range {
  const local = now.getTime() + TZ_OFFSET_MS;
  const midnight = local - (local % DAY_MS) - TZ_OFFSET_MS;
  const span = DAYS[period] * DAY_MS;
  const from = new Date(midnight - (DAYS[period] - 1) * DAY_MS);
  return { period, from, to: now, prevFrom: new Date(from.getTime() - span), prevTo: new Date(now.getTime() - span) };
}

@Injectable()
export class EstadisticasService {
  constructor(@InjectDb() private readonly db: Db) {}

  /** Totals of the orders matching `scope` (a condition on sionmarket.orders) placed in [from, to). */
  async totals(scope: SQL, from: Date, to: Date): Promise<PeriodTotals & { deliveryCents: number }> {
    const [row] = await this.db.execute<Record<string, number>>(sql`
      select count(*)::int as orders,
        count(*) filter (where status = 'ENTREGADO')::int as delivered,
        count(*) filter (where status = 'RECHAZADO')::int as rejected,
        count(*) filter (where status = 'CANCELADO')::int as cancelled,
        count(*) filter (where ${VALID})::int as valid,
        coalesce(sum(subtotal_cents - product_discount_cents) filter (where ${VALID}), 0)::int as sales,
        coalesce(sum(delivery_base_cents - delivery_discount_cents + tip_cents) filter (where ${VALID}), 0)::int as delivery
      from sionmarket.orders
      where ${scope} and created_at >= ${from.toISOString()} and created_at < ${to.toISOString()}`);
    const r = row!;
    return {
      orders: r.orders!,
      delivered: r.delivered!,
      rejected: r.rejected!,
      cancelled: r.cancelled!,
      salesCents: r.sales!,
      avgTicketCents: r.valid ? Math.round(r.sales! / r.valid) : 0,
      deliveryCents: r.delivery!,
    };
  }

  /** Bars for the chart: one per hour for "dia", one per day otherwise, empty ones included. */
  async series(scope: SQL, range: Range): Promise<StatsPoint[]> {
    const hourly = range.period === 'dia';
    const bucket = hourly
      ? sql`extract(hour from created_at at time zone ${TZ})::int::text`
      : sql`to_char(created_at at time zone ${TZ}, 'YYYY-MM-DD')`;
    const rows = await this.db.execute<{ bucket: string; orders: number; sales: number }>(sql`
      select ${bucket} as bucket, count(*)::int as orders,
        coalesce(sum(subtotal_cents - product_discount_cents) filter (where ${VALID}), 0)::int as sales
      from sionmarket.orders
      where ${scope} and created_at >= ${range.from.toISOString()} and created_at < ${range.to.toISOString()}
      group by 1`);
    const found = new Map(rows.map((r) => [r.bucket, r]));
    const point = (key: string, label: string) => ({ label, orders: found.get(key)?.orders ?? 0, salesCents: found.get(key)?.sales ?? 0 });
    if (hourly) return Array.from({ length: 24 }, (_, h) => point(String(h), `${h}h`));
    return Array.from({ length: DAYS[range.period] }, (_, i) => {
      const day = new Date(range.from.getTime() + TZ_OFFSET_MS + i * DAY_MS);
      const key = day.toISOString().slice(0, 10);
      const label = range.period === 'semana' ? WEEKDAYS[day.getUTCDay()]! : `${day.getUTCDate()}/${day.getUTCMonth() + 1}`;
      return point(key, label);
    });
  }

  async restaurant(restaurantId: string, period: StatsPeriod): Promise<RestaurantStats> {
    const range = rangeFor(period);
    const scope = sql`restaurant_id = ${restaurantId}`;
    const [current, previous, series, pending, accept, top] = await Promise.all([
      this.totals(scope, range.from, range.to),
      this.totals(scope, range.prevFrom, range.prevTo),
      this.series(scope, range),
      this.db.execute<{ n: number }>(sql`select count(*)::int as n from sionmarket.orders where ${scope} and status = 'PENDIENTE'`),
      this.db.execute<{ minutes: number | null }>(sql`
        select percentile_cont(0.5) within group (order by extract(epoch from (e.created_at - o.created_at)) / 60) as minutes
        from sionmarket.orders o
        join sionmarket.order_status_events e on e.order_id = o.id and e.status = 'ACEPTADO'
        where o.restaurant_id = ${restaurantId} and o.created_at >= ${range.from.toISOString()}`),
      this.db.execute<{ name: string; quantity: number; sales: number }>(sql`
        select i.name, sum(i.quantity)::int as quantity, sum(i.quantity * i.unit_cents)::int as sales
        from sionmarket.order_items i
        join sionmarket.orders o on o.id = i.order_id
        where o.restaurant_id = ${restaurantId} and o.status not in ('RECHAZADO', 'CANCELADO')
          and o.created_at >= ${range.from.toISOString()}
        group by i.name order by 2 desc, 3 desc limit 5`),
    ]);
    const { deliveryCents: _d, ...totals } = current;
    const { deliveryCents: _p, ...prev } = previous;
    const minutes = accept[0]?.minutes;
    return {
      period,
      from: range.from.toISOString(),
      totals,
      previous: prev,
      pending: pending[0]?.n ?? 0,
      acceptMinutes: minutes == null ? null : Math.round(Number(minutes) * 10) / 10,
      series,
      topProducts: top.map((t) => ({ name: t.name, quantity: t.quantity, salesCents: t.sales })),
    };
  }
}
