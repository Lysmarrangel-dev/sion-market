import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ChangeStatus, CreateOrder, OrderStatus } from '@sionmarket/contracts';
import { z } from 'zod';
import { CurrentUser, Roles, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.js';
import { PedidosService } from './pedidos.service.js';

const AssignBody = z.object({ riderId: z.uuid() });
const InboxQuery = z.object({
  estado: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : undefined))
    .pipe(z.array(OrderStatus).optional()),
  /** Newest first, for the history; the inbox (default) is oldest first. */
  recientes: z.stringbool().optional(),
});

@Controller()
export class PedidosController {
  constructor(private readonly pedidos: PedidosService) {}

  @Post('pedidos')
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(CreateOrder)) body: CreateOrder) {
    return this.pedidos.create(user, body);
  }

  @Get('pedidos')
  mine(@CurrentUser() user: AuthUser) {
    return this.pedidos.listForCustomer(user);
  }

  @Get('pedidos/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.pedidos.get(user, id);
  }

  /** One endpoint for every role: the state machine decides who may do what. */
  @Post('pedidos/:id/estado')
  changeStatus(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(ChangeStatus)) body: ChangeStatus) {
    return this.pedidos.changeStatus(user, id, body);
  }

  @Roles('admin')
  @Post('pedidos/:id/asignar')
  assign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(AssignBody)) body: z.infer<typeof AssignBody>) {
    return this.pedidos.assignRider(user, id, body.riderId);
  }

  @Roles('restaurante', 'admin')
  @Get('restaurantes/:id/pedidos')
  inbox(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query(new ZodPipe(InboxQuery)) query: z.infer<typeof InboxQuery>) {
    return this.pedidos.listForRestaurant(user, id, query.estado, query.recientes);
  }
}
