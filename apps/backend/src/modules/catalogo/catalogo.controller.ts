import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ProductAvailability, ProductCustomization, ProductInput, ProductPatch, RestaurantInput, RestaurantPatch, RestaurantQuery } from '@sionmarket/contracts';
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
  @Get('yo/restaurantes')
  mine(@CurrentUser() user: AuthUser) {
    return this.catalogo.mine(user);
  }

  @Roles('restaurante', 'admin')
  @Get('yo/restaurantes/:id')
  managed(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalogo.managedDetail(user, id);
  }

  @Roles('restaurante', 'admin')
  @Post('restaurantes')
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(RestaurantInput)) body: RestaurantInput) {
    return this.catalogo.createRestaurant(user, body);
  }

  @Roles('restaurante', 'admin')
  @Patch('restaurantes/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(RestaurantPatch)) body: RestaurantPatch) {
    return this.catalogo.updateRestaurant(user, id, body);
  }

  @Roles('restaurante', 'admin')
  @Delete('restaurantes/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalogo.deleteRestaurant(user, id);
  }

  @Roles('restaurante', 'admin')
  @Post('restaurantes/:id/productos')
  createProduct(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(ProductInput)) body: ProductInput) {
    return this.catalogo.createProduct(user, id, body);
  }

  @Roles('restaurante', 'admin')
  @Patch('restaurantes/:id/productos/:productId')
  updateProduct(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body(new ZodPipe(ProductPatch)) body: ProductPatch,
  ) {
    return this.catalogo.updateProduct(user, id, productId, body);
  }

  @Roles('restaurante', 'admin')
  @Delete('restaurantes/:id/productos/:productId')
  removeProduct(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('productId') productId: string) {
    return this.catalogo.deleteProduct(user, id, productId);
  }

  @Roles('restaurante', 'admin')
  @Put('restaurantes/:id/productos/:productId/personalizacion')
  setCustomization(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body(new ZodPipe(ProductCustomization)) body: ProductCustomization,
  ) {
    return this.catalogo.setCustomization(user, id, productId, body);
  }

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
