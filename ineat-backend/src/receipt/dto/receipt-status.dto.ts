import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ===== DTOs DE RÉPONSE =====

/**
 * DTO pour le statut d'un ticket
 */
export class ReceiptStatusDto {
  @ApiProperty({
    description: 'ID du ticket',
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Statut actuel du ticket',
    enum: ['PROCESSING', 'COMPLETED', 'FAILED', 'VALIDATED'],
    example: 'COMPLETED',
  })
  status: string;

  @ApiProperty({
    description: 'URL de l\'image du ticket',
    example: 'https://storage.example.com/receipts/ticket123.jpg',
  })
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'Montant total détecté (si disponible)',
    example: 15.47,
    nullable: true,
  })
  totalAmount?: number | null;

  @ApiPropertyOptional({
    description: 'Date d\'achat détectée (si disponible)',
    format: 'date-time',
    example: '2024-10-22T10:30:00.000Z',
    nullable: true,
  })
  purchaseDate?: string | null;

  @ApiPropertyOptional({
    description: 'Nom du magasin détecté (si disponible)',
    example: 'Carrefour Market',
    nullable: true,
  })
  merchantName?: string | null;

  @ApiPropertyOptional({
    description: 'Lieu du magasin détecté (si disponible)',
    example: 'Paris 15ème',
    nullable: true,
  })
  merchantAddress?: string | null;

  @ApiProperty({
    description: 'Nombre total d\'items détectés',
    example: 5,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Nombre d\'items validés par l\'utilisateur',
    example: 3,
  })
  validatedItems: number;

  @ApiProperty({
    description: 'Pourcentage de progression de la validation',
    example: 60,
    minimum: 0,
    maximum: 100,
  })
  validationProgress: number;

  @ApiProperty({
    description: 'Indique si le ticket est prêt à être ajouté à l\'inventaire',
    example: false,
  })
  readyForInventory: boolean;

  @ApiProperty({
    description: 'Indique si le ticket a déjà été ajouté à l\'inventaire',
    example: false,
  })
  addedToInventory: boolean;

  @ApiProperty({
    description: 'Date de création du ticket',
    format: 'date-time',
    example: '2024-10-22T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    format: 'date-time',
    example: '2024-10-22T10:15:00.000Z',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Temps estimé restant pour le traitement (en secondes, si en cours)',
    example: 30,
    nullable: true,
  })
  estimatedTimeRemaining?: number | null;

  @ApiPropertyOptional({
    description: 'Message d\'erreur si le traitement a échoué',
    example: 'Image de mauvaise qualité, impossible de détecter le texte',
    nullable: true,
  })
  errorMessage?: string | null;
}

/**
 * Réponse API pour le statut d'un ticket
 */
export class ReceiptStatusResponseDto {
  @ApiProperty({
    description: 'Indique si l\'opération a réussi',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Statut détaillé du ticket',
    type: ReceiptStatusDto,
  })
  data: ReceiptStatusDto;

  @ApiProperty({
    description: 'Message informatif sur l\'état',
    example: 'Ticket traité avec succès, prêt pour validation',
  })
  message: string;
}

/**
 * DTO pour les paramètres de route
 */
export class ReceiptStatusParamsDto {
  @ApiProperty({
    description: 'ID du ticket',
    format: 'uuid',
  })
  receiptId: string;
}