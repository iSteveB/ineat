import { QuickAddProductDto } from '../inventory/dto/quick-add-product.dto';
// DTOs pour l'authentification
export {
  LoginDto,
  RegisterDto,
} from '../auth/dto/auth.dto';

// DTOs pour l'ajout de produit manuel
export { 
  AddManualProductDto, 
  ProductCreatedResponseDto, 
  NutritionalInfoDto,
  UnitType,
  NutriScore,
  EcoScore,
} from '../inventory/dto/add-manual-product.dto';

// DTOs pour la recherche de produits
export {
  SearchProductsDto,
  ProductSearchResultDto,
  CategoryInfoDto,
} from '../product/dto/search-product.dto';

export { QuickAddProductDto } from '../inventory/dto/quick-add-product.dto';