import { Module } from '@nestjs/common';
import { IdentidadController } from './identidad.controller.js';
import { IdentidadService } from './identidad.service.js';

@Module({ controllers: [IdentidadController], providers: [IdentidadService] })
export class IdentidadModule {}
