import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CapabilityGuard } from '../../auth/guards/capability.guard';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { RequiresCapability } from '../../auth/decorators/requires-capability.decorator';
import {
  DriveImportResponseDto,
  InvoiceResponseDto,
} from '../dto/invoice-response.dto';
import { INVOICE_MAX_FILE_SIZE_BYTES } from '../services/invoice-upload.service';
import { InvoiceService, InvoiceUser } from '../services/invoice.service';

interface AuthenticatedRequest extends Request {
  user: InvoiceUser & {
    email: string;
  };
}

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard, CapabilityGuard)
@RequiresCapability('canImportDrive')
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('drive-import')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: INVOICE_MAX_FILE_SIZE_BYTES,
      },
      fileFilter: (_req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          callback(
            new BadRequestException('Seules les factures PDF sont acceptées'),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Importer une facture Drive PDF',
    description:
      "Upload une facture Drive PDF, lance l'analyse mock et prépare les lignes à valider.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Facture importée et analysée avec succès',
    type: DriveImportResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Fichier absent, invalide, trop lourd ou analyse impossible',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Accès Premium/Trial ou quota Drive insuffisant',
  })
  async importDriveInvoice(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<DriveImportResponseDto> {
    const invoice = await this.invoiceService.importDriveInvoice(
      req.user,
      file as Express.Multer.File,
    );

    return {
      success: true,
      data: invoice,
      message: 'Facture Drive importée et analysée avec succès',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Récupérer une facture importée',
    description:
      "Retourne une facture importée et ses lignes détectées pour l'utilisateur connecté.",
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la facture',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Facture récupérée avec succès',
    type: InvoiceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Facture non trouvée',
  })
  async getInvoice(
    @Req() req: AuthenticatedRequest,
    @Param('id') invoiceId: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.getInvoiceForUser(req.user.id, invoiceId);
  }
}
