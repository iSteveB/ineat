import { z } from 'zod';

// ===== EXPORTS ORGANISÉS PAR DOMAINE =====

// ===== BASE - Enums et types fondamentaux =====
export {
	// Enums
	ProfileTypeSchema,
	SubscriptionSchema,
	UnitTypeSchema,
	NutriScoreSchema,
	EcoscoreSchema,
	NovascoreSchema,
	ExpiryStatusSchema,
	RecipeDifficultySchema,
	NotificationTypeSchema,
	DietTypeSchema,

	// Types
	type ProfileType,
	type Subscription,
	type UnitType,
	type NutriScore,
	type Ecoscore,
	type Novascore,
	type ExpiryStatus,
	type RecipeDifficulty,
	type NotificationType,
	type DietType,

	// Schémas de base réutilisables
	UuidSchema,
	EmailSchema,
	DateStringSchema,
	DateInputSchema,
	PasswordSchema,
	PriceSchema,
	QuantitySchema,
	ShortTextSchema,
	MediumTextSchema,
	LongTextSchema,

	// Utilitaires
	calculateExpiryStatus,
	nutriscoreToNumber,
	numberToNutriScore,
} from './base';

// ===== COMMON - Schémas génériques et utilitaires =====
export {
	// Pagination
	PaginationParamsSchema,
	PaginatedResponseSchema,
	type PaginationParams,
	type PaginatedResponse,

	// Réponses API
	ApiSuccessResponseSchema,
	ApiErrorResponseSchema,
	ApiResponseSchema,
	type ApiSuccessResponse,
	type ApiErrorResponse,
	type ApiResponse,

	// Filtrage
	DateRangeFilterSchema,
	SearchFilterSchema,
	type DateRangeFilter,
	type SearchFilter,

	// Fichiers
	FileMetadataSchema,
	type FileMetadata,

	// Audit
	TimestampsSchema,
	AuditSchema,
	type Timestamps,
	type Audit,

	// Notifications UI
	ToastSchema,
	type Toast,

	// Préférences
	DietaryPreferencesSchema,
	UiPreferencesSchema,
	type DietaryPreferences,
	type UiPreferences,

	// Utilitaires de validation
	NonEmptyStringSchema,
	NonEmptyArraySchema,
	FutureDateSchema,
	PastDateSchema,
	OptionalOrEmptySchema,

	// Constantes
	COMMON_STORAGE_LOCATIONS,
	COMMON_CURRENCIES,
	DATE_FORMATS,
} from './common';

// ===== USER - Utilisateurs et authentification =====
export {
	// Utilisateur
	UserSchema,
	PublicUserSchema,
	type User,
	type PublicUser,

	// Authentification
	LoginCredentialsSchema,
	RegisterDataSchema,
	RegisterFormSchema,
	type LoginCredentials,
	type RegisterData,
	type RegisterFormData,

	// Réponses auth
	AuthResponseSchema,
	AuthCheckResponseSchema,
	type AuthResponse,
	type AuthCheckResponse,

	// Récupération mot de passe
	ForgotPasswordSchema,
	ResetPasswordSchema,
	type ForgotPasswordData,
	type ResetPasswordData,

	// Mise à jour profil
	UpdateProfileSchema,
	UpdateDietaryPreferencesSchema,
	UpdateUiPreferencesSchema,
	type UpdateProfileData,
	type UpdateDietaryPreferencesData,
	type UpdateUiPreferencesData,

	// Sécurité
	ChangePasswordSchema,
	type ChangePasswordData,

	// Abonnement
	UpgradeSubscriptionSchema,
	type UpgradeSubscriptionData,

	// Onboarding
	OnboardingDataSchema,
	type OnboardingData,

	// Validation
	EmailValidationSchema,
	type EmailValidationData,

	// Suppression compte
	DeleteAccountSchema,
	type DeleteAccountData,

	// Utilitaires
	isPremiumUser,
	isAdminUser,
	getUserFullName,
	getUserInitials,
	hasCompleteProfile,
} from './user';

