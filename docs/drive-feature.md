# Feature Drive

## Objectif

La feature Drive permet a un utilisateur eligible d'importer une facture PDF,
d'analyser ses lignes d'achat, de les corriger si necessaire, puis de les
valider vers l'inventaire et le budget.

Elle couvre trois besoins:

- Transformer une facture Drive PDF en lignes d'inventaire exploitables.
- Enrichir les produits avec OpenFoodFacts quand un code-barres est disponible.
- Creer les depenses budget correspondantes au moment de la validation.

## Acces et quotas

L'import Drive est une fonctionnalite reservee aux utilisateurs ayant la
capability backend `canImportDrive`.

Plans autorises:

- `TRIAL` actif
- `PREMIUM` actif

Quotas:

- Trial actif: 3 imports Drive sur la periode de trial.
- Premium actif: 25 imports Drive par periode mensuelle.

Le quota `DRIVE_IMPORT` est consomme uniquement apres une analyse terminee avec
succes. Un upload ou une analyse en erreur ne consomme pas le quota.

References:

- `docs/rbac.md`
- `ineat-backend/src/auth/services/usage-quota.service.ts`
- `ineat-backend/src/invoice/services/invoice.service.ts`

## Parcours utilisateur

1. L'utilisateur ouvre la page `Facture Drive`.
2. Il selectionne un fichier PDF depuis son ordinateur.
3. La page affiche une confirmation non bloquante:
   - texte: `Analyser ce fichier ?`
   - nom du fichier selectionne
   - bouton `Valider`
   - bouton `Annuler`
4. Si l'utilisateur valide, le PDF est envoye au backend.
5. Le backend stocke le PDF, cree la facture et ajoute son analyse a la file
   BullMQ.
6. Le worker telecharge le PDF, l'analyse, enrichit les lignes et fait passer
   la facture a l'etat `READY_FOR_REVIEW`.
7. Le frontend suit la progression; l'utilisateur selectionne ensuite les
   lignes a importer et peut corriger les champs.
8. A la validation, le backend cree ou met a jour les produits, ajoute les
   elements d'inventaire, cree les depenses budget, puis renvoie un resume.
9. La page affiche le resultat:
   - nombre de produits importes
   - nombre de depenses creees
   - nombre de lignes ignorees
   - montant total ajoute au budget

## Contraintes fichier

Le fichier doit respecter les contraintes suivantes:

- Format PDF uniquement.
- Extension `.pdf`.
- Taille maximale: 5 Mo.

La validation est faite cote frontend avant appel API et cote backend avant
upload.

References:

- `ineat-frontend/src/services/invoiceService.ts`
- `ineat-backend/src/invoice/services/invoice-upload.service.ts`

## Endpoints API

Base path: `/invoices`. Le backend n'ajoute aucun prefixe global `/api`.

### Importer une facture

`POST /invoices/drive-import`

Body: `multipart/form-data`

Champ requis:

- `file`: fichier PDF

Traitement:

1. Verifie la capability `canImportDrive`.
2. Verifie le quota `DRIVE_IMPORT`.
3. Upload le PDF dans Cloudinary.
4. Cree une facture en statut `PROCESSING`, etape `UPLOADED`.
5. Passe la facture a l'etape `QUEUED`.
6. Publie le job `invoice-analysis/analyze` dans BullMQ.
7. Retourne HTTP 202 sans attendre OpenAI.

Le worker telecharge ensuite le PDF depuis Cloudinary, verifie sa signature
`%PDF-`, l'analyse, enrichit les lignes via OpenFoodFacts, resout les produits,
cree les `InvoiceItem`, puis passe la facture a `READY_FOR_REVIEW`. Le quota est
consomme uniquement apres l'analyse reussie, avec une cle d'idempotence liee a
la facture.

### Recuperer une facture

`GET /invoices/:id`

Retourne la facture et ses lignes pour l'utilisateur connecte.

### Relancer une facture

`POST /invoices/:id/retry`

Remet en file une facture en echec ou interrompue sans recreer l'import.

### Corriger une ligne

`PATCH /invoices/:id/items/:itemId`

Permet de corriger une ligne non validee avant import dans l'inventaire.

