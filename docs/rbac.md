# RBAC InEat

## Objectif

Definir le modele d'acces InEat autour de plans produit (`FREE`, `TRIAL`,
`PREMIUM`) et d'un role d'administration separe (`USER`, `ADMIN`).

Cette specification est la source de verite produit et technique pour la future
implementation RBAC.

## Synthese

- `ADMIN` est un role separe, pas un plan d'abonnement.
- Les droits produit dependent de `subscriptionPlan` et
  `subscriptionStatus`.
- Les droits admin dependent uniquement de `role`.
- `TRIAL` donne les memes droits produit que `PREMIUM` pendant 3 jours.
- Un `TRIAL` expire reste marque `TRIAL`, mais applique les droits effectifs de
  `FREE`.
- `FREE` garde les fonctionnalites de base, avec un inventaire limite a 50
  articles.
- `TRIAL` actif et `PREMIUM` ont un inventaire limite a 500 articles.
- Les recettes sont reservees a `TRIAL` actif et `PREMIUM`.
- Les quotas sont suivis dans une table de consommation dediee.
- Le backend expose des `capabilities` calculees pour eviter que le frontend
  recalcule les regles RBAC.

## Modele cible

### Role

`role` decrit les droits d'administration.

Valeurs :

- `USER`
- `ADMIN`

Regles :

- `ADMIN` donne acces aux fonctions d'administration.
- `ADMIN` ne donne pas automatiquement acces aux fonctionnalites Premium.
- `ADMIN` ne contourne pas les quotas produit.
- Un administrateur doit avoir un plan produit compatible (`TRIAL` actif ou
  `PREMIUM`) pour utiliser les fonctionnalites produit Premium.

### Plan produit

`subscriptionPlan` decrit l'offre produit.

Valeurs :

- `FREE`
- `TRIAL`
- `PREMIUM`

`subscriptionStatus` decrit l'etat du plan.

Valeurs :

- `ACTIVE`
- `EXPIRED`
- `CANCELLED`

Regles :

- `FREE` actif applique les droits Free.
- `TRIAL` actif applique les droits Premium pendant 3 jours.
- `TRIAL` expire garde `subscriptionPlan = TRIAL`, mais applique les droits
  Free.
- `PREMIUM` actif applique les droits Premium.
- `PREMIUM` annule peut rester `PREMIUM/CANCELLED` jusqu'a la fin de periode si
  une logique de facturation le necessite.

## Persistance

Champs utilisateur cibles :

- `role`: `USER` ou `ADMIN`
- `subscriptionPlan`: `FREE`, `TRIAL` ou `PREMIUM`
- `subscriptionStatus`: `ACTIVE`, `EXPIRED` ou `CANCELLED`
- `trialStartedAt`: date nullable
- `trialEndsAt`: date nullable
- `currentPeriodStartedAt`: date nullable, pour les quotas mensuels Premium
- `currentPeriodEndsAt`: date nullable, pour les quotas mensuels Premium

### Suivi des quotas

Les quotas doivent etre stockes dans une table dediee, pas comme de simples
compteurs sur l'utilisateur.

Champs recommandes :

- `userId`
- `usageType`: `AI_RECIPE_GENERATION` ou `DRIVE_IMPORT`
- `periodStart`
- `periodEnd`
- `usedCount`
- `limit`

Regles :

- Les quotas `TRIAL` utilisent la periode de trial de 3 jours.
- Les quotas `PREMIUM` utilisent une periode mensuelle.
- Une consommation est incrementee uniquement apres une action terminee avec
  succes.
- Le backend refuse une action lorsque le quota est atteint.

## Matrice d'acces

### Free

Fonctionnalites incluses :

- Authentification.
- Profil utilisateur.
- Parametres utilisateur.
- Inventaire de base, limite a 50 articles.
- Ajout manuel de produits.
- Scan code-barres.
- Suivi des dates d'expiration.
- Budget manuel.
- Notifications basiques.

Fonctionnalites non incluses :

- Consultation des recettes.
- Suggestions de recettes.
- Generation de recettes avec IA.
- Personnalisation des recettes.
- Import de factures Drive.
- Synchronisation automatique du budget depuis factures/imports.

### Trial actif

`TRIAL` actif donne les memes droits que `PREMIUM` pendant 3 jours.

Fonctionnalites incluses :

- Toutes les fonctionnalites Free.
- Inventaire limite a 500 articles.
- Consultation des recettes.
- Suggestions de recettes depuis le stock.
- Generation de recettes avec IA.
- Personnalisation des recettes selon preferences et restrictions alimentaires.
- Import de factures Drive.
- Synchronisation automatique du budget depuis factures/imports.

