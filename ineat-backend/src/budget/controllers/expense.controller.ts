import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { ExpenseService } from '../services/expense.service';
import {
  CreateExpenseData,
  CreateExpenseFromProductData,
  UpdateExpenseData,
  ExpenseFilters,
  ExpenseNotFoundError,
  InvalidExpenseDateError,
  BudgetNotFoundForExpenseError,
  CreateExpenseSchema,
  CreateExpenseFromProductSchema,
  UpdateExpenseSchema,
  ExpenseFiltersSchema,
  ExpenseParamsSchema,
} from '../schemas/expense.schema';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

// Pipes Zod pour validation
const CreateExpensePipe = new ZodValidationPipe(CreateExpenseSchema);
const CreateExpenseFromProductPipe = new ZodValidationPipe(CreateExpenseFromProductSchema);
const UpdateExpensePipe = new ZodValidationPipe(UpdateExpenseSchema);
const ExpenseFiltersPipe = new ZodValidationPipe(ExpenseFiltersSchema);
const ExpenseParamsPipe = new ZodValidationPipe(ExpenseParamsSchema);

@Controller('expense')
@UseGuards(JwtAuthGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  /**
   * Récupère les dépenses avec filtres et pagination
   * GET /expense
   */
  @Get()
  async getExpenses(
    @Req() req: Request,
    @Query(ExpenseFiltersPipe) filters?: ExpenseFilters,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const result = await this.expenseService.getExpenses(
        userId,
        filters,
        Number(page),
        Number(pageSize),
      );
      
      return {
        success: true,
        data: {
          expenses: result.expenses,
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            total: result.total,
            hasNext: result.hasNext,
            totalPages: Math.ceil(result.total / Number(pageSize)),
          },
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Récupère une dépense spécifique
   * GET /expense/:expenseId
   */
  @Get(':expenseId')
  async getExpenseById(
    @Req() req: Request,
    @Param(ExpenseParamsPipe) params: { expenseId: string },
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const { expenseId } = params;
      
      const expense = await this.expenseService.getExpenseById(expenseId, userId);
      if (!expense) {
        throw new NotFoundException(`Dépense avec l'ID ${expenseId} introuvable`);
      }
      
      return {
        success: true,
        data: expense,
      };
    } catch (error) {
      if (error instanceof ExpenseNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Crée une nouvelle dépense
   * POST /expense
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createExpense(
    @Req() req: Request,
    @Body(CreateExpensePipe) data: CreateExpenseData,
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const expense = await this.expenseService.createExpense(userId, data);
      
      return {
        success: true,
        data: expense,
        message: 'Dépense créée avec succès',
      };
    } catch (error) {
      if (error instanceof BudgetNotFoundForExpenseError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof InvalidExpenseDateError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Crée une dépense depuis l'ajout d'un produit à l'inventaire
   * POST /expense/from-product
   */
  @Post('from-product')
  @HttpCode(HttpStatus.CREATED)
  async createExpenseFromProduct(
    @Req() req: Request,
    @Body(CreateExpenseFromProductPipe) data: CreateExpenseFromProductData,
    @Body('options') options?: {
      findOrCreateBudget?: boolean;
      defaultBudgetAmount?: number;
      autoDetectCategory?: boolean;
    },
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const autoOptions = {
        findOrCreateBudget: options?.findOrCreateBudget ?? true,
        defaultBudgetAmount: options?.defaultBudgetAmount,
        autoDetectCategory: options?.autoDetectCategory ?? true,
      };
      
      const result = await this.expenseService.createExpenseFromProduct(
        userId,
        data,
        autoOptions,
      );
      
      return {
        success: true,
        data: result,
        message: result.message,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Met à jour une dépense existante
   * PUT /expense/:expenseId
   */
  @Put(':expenseId')
  async updateExpense(
    @Req() req: Request,
    @Param(ExpenseParamsPipe) params: { expenseId: string },
    @Body(UpdateExpensePipe) data: UpdateExpenseData,
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const { expenseId } = params;
      
      const expense = await this.expenseService.updateExpense(expenseId, userId, data);
      
      return {
        success: true,
        data: expense,
        message: 'Dépense mise à jour avec succès',
      };
    } catch (error) {
      if (error instanceof ExpenseNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Supprime une dépense
   * DELETE /expense/:expenseId
   */
  @Delete(':expenseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteExpense(
    @Req() req: Request,
    @Param(ExpenseParamsPipe) params: { expenseId: string },
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const { expenseId } = params;
      
      await this.expenseService.deleteExpense(expenseId, userId);
      
      return {
        success: true,
        message: 'Dépense supprimée avec succès',
      };
    } catch (error) {
      if (error instanceof ExpenseNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Récupère les dépenses récentes (pour le dashboard)
   * GET /expense/recent
   */
  @Get('recent')
  async getRecentExpenses(
    @Req() req: Request,
    @Query('limit') limit = 10,
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const expenses = await this.expenseService.getRecentExpenses(userId, Number(limit));
      
      return {
        success: true,
        data: expenses,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Récupère les statistiques des dépenses
   * GET /expense/stats
   */
  @Get('stats')
  async getExpenseStats(
    @Req() req: Request,
    @Query('budgetId') budgetId?: string,
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const stats = await this.expenseService.getExpenseStats(userId, budgetId);
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Récupère les dépenses sans montant (produits sans prix)
   * GET /expense/without-amount
   */
  @Get('without-amount')
  async getExpensesWithoutAmount(
    @Req() req: Request,
    @Query('budgetId') budgetId?: string,
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const expenses = await this.expenseService.getExpensesWithoutAmount(userId, budgetId);
      
      return {
        success: true,
        data: expenses,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Calcule l'impact d'un montant sur un budget
   * POST /expense/calculate-impact
   */
  @Post('calculate-impact')
  async calculateExpenseImpact(
    @Req() req: Request,
    @Body() data: { budgetId: string; amount: number },
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const impact = await this.expenseService.calculateExpenseImpact(
        data.budgetId,
        userId,
        data.amount,
      );
      
      return {
        success: true,
        data: impact,
      };
    } catch (error) {
      if (error instanceof BudgetNotFoundForExpenseError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Récupère les dépenses d'un budget spécifique
   * GET /expense/budget/:budgetId
   */
  @Get('budget/:budgetId')
  async getBudgetExpenses(
    @Req() req: Request,
    @Param('budgetId') budgetId: string,
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const expenses = await this.expenseService.getBudgetExpenses(budgetId, userId);
      
      return {
        success: true,
        data: expenses,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}