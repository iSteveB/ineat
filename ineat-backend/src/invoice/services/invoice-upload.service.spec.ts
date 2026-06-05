import { BadRequestException } from '@nestjs/common';
import {
  INVOICE_MAX_FILE_SIZE_BYTES,
  InvoiceUploadService,
} from './invoice-upload.service';

describe('InvoiceUploadService', () => {
  const cloudinaryService = {
    uploadRawFile: jest.fn(),
  };

  let service: InvoiceUploadService;

  const createFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File =>
    ({
      originalname: 'facture.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('%PDF-1.4'),
      ...overrides,
    }) as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InvoiceUploadService(cloudinaryService as any);
  });

  it('accepte et upload un PDF valide', async () => {
    cloudinaryService.uploadRawFile.mockResolvedValue(
      'https://res.cloudinary.com/demo/raw/upload/invoices/user-1/file.pdf',
    );

    const result = await service.uploadInvoicePdf('user-1', createFile());

    expect(cloudinaryService.uploadRawFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      'invoices/user-1',
      expect.any(String),
    );
    expect(result).toContain('https://res.cloudinary.com');
  });

  it('refuse un fichier absent', () => {
    expect(() => service.validatePdf(undefined)).toThrow(BadRequestException);
  });

  it('refuse un fichier non PDF', () => {
    expect(() =>
      service.validatePdf(
        createFile({
          originalname: 'facture.png',
          mimetype: 'image/png',
        }),
      ),
    ).toThrow('Seules les factures PDF sont acceptées');
  });

  it('refuse un PDF de plus de 5 Mo', () => {
    expect(() =>
      service.validatePdf(
        createFile({
          size: INVOICE_MAX_FILE_SIZE_BYTES + 1,
        }),
      ),
    ).toThrow('La facture PDF ne doit pas dépasser 5 Mo');
  });
});
