import { Controller, Get, Param, Query } from '@nestjs/common';
import { StatsQuery } from '@sionmarket/contracts';
import { CurrentUser, Roles, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.js';
import { CatalogoService } from '../catalogo/catalogo.service.js';
import { EstadisticasService } from './estadisticas.service.js';

@Controller()
export class EstadisticasController {
  constructor(
    private readonly stats: EstadisticasService,
    private readonly catalogo: CatalogoService,
  ) {}

  /** The restaurant's dashboard: sales and orders of today, the week or the month. */
  @Roles('restaurante', 'admin')
  @Get('restaurantes/:id/resumen')
  async summary(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query(new ZodPipe(StatsQuery)) query: StatsQuery) {
    await this.catalogo.assertOwner(user, id);
    return this.stats.restaurant(id, query.periodo);
  }
}
