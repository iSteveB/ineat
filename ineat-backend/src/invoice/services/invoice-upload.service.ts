import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

export const INVOICE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const PDF_MIME_TYPES = ['application/pdf', 'application/x-pdf'];

@Injectable()
export class InvoiceUploadService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  validatePdf(file?: Express.Multer.File): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Le fichier PDF est requis');
    }

    if (!PDF_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Seules les factures PDF sont acceptées');
    }

    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Le fichier doit avoir une extension PDF');
    }

    if (file.size > INVOICE_MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('La facture PDF ne doit pas dépasser 5 Mo');
    }
  }

  async uploadInvoicePdf(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    this.validatePdf(file);

    return this.cloudinaryService.uploadRawFile(
      file.buffer,
      `invoices/${userId}`,
      randomUUID(),
    );
  }
}
