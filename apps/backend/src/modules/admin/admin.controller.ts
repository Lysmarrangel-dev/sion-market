import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { AdminOrderQuery, AdminRestaurantInput, AdminUserQuery, SetActive, SetEnabled, SetOwner, SetRequestStatus, SetRoles, StatsQuery } from '@sionmarket/contracts';
import { CurrentUser, Roles, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.js';
import { AdminService } from './admin.service.js';

/** SionMarket's back office: the whole platform at a glance and the switches only staff may flip. */
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('resumen')
  summary(@Query(new ZodPipe(StatsQuery)) query: StatsQuery) {
    return this.admin.summary(query.periodo);
  }

  @Get('restaurantes')
  restaurants() {
    return this.admin.restaurants();
  }

  @Post('restaurantes')
  createRestaurant(@Body(new ZodPipe(AdminRestaurantInput)) body: AdminRestaurantInput) {
    return this.admin.createRestaurant(body);
  }

  @Patch('restaurantes/:id/habilitado')
  setEnabled(@Param('id') id: string, @Body(new ZodPipe(SetEnabled)) body: SetEnabled) {
    return this.admin.setEnabled(id, body.enabled);
  }

  @Patch('restaurantes/:id/dueno')
  setOwner(@Param('id') id: string, @Body(new ZodPipe(SetOwner)) body: SetOwner) {
    return this.admin.setOwner(id, body.email);
  }

  @Get('zonas')
  zones() {
    return this.admin.zones();
  }

  @Patch('zonas/:id/activa')
  setZoneActive(@Param('id') id: string, @Body(new ZodPipe(SetActive)) body: SetActive) {
    return this.admin.setZoneActive(id, body.active);
  }

  @Get('usuarios')
  users(@Query(new ZodPipe(AdminUserQuery)) query: AdminUserQuery) {
    return this.admin.users(query);
  }

  @Put('usuarios/:id/roles')
  setRoles(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body(new ZodPipe(SetRoles)) body: SetRoles) {
    return this.admin.setRoles(user, id, body.roles);
  }

  @Get('pedidos')
  orders(@Query(new ZodPipe(AdminOrderQuery)) query: AdminOrderQuery) {
    return this.admin.orders(query);
  }

  @Get('solicitudes')
  requests() {
    return this.admin.requests();
  }

  @Patch('solicitudes/:id')
  setRequestStatus(@Param('id') id: string, @Body(new ZodPipe(SetRequestStatus)) body: SetRequestStatus) {
    return this.admin.setRequestStatus(id, body.status);
  }
}
