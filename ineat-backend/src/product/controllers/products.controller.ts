import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ProductsService } from '../services/products.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SearchProductsDto, ProductSearchResultDto } from '../../DTOs';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Recherche de produits dans la base de données
   */
  @Get('search')
  @ApiOperation({
    summary: 'Rechercher des produits',
    description:
      "Recherche des produits existants par nom ou marque. Utile pour éviter les doublons lors de l'ajout à l'inventaire.",
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Terme de recherche (minimum 2 caractères)',
    example: 'lait',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Nombre maximum de résultats (défaut: 10, max: 50)',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liste des produits correspondant à la recherche',
    type: [ProductSearchResultDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Paramètres de recherche invalides',
    schema: {
      example: {
        statusCode: 400,
        message: ['Le terme de recherche doit contenir au moins 2 caractères'],
        error: 'Bad Request',
      },
    },
  })
  async searchProducts(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    searchDto: SearchProductsDto,
  ): Promise<ProductSearchResultDto[]> {
    return await this.productsService.searchProducts(
      searchDto.q,
      searchDto.limit,
    );
  }

  /**
   * Récupère les catégories disponibles
   * IMPORTANT: Cette route doit être définie AVANT la route :id
   */
  @Get('categories')
  @ApiOperation({
    summary: 'Lister les catégories',
    description:
      'Récupère la liste de toutes les catégories de produits disponibles',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liste des catégories',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          icon: { type: 'string', nullable: true },
          parentId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
    },
  })
  async getCategories() {
    return await this.productsService.getCategories();
  }

  /**
   * Récupère un produit spécifique par son ID
   * IMPORTANT: Cette route doit être définie APRÈS les routes statiques
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer un produit par ID',
    description: "Récupère les informations détaillées d'un produit spécifique",
  })
  @ApiParam({
    name: 'id',
    description: 'ID du produit',
    example: 'uuid-exemple',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Produit trouvé',
    type: ProductSearchResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Produit non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Produit non trouvé',
        error: 'Not Found',
      },
    },
  })
  async getProductById(
    @Param('id') productId: string,
  ): Promise<ProductSearchResultDto> {
    return await this.productsService.getProductById(productId);
  }
}
