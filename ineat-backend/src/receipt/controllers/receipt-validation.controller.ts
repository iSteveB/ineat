import {
  Controller,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequiresPremium } from '../../auth/decorators/requires-premium.decorator';
import { PremiumGuard } from '../../auth/guards/premium.guard';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ValidateReceiptItemDto,
  ValidatedReceiptItemResponseDto,
  ValidateReceiptItemApiResponseDto,
  ReceiptItemParamsDto,
} from '../dto/validate-receipt-item.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Contrôleur pour la gestion de la validation des items de tickets
 * Permet la correction, l'association et la création de produits
 */
@ApiTags('receipt-validation')
@Controller('receipt')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReceiptValidationController {
  private readonly logger = new Logger(ReceiptValidationController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Valide et met à jour un item de ticket
   * Permet la correction des informations, l'association à un produit existant
   * ou la création d'un nouveau produit
   */
  @Put(':receiptId/items/:itemId')
  @UseGuards(PremiumGuard)
  @RequiresPremium()
  @ApiOperation({
    summary: 'Valider et corriger un item de ticket',
    description: `
      Met à jour un item de ticket détecté par OCR avec les corrections de l'utilisateur.
      Permet de :
      - Corriger les informations détectées (nom, quantité, prix)
      - Associer l'item à un produit existant
      - Créer un nouveau produit si nécessaire
      - Ajouter des informations pour l'inventaire (expiration, stockage)
    `,
  })
  @ApiParam({
    name: 'receiptId',
    description: 'ID du ticket de caisse',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'itemId',
    description: "ID de l'item du ticket à valider",
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({
    description: "Données de validation de l'item",
    type: ValidateReceiptItemDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item validé avec succès',
    type: ValidateReceiptItemApiResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Ticket ou item non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Item de ticket non trouvé',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Données de validation invalides',
    schema: {
      example: {
        statusCode: 400,
        message: ['quantity must be a positive number'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Accès premium requis',
    schema: {
      example: {
        statusCode: 403,
        message: 'Premium subscription required',
        error: 'Forbidden',
      },
    },
  })
  async validateReceiptItem(
    @Req() req: AuthenticatedRequest,
    @Param() params: ReceiptItemParamsDto,
    @Body() validationData: ValidateReceiptItemDto,
  ): Promise<ValidateReceiptItemApiResponseDto> {
    const { receiptId, itemId } = params;
    const userId = req.user.id;

    this.logger.log(
      `Validation de l'item ${itemId} du ticket ${receiptId} par l'utilisateur ${userId}`,
    );

    try {
      // 1. Vérifier que l'item existe et appartient à l'utilisateur
      const existingItem = await this.findReceiptItem(
        receiptId,
        itemId,
        userId,
      );

      // 2. Gérer le produit (existant ou nouveau)
      const productId = await this.handleProduct(validationData);

      // 3. Mettre à jour l'item avec les données validées
      const updatedItem = await this.updateReceiptItem(
        itemId,
        validationData,
        productId,
      );

      // 4. Préparer la réponse
      const response: ValidateReceiptItemApiResponseDto = {
        success: true,
        data: this.mapItemToResponseDto(updatedItem),
        message: 'Item validé avec succès',
        meta:
          productId !== existingItem.productId
            ? {
                productAssociated: true,
                productId,
                newProductCreated: !validationData.productId,
              }
            : undefined,
      };

      this.logger.log(`Item ${itemId} validé avec succès`);
      return response;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la validation de l'item ${itemId}: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException("Erreur lors de la validation de l'item");
    }
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * Trouve et vérifie l'existence d'un item de ticket
   */
  private async findReceiptItem(
    receiptId: string,
    itemId: string,
    userId: string,
  ) {
    // Vérifier que le ticket appartient à l'utilisateur
    const receipt = await this.prisma.receipt.findFirst({
      where: {
        id: receiptId,
        userId,
      },
    });

    if (!receipt) {
      throw new NotFoundException('Ticket non trouvé ou non autorisé');
    }

    // Vérifier que l'item existe
    const item = await this.prisma.receiptItem.findFirst({
      where: {
        id: itemId,
        receiptId,
      },
    });

    if (!item) {
      throw new NotFoundException('Item de ticket non trouvé');
    }

    return item;
  }

  /**
   * Gère l'association ou la création d'un produit
   */
  private async handleProduct(
    validationData: ValidateReceiptItemDto,
  ): Promise<string | null> {
    // Si un productId est fourni, vérifier qu'il existe
    if (validationData.productId) {
      const existingProduct = await this.prisma.product.findUnique({
        where: { id: validationData.productId },
      });

      if (!existingProduct) {
        throw new BadRequestException('Produit spécifié non trouvé');
      }

      return validationData.productId;
    }

    // Si des informations de nouveau produit sont fournies, le créer
    if (validationData.newProduct) {
      const newProduct = await this.createNewProduct(validationData.newProduct);
      return newProduct.id;
    }

    // Aucun produit associé
    return null;
  }

  /**
   * Crée un nouveau produit à partir des données fournies
   */
  private async createNewProduct(productData: any) {
    // Vérifier que la catégorie existe
    const category = await this.prisma.category.findUnique({
      where: { slug: productData.categorySlug },
    });

    if (!category) {
      throw new BadRequestException(
        `Catégorie '${productData.categorySlug}' non trouvée`,
      );
    }

    // Vérifier l'unicité du code-barres si fourni
    if (productData.barcode) {
      const existingProduct = await this.prisma.product.findUnique({
        where: { barcode: productData.barcode },
      });

      if (existingProduct) {
        throw new BadRequestException(
          'Un produit avec ce code-barres existe déjà',
        );
      }
    }

    // Créer le nouveau produit
    const newProduct = await this.prisma.product.create({
      data: {
        name: productData.name,
        brand: productData.brand,
        barcode: productData.barcode,
        categoryId: category.id,
        imageUrl: productData.imageUrl,
        unitType: productData.unitType,
      },
    });

    this.logger.log(
      `Nouveau produit créé: ${newProduct.name} (${newProduct.id})`,
    );
    return newProduct;
  }

  /**
   * Met à jour l'item de ticket avec les données validées
   */
  private async updateReceiptItem(
    itemId: string,
    validationData: ValidateReceiptItemDto,
    productId: string | null,
  ) {
    const updateData: any = {
      ...(productId && { productId }),
      ...(validationData.detectedName && {
        detectedName: validationData.detectedName,
      }),
      ...(validationData.quantity && { quantity: validationData.quantity }),
      ...(validationData.unitPrice !== undefined && {
        unitPrice: validationData.unitPrice,
      }),
      ...(validationData.totalPrice !== undefined && {
        totalPrice: validationData.totalPrice,
      }),
      ...(validationData.confidence !== undefined && {
        confidence: validationData.confidence,
      }),
      ...(validationData.categoryGuess && {
        category: validationData.categoryGuess, // ✅ Mapper categoryGuess → category
      }),
      ...(validationData.validated !== undefined && {
        validated: validationData.validated,
      }),
      // Informations d'inventaire (stockées pour usage ultérieur)
      ...(validationData.expiryDate && {
        expiryDate: new Date(validationData.expiryDate),
      }),
      ...(validationData.storageLocation && {
        storageLocation: validationData.storageLocation,
      }),
      ...(validationData.notes && { notes: validationData.notes }),
    };

    const updatedItem = await this.prisma.receiptItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        product: true,
      },
    });

    return updatedItem;
  }

  /**
   * Mappe un item de base de données vers le DTO de réponse
   */
  private mapItemToResponseDto(item: any): ValidatedReceiptItemResponseDto {
    return {
      id: item.id,
      receiptId: item.receiptId,
      productId: item.productId,
      detectedName: item.detectedName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      confidence: item.confidence,
      validated: item.validated,
      categoryGuess: item.category, 
      expiryDate: item.expiryDate?.toISOString(),
      storageLocation: item.storageLocation,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
