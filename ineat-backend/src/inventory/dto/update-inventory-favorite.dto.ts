import { IsBoolean } from 'class-validator';

export class UpdateInventoryFavoriteDto {
  @IsBoolean()
  isFavorite: boolean;
}
