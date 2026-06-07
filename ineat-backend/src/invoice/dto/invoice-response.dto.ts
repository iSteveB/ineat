import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../../../prisma/generated/prisma/client';

class InvoiceItemProductCategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  icon?: string | null;
}

class InvoiceItemProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  brand?: string | null;

  @ApiPropertyOptional()
  barcode?: string | null;

  @ApiPropertyOptional({ type: InvoiceItemProductCategoryResponseDto })
  category?: InvoiceItemProductCategoryResponseDto | null;
}

export class InvoiceItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  invoiceId: string;

  @ApiPropertyOptional()
  productId?: string | null;

  @ApiProperty()
  detectedName: string;

  @ApiProperty()
  quantity: number;

  @ApiPropertyOptional()
  unitPrice?: number | null;

  @ApiPropertyOptional()
  totalPrice?: number | null;

  @ApiProperty()
  confidence: number;

  @ApiProperty()
  validated: boolean;

  @ApiPropertyOptional()
  productCode?: string | null;

  @ApiPropertyOptional()
  category?: string | null;

  @ApiPropertyOptional()
  discount?: number | null;

  @ApiPropertyOptional()
  selectedEan?: string | null;

  @ApiProperty({ type: [String] })
  suggestedEans: string[];

  @ApiPropertyOptional({ type: InvoiceItemProductResponseDto })
  product?: InvoiceItemProductResponseDto | null;

  @ApiPropertyOptional()
  expiryDate?: string | null;

  @ApiPropertyOptional()
  storageLocation?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class InvoiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  pdfUrl: string;

  @ApiProperty({ enum: InvoiceStatus })
  status: InvoiceStatus;

  @ApiPropertyOptional()
  merchantName?: string | null;

  @ApiPropertyOptional()
  totalAmount?: number | null;

  @ApiPropertyOptional()
  purchaseDate?: string | null;

  @ApiPropertyOptional()
  invoiceNumber?: string | null;

  @ApiPropertyOptional()
  orderNumber?: string | null;

  @ApiPropertyOptional()
  analysisProvider?: string | null;

  @ApiPropertyOptional()
  analysisConfidence?: number | null;

  @ApiPropertyOptional()
  processingTime?: number | null;

  @ApiPropertyOptional()
  errorMessage?: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ type: [InvoiceItemResponseDto] })
  items: InvoiceItemResponseDto[];
}

export class DriveImportResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: InvoiceResponseDto })
  data: InvoiceResponseDto;

  @ApiProperty()
  message: string;
}
