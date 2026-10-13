import {
  createParamDecorator,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@sionmarket/contracts';
import type { FastifyRequest } from 'fastify';
import { forbidden } from './errors.js';
import { SupabaseTokenVerifier, UserDirectory, type AuthUser } from './supabase-auth.js';

export type { AuthUser };
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

/** Global guard: every route requires a valid Supabase access token unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly log = new Logger('Auth');

  constructor(
    private readonly verifier: SupabaseTokenVerifier,
    private readonly directory: UserDirectory,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Inicia sesión');
    let claims;
    try {
      claims = await this.verifier.verify(token);
    } catch (e) {
      // Logged so a wave of rejected sessions can be told apart from expired tokens.
      this.log.warn(`Token rechazado: ${(e as { code?: string }).code ?? (e as Error).message}`);
      throw new UnauthorizedException('Sesión vencida');
    }
    req.user = await this.directory.resolve(claims);

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.some((r) => req.user!.roles.includes(r))) throw forbidden();
    return true;
  }
}
