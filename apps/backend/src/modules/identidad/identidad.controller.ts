import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { OtpRequest, OtpVerify, RefreshRequest } from '@sionmarket/contracts';
import { Public } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.js';
import { IdentidadService } from './identidad.service.js';

@Public()
@Controller('auth')
export class IdentidadController {
  constructor(private readonly auth: IdentidadService) {}

  @Post('otp')
  @HttpCode(200)
  request(@Body(new ZodPipe(OtpRequest)) body: OtpRequest) {
    return this.auth.requestOtp(body.phone);
  }

  @Post('otp/verificar')
  @HttpCode(200)
  verify(@Body(new ZodPipe(OtpVerify)) body: OtpVerify) {
    return this.auth.verifyOtp(body.phone, body.code);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodPipe(RefreshRequest)) body: RefreshRequest) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body(new ZodPipe(RefreshRequest)) body: RefreshRequest) {
    await this.auth.logout(body.refreshToken);
  }
}
