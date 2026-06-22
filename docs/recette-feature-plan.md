# Feature recette IA

## Objectif

Permettre a un utilisateur de generer des recettes a partir de son inventaire, en choisissant les types de recettes souhaites, le nombre de personnes, et le niveau de largesse autorise. Les recettes gardees sont sauvegardees dans `Mes recettes` avec une image illustrative generee au moment de l'enregistrement.

## Decisions produit validees

- L'utilisateur choisit une ou plusieurs categories : entree, plat, dessert.
- Une seule recette est generee par categorie cochee.
- Si entree, plat et dessert sont coches, l'API retourne 3 recettes.
- L'utilisateur renseigne le nombre de personnes.
- Deux modes de generation existent :
  - strict : uniquement les ingredients de l'inventaire et les basiques.
  - avec largesse : autorise de 1 a 5 ingredients supplementaires via un input range.
- Les quantites restantes ne sont pas gerees pour l'instant. Si un article est present dans l'inventaire, il est considere disponible.
- Les restrictions alimentaires sont recuperees depuis le profil utilisateur.
- Le materiel de cuisine n'est pas pris en compte dans le MVP.
- Pas de conseils, variantes, notes, modification ou informations nutritionnelles dans le MVP.
- L'image n'est pas generee lors de la generation initiale.
- L'image est generee uniquement quand l'utilisateur garde une recette.
- L'image est illustrative et generee a partir du titre de la recette.
- Une recette gardee est sauvegardee dans `Mes recettes`.
- Une recette sauvegardee expose un bouton `Fait`.
- Le bouton `Fait` decremente l'inventaire apres confirmation.
- Limite MVP : 5 generations de recettes par jour et par utilisateur.

## Ingredients basiques MVP

Les ingredients suivants ne comptent jamais comme ingredients hors inventaire :

- sel
- poivre
- eau
- huile neutre

`Huile d'olive` est un ingredient normal. Elle doit etre presente dans l'inventaire en mode strict, ou compte comme ingredient supplementaire en mode avec largesse.

## Regles metier

### Generation

- Une generation correspond a un clic sur `Generer`, meme si plusieurs recettes sont retournees.
- Une generation valide compte dans la limite quotidienne.
- Un drop utilisateur ne rembourse pas la generation.
- Une sauvegarde de recette ne consomme pas de generation supplementaire.
- Une image generee a la sauvegarde ne compte pas comme generation de recette, mais pourra etre suivie separement cote cout.
- Un echec technique ne doit pas consommer la limite.
- Une reponse valide indiquant qu'aucune recette n'est possible peut consommer la limite.

### Validation locale avant appel IA

- En mode strict, il faut au moins 2 ingredients non-basiques dans l'inventaire.
- En mode avec largesse, il faut au moins 1 ingredient non-basique dans l'inventaire.
- Si la validation echoue, l'utilisateur voit un message clair et aucun appel IA n'est effectue.

### Contraintes IA

L'IA doit recevoir :

- categories demandees
- nombre de personnes
- mode strict ou avec largesse
- nombre maximum d'ingredients supplementaires autorises
- inventaire utilisateur
- restrictions alimentaires utilisateur
- liste des basiques autorises
- format JSON attendu

L'IA doit respecter les contraintes suivantes :

- Ne jamais utiliser d'ingredient interdit par les restrictions alimentaires.
- En mode strict, ne jamais utiliser d'ingredient hors inventaire sauf basiques.
- En mode avec largesse, ne jamais depasser le nombre d'ingredients supplementaires choisi.
- Les basiques ne comptent jamais dans la limite d'ingredients supplementaires.
- Retourner exactement une recette par categorie demandee.
- Retourner une erreur exploitable plutot qu'une recette bancale si la demande est impossible.

## Experience utilisateur

### Ecran de generation

Champs attendus :

- cases a cocher : entree, plat, dessert
- nombre de personnes
- mode : strict / avec largesse
- range 1 a 5 visible uniquement en mode avec largesse
- rappel de la limite restante du jour
- bouton generer

Etats attendus :

- aucun type selectionne
- inventaire insuffisant
- limite quotidienne atteinte
- chargement generation
- erreur IA ou reseau

### Resultats de generation

Chaque recette est affichee en carte compacte :

- titre
- type
- temps de preparation
- temps de cuisson
- difficulte
- nombre de personnes
- ingredients principaux
- ingredients manquants si mode avec largesse
- actions : voir, garder, drop

Le detail complet est consultable avant sauvegarde afin que l'utilisateur ne garde pas une recette a l'aveugle.

### Sauvegarde

Quand l'utilisateur garde une recette :

- l'image illustrative est generee a partir du titre
- l'image est stockee
- la recette complete est sauvegardee dans le book utilisateur
- la recette apparait dans `Mes recettes`

### Recette sauvegardee

Une recette sauvegardee affiche :

- image
- titre
- type
- nombre de personnes
- temps de preparation
- temps de cuisson
- difficulte
- ingredients
- ingredients manquants eventuels
- etapes
- bouton `Fait`

### Bouton Fait

Au clic sur `Fait` :

- afficher une confirmation
- lister les ingredients de l'inventaire qui seront retires
- ne pas retirer les basiques
- ne pas retirer les ingredients manquants de la recette
- ne pas retirer les ingredients absents de l'inventaire au moment du clic
- apres confirmation, supprimer les ingredients concernes de l'inventaire

## Donnees a prevoir

Le schema existant contient deja `Recipe`, `RecipeIngredient` et `UsageQuota`. Il faudra verifier s'il suffit ou s'il doit evoluer.

Champs utiles pour une recette IA sauvegardee :

- id
- userId
- title/name
- type : entree, plat, dessert
- servings
- preparationTime
- cookingTime
- difficulty
- ingredients
- basicIngredients
- missingIngredients
- instructions/steps
- imageUrl
- source : ai
- createdAt
- updatedAt
- doneAt optionnel

Points de vigilance :

- Le modele `Recipe` existant ne semble pas encore lie a `User`.
- `RecipeIngredient` reference actuellement un `Product`, ce qui peut etre limitant pour les ingredients manquants ou basiques.
- Les recettes generees non sauvegardees peuvent rester ephemeres cote frontend ou etre persistees temporairement selon l'implementation choisie.

## Decoupage de developpement propose

1. Backend : modele de donnees et book de recettes utilisateur.
2. Backend : service IA de generation structuree avec validation stricte.
3. Backend : quota 5 generations par jour.
4. Backend : sauvegarde avec generation d'image et stockage.
5. Backend : action `Fait` et decrement inventaire.
6. Frontend : formulaire de generation et cartes de resultats.
7. Frontend : detail avant sauvegarde et book `Mes recettes`.
8. Frontend : action `Fait` avec confirmation.
9. Tests : unites, integration API et cas limites UI.

## Questions non bloquantes pour plus tard

- Faut-il suivre un quota separe pour les generations d'images ?
- Faut-il historiser les recettes dropees pour eviter de reproposer la meme chose ?
- Faut-il un statut `DONE` sur les recettes ou seulement un `doneAt` ?
- Faut-il autoriser plusieurs sauvegardes d'une meme recette generee ?
- Faut-il utiliser les dates de peremption pour prioriser certains ingredients dans une version future ?
