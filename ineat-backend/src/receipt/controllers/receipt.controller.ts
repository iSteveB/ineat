/**
 * Contrôleur Receipt
 *
 * API REST pour la gestion des receipts (tickets de caisse et factures drive)
 * Routes protégées par @RequiresPremium()
 *
 * @module receipt/controllers/receipt.controller
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PremiumGuard } from '../../auth/guards/premium.guard';
import { RequiresPremium } from '../../auth/decorators/requires-premium.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ReceiptService } from '../services/receipt.service';
import { UploadReceiptDto, UpdateReceiptItemDto } from '../dto/receipt.dto';
import { DocumentType } from '../interfaces/ocr-provider.interface';
import { ReceiptStatus } from '@prisma/client';

/**
 * Contrôleur Receipt
 *
 * Toutes les routes sont protégées par :
 * - JwtAuthGuard : Authentification requise
 * - PremiumGuard : Abonnement premium requis
 *
 * @route /receipt
 */
@ApiTags('Receipt')
@ApiBearerAuth()
@Controller('receipt')
@UseGuards(JwtAuthGuard, PremiumGuard)
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  /**
   * Upload un receipt (ticket photo ou facture PDF)
   *
   * @route POST /receipt/upload
   * @access Premium
   */
  @Post('upload')
  @RequiresPremium()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Uploader un receipt (ticket ou facture)',
    description: `
      Upload un ticket de caisse (photo) ou une facture drive (PDF/HTML).
      Le fichier est uploadé sur Cloudinary puis traité par OCR.
      Le traitement OCR se fait en asynchrone.
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Receipt créé et traitement OCR lancé',
    schema: {
      example: {
        success: true,
        data: {
          receiptId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'PROCESSING',
          documentType: 'RECEIPT_IMAGE',
          createdAt: '2025-10-17T10:30:00Z',
        },
        message: 'Ticket uploadé avec succès, traitement en cours',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Fichier invalide (taille, format)',
  })
  @ApiResponse({
    status: 403,
    description: 'Abonnement premium requis',
  })
  async uploadReceipt(
    @CurrentUser() user: any,
    @Body() dto: UploadReceiptDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // Max 10MB
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          // Types autorisés
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|heic|pdf)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Valider le type de document
    if (!Object.values(DocumentType).includes(dto.documentType)) {
      throw new BadRequestException('Type de document invalide');
    }

    // Créer le receipt
    const receipt = await this.receiptService.createReceipt({
      userId: user.id,
      documentType: dto.documentType,
      fileBuffer: file.buffer,
      fileName: file.originalname,
      merchantName: dto.merchantName,
      merchantAddress: dto.merchantAddress,
    });

    return {
      success: true,
      data: {
        receiptId: receipt.id,
        status: receipt.status,
        documentType: receipt.documentType,
        createdAt: receipt.createdAt,
      },
      message: 'Ticket reçu avec succès, traitement en cours',
    };
  }

  /**
   * Récupérer un receipt par ID
   *
   * @route GET /receipt/:id
   * @access Premium
   */
  @Get(':id')
  @RequiresPremium()
  @ApiOperation({
    summary: 'Récupérer un receipt par ID',
    description: "Récupère les détails complets d'un receipt avec ses items",
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt trouvé',
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt non trouvé',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (pas le propriétaire)',
  })
  async getReceipt(@CurrentUser() user: any, @Param('id') receiptId: string) {
    const receipt = await this.receiptService.getReceiptById(
      receiptId,
      user.id,
    );

    return {
      success: true,
      data: receipt,
    };
  }

  /**
   * Récupérer tous les receipts de l'utilisateur
   *
   * @route GET /receipt
   * @access Premium
   */
  @Get()
  @RequiresPremium()
  @ApiOperation({
    summary: "Lister tous les receipts de l'utilisateur",
    description: 'Récupère tous les receipts avec filtres optionnels',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des receipts',
  })
  async getUserReceipts(
    @CurrentUser() user: any,
    @Query('status') status?: ReceiptStatus,
    @Query('documentType') documentType?: DocumentType,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const receipts = await this.receiptService.getUserReceipts(user.id, {
      status,
      documentType,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });

    return {
      success: true,
      data: receipts,
      pagination: {
        limit: limit || 50,
        offset: offset || 0,
        total: receipts.length,
      },
    };
  }

  /**
   * Mettre à jour un item de receipt
   *
   * @route PATCH /receipt/:receiptId/items/:itemId
   * @access Premium
   */
  @Patch(':receiptId/items/:itemId')
  @RequiresPremium()
  @ApiOperation({
    summary: 'Corriger/valider un item de receipt',
    description: `
      Permet à l'utilisateur de corriger les informations détectées par l'OCR :
      - Nom du produit
      - Quantité
      - Prix
      - Association avec un produit existant
      - Marquage comme validé
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Item mis à jour',
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt ou item non trouvé',
  })
  async updateReceiptItem(
    @CurrentUser() user: any,
    @Param('receiptId') receiptId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateReceiptItemDto,
  ) {
    const updatedItem = await this.receiptService.updateReceiptItem(
      receiptId,
      itemId,
      user.id,
      dto,
    );

    return {
      success: true,
      data: updatedItem,
      message: 'Item mis à jour avec succès',
    };
  }

  /**
   * Valider un receipt
   *
   * @route POST /receipt/:id/validate
   * @access Premium
   */
  @Post(':id/validate')
  @RequiresPremium()
  @ApiOperation({
    summary: 'Valider un receipt',
    description: `
      Marque le receipt comme validé et prêt pour l'ajout à l'inventaire.
      Le receipt doit être en statut COMPLETED.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt validé',
  })
  @ApiResponse({
    status: 400,
    description: 'Receipt pas en statut COMPLETED',
  })
  async validateReceipt(
    @CurrentUser() user: any,
    @Param('id') receiptId: string,
  ) {
    const receipt = await this.receiptService.validateReceipt(
      receiptId,
      user.id,
    );

    return {
      success: true,
      data: receipt,
      message: 'Receipt validé avec succès',
    };
  }

  /**
   * Supprimer un receipt
   *
   * @route DELETE /receipt/:id
   * @access Premium
   */
  @Delete(':id')
  @RequiresPremium()
  @ApiOperation({
    summary: 'Supprimer un receipt',
    description: `
      Supprime le receipt de la base de données et le fichier de Cloudinary.
      Cette action est irréversible.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt supprimé',
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt non trouvé',
  })
  async deleteReceipt(
    @CurrentUser() user: any,
    @Param('id') receiptId: string,
  ) {
    await this.receiptService.deleteReceipt(receiptId, user.id);

    return {
      success: true,
      message: 'Receipt supprimé avec succès',
    };
  }

  /**
   * Obtenir les statistiques des receipts
   *
   * @route GET /receipt/stats
   * @access Premium
   */
  @Get('stats/summary')
  @RequiresPremium()
  @ApiOperation({
    summary: 'Statistiques des receipts',
    description: 'Nombre de receipts par statut',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées',
  })
  async getReceiptStats(@CurrentUser() user: any) {
    const stats = await this.receiptService.getReceiptStats(user.id);

    return {
      success: true,
      data: stats,
    };
  }
}
