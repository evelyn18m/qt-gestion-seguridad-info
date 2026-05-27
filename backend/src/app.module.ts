import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatalogosModule } from './catalogos/catalogos.module';
import { ValoracionesModule } from './valoraciones/valoraciones.module';

@Module({
  imports: [CatalogosModule, ValoracionesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
