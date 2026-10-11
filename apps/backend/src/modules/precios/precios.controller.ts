import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { QuoteRequest, type Quote } from '@sionmarket/contracts';
import { CurrentUser, Public, type AuthUser } from '../../common/auth.js';
import { ZodPipe } from '../../common/zod.js';
import { PreciosService } from './precios.service.js';

@Controller()
export class PreciosController {
  constructor(private readonly precios: PreciosService) {}

  @Public()
  @Get('tasa')
  rate() {
    return this.precios.currentRate();
  }

  /** Checkout preview: same numbers the order will be created with. */
  @Post('cotizar')
  @HttpCode(200)
  async quote(@CurrentUser() user: AuthUser, @Body(new ZodPipe(QuoteRequest)) body: QuoteRequest): Promise<Quote> {
    const { lines, totals, couponApplied, etaMin, etaMax } = await this.precios.quote(user.id, body);
    return { lines, totals, couponApplied, etaMin, etaMax };
  }
}
