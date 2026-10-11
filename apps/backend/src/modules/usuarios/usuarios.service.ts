import { Injectable } from '@nestjs/common';
import type { Address, AddressInput, UpdateProfile } from '@sionmarket/contracts';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { InjectDb } from '../../common/db.module.js';
import { AppError, notFound } from '../../common/errors.js';
import type { Db } from '../../db/client.js';
import { addresses, users } from '../../db/schema.js';
import { CoberturaService } from '../cobertura/cobertura.service.js';

type AddressRow = typeof addresses.$inferSelect;

const toAddress = (a: AddressRow): Address => ({
  id: a.id,
  alias: a.alias,
  street: a.street,
  reference: a.reference,
  location: { latitude: a.location.y, longitude: a.location.x },
  zoneId: a.zoneId,
});

@Injectable()
export class UsuariosService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly cobertura: CoberturaService,
  ) {}

  async profile(userId: string) {
    const [u] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!u) throw notFound('El usuario');
    return { id: u.id, phone: u.phone, name: u.name, email: u.email, photoUrl: u.photoUrl, roles: u.roles };
  }

  async updateProfile(userId: string, input: UpdateProfile) {
    await this.db.update(users).set(input).where(eq(users.id, userId));
    return this.profile(userId);
  }

  async listAddresses(userId: string) {
    const rows = await this.db
      .select()
      .from(addresses)
      .where(and(eq(addresses.userId, userId), isNull(addresses.deletedAt)))
      .orderBy(asc(addresses.createdAt));
    return rows.map(toAddress);
  }

  /** RF-C02: an address is saved only inside an active coverage zone. */
  async addAddress(userId: string, input: AddressInput) {
    const coverage = await this.cobertura.check(input.location);
    if (!coverage.covered) {
      throw new AppError('OUT_OF_COVERAGE', 'Todavía no llegamos a esa zona. Puedes pedir que te avisemos.');
    }
    const [row] = await this.db
      .insert(addresses)
      .values({
        userId,
        alias: input.alias,
        street: input.street,
        reference: input.reference,
        location: { x: input.location.longitude, y: input.location.latitude },
        zoneId: coverage.zoneId,
      })
      .returning();
    return toAddress(row!);
  }

  async removeAddress(userId: string, id: string) {
    const [row] = await this.db
      .update(addresses)
      .set({ deletedAt: new Date() })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId), isNull(addresses.deletedAt)))
      .returning({ id: addresses.id });
    if (!row) throw notFound('La dirección');
  }

  /** Used by pedidos: the address must belong to the customer. */
  async ownedAddress(userId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId), isNull(addresses.deletedAt)));
    if (!row) throw notFound('La dirección');
    return toAddress(row);
  }
}
