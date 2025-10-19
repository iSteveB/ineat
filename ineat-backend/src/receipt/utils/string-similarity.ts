/**
 * Utilitaires de similarité de chaînes
 * 
 * Fonctions utilitaires pour calculer la similarité entre chaînes de caractères
 * utilisées pour le matching de produits
 * 
 * @module receipt/utils/string-similarity
 */

/**
 * Calculer la distance de Levenshtein entre deux chaînes
 * 
 * La distance de Levenshtein mesure le nombre minimum d'opérations
 * (insertion, suppression, substitution) nécessaires pour transformer
 * une chaîne en une autre.
 * 
 * @param str1 - Première chaîne
 * @param str2 - Deuxième chaîne
 * @returns Distance de Levenshtein (nombre d'opérations)
 * 
 * @example
 * ```typescript
 * levenshteinDistance('chat', 'chien'); // 3
 * levenshteinDistance('pomme', 'pommes'); // 1
 * ```
 */
export function levenshteinDistance(str1: string, str2: string): number {
  // Optimisation : si une chaîne est vide
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  // Optimisation : si les chaînes sont identiques
  if (str1 === str2) return 0;

  const matrix: number[][] = [];

  // Initialiser la première ligne et colonne
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Remplir la matrice
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // suppression
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculer le pourcentage de similarité entre deux chaînes
 * 
 * @param str1 - Première chaîne
 * @param str2 - Deuxième chaîne
 * @returns Similarité entre 0 et 1 (1 = identique)
 * 
 * @example
 * ```typescript
 * calculateSimilarity('pomme', 'pommes'); // 0.83
 * calculateSimilarity('chat', 'chien'); // 0.4
 * ```
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  if (maxLength === 0) return 1;
  
  return 1 - (distance / maxLength);
}

/**
 * Normaliser une chaîne pour la comparaison
 * 
 * Supprime les accents, convertit en minuscules, normalise les espaces
 * et supprime la ponctuation
 * 
 * @param str - Chaîne à normaliser
 * @returns Chaîne normalisée
 * 
 * @example
 * ```typescript
 * normalizeString('Café "Très" BON!!!'); // 'cafe tres bon'
 * normalizeString('Pommes de terre'); // 'pommes de terre'
 * ```
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD') // Décomposer les caractères avec accents
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^\w\s]/g, ' ') // Remplacer ponctuation par espaces
    .replace(/\s+/g, ' ') // Normaliser les espaces multiples
    .trim();
}

/**
 * Calculer la similarité Jaccard entre deux ensembles de mots
 * 
 * La similarité Jaccard mesure la taille de l'intersection divisée
 * par la taille de l'union de deux ensembles.
 * 
 * @param str1 - Première chaîne
 * @param str2 - Deuxième chaîne
 * @returns Similarité Jaccard entre 0 et 1
 * 
 * @example
 * ```typescript
 * jaccardSimilarity('pommes de terre', 'pommes douces'); // 0.33
 * ```
 */
export function jaccardSimilarity(str1: string, str2: string): number {
  const words1 = new Set(normalizeString(str1).split(/\s+/));
  const words2 = new Set(normalizeString(str2).split(/\s+/));

  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 1;
  
  return intersection.size / union.size;
}

/**
 * Calculer la similarité cosinus entre deux chaînes
 * 
 * Traite les chaînes comme des vecteurs de mots et calcule
 * la similarité cosinus entre ces vecteurs.
 * 
 * @param str1 - Première chaîne
 * @param str2 - Deuxième chaîne
 * @returns Similarité cosinus entre 0 et 1
 */
export function cosineSimilarity(str1: string, str2: string): number {
  const words1 = normalizeString(str1).split(/\s+/);
  const words2 = normalizeString(str2).split(/\s+/);

  // Créer un vocabulaire unique
  const vocabulary = new Set([...words1, ...words2]);
  
  if (vocabulary.size === 0) return 1;

  // Créer les vecteurs de fréquence
  const vector1 = Array.from(vocabulary).map(word => 
    words1.filter(w => w === word).length
  );
  
  const vector2 = Array.from(vocabulary).map(word => 
    words2.filter(w => w === word).length
  );

  // Calculer le produit scalaire
  const dotProduct = vector1.reduce((sum, val, i) => sum + (val * vector2[i]), 0);

  // Calculer les normes
  const norm1 = Math.sqrt(vector1.reduce((sum, val) => sum + (val * val), 0));
  const norm2 = Math.sqrt(vector2.reduce((sum, val) => sum + (val * val), 0));

  if (norm1 === 0 || norm2 === 0) return 0;

  return dotProduct / (norm1 * norm2);
}

