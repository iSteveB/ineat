import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProductsModule } from './product/products.module';
import { BudgetModule } from './budget/budget.module';
import { UserModule } from './user/user.module';
import { AvatarModule } from './avatar/avatar.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ReceiptModule } from './receipt/receipt.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    InventoryModule,
    ProductsModule,
    BudgetModule,
    UserModule,
    CloudinaryModule,
    AvatarModule,
    ReceiptModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
