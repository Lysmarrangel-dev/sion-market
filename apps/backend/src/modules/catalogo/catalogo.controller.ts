import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ProductAvailability, RestaurantQuery } from '@sionmarket/contracts';
import { z } from 'zod';
import { CurrentUser, Public, Roles, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.js';
import { CatalogoService } from './catalogo.service.js';

const OpenBody = z.object({ open: z.boolean() });

@Controller()
export class CatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  @Public()
  @Get('categorias')
  categories() {
    return this.catalogo.categories();
  }

  @Public()
  @Get('restaurantes')
  list(@Query(new ZodPipe(RestaurantQuery)) query: RestaurantQuery) {
    return this.catalogo.list(query);
  }

  @Public()
  @Get('restaurantes/:id')
  detail(@Param('id') id: string) {
    return this.catalogo.detail(id);
  }

  // ── Panel del restaurante ──
  @Roles('restaurante', 'admin')
  @Patch('restaurantes/:id/abierto')
  setOpen(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(OpenBody)) body: z.infer<typeof OpenBody>) {
    return this.catalogo.setOpen(user, id, body.open);
  }

  @Roles('restaurante', 'admin')
  @Patch('restaurantes/:id/productos/:productId/disponibilidad')
  setSoldOut(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body(new ZodPipe(ProductAvailability)) body: ProductAvailability,
  ) {
    return this.catalogo.setSoldOut(user, id, productId, body.soldOut);
  }
}
