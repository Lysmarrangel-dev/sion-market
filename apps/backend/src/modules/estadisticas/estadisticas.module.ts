import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module.js';
import { EstadisticasController } from './estadisticas.controller.js';
import { EstadisticasService } from './estadisticas.service.js';

@Module({ imports: [CatalogoModule], controllers: [EstadisticasController], providers: [EstadisticasService], exports: [EstadisticasService] })
export class EstadisticasModule {}