Quotas :

- Generation IA : 10 generations sur les 3 jours de trial.
- Import Drive : 3 imports sur les 3 jours de trial.

### Trial expire

Un `TRIAL` expire conserve ses donnees et son historique, mais applique les
droits effectifs de `FREE`.

Regles :

- Les donnees existantes sont conservees.
- La synchronisation automatique du budget est desactivee.
- Les recettes deja creees ou generees restent consultables en lecture seule.
- Les nouvelles consultations du catalogue de recettes, suggestions,
  generations IA et personnalisations sont bloquees.
- Si l'inventaire depasse 50 articles, les nouveaux ajouts sont bloques.

### Premium

Fonctionnalites incluses :

- Toutes les fonctionnalites Free.
- Inventaire limite a 500 articles.
- Consultation des recettes.
- Suggestions de recettes depuis le stock.
- Generation de recettes avec IA.
- Personnalisation des recettes selon preferences et restrictions alimentaires.
- Import de factures Drive.
- Synchronisation automatique du budget depuis factures/imports.

Quotas :

- Generation IA : 100 generations par mois.
- Import Drive : 25 imports par mois.

### Admin

`ADMIN` est un role d'administration.

Fonctionnalites cible :

- Tableau de bord admin.
- Liste des utilisateurs.
- Detail utilisateur.
- Modification du role `USER` / `ADMIN`.
- Modification du plan `FREE` / `TRIAL` / `PREMIUM`.
- Vue des quotas consommes.
- Observabilite technique.

Regles :

- Les routes admin verifient `role = ADMIN`.
- Modifier un plan utilisateur ne modifie pas automatiquement son role.
- Modifier un role utilisateur ne modifie pas automatiquement son plan.
- `ADMIN` ne remplace pas le plan produit.

## Downgrade

Lorsqu'un utilisateur passe de `PREMIUM` ou `TRIAL` actif vers des droits
effectifs `FREE` :

- Aucune donnee existante n'est supprimee.
- Si l'utilisateur depasse la limite Free de 50 articles d'inventaire, les
  nouveaux ajouts sont bloques.
- L'utilisateur doit supprimer des articles ou repasser sur un plan donnant
  acces a la limite de 500 articles pour ajouter de nouveaux produits.
- Les recettes deja creees ou generees restent consultables en lecture seule.
- Les nouvelles consultations du catalogue de recettes, suggestions,
  generations IA et personnalisations sont bloquees.

## Contrat API frontend

Les endpoints d'authentification et de profil exposent les donnees brutes et
des droits calcules par le backend.

Champs bruts recommandes :

- `role`
- `subscriptionPlan`
- `subscriptionStatus`
- `trialEndsAt`

Champs calcules recommandes :

- `effectivePlan`: `FREE` ou `PREMIUM`
- `capabilities`: objet de capacites consomme directement par le frontend

Forme cible de `capabilities` :

```ts
capabilities: {
  inventoryLimit: 50 | 500;
  canUseRecipes: boolean;
  canGenerateAiRecipes: boolean;
  aiRecipeGenerationRemaining: number;
  canImportDrive: boolean;
  driveImportsRemaining: number;
  canUseAutomaticBudgetSync: boolean;
  canAccessAdmin: boolean;
}
```

Objectifs :

- Le frontend ne recalcule pas les regles RBAC complexes.
- Le backend reste la source de verite des droits.
- Les changements de regles produit sont moins exposes aux divergences entre
  backend et frontend.

## Strategie backend

L'autorisation backend doit etre centralisee afin d'eviter les checks disperses
du type `subscription === 'PREMIUM'`.

Composants cibles :

- `AccessPolicyService`
  - calcule `effectivePlan` ;
  - calcule `capabilities` ;
  - verifie les quotas ;
  - applique les regles Trial actif / Trial expire.
- `@RequiresRole('ADMIN')`
  - protege les routes d'administration ;
  - verifie le champ `role`.
- `@RequiresCapability('canImportDrive')`
  - protege les fonctionnalites produit ;
  - s'appuie sur `AccessPolicyService`.
- `@RequiresCapability('canGenerateAiRecipes')`
  - protege la generation IA de recettes ;
  - verifie aussi le quota restant.

Regles :

- Les anciens guards specialises `PremiumGuard` et `AdminGuard` peuvent etre
  remplaces progressivement.