Champs modifiables principaux:

- `detectedName`
- `quantity`
- `unitPrice`
- `totalPrice`
- `category`
- `storageLocation`
- `expiryDate`
- `notes`
- `selectedEan`

Une ligne deja validee ne peut plus etre corrigee.

### Valider les lignes

`POST /invoices/:id/validate`

Body:

```json
{
  "invoiceItemIds": ["..."]
}
```

Traitement:

1. Verifie que la facture appartient a l'utilisateur.
2. Refuse les factures `PROCESSING` ou `FAILED`.
3. Charge uniquement les lignes demandees.
4. Pour chaque ligne non validee:
   - cree ou enrichit le `Product`;
   - cree un `InventoryItem`;
   - cree une `Expense` liee a la facture et a la ligne;
   - marque la ligne comme validee.
5. Pour une ligne deja validee:
   - ne recree pas l'inventaire;
   - si la depense manque, cree seulement la depense manquante.

Le resume renvoye contient:

- `validatedItemCount`
- `skippedItemCount`
- `inventoryItemCount`
- `expenseCount`
- `totalBudgetAmount`

## Pipeline backend

### 1. Upload PDF

Service: `InvoiceUploadService`

Le PDF est uploade en fichier brut Cloudinary dans le dossier:

```text
invoices/{userId}
```

### 2. Analyse facture

Service: `InvoiceAnalysisService`

Provider selectionne:

- `INVOICE_ANALYSIS_PROVIDER` si defini.
- `openai` si `OPENAI_API_KEY_INVOICE` est disponible.
- `mock` sinon.

Le provider renvoie un `AnalyzedInvoice` avec les metadonnees de facture et les
lignes detectees.

### 3. Enrichissement OpenFoodFacts

Service: `OpenFoodFactsInvoiceEnrichmentService`

L'enrichissement est tente si la ligne contient un code-barres valide dans:

- `selectedEan`
- `productCode`

Si aucun code-barres valide n'est present, la ligne est marquee:

```text
externalProductStatus = SKIPPED
```

Si OFF repond avec un produit, la ligne est marquee:

```text
externalProductStatus = FOUND
externalProductProvider = openfoodfacts
```

Donnees OFF recuperees:

- code-barres
- nom produit
- marque
- quantite
- image produit
- categories
- Nutri-score
- Eco-score
- groupe NOVA
- ingredients
- nutriments
- donnees brutes utiles au fallback

Limite importante: ces champs ne sont disponibles que si OpenFoodFacts les
fournit pour le code-barres. Par exemple, un produit peut avoir une image et une
marque mais ne pas avoir de Nutri-score, Eco-score, NOVA ou ingredients.

Variables configurables:

- `OPENFOODFACTS_BASE_URL`
- `OPENFOODFACTS_TIMEOUT_MS`
- `OPENFOODFACTS_USER_AGENT`

### 4. Resolution produit

Service: `InvoiceProductResolverService`

Pendant l'analyse, le backend essaie d'associer chaque ligne a un produit
existant:

- par code-barres;
- puis selon les strategies de resolution existantes.

Le but est de pre-remplir `productId` quand un produit connu existe deja.

### 5. Persistance de la facture

La facture est stockee avec ses lignes dans:

- `Invoice`
- `InvoiceItem`

Les donnees OFF sont conservees dans `InvoiceItem.externalProductData`.

## Validation vers inventaire

La validation est l'etape qui transforme une ligne de facture en donnees metier
durables.

Tables impactees:

- `Product`
- `InventoryItem`
- `Expense`
- `InvoiceItem`
- `Invoice`
- `Budget` si un budget mensuel doit etre cree

### Creation ou enrichissement produit

Pour chaque ligne validee, le backend resout un produit:

1. Si `InvoiceItem.productId` est deja present, le produit est charge.
2. Sinon, le backend cherche un produit par code-barres.
3. Sinon, le backend cherche un produit equivalent par nom/categorie.
4. Sinon, il cree un nouveau produit.

Dans tous les cas ou un `Product` existe ou est cree, les donnees OFF
disponibles sont appliquees au `Product`:

