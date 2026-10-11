import {
  createParamDecorator,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@sionmarket/contracts';
import type { FastifyRequest } from 'fastify';
import { forbidden } from './errors.js';

export type AuthUser = { id: string; roles: Role[] };
type AuthedRequest = FastifyRequest & { user?: AuthUser };

const PUBLIC = 'public';
const ROLES = 'roles';

/** Route needs no sign-in. */
export const Public = () => SetMetadata(PUBLIC, true);
/** Route needs one of these roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().user;
});

/** Global guard: every route requires a valid access token unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Inicia sesión');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; roles: Role[] }>(token);
      req.user = { id: payload.sub, roles: payload.roles };
    } catch {
      throw new UnauthorizedException('Sesión vencida');
    }

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.some((r) => req.user!.roles.includes(r))) throw forbidden();
    return true;
  }
}
