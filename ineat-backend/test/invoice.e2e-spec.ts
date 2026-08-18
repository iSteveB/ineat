import { CanActivate, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CapabilityGuard } from '../src/auth/guards/capability.guard';
import { SessionAuthGuard } from '../src/auth/guards/session-auth.guard';
import { InvoiceController } from '../src/invoice/controllers/invoice.controller';
import { InvoiceService } from '../src/invoice/services/invoice.service';

describe('Invoice import (e2e)', () => {
  let app: INestApplication;
  const invoiceService = { importDriveInvoice: jest.fn() };
  const authenticatedGuard: CanActivate = {
    canActivate: (context) => {
      context.switchToHttp().getRequest().user = {
        id: 'user-1',
        email: 'jane@example.com',
        subscriptionPlan: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
      };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [{ provide: InvoiceService, useValue: invoiceService }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue(authenticatedGuard)
      .overrideGuard(CapabilityGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    invoiceService.importDriveInvoice.mockResolvedValue({
      id: 'invoice-1',
      status: 'PROCESSING',
      processingStage: 'QUEUED',
      processingProgress: 20,
      items: [],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a PDF and exposes the queued asynchronous state', async () => {
    const response = await request(app.getHttpServer())
      .post('/invoices/drive-import')
      .attach('file', Buffer.from('%PDF-1.4\nsmoke test'), {
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      })
      .expect(202);

    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({
        id: 'invoice-1',
        status: 'PROCESSING',
        processingStage: 'QUEUED',
        processingProgress: 20,
      }),
      message: 'Facture Drive acceptée pour analyse',
    });
    expect(invoiceService.importDriveInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      expect.objectContaining({
        fieldname: 'file',
        originalname: 'invoice.pdf',
        mimetype: 'application/pdf',
        buffer: expect.any(Buffer),
      }),
    );
  });

  it('rejects a non-PDF before invoking the invoice service', async () => {
    await request(app.getHttpServer())
      .post('/invoices/drive-import')
      .attach('file', Buffer.from('not a PDF'), {
        filename: 'invoice.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    expect(invoiceService.importDriveInvoice).not.toHaveBeenCalled();
  });
});