- `barcode`
- `name`
- `brand`
- `nutriscore`
- `ecoscore`
- `novascore`
- `ingredients`
- `imageUrl`
- `externalId`
- `nutrients`

Pourquoi c'est important: la fiche inventaire lit les donnees depuis `Product`,
pas depuis `InvoiceItem.externalProductData`. Les donnees OFF doivent donc etre
propagees vers `Product` a la validation.

### Creation inventaire

Une ligne non validee cree un `InventoryItem` avec:

- utilisateur
- produit
- quantite
- date d'achat
- date de peremption si disponible
- prix d'achat
- lieu de stockage
- notes

La date d'achat vient de `Invoice.purchaseDate`; si elle est absente, le backend
utilise `Invoice.createdAt`.

### Creation budget

Une depense est creee si:

- la ligne a un `totalPrice` strictement positif;
- un budget existe ou peut etre cree.

La depense creee contient:

- `userId`
- `budgetId`
- `amount = InvoiceItem.totalPrice`
- `date = purchaseDate`
- `source = Facture Drive`
- `category = InvoiceItem.category`
- `notes = InvoiceItem.detectedName`
- `invoiceId`
- `invoiceItemId`

`invoiceItemId` est unique dans `Expense`, ce qui rend la validation idempotente
cote budget.

### Creation automatique du budget mensuel

Si aucun budget actif ne couvre la date de facture, la validation Drive cherche
le dernier budget actif de l'utilisateur.

Si un dernier budget actif existe:

1. Elle cree un budget mensuel pour le mois de la facture.
2. Elle reprend le montant du dernier budget actif.
3. Elle cree la depense dans ce nouveau budget.

Si aucun budget de reference n'existe, aucune depense n'est creee et le resume
renvoie `expenseCount = 0`.

### Reparation idempotente

Si une ligne est deja `validated = true`, la validation ne recree pas
l'inventaire.

En revanche, si aucune depense n'existe pour son `invoiceItemId`, le backend
peut creer la depense manquante. Ce comportement permet de reparer les factures
validees avant la correction du flux budget.

## Frontend

Page:

```text
ineat-frontend/src/routes/app/inventory/add/drive.tsx
```

Service API:

```text
ineat-frontend/src/services/invoiceService.ts
```

Etats principaux:

- `upload`: selection et confirmation du PDF.
- `review`: affichage et correction des lignes detectees.
- `done`: resume de validation.

Apres validation reussie, le frontend rafraichit:

- l'inventaire;
- les queries `inventory`;
- les queries `budget/current`;
- les queries `budget/stats`.

## Modele de donnees

### Invoice

Stocke la facture importee:

- utilisateur
- URL Cloudinary du PDF
- statut
- marchand
- montant total
- date d'achat
- numero facture / commande
- provider d'analyse
- confiance
- donnees brutes d'analyse

### InvoiceItem

Stocke une ligne detectee:

- nom detecte
- quantite
- prix unitaire
- prix total
- categorie
- code-barres selectionne
- suggestions de codes-barres
- statut de validation
- lien produit optionnel
- donnees OFF optionnelles

### Product

Stocke les donnees produit durables utilisees par l'inventaire.

Les donnees OFF doivent finir ici pour etre visibles dans la fiche produit.

### InventoryItem

Stocke la possession d'un produit par un utilisateur:

- quantite
- date d'achat
- prix d'achat
- stockage
- peremption
- notes

### Expense

Stocke l'impact budget:

- montant
- date
- budget
- source
- lien facture
- lien ligne facture

## Variables d'environnement

Backend et worker:

- `INVOICE_ANALYSIS_PROVIDER`: `mock` ou `openai`.
- `INVOICE_PROCESSING_MODE`: `bullmq` par defaut, `sync` uniquement pour le
  diagnostic local cible.
- `OPENAI_API_KEY_INVOICE`: requis sur le processus qui execute l'analyse.
- `OPENAI_INVOICE_MODEL`: `gpt-5.5` par defaut.
- `REDIS_URL` et `REDIS_KEY_PREFIX`: connexion et isolation des files BullMQ.
- `OPENFOODFACTS_BASE_URL`: optionnel, defaut
  `https://world.openfoodfacts.org`.