// ===== PRODUCT - Produits et catégories =====
export {
	// Catégories
	CategorySchema,
	CategoryWithChildrenSchema,
	type Category,
	type CategoryWithChildren,

	// Informations nutritionnelles
	NutritionalInfoSchema,
	type NutritionalInfo,

	// Produits
	ProductSchema,
	ProductSummarySchema,
	type Product,
	type ProductSummary,

	// CRUD Produits
	CreateProductSchema,
	UpdateProductSchema,
	type CreateProductData,
	type UpdateProductData,

	// Recherche et filtrage
	ProductFiltersSchema,
	OpenFoodFactsSearchSchema,
	type ProductFilters,
	type OpenFoodFactsSearchParams,

	// Réponses API
	ProductCreatedResponseSchema,
	ProductListResponseSchema,
	ProductDetailResponseSchema,
	CategoryListResponseSchema,
	type ProductCreatedResponse,
	type ProductListResponse,
	type ProductDetailResponse,
	type CategoryListResponse,

	// OpenFoodFacts
	OpenFoodFactsProductSchema,
	OpenFoodFactsSearchResponseSchema,
	type OpenFoodFactsProduct,
	type OpenFoodFactsSearchResponse,

	// Utilitaires
	mapOpenFoodFactsProduct,
	suggestUnitType,
	validateBarcode,
	generateCategorySlug,
} from './product';

// ===== INVENTORY - Gestion des stocks =====
export {
	// Inventaire
	InventoryItemSchema,
	InventoryItemWithStatusSchema,
	type InventoryItem,
	type InventoryItemWithStatus,

	// Ajout à l'inventaire
	AddInventoryItemSchema,
	AddExistingProductToInventorySchema,
	type AddInventoryItemData,
	type AddExistingProductToInventoryData,

	// Mise à jour inventaire
	UpdateInventoryItemSchema,
	ConsumeInventoryItemSchema,
	type UpdateInventoryItemData,
	type ConsumeInventoryItemData,

	// Filtrage
	InventoryFiltersSchema,
	StorageLocationFilterSchema,
	type InventoryFilters,
	type StorageLocationFilter,

	// Statistiques
	InventoryStatsSchema,
	type InventoryStats,

	// Réponses API classiques
	InventoryItemResponseSchema,
	InventoryListResponseSchema,
	InventoryStatsResponseSchema,
	type InventoryItemResponse,
	type InventoryListResponse,
	type InventoryStatsResponse,

	// Réponses API enrichies avec budget
	InventoryItemWithBudgetSchema,
	InventoryItemWithBudgetResponseSchema,
	type InventoryItemWithBudget,
	type InventoryItemWithBudgetResponse,
	type AddProductResponse,
	hasBudgetImpact,
	extractNotificationData,

	// Import OCR
	TicketImportSchema,
	TicketAnalysisResultSchema,
	type TicketImportData,
	type TicketAnalysisResult,

	// Utilitaires
	addExpiryStatusToItem,
	filterInventoryItems,
	calculateInventoryStats,
} from './inventory';

// ===== BUDGET - Gestion budgétaire =====
export {
	// Budget
	BudgetSchema,
	type Budget,

	// Dépenses
	ExpenseSchema,
	type Expense,

	// Création
	CreateBudgetSchema,
	CreateExpenseSchema,
	type CreateBudgetData,
	type CreateExpenseData,

	// Mise à jour
	UpdateBudgetSchema,
	UpdateExpenseSchema,
	type UpdateBudgetData,
	type UpdateExpenseData,

	// Filtrage
	BudgetFiltersSchema,
	ExpenseFiltersSchema,
	type BudgetFilters,
	type ExpenseFilters,

	// Statistiques
	BudgetStatsSchema,
	BudgetComparisonSchema,
	type BudgetStats,
	type BudgetComparison,

	// Alertes
	BudgetAlertSchema,
	type BudgetAlert,

	// Impact budgétaire
	BudgetImpactSchema,
	type BudgetImpact,
	wasExpenseCreated,
	hasBudgetInfo,
	formatBudgetMessage,
	getBudgetNotificationType,

	// Réponses API
	BudgetResponseSchema,
	BudgetListResponseSchema,
	ExpenseResponseSchema,
	ExpenseListResponseSchema,
	BudgetStatsResponseSchema,
	BudgetComparisonResponseSchema,
	BudgetAlertsResponseSchema,
	type BudgetResponse,
	type BudgetListResponse,
	type ExpenseResponse,
	type ExpenseListResponse,
	type BudgetStatsResponse,
	type BudgetComparisonResponse,
	type BudgetAlertsResponse,

	// Utilitaires
	calculateBudgetStats,
	shouldTriggerAlert,
	generateBudgetSuggestions,
	validateExpenseForBudget,
} from './budget';

