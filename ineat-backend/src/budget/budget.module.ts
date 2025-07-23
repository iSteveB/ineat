import { Module } from '@nestjs/common';
import { BudgetService } from './services/budget.service';
import { ExpenseService } from './services/expense.service';
import { BudgetController } from './controllers/budget.controller';
import { ExpenseController } from './controllers/expense.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule, // Pour l'accès à la base de données
  ],
  controllers: [
    BudgetController,
    ExpenseController,
  ],
  providers: [
    BudgetService,
    ExpenseService,
  ],
  exports: [
    BudgetService,
    ExpenseService,
  ], // Exporter les services pour les utiliser dans d'autres modules (ex: inventory)
})
export class BudgetModule {}