import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
  imports: [ConfigModule.forRoot(), PrismaModule, AuthModule, InventoryModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
