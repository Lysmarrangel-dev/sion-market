import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './common/auth.js';
import { DbModule } from './common/db.module.js';
import { RedisModule } from './common/redis.module.js';
import { ErrorFilter } from './common/errors.js';
import { CatalogoModule } from './modules/catalogo/catalogo.module.js';
import { CoberturaModule } from './modules/cobertura/cobertura.module.js';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module.js';
import { IdentidadModule } from './modules/identidad/identidad.module.js';
import { PedidosModule } from './modules/pedidos/pedidos.module.js';
import { PreciosModule } from './modules/precios/precios.module.js';
import { SaludController } from './modules/salud/salud.controller.js';
import { UsuariosModule } from './modules/usuarios/usuarios.module.js';

@Module({
  imports: [
    DbModule,
    RedisModule,
    IdentidadModule,
    UsuariosModule,
    CoberturaModule,
    CatalogoModule,
    PreciosModule,
    PedidosModule,
    NotificacionesModule,
  ],
  controllers: [SaludController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: ErrorFilter },
  ],
})
export class AppModule {}
