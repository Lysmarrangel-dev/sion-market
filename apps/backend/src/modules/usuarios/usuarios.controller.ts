import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { AddressInput, UpdateProfile } from '@sionmarket/contracts';
import { CurrentUser, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('yo')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  me(@CurrentUser() user: AuthUser) {
    return this.usuarios.profile(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body(new ZodPipe(UpdateProfile)) body: UpdateProfile) {
    return this.usuarios.updateProfile(user.id, body);
  }

  @Get('direcciones')
  addresses(@CurrentUser() user: AuthUser) {
    return this.usuarios.listAddresses(user.id);
  }

  @Post('direcciones')
  addAddress(@CurrentUser() user: AuthUser, @Body(new ZodPipe(AddressInput)) body: AddressInput) {
    return this.usuarios.addAddress(user.id, body);
  }

  @Delete('direcciones/:id')
  @HttpCode(204)
  async removeAddress(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.usuarios.removeAddress(user.id, id);
  }
}