- `OPENFOODFACTS_TIMEOUT_MS`: optionnel, defaut `5000`.
- `OPENFOODFACTS_USER_AGENT`: optionnel.
- Variables Cloudinary requises pour l'upload PDF.

Frontend:

- `VITE_API_URL`: origine backend publique ou locale.

## Tests de reference

Backend:

```bash
pnpm exec jest --runInBand --no-watchman invoice.service.spec.ts openfoodfacts-invoice-enrichment.service.spec.ts
pnpm run test:e2e
pnpm run build
```

Frontend:

```bash
pnpm exec tsc --noEmit
pnpm exec eslint src/routes/app/inventory/add/drive.tsx
```

Cas couverts par les tests backend:

- import facture et consommation du quota apres analyse reussie;
- reponse HTTP 202 avec etat `QUEUED` en mode BullMQ;
- telechargement du PDF par le worker et validation de sa signature;
- non-consommation du quota si l'analyse echoue;
- creation inventaire + depense budget;
- creation automatique d'un budget mensuel pour une facture ancienne;
- enrichissement d'un nouveau produit avec OFF;
- enrichissement d'un produit existant avec OFF;
- fallback sur les donnees OFF brutes;
- idempotence si une depense existe deja;
- reparation d'une ligne deja validee sans depense budget;
- validation partielle.

## Scenarios de verification manuelle

### Import nominal

1. Se connecter avec un compte Premium ou Trial actif.
2. Ouvrir `Facture Drive`.
3. Selectionner un PDF valide.
4. Confirmer `Analyser ce fichier ?`.
5. Verifier que les lignes detectees s'affichent.
6. Verifier que les images OFF apparaissent quand disponibles.
7. Valider les lignes.
8. Verifier le resume:
   - produits > 0
   - depenses > 0 si les prix sont presents
   - budget > 0 si un budget existe ou peut etre cree
9. Ouvrir l'inventaire et verifier que les produits importes sont presents.
10. Ouvrir une fiche produit et verifier les donnees OFF disponibles.

### Annulation avant analyse

1. Selectionner un PDF.
2. Cliquer `Annuler`.
3. Verifier qu'aucun appel d'analyse n'est lance.

### Produit OFF incomplet

1. Importer une facture contenant un produit connu d'OFF mais sans scores.
2. Verifier que l'image ou la marque s'affiche si OFF les fournit.
3. Verifier que Nutri-score/Eco-score/NOVA restent en `Information non
   disponible` si OFF ne les fournit pas.

### Reparation budget

1. Utiliser une facture deja validee sans depense.
2. Relancer la validation des lignes.
3. Verifier qu'aucun nouvel item d'inventaire n'est cree.
4. Verifier qu'une depense est creee si un budget existe ou peut etre cree.

## Limites connues

- L'analyse PDF depend du provider configure et de la qualite de la facture.
- Les donnees OFF dependent de la presence d'un code-barres valide.
- Les scores nutritionnels et environnementaux dependent de la completude OFF.
- Si aucun budget de reference n'existe, l'import cree l'inventaire mais ne peut
  pas creer de depense budget.
- Les lignes validees ne peuvent plus etre corrigees depuis l'ecran Drive.

## Fichiers principaux

Backend:

- `ineat-backend/src/invoice/controllers/invoice.controller.ts`
- `ineat-backend/src/invoice/services/invoice.service.ts`
- `ineat-backend/src/invoice/services/invoice-analysis.service.ts`
- `ineat-backend/src/invoice/services/invoice-upload.service.ts`
- `ineat-backend/src/invoice/services/invoice-product-resolver.service.ts`
- `ineat-backend/src/invoice/services/openfoodfacts-invoice-enrichment.service.ts`
- `ineat-backend/src/invoice/services/providers/invoice-analysis-provider.ts`
- `ineat-backend/src/invoice/services/providers/openai-invoice-analysis.provider.ts`
- `ineat-backend/src/invoice/services/providers/mock-invoice-analysis.provider.ts`

Frontend:

- `ineat-frontend/src/routes/app/inventory/add/drive.tsx`
- `ineat-frontend/src/services/invoiceService.ts`