// ===== RECIPE - Gestion des recettes =====
export {
	// Ingrédients de recette
	RecipeIngredientSchema,
	type RecipeIngredient,

	// Recettes
	RecipeSchema,
	RecipeSummarySchema,
	type Recipe,
	type RecipeSummary,

	// Création
	CreateRecipeIngredientSchema,
	CreateRecipeSchema,
	type CreateRecipeIngredientData,
	type CreateRecipeData,

	// Mise à jour
	UpdateRecipeSchema,
	UpdateRecipeIngredientSchema,
	type UpdateRecipeData,
	type UpdateRecipeIngredientData,

	// Génération IA
	RecipeGenerationRequestSchema,
	GeneratedRecipeSchema,
	type RecipeGenerationRequest,
	type GeneratedRecipe,

	// Filtrage
	RecipeFiltersSchema,
	type RecipeFilters,

	// Réponses API
	RecipeResponseSchema,
	RecipeListResponseSchema,
	GeneratedRecipesResponseSchema,
	RecipeSuggestionsResponseSchema,
	type RecipeResponse,
	type RecipeListResponse,
	type GeneratedRecipesResponse,
	type RecipeSuggestionsResponse,

	// Utilitaires
	calculateTotalTime,
	isRecipeCompatibleWithDiet,
	calculateRecipeMatchScore,
	findMissingIngredients,
	generateAutoTags,
	estimateRecipeCost,
	validateRecipe,
} from './recipe';

// ===== UTILITAIRES GLOBAUX =====

/**
 * Valide qu'un objet correspond à un schéma Zod donné
 */
export const validateSchema = <T>(
	schema: z.ZodSchema<T>,
	data: unknown
): { success: true; data: T } | { success: false; error: string } => {
	try {
		const result = schema.parse(data);
		return { success: true, data: result };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: error.errors.map((e) => e.message).join(', '),
			};
		}
		return {
			success: false,
			error: 'Erreur de validation inconnue',
		};
	}
};

/**
 * Valide de manière sûre sans lever d'exception
 */
export const safeValidate = <T>(
	schema: z.ZodSchema<T>,
	data: unknown
): T | null => {
	try {
		return schema.parse(data);
	} catch {
		return null;
	}
};

// ===== CONSTANTES GLOBALES =====

export const VALIDATION_MESSAGES = {
	REQUIRED: 'Ce champ est obligatoire',
	INVALID_EMAIL: 'Adresse email invalide',
	INVALID_UUID: 'Identifiant invalide',
	INVALID_DATE: 'Format de date invalide',
	INVALID_URL: 'URL invalide',
	TOO_SHORT: 'Ce champ est trop court',
	TOO_LONG: 'Ce champ est trop long',
	INVALID_NUMBER: 'Nombre invalide',
	NEGATIVE_NUMBER: 'Le nombre ne peut pas être négatif',
} as const;

export const SCHEMA_DEFAULTS = {
	PAGINATION: {
		page: 1,
		pageSize: 10,
		sortOrder: 'asc' as const,
	},
	BUDGET: {
		isActive: true,
	},
	RECIPE: {
		difficulty: 'MEDIUM' as const,
		servings: 4,
		isPublic: false,
	},
	USER: {
		subscription: 'FREE' as const,
	},
} as const;