/**
 * Vérifier si une chaîne contient une autre (fuzzy)
 * 
 * Vérifie si `needle` est contenu dans `haystack` avec une tolérance
 * pour les fautes de frappe
 * 
 * @param haystack - Chaîne dans laquelle chercher
 * @param needle - Chaîne à chercher
 * @param tolerance - Tolérance pour les erreurs (0-1)
 * @returns true si trouvé avec la tolérance donnée
 */
export function fuzzyContains(haystack: string, needle: string, tolerance: number = 0.8): boolean {
  const normalizedHaystack = normalizeString(haystack);
  const normalizedNeedle = normalizeString(needle);

  // Vérification exacte d'abord
  if (normalizedHaystack.includes(normalizedNeedle)) {
    return true;
  }

  // Vérification floue par mots
  const haystackWords = normalizedHaystack.split(/\s+/);
  const needleWords = normalizedNeedle.split(/\s+/);

  for (const needleWord of needleWords) {
    let found = false;
    
    for (const haystackWord of haystackWords) {
      const similarity = calculateSimilarity(needleWord, haystackWord);
      if (similarity >= tolerance) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      return false;
    }
  }

  return true;
}

/**
 * Extraire les sous-chaînes communes les plus longues
 * 
 * @param str1 - Première chaîne
 * @param str2 - Deuxième chaîne
 * @returns Array des sous-chaînes communes
 */
export function findCommonSubstrings(str1: string, str2: string): string[] {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  const commonSubstrings: string[] = [];
  
  for (let i = 0; i < normalized1.length; i++) {
    for (let j = i + 2; j <= normalized1.length; j++) { // Au moins 2 caractères
      const substring = normalized1.substring(i, j);
      
      if (normalized2.includes(substring) && !commonSubstrings.includes(substring)) {
        commonSubstrings.push(substring);
      }
    }
  }
  
  // Trier par longueur décroissante
  return commonSubstrings.sort((a, b) => b.length - a.length);
}

/**
 * Calculer un score de similarité composite
 * 
 * Combine plusieurs métriques de similarité pour un score plus robuste
 * 
 * @param str1 - Première chaîne
 * @param str2 - Deuxième chaîne
 * @returns Score composite entre 0 et 1
 */
export function compositeSimilarity(str1: string, str2: string): number {
  const levenshtein = calculateSimilarity(str1, str2);
  const jaccard = jaccardSimilarity(str1, str2);
  const cosine = cosineSimilarity(str1, str2);
  
  // Moyenne pondérée des différentes métriques
  return (levenshtein * 0.4) + (jaccard * 0.3) + (cosine * 0.3);
}

/**
 * Créer une signature phonétique simplifiée (Soundex français)
 * 
 * Utile pour matcher des mots qui se prononcent de manière similaire
 * 
 * @param str - Chaîne à encoder
 * @returns Code phonétique
 */
export function frenchSoundex(str: string): string {
  let normalized = normalizeString(str).replace(/\s+/g, '');
  
  if (normalized.length === 0) return '';
  
  // Règles de transformation pour le français
  normalized = normalized
    .replace(/ph/g, 'f')
    .replace(/ch/g, 'k')
    .replace(/qu/g, 'k')
    .replace(/gu/g, 'g')
    .replace(/eau/g, 'o')
    .replace(/au/g, 'o')
    .replace(/ou/g, 'u')
    .replace(/ai/g, 'e')
    .replace(/ei/g, 'e')
    .replace(/[aeiouy]/g, '0')
    .replace(/[bpfv]/g, '1')
    .replace(/[cgjkqxz]/g, '2')
    .replace(/[dt]/g, '3')
    .replace(/[l]/g, '4')
    .replace(/[mn]/g, '5')
    .replace(/[rs]/g, '6')
    .replace(/[h]/g, '')
    .replace(/0+/g, '0')
    .replace(/(.)\1+/g, '$1'); // Supprimer les doublons
  
  // Garder la première lettre + 3 chiffres max
  const firstLetter = str.charAt(0).toUpperCase();
  const code = normalized.substring(1).replace(/[^0-9]/g, '').substring(0, 3);
  
  return firstLetter + code.padEnd(3, '0');
}

/**
 * Comparer deux chaînes en utilisant leur signature phonétique
 * 
 * @param str1 - Première chaîne
 * @param str2 - Deuxième chaîne
 * @returns true si les signatures phonétiques correspondent
 */
export function phoneticMatch(str1: string, str2: string): boolean {
  return frenchSoundex(str1) === frenchSoundex(str2);
}