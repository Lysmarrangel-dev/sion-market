import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { DeviceToken } from '@sionmarket/contracts';
import { CurrentUser, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.js';
import { NotificacionesService } from './notificaciones.service.js';

@Controller('yo/dispositivos')
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @Post()
  @HttpCode(204)
  async register(@CurrentUser() user: AuthUser, @Body(new ZodPipe(DeviceToken)) body: DeviceToken) {
    await this.notificaciones.registerDevice(user.id, body);
  }
}
