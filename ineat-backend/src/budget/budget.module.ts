import { Module } from '@nestjs/common';
import { BudgetController } from './controller/budget.controller';
import { BudgetService } from './service/budget.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService], // Export du service pour l'utiliser dans d'autres modules (ex: inventory)
})
export class BudgetModule {}