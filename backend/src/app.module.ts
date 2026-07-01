import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatalogosModule } from './catalogos/catalogos.module';
import { ValoracionesModule } from './valoraciones/valoraciones.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { ReportesModule } from './reportes/reportes.module';
import { ParametrosModule } from './parametros/parametros.module';
import { AuditModule } from './audit/audit.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PlanTratamientoModule } from './plan-tratamiento/plan-tratamiento.module';

@Module({
  imports: [
    CatalogosModule,
    ValoracionesModule,
    AuthModule,
    ReportesModule,
    ParametrosModule,
    AuditModule,
    UsuariosModule,
    PlanTratamientoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
