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
import { BudgetService } from '../services/budget.service';
import { ExpenseService } from '../services/expense.service';
import {
  CreateBudgetData,
  UpdateBudgetData,
  BudgetFilters,
  BudgetNotFoundError,
  CreateBudgetSchema,
  UpdateBudgetSchema,
  BudgetFiltersSchema,
  BudgetParamsSchema,
} from '../schemas/budget.schema';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

// Pipes Zod pour validation
const CreateBudgetPipe = new ZodValidationPipe(CreateBudgetSchema);
const UpdateBudgetPipe = new ZodValidationPipe(UpdateBudgetSchema);
const BudgetFiltersPipe = new ZodValidationPipe(BudgetFiltersSchema);
const BudgetParamsPipe = new ZodValidationPipe(BudgetParamsSchema);

@Controller('budget')
@UseGuards(JwtAuthGuard)
export class BudgetController {
  constructor(
    private readonly budgetService: BudgetService,
    private readonly expenseService: ExpenseService,
  ) {}

  /**
   * Récupère le budget du mois courant
   * GET /budget/current
   */
  @Get('current')
  async getCurrentBudget(@Req() req: Request) {
    try {
      const userId = (req.user as { id: string }).id;
      const budget = await this.budgetService.getCurrentBudget(userId);
      
      if (!budget) {
        return {
          success: true,
          data: null,
          message: 'Aucun budget défini pour le mois courant',
        };
      }

      // Récupérer les statistiques du budget
      const stats = await this.budgetService.getBudgetStats(budget.id, userId);
      
      return {
        success: true,
        data: {
          budget,
          stats,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Vérifie si l'utilisateur a déjà un budget
   * GET /budget/exists
   */
  @Get('exists')
  async checkBudgetExists(@Req() req: Request) {
    try {
      const userId = (req.user as { id: string }).id;
      const hasAnyBudget = await this.budgetService.hasAnyBudget(userId);
      
      return {
        success: true,
        data: { hasAnyBudget },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Récupère tous les budgets avec filtres
   * GET /budget
   */
  @Get()
  async getBudgets(
    @Req() req: Request,
    @Query(BudgetFiltersPipe) filters?: BudgetFilters,
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const budgets = await this.budgetService.getBudgets(userId, filters);
      
      return {
        success: true,
        data: budgets,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Récupère un budget spécifique avec ses statistiques
   * GET /budget/:budgetId
   */
  @Get(':budgetId')
  async getBudgetById(
    @Req() req: Request,
    @Param(BudgetParamsPipe) params: { budgetId: string },
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const { budgetId } = params;
      
      const budget = await this.budgetService.getBudgetById(budgetId, userId);
      if (!budget) {
        throw new NotFoundException(`Budget avec l'ID ${budgetId} introuvable`);
      }

      const [stats, expenses] = await Promise.all([
        this.budgetService.getBudgetStats(budgetId, userId),
        this.expenseService.getBudgetExpenses(budgetId, userId),
      ]);
      
      return {
        success: true,
        data: {
          budget,
          stats,
          expenses,
        },
      };
    } catch (error) {
      if (error instanceof BudgetNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Crée un nouveau budget
   * POST /budget
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBudget(
    @Req() req: Request,
    @Body(CreateBudgetPipe) data: CreateBudgetData,
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const budget = await this.budgetService.createBudget(userId, data);
      
      return {
        success: true,
        data: budget,
        message: 'Budget créé avec succès',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Crée un budget mensuel automatique
   * POST /budget/monthly
   */
  @Post('monthly')
  @HttpCode(HttpStatus.CREATED)
  async createMonthlyBudget(
    @Req() req: Request,
    @Body() data: { amount: number; year?: number; month?: number },
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const budget = await this.budgetService.createMonthlyBudget(
        userId,
        data.amount,
        { year: data.year, month: data.month },
      );
      
      return {
        success: true,
        data: budget,
        message: 'Budget mensuel créé avec succès',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Met à jour un budget
   * PUT /budget/:budgetId
   */
  @Put(':budgetId')
  async updateBudget(
    @Req() req: Request,
    @Param(BudgetParamsPipe) params: { budgetId: string },
    @Body(UpdateBudgetPipe) data: UpdateBudgetData,
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const { budgetId } = params;
      
      const budget = await this.budgetService.updateBudget(budgetId, userId, data);
      
      return {
        success: true,
        data: budget,
        message: 'Budget mis à jour avec succès',
      };
    } catch (error) {
      if (error instanceof BudgetNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Récupère les statistiques d'un budget
   * GET /budget/:budgetId/stats
   */
  @Get(':budgetId/stats')
  async getBudgetStats(
    @Req() req: Request,
    @Param(BudgetParamsPipe) params: { budgetId: string },
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const { budgetId } = params;
      
      const stats = await this.budgetService.getBudgetStats(budgetId, userId);
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      if (error instanceof BudgetNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Récupère les alertes d'un budget
   * GET /budget/:budgetId/alerts
   */
  @Get(':budgetId/alerts')
  async getBudgetAlerts(
    @Req() req: Request,
    @Param(BudgetParamsPipe) params: { budgetId: string },
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const { budgetId } = params;
      
      const alerts = await this.budgetService.checkBudgetAlerts(budgetId, userId);
      
      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      if (error instanceof BudgetNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Supprime un budget
   * DELETE /budget/:budgetId
   */
  @Delete(':budgetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBudget(
    @Req() req: Request,
    @Param(BudgetParamsPipe) params: { budgetId: string },
  ) {
    try {
      const userId = (req.user as { id: string }).id;
      const { budgetId } = params;
      
      await this.budgetService.deleteBudget(budgetId, userId);
      
      return {
        success: true,
        message: 'Budget supprimé avec succès',
      };
    } catch (error) {
      if (error instanceof BudgetNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }
}