import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { PreciosController } from './precios.controller.js';
import { PreciosService } from './precios.service.js';

@Module({
  imports: [CatalogoModule, UsuariosModule],
  controllers: [PreciosController],
  providers: [PreciosService],
  exports: [PreciosService],
})
export class PreciosModule {}
