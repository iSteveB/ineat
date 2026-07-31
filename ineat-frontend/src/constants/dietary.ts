export const COMMON_ALLERGENS = [
  { id: "gluten", label: "Gluten" },
  { id: "lactose", label: "Lactose" },
  { id: "eggs", label: "Œufs" },
  { id: "nuts", label: "Fruits à coque" },
  { id: "peanuts", label: "Arachides" },
  { id: "soy", label: "Soja" },
  { id: "fish", label: "Poisson" },
  { id: "shellfish", label: "Crustacés" },
  { id: "molluscs", label: "Mollusques" },
  { id: "celery", label: "Céleri" },
  { id: "mustard", label: "Moutarde" },
  { id: "sesame", label: "Sésame" },
  { id: "sulphites", label: "Sulfites" },
  { id: "lupin", label: "Lupin" },
] as const;

export const COMMON_DIETS = [
  { id: "vegetarian", label: "Végétarien" },
  { id: "vegan", label: "Vegan" },
  { id: "pescatarian", label: "Pescétarien" },
  { id: "no-pork", label: "Sans porc" },
  { id: "dairy-free", label: "Sans produit laitier" },
  { id: "gluten-free", label: "Sans gluten" },
] as const;

export const getDietaryLabel = (value: string): string =>
  [...COMMON_ALLERGENS, ...COMMON_DIETS].find((item) => item.id === value)
    ?.label ?? value;
