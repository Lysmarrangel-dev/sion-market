import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { LatLng } from '@sionmarket/contracts';
import { CurrentUser, Public, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.js';
import { CoberturaService } from './cobertura.service.js';

@Controller('cobertura')
export class CoberturaController {
  constructor(private readonly cobertura: CoberturaService) {}

  @Public()
  @Post('verificar')
  @HttpCode(200)
  check(@Body(new ZodPipe(LatLng)) body: LatLng) {
    return this.cobertura.check(body);
  }

  @Post('avisame')
  @HttpCode(204)
  async waitlist(@CurrentUser() user: AuthUser, @Body(new ZodPipe(LatLng)) body: LatLng) {
    await this.cobertura.joinWaitlist(user.id, body);
  }
}
