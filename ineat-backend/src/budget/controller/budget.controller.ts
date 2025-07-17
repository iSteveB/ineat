import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { BudgetService } from '../service/budget.service';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  BudgetFiltersDto,
  ExpenseFiltersDto,
  CreateInitialBudgetDto,
  AddProductExpenseDto,
} from '../dto/budget.dto';
import {
  Budget,
  Expense,
  BudgetStats,
  BudgetComparison,
  BudgetSetupStatus,
} from '../types/budget.type';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Budget')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  // ===== GESTION DES BUDGETS =====

  @Get('setup-status')
  @ApiOperation({
    summary: "Vérifie si l'utilisateur a besoin de configurer un budget",
    description:
      "Retourne l'état de configuration du budget pour l'utilisateur connecté",
  })
  @ApiOkResponse({
    description: 'Statut de configuration du budget récupéré avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            needsSetup: { type: 'boolean', example: true },
            hasCurrentBudget: { type: 'boolean', example: false },
            hasPreviousBudget: { type: 'boolean', example: true },
            suggestedAmount: { type: 'number', example: 500 },
          },
        },
      },
    },
  })
  async getBudgetSetupStatus(
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: BudgetSetupStatus }> {
    const status = await this.budgetService.needsBudgetSetup(user.id);
    return { success: true, data: status };
  }

  @Post('initial')
  @ApiOperation({
    summary: 'Crée le budget initial pour le mois en cours',
    description: "Crée le premier budget de l'utilisateur pour le mois actuel",
  })
  @ApiCreatedResponse({
    description: 'Budget initial créé avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/Budget' },
        message: { type: 'string', example: 'Budget initial créé avec succès' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Un budget existe déjà pour ce mois ou données invalides',
  })
  async createInitialBudget(
    @CurrentUser() user: User,
    @Body() dto: CreateInitialBudgetDto,
  ): Promise<{ success: boolean; data: Budget; message: string }> {
    const budget = await this.budgetService.createInitialBudget(user.id, dto);
    return {
      success: true,
      data: budget,
      message: 'Budget initial créé avec succès',
    };
  }

  @Post()
  @ApiOperation({
    summary: 'Crée un nouveau budget',
    description: 'Crée un budget pour une période spécifique',
  })
  @ApiCreatedResponse({
    description: 'Budget créé avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/Budget' },
        message: { type: 'string', example: 'Budget créé avec succès' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Un budget actif existe déjà pour cette période',
  })
  async createBudget(
    @CurrentUser() user: User,
    @Body() dto: CreateBudgetDto,
  ): Promise<{ success: boolean; data: Budget; message: string }> {
    const budget = await this.budgetService.createBudget(user.id, dto);
    return {
      success: true,
      data: budget,
      message: 'Budget créé avec succès',
    };
  }

  @Get('current')
  @ApiOperation({
    summary: 'Récupère le budget actuel',
    description: "Retourne le budget actif de l'utilisateur (période actuelle)",
  })
  @ApiOkResponse({
    description: 'Budget actuel récupéré avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/Budget' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Aucun budget actuel trouvé',
  })
  async getCurrentBudget(
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: Budget | null }> {
    const budget = await this.budgetService.getCurrentBudget(user.id);
    return { success: true, data: budget };
  }

  @Get('current/month')
  @ApiOperation({
    summary: 'Récupère le budget du mois en cours',
    description: 'Retourne le budget du mois actuel',
  })
  @ApiOkResponse({
    description: 'Budget du mois récupéré avec succès',
  })
  async getCurrentMonthBudget(
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: Budget | null }> {
    const budget = await this.budgetService.getCurrentMonthBudget(user.id);
    return { success: true, data: budget };
  }

  @Get()
  @ApiOperation({
    summary: "Liste les budgets de l'utilisateur",
    description:
      'Retourne une liste paginée des budgets avec filtres optionnels',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Liste des budgets récupérée avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            budgets: {
              type: 'array',
              items: { $ref: '#/components/schemas/Budget' },
            },
            total: { type: 'number', example: 25 },
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 3 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  async getBudgets(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query() filters: BudgetFiltersDto,
  ): Promise<{
    success: boolean;
    data: {
      budgets: Budget[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { budgets, total } = await this.budgetService.getBudgets(
      user.id,
      filters,
      page,
      pageSize,
    );

    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: {
        budgets,
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupère un budget par son ID',
    description: "Retourne les détails d'un budget spécifique",
  })
  @ApiParam({
    name: 'id',
    description: 'ID unique du budget',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Budget récupéré avec succès',
  })
  @ApiNotFoundResponse({
    description: 'Budget non trouvé',
  })
  async getBudgetById(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) budgetId: string,
  ): Promise<{ success: boolean; data: Budget }> {
    // On utilise getBudgets avec filtrage pour s'assurer que l'utilisateur possède ce budget
    const { budgets } = await this.budgetService.getBudgets(user.id, {}, 1, 1);
    const budget = budgets.find((b) => b.id === budgetId);

    if (!budget) {
      throw new Error('Budget non trouvé');
    }

    return { success: true, data: budget };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Met à jour un budget',
    description: "Modifie les informations d'un budget existant",
  })
  @ApiParam({
    name: 'id',
    description: 'ID unique du budget',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Budget mis à jour avec succès',
  })
  @ApiNotFoundResponse({
    description: 'Budget non trouvé',
  })
  async updateBudget(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) budgetId: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<{ success: boolean; data: Budget; message: string }> {
    const budget = await this.budgetService.updateBudget(
      budgetId,
      user.id,
      dto,
    );
    return {
      success: true,
      data: budget,
      message: 'Budget mis à jour avec succès',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprime un budget',
    description:
      'Supprime définitivement un budget et toutes ses dépenses associées',
  })
  @ApiParam({
    name: 'id',
    description: 'ID unique du budget',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Budget supprimé avec succès',
  })
  @ApiNotFoundResponse({
    description: 'Budget non trouvé',
  })
  async deleteBudget(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) budgetId: string,
  ): Promise<void> {
    await this.budgetService.deleteBudget(budgetId, user.id);
  }

  // ===== GESTION DES DÉPENSES =====

  @Post('expenses')
  @ApiOperation({
    summary: 'Ajoute une dépense manuelle',
    description: 'Enregistre une nouvelle dépense dans le budget approprié',
  })
  @ApiCreatedResponse({
    description: 'Dépense ajoutée avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/Expense' },
        message: { type: 'string', example: 'Dépense ajoutée avec succès' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Aucun budget trouvé pour cette période ou données invalides',
  })
  async addExpense(
    @CurrentUser() user: User,
    @Body() dto: CreateExpenseDto,
  ): Promise<{ success: boolean; data: Expense; message: string }> {
    const expense = await this.budgetService.addExpense(user.id, dto);
    return {
      success: true,
      data: expense,
      message: 'Dépense ajoutée avec succès',
    };
  }

  @Post('expenses/product')
  @ApiOperation({
    summary: 'Ajoute une dépense automatique pour un produit',
    description:
      "Enregistre automatiquement une dépense lors de l'ajout d'un produit avec prix",
  })
  @ApiCreatedResponse({
    description: 'Dépense produit ajoutée avec succès',
  })
  async addProductExpense(
    @CurrentUser() user: User,
    @Body() dto: AddProductExpenseDto,
  ): Promise<{ success: boolean; data: Expense; message: string }> {
    const expense = await this.budgetService.addProductExpense(user.id, dto);
    return {
      success: true,
      data: expense,
      message: 'Dépense produit enregistrée avec succès',
    };
  }

  @Get('expenses')
  @ApiOperation({
    summary: "Liste les dépenses de l'utilisateur",
    description:
      'Retourne une liste paginée des dépenses avec filtres optionnels',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Liste des dépenses récupérée avec succès',
  })
  async getExpenses(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @Query() filters: ExpenseFiltersDto,
  ): Promise<{
    success: boolean;
    data: {
      expenses: Expense[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { expenses, total } = await this.budgetService.getExpenses(
      user.id,
      filters,
      page,
      pageSize,
    );

    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: {
        expenses,
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  @Put('expenses/:id')
  @ApiOperation({
    summary: 'Met à jour une dépense',
    description: "Modifie les informations d'une dépense existante",
  })
  @ApiParam({
    name: 'id',
    description: 'ID unique de la dépense',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Dépense mise à jour avec succès',
  })
  async updateExpense(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<{ success: boolean; data: Expense; message: string }> {
    const expense = await this.budgetService.updateExpense(
      expenseId,
      user.id,
      dto,
    );
    return {
      success: true,
      data: expense,
      message: 'Dépense mise à jour avec succès',
    };
  }

  @Delete('expenses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprime une dépense',
    description: 'Supprime définitivement une dépense',
  })
  @ApiParam({
    name: 'id',
    description: 'ID unique de la dépense',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Dépense supprimée avec succès',
  })
  async deleteExpense(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) expenseId: string,
  ): Promise<void> {
    await this.budgetService.deleteExpense(expenseId, user.id);
  }

  // ===== STATISTIQUES ET ANALYTICS =====

  @Get('current/stats')
  @ApiOperation({
    summary: 'Récupère les statistiques du budget actuel',
    description:
      'Retourne les statistiques détaillées du budget du mois en cours',
  })
  @ApiOkResponse({
    description: 'Statistiques du budget récupérées avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/BudgetStats' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Aucun budget actuel trouvé',
  })
  async getCurrentBudgetStats(
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: BudgetStats | null }> {
    const stats = await this.budgetService.getCurrentBudgetStats(user.id);
    return { success: true, data: stats };
  }

  @Get(':id/stats')
  @ApiOperation({
    summary: "Récupère les statistiques d'un budget spécifique",
    description: "Calcule et retourne les statistiques détaillées d'un budget",
  })
  @ApiParam({
    name: 'id',
    description: 'ID unique du budget',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Statistiques du budget récupérées avec succès',
  })
  async getBudgetStats(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) budgetId: string,
  ): Promise<{ success: boolean; data: BudgetStats }> {
    const stats = await this.budgetService.getBudgetStats(budgetId, user.id);
    return { success: true, data: stats };
  }

  @Get(':currentId/compare/:previousId')
  @ApiOperation({
    summary: 'Compare deux budgets',
    description: 'Compare les statistiques entre deux périodes de budget',
  })
  @ApiParam({
    name: 'currentId',
    description: 'ID du budget actuel',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'previousId',
    description: 'ID du budget précédent',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Comparaison de budgets récupérée avec succès',
  })
  async compareBudgets(
    @CurrentUser() user: User,
    @Param('currentId', ParseUUIDPipe) currentBudgetId: string,
    @Param('previousId', ParseUUIDPipe) previousBudgetId: string,
  ): Promise<{ success: boolean; data: BudgetComparison }> {
    const comparison = await this.budgetService.compareBudgets(
      currentBudgetId,
      previousBudgetId,
      user.id,
    );
    return { success: true, data: comparison };
  }
}