- Les routes produit ne verifient pas directement le role `ADMIN`.
- Les routes admin ne verifient pas directement le plan produit.
- Le backend reste la source de verite des refus d'acces.

## Strategie frontend

Le frontend consomme les capacites calculees par le backend.

Regles :

- Ne plus faire de checks directs du type `user.subscription === 'PREMIUM'`.
- Utiliser `user.capabilities.canImportDrive`,
  `user.capabilities.canUseRecipes`, `user.capabilities.canAccessAdmin`, etc.
- Afficher les quotas restants depuis les valeurs renvoyees par l'API.
- Les helpers frontend sont autorises, mais ils doivent s'appuyer sur
  `capabilities`.
- Le frontend adapte l'UX, mais le backend reste responsable du refus effectif
  des actions non autorisees.

## Messages UX

Les messages d'acces bloque doivent etre courts, explicites et actionnables.

Messages types :

- Recettes pour un utilisateur Free :
  "Les recettes sont incluses avec Premium. Activez votre essai de 3 jours pour
  les debloquer."
- Quota IA atteint pour un Trial actif :
  "Vous avez utilise vos 10 generations d'essai."
- Quota IA atteint pour un Premium :
  "Vous avez atteint vos 100 generations ce mois-ci."
- Inventaire Free au-dessus de la limite :
  "Votre inventaire depasse la limite Free de 50 articles. Supprimez des
  articles ou passez Premium pour en ajouter."
- Trial expire :
  "Votre essai Premium est termine. Vos donnees sont conservees."

## Strategie de migration

Les comptes existants utilisent actuellement `subscription` comme source unique
pour les plans produit et les droits admin.

Regles de migration :

- `subscription = ADMIN` devient :
  - `role = ADMIN`
  - `subscriptionPlan = PREMIUM`
  - `subscriptionStatus = ACTIVE`
- `subscription = PREMIUM` devient :
  - `role = USER`
  - `subscriptionPlan = PREMIUM`
  - `subscriptionStatus = ACTIVE`
- `subscription = FREE` ou valeur absente devient :
  - `role = USER`
  - `subscriptionPlan = FREE`
  - `subscriptionStatus = ACTIVE`

Justification :

- Les anciens comptes `ADMIN` conservaient jusque-la les droits Premium via
  `subscription = ADMIN`.
- La migration vers `subscriptionPlan = PREMIUM` preserve leur acces produit
  existant.
- Le role `ADMIN` est conserve uniquement pour les droits d'administration.

## Roadmap de livraison

1. Migration base de donnees et modele `role` / `subscriptionPlan` /
   `subscriptionStatus`.
2. Creation de `AccessPolicyService` et calcul de `capabilities`.
3. Adaptation des endpoints d'authentification et de profil.
4. Guards et decorators `RequiresRole` / `RequiresCapability`.
5. Gestion des quotas IA et Drive.
6. Refactor frontend vers `capabilities`.
7. Ecrans Trial / Premium et messages UX.
8. Admin minimal.

## Criteres de validation

La mise en oeuvre RBAC doit etre validee avec les cas suivants :

- Migration correcte des anciens comptes `FREE`, `PREMIUM` et `ADMIN`.
- Un `TRIAL` actif donne les memes droits produit que `PREMIUM`.
- Un `TRIAL` expire applique les droits effectifs de `FREE`.
- Quotas IA :
  - `FREE`: 0 generation ;
  - `TRIAL` actif: 10 generations sur 3 jours ;
  - `PREMIUM`: 100 generations par mois.
- Quotas Drive :
  - `FREE`: 0 import ;
  - `TRIAL` actif: 3 imports sur 3 jours ;
  - `PREMIUM`: 25 imports par mois.
- Limites d'inventaire :
  - `FREE`: 50 articles ;
  - `TRIAL` actif et `PREMIUM`: 500 articles.
- Downgrade non destructif :
  - aucune donnee supprimee ;
  - nouveaux ajouts bloques si la limite effective est depassee.
- Recettes apres downgrade ou trial expire :
  - recettes existantes conservees en lecture seule ;
  - nouvelles consultations, suggestions, generations et personnalisations
    bloquees.
- `ADMIN` ne contourne pas les limites produit.
- Routes admin reservees a `role = ADMIN`.
- Frontend base sur `capabilities`, sans recalcul local des regles RBAC.

## Hors perimetre

- Support prioritaire.
- Suppression automatique de donnees lors d'un downgrade.
- Bypass produit implicite pour les administrateurs.
