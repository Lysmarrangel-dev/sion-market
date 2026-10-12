import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module.js';
import { EstadisticasModule } from '../estadisticas/estadisticas.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({ imports: [CatalogoModule, EstadisticasModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
