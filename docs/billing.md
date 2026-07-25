# Facturation InEat

## Objectif

Definir le cadre economique et l'offre commerciale InEat avant l'integration
Stripe.

Ce document est la source de verite pour :

- les plans commercialises ;
- les couts unitaires Free et Premium ;
- les tarifs mensuel et annuel retenus pour la V1 ;
- le trial ;
- les regles d'activation, renouvellement, annulation et downgrade ;
- les futurs objets Stripe a creer.

La logique d'acces produit reste decrite dans `docs/rbac.md`.

## Principe de pricing

Les prix publics ne doivent pas etre fixes uniquement par benchmark marche.

Ordre de decision :

1. Estimer le cout mensuel moyen d'un utilisateur Free.
2. Estimer le cout mensuel moyen d'un utilisateur Premium.
3. Ajouter les frais de paiement, support, infrastructure et marge de securite.
4. Fixer un prix mensuel qui garde une marge brute suffisante.
5. Fixer un prix annuel qui ameliore la retention et le cash-flow sans degrader
   la marge.
6. Comparer ensuite au marche pour verifier que le prix reste acceptable.

Les tarifs retenus plus bas sont les prix V1. Ils devront etre revisites apres
les premiers usages reels, mais ils peuvent servir de base pour creer les prices
Stripe.

## Modele de couts unitaires

### Cout utilisateur Free

Le cout Free doit rester tres bas, car il est finance par la conversion vers
Premium.

Postes a suivre :

- authentification et sessions ;
- base de donnees ;
- stockage des donnees utilisateur ;
- notifications ;
- appels Open Food Facts ;
- trafic API ;
- logs et observabilite ;
- support utilisateur ;
- cout d'opportunite des limites gratuites.

Les fonctionnalites couteuses doivent rester bloquees ou fortement limitees sur
Free :

- generation IA ;
- analyse de factures ;
- imports Drive ;
- synchronisation automatique du budget.

Formule cible :

```text
cout_free_mensuel =
  cout_infra_moyen
+ cout_stockage_moyen
+ cout_notifications
+ cout_support_moyen
+ cout_services_tiers_gratuits
```

Objectif recommande :

- cout Free moyen inferieur a 0,10 EUR / utilisateur / mois ;
- cout Free haut mais acceptable inferieur a 0,25 EUR / utilisateur / mois.

Si le cout Free depasse ce niveau, il faut reduire les limites gratuites ou
augmenter la conversion vers Premium.

### Cout utilisateur Premium

Le cout Premium depend surtout de l'utilisation des fonctionnalites variables :

- generations IA de recettes ;
- analyse/import de factures ;
- enrichissement produit ;
- stockage et bande passante ;
- synchronisation budget ;
- support ;
- frais Stripe.

Formule cible :

```text
cout_premium_mensuel =
  cout_free_mensuel
+ cout_ia_recettes_moyen
+ cout_imports_drive_moyen
+ cout_analyse_factures_moyen
+ cout_stockage_premium_moyen
+ cout_support_premium_moyen
+ frais_paiement
```

Pour eviter qu'une minorite d'utilisateurs intensifs consomme toute la marge,
les quotas Premium doivent etre dimensionnes sur le cout maximum acceptable, pas
uniquement sur l'usage moyen.

### Seuils de decision

Avant de valider un tarif, calculer trois scenarios :

- utilisateur Premium faible usage : 10 % des quotas ;
- utilisateur Premium moyen : 40 % des quotas ;
- utilisateur Premium intensif : 100 % des quotas.

Le prix mensuel doit rester rentable dans le scenario moyen et ne pas devenir
catastrophique dans le scenario intensif.

Objectif de marge brute recommande :

- minimum : 70 % sur Premium moyen ;
- confortable : 80 % ou plus ;
- alerte : moins de 60 %.

### Hypotheses economiques V1

Ces hypotheses ne remplacent pas la mesure reelle, mais elles donnent un cadre
pour justifier le premier prix.

| Scenario Premium | Usage IA recettes | Usage Drive | Risque cout | Lecture pricing |
| --- | ---: | ---: | --- | --- |
| Faible usage | 10 generations/mois | 2 imports/mois | faible | tres rentable |
| Usage moyen | 40 generations/mois | 10 imports/mois | acceptable | prix V1 viable |
| Usage intensif | 100 generations/mois | 25 imports/mois | eleve | protege par quotas |

Regles de pilotage :

- les quotas doivent proteger la marge maximale ;
- les utilisateurs intensifs doivent etre acceptables, mais pas dimensionner
  tout le prix ;
- les images de recettes generees doivent etre surveillees separement, car leur
  cout peut devenir significatif ;
- les imports Drive doivent etre incrementes uniquement apres analyse terminee
  avec succes ;
- les essais gratuits doivent rester courts et limites.

### Variables a mesurer apres lancement

Les valeurs suivantes doivent etre mesurees apres lancement pour ajuster les
quotas, les couts et les prix futurs :

- cout moyen d'une generation IA de recette texte ;
- cout moyen d'une image de recette generee ;
- cout moyen d'un import Drive complet ;
- cout moyen d'une analyse de facture PDF ;
- cout mensuel moyen d'infrastructure par utilisateur actif ;
- cout mensuel moyen de stockage par utilisateur actif ;
- frais Stripe par paiement mensuel ;
- frais Stripe par paiement annuel ;
- taux attendu de conversion Free vers Premium ;
- taux attendu de passage mensuel vers annuel ;
- taux de churn mensuel acceptable.

## Synthese de l'offre cible

InEat propose une offre simple :

- `FREE` : gratuit, sans moyen de paiement ;
- `TRIAL` : essai Premium gratuit de 3 jours, sans moyen de paiement requis ;
- `PREMIUM_MONTHLY` : Premium mensuel ;
- `PREMIUM_YEARLY` : Premium annuel avec remise.

Le plan technique `PREMIUM` reste unique cote application. Le rythme de
facturation, mensuel ou annuel, doit etre porte par une notion separee de
billing interval.

## Prix V1 retenu

Les tarifs ci-dessous sont retenus pour la V1 Stripe.

Prix catalogue :

- Premium mensuel : 5,99 EUR TTC / mois.
- Premium annuel : 59,99 EUR TTC / an.
- Equivalent mensuel annuel : 5,00 EUR TTC / mois.
- Remise annuelle : environ 2 mois offerts par rapport au mensuel.

Justification :

- InEat inclut plus qu'un catalogue de recettes : inventaire, anti-gaspi,
  recettes depuis le stock, IA, imports Drive, analyse de factures et budget
  synchronise.
- Le prix reste sous le seuil psychologique de 6 EUR / mois.
- Le revenu net apres TVA et frais de paiement laisse plus de marge que 4,99 EUR
  pour absorber les usages IA et les imports intensifs.
- Le prix annuel reste simple a comprendre et proche du marche des apps food
  premium avec IA.

Option commerciale de lancement :

- Prix catalogue : 5,99 EUR / mois et 59,99 EUR / an.
- Offre early adopter limitee : 4,99 EUR / mois ou 49,99 EUR / an pendant une
  periode de lancement.

Cette approche evite d'ancrer le produit trop bas tout en permettant de tester
la sensibilite prix.

Decision V1 :

- creer les prices Stripe catalogue a 5,99 EUR et 59,99 EUR ;
- ne creer une price promotionnelle que si une campagne de lancement est
  decidee explicitement ;
- ne pas afficher le prix promotionnel comme prix normal ;
- afficher l'annuel comme l'offre recommandee.

### Gratuit

- Prix : 0 EUR.
- Engagement : aucun.
- Moyen de paiement : non requis.

### Premium mensuel

- Prix public : 5,99 EUR TTC / mois.
- Renouvellement : mensuel.
- Engagement : sans engagement.
- Annulation : possible a tout moment, avec conservation des droits Premium
  jusqu'a la fin de la periode payee.

### Premium annuel

- Prix public : 59,99 EUR TTC / an.
- Equivalent mensuel affiche : 5,00 EUR / mois.
- Remise affichee : environ 2 mois offerts par rapport au mensuel.
- Renouvellement : annuel.
- Engagement : sans engagement au renouvellement suivant.
- Annulation : possible a tout moment, avec conservation des droits Premium
  jusqu'a la fin de la periode payee.

## Trial

### Regle produit

- Duree : 3 jours.
- Prix : gratuit.
- Moyen de paiement : non requis.
- Eligibilite : une seule fois par utilisateur.
- Droits : memes droits produit que Premium pendant la periode de trial.
- Conversion automatique : non. A la fin du trial, l'utilisateur repasse sur les
  droits effectifs Free tant qu'il ne choisit pas une offre payante.

### Pourquoi sans carte

Le trial sert a faire decouvrir rapidement la valeur d'InEat sans friction :
recettes, IA, imports Drive et budget synchronise. L'abonnement payant doit etre
un choix explicite apres l'essai.

### Expiration

A l'expiration du trial :

- aucune donnee n'est supprimee ;
- les droits effectifs repassent a Free ;
- les donnees Premium existantes restent consultables quand la spec RBAC le
  prevoit ;
- les nouvelles actions Premium sont bloquees ;
- l'interface doit proposer le passage a Premium mensuel ou annuel.

## Droits et quotas

Les droits produit restent ceux de `docs/rbac.md`.

### Free

- Inventaire : 50 articles.
- Recettes : non incluses.
- Generation IA : 0.
- Imports Drive : 0.
- Budget synchronise : non inclus.

### Trial actif

- Inventaire : 500 articles.
- Recettes : incluses.
- Generation IA : 10 generations sur les 3 jours de trial.
- Imports Drive : 3 imports sur les 3 jours de trial.
- Budget synchronise : inclus.

### Premium mensuel

- Inventaire : 500 articles.
- Recettes : incluses.
- Generation IA : 100 generations par periode mensuelle.
- Imports Drive : 25 imports par periode mensuelle.
- Budget synchronise : inclus.

### Premium annuel

Les droits Premium annuel sont identiques aux droits Premium mensuel.

Les quotas restent mensuels, meme pour un abonnement annuel :

- Generation IA : 100 generations par mois ;
- Imports Drive : 25 imports par mois.

Cette regle evite qu'un utilisateur annuel consomme tout son quota des le debut
de l'annee et garde une experience reguliere.

## Cycle de vie abonnement

### Activation trial

Quand un utilisateur active son trial :

- `subscriptionPlan = TRIAL`
- `subscriptionStatus = ACTIVE`
- `trialStartedAt = now`
- `trialEndsAt = now + 3 jours`
- `currentPeriodStartedAt = trialStartedAt`
- `currentPeriodEndsAt = trialEndsAt`

Si l'utilisateur a deja utilise son trial, l'activation doit etre refusee.

### Passage a Premium

Quand un paiement Stripe est confirme :

- `subscriptionPlan = PREMIUM`
- `subscriptionStatus = ACTIVE`
- `currentPeriodStartedAt = periode Stripe courante`
- `currentPeriodEndsAt = fin de periode Stripe courante`
- les quotas Premium utilisent la periode mensuelle effective.

Si l'utilisateur passe a Premium pendant le trial, le trial est remplace par
l'abonnement payant. Les dates de trial peuvent etre conservees pour historique,
mais elles ne pilotent plus les droits.

### Renouvellement

A chaque renouvellement Stripe reussi :

- conserver `subscriptionPlan = PREMIUM` ;
- conserver `subscriptionStatus = ACTIVE` ;
- mettre a jour `currentPeriodStartedAt` ;
- mettre a jour `currentPeriodEndsAt` ;
- laisser les quotas se recalculer sur la nouvelle periode.

### Annulation

L'annulation utilisateur doit etre faite en fin de periode :

- garder `subscriptionPlan = PREMIUM` ;
- passer `subscriptionStatus = CANCELLED` si l'interface doit afficher
  l'annulation programmee ;
- conserver les droits Premium jusqu'a `currentPeriodEndsAt` ;
- repasser aux droits effectifs Free apres `currentPeriodEndsAt`.

Note technique : le calcul des droits doit distinguer un abonnement annule mais
encore valable d'un abonnement expire.

### Paiement echoue

En cas de paiement echoue :

- laisser Stripe gerer les relances et la periode de grace ;
- conserver les droits Premium tant que Stripe considere l'abonnement actif ou
  en relance recuperable ;
- passer aux droits Free uniquement apres evenement Stripe terminal :
  abonnement impaye, expire ou annule en fin de periode.

### Downgrade vers Free

Le downgrade est non destructif :

- aucune donnee n'est supprimee ;
- les ajouts d'inventaire sont bloques si l'utilisateur depasse la limite Free ;
- les fonctionnalites Premium ne permettent plus de nouvelles actions ;
- les donnees historiques restent conservees.

## Taxes, factures et devise

### Devise

- Devise de lancement : EUR.
- Les prix affiches au public sont TTC.
- Les montants Stripe doivent etre configures en centimes d'euro.

### TVA

Pour la V1, utiliser Stripe Tax si disponible sur le compte Stripe.

Regles produit :

- l'interface affiche un prix TTC simple ;
- Stripe reste responsable du calcul fiscal exact au paiement ;
- le backend ne recalcule pas la TVA ;
- les factures et recus sont fournis par Stripe.

### Factures client

Les utilisateurs doivent pouvoir recuperer leurs factures depuis le portail
Stripe.

L'application InEat n'a pas besoin de generer elle-meme des factures de
souscription en V1.

### Remboursements

V1 :

- pas de remboursement automatique dans l'application ;
- remboursement manuel depuis Stripe Dashboard si necessaire ;
- un remboursement ne supprime pas les donnees utilisateur ;
- si le remboursement annule effectivement l'abonnement, les droits repassent a
  Free selon les webhooks Stripe recus.

## Parcours utilisateur

### Demarrer le trial

1. L'utilisateur clique sur "Essayer 3 jours gratuitement".
2. Le backend verifie que le trial n'a jamais ete utilise.
3. Le backend active `TRIAL/ACTIVE`.
4. Le frontend rafraichit le profil utilisateur.
5. Les droits Premium sont immediatement disponibles.

Le trial ne passe pas par Stripe en V1.

### Acheter Premium

1. L'utilisateur choisit Mensuel ou Annuel.
2. Le frontend appelle le backend pour creer une session Stripe Checkout.
3. Le backend choisit la price Stripe depuis l'intervalle demande.
4. Stripe encaisse le paiement.
5. Le webhook Stripe active `PREMIUM/ACTIVE`.
6. Le frontend recupere le profil a jour.

Le backend ne doit pas activer Premium uniquement apres le retour navigateur
Checkout. Le webhook Stripe est la source de verite.

### Gerer l'abonnement

1. L'utilisateur clique sur "Gerer mon abonnement".
2. Le backend cree une session Stripe Customer Portal.
3. Stripe gere le moyen de paiement, l'annulation et les factures.
4. Les webhooks Stripe mettent a jour InEat.

## API billing cible

Endpoints recommandes :

- `POST /billing/trial/start`
  - active le trial si l'utilisateur est eligible ;
  - refuse si `trialUsedAt` existe ou si l'utilisateur est deja Premium actif.
- `POST /billing/checkout`
  - body : `{ "interval": "MONTHLY" | "YEARLY" }` ;
  - retourne l'URL Stripe Checkout ;
  - necessite un utilisateur authentifie.
- `POST /billing/portal`
  - retourne l'URL Stripe Customer Portal ;
  - necessite un utilisateur authentifie et un `stripeCustomerId`.
- `POST /billing/webhook`
  - endpoint public signe par Stripe ;
  - verifie `STRIPE_WEBHOOK_SECRET` ;
  - traite les evenements Stripe de maniere idempotente.

Reponse profil utilisateur :

- conserver les champs RBAC existants ;
- ajouter les champs billing utiles a l'UX :
  - `billingInterval` ;
  - `cancelAtPeriodEnd` ;
  - `currentPeriodEndsAt` ;
  - `trialUsedAt` ;
  - `stripeCustomerId` uniquement si necessaire cote admin, pas pour l'UX
    utilisateur.

## Webhooks Stripe

Le webhook est la source de verite pour les droits payants.

Evenements minimum a gerer :

- `checkout.session.completed`
  - creer ou retrouver le customer ;
  - associer `stripeCustomerId` et `stripeSubscriptionId` ;
  - activer `PREMIUM/ACTIVE`.
- `customer.subscription.created`
  - synchroniser la subscription si Checkout n'a pas encore tout renseigne.
- `customer.subscription.updated`
  - mettre a jour price, intervalle, periode courante et annulation programmee.
- `customer.subscription.deleted`
  - repasser aux droits effectifs Free si la periode est terminee.
- `invoice.payment_succeeded`
  - confirmer le renouvellement et mettre a jour la periode si necessaire.
- `invoice.payment_failed`
  - ne pas couper brutalement les droits ;
  - attendre le statut final de la subscription.

Idempotence :

- stocker les `stripeEventId` traites dans une table dediee ou un journal
  idempotent ;
- ignorer un evenement deja traite ;
- ne jamais supposer l'ordre parfait des webhooks.

## Mapping Stripe vers InEat

### Price mensuelle

- `stripePriceId = STRIPE_PRICE_PREMIUM_MONTHLY_EUR`
- `subscriptionPlan = PREMIUM`
- `subscriptionStatus = ACTIVE`
- `billingInterval = MONTHLY`

### Price annuelle

- `stripePriceId = STRIPE_PRICE_PREMIUM_YEARLY_EUR`
- `subscriptionPlan = PREMIUM`
- `subscriptionStatus = ACTIVE`
- `billingInterval = YEARLY`

### Subscription annulee en fin de periode

- `subscriptionPlan = PREMIUM`
- `subscriptionStatus = CANCELLED`
- `cancelAtPeriodEnd = true`
- droits Premium conserves jusqu'a `currentPeriodEndsAt`.

### Subscription terminee

- `subscriptionPlan = PREMIUM` ou `FREE` selon choix de migration ;
- `subscriptionStatus = EXPIRED`
- `cancelAtPeriodEnd = false`
- droits effectifs Free.

Decision V1 recommandee :

- conserver `subscriptionPlan = PREMIUM` avec `EXPIRED` pour garder
  l'historique produit ;
- calculer `effectivePlan = FREE` quand la periode payee est terminee.

## Objets Stripe a prevoir

### Product

Nom recommande :

- `InEat Premium`

### Prices

Deux prices Stripe sont necessaires :

- `premium_monthly_eur`
  - montant : 5,99 EUR ;
  - intervalle : month.
- `premium_yearly_eur`
  - montant : 59,99 EUR ;
  - intervalle : year.

Les identifiants techniques Stripe doivent etre stockes en variables
d'environnement et ne doivent pas etre hardcodes dans le frontend.

Variables recommandees :

- `STRIPE_PRICE_PREMIUM_MONTHLY_EUR`
- `STRIPE_PRICE_PREMIUM_YEARLY_EUR`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CUSTOMER_PORTAL_RETURN_URL`
- `STRIPE_CHECKOUT_SUCCESS_URL`
- `STRIPE_CHECKOUT_CANCEL_URL`

## Modele de donnees cible

Le modele RBAC existant couvre les droits produit :

- `subscriptionPlan`
- `subscriptionStatus`
- `trialStartedAt`
- `trialEndsAt`
- `currentPeriodStartedAt`
- `currentPeriodEndsAt`

Pour Stripe, ajouter ensuite des champs de facturation dedies :

- `stripeCustomerId`
- `stripeSubscriptionId`
- `stripePriceId`
- `billingInterval`: `MONTHLY` ou `YEARLY`
- `cancelAtPeriodEnd`: boolean
- `trialUsedAt`: date nullable
- `subscriptionCancelledAt`: date nullable
- `lastStripeEventAt`: date nullable

`trialUsedAt` permet de garantir le trial unique meme si l'utilisateur passe
ensuite a Premium ou revient en Free.

### Table d'evenements Stripe

Ajouter une table technique pour l'idempotence :

- `id`
- `stripeEventId`
- `eventType`
- `processedAt`
- `payload`

Contrainte :

- `stripeEventId` unique.

Cette table evite de traiter deux fois un paiement ou une annulation.

## Securite et conformite

Regles :

- ne jamais exposer la cle secrete Stripe au frontend ;
- ne jamais stocker de carte bancaire dans InEat ;
- verifier la signature du webhook Stripe ;
- ne pas faire confiance au `success_url` pour activer Premium ;
- journaliser les changements de statut billing ;
- limiter les endpoints billing a l'utilisateur authentifie, sauf le webhook ;
- utiliser les IDs Stripe comme references externes, pas comme preuve de droit
  sans verification cote backend.

Variables d'environnement :

- les cles Stripe doivent rester cote backend ;
- les price IDs peuvent etre references cote backend uniquement ;
- le frontend demande un intervalle, jamais un price ID libre.

## Observabilite billing

Evenements applicatifs a logger :

- trial active ;
- trial refuse car deja utilise ;
- session Checkout creee ;
- session Portal creee ;
- abonnement active ;
- abonnement annule en fin de periode ;
- abonnement expire ;
- paiement reussi ;
- paiement echoue ;
- webhook ignore car deja traite ;
- webhook refuse car signature invalide.

Metriques a suivre :

- taux d'activation trial ;
- taux de conversion trial vers Premium ;
- taux de conversion Free vers Premium direct ;
- repartition mensuel / annuel ;
- churn mensuel ;
- MRR ;
- ARR ;
- ARPPU ;
- cout moyen IA par utilisateur Premium ;
- cout moyen Drive par utilisateur Premium ;
- marge brute estimee.

## UX abonnement

### Page abonnement

La page abonnement doit afficher :

- le plan actuel ;
- le statut du trial ou de l'abonnement ;
- les quotas restants ;
- une bascule Mensuel / Annuel ;
- le prix mensuel : 5,99 EUR / mois ;
- le prix annuel : 59,99 EUR / an ;
- l'equivalent mensuel annuel : 5,00 EUR / mois ;
- le message "2 mois offerts" sur l'annuel ;
- un bouton "Essayer 3 jours gratuitement" si l'utilisateur est eligible ;
- un bouton "Choisir Premium mensuel" ;
- un bouton "Choisir Premium annuel".

### Etat Free eligible trial

Afficher :

- bouton principal : "Essayer 3 jours gratuitement" ;
- bouton secondaire : "Choisir Premium" ;
- rappel : "Sans carte bancaire".

### Etat Trial actif

Afficher :

- date de fin du trial ;
- quotas restants ;
- CTA vers Premium mensuel et annuel ;
- message indiquant que les donnees sont conservees apres l'essai.

### Etat Trial expire

Afficher :

- message d'expiration ;
- CTA Premium mensuel ;
- CTA Premium annuel recommande ;
- explication non anxiogène : donnees conservees, nouvelles actions Premium
  bloquees.

### Etat Premium actif

Afficher :

- intervalle de facturation ;
- date de renouvellement ;
- quotas restants ;
- bouton "Gerer mon abonnement".

### Etat Premium annule

Afficher :

- "Votre abonnement restera actif jusqu'au {date}" ;
- bouton "Gerer mon abonnement" ;
- ne pas afficher l'utilisateur comme Free avant la fin effective de periode.

### Etat paiement en echec

Afficher un message court :

- "Votre paiement n'a pas pu etre valide. Mettez a jour votre moyen de paiement
  pour conserver Premium."

Le niveau d'urgence depend du statut Stripe. Ne pas bloquer si Stripe est encore
en periode de relance.

### Messages recommandes

- Trial disponible :
  "Essayez Premium gratuitement pendant 3 jours, sans carte bancaire."
- Trial actif :
  "Votre essai Premium est actif jusqu'au {date}."
- Trial expire :
  "Votre essai Premium est termine. Vos donnees sont conservees."
- Annulation programmee :
  "Votre abonnement restera actif jusqu'au {date}."
- Annuel :
  "59,99 EUR par an, soit 5,00 EUR par mois. 2 mois offerts."

## Decisions V1 avant Stripe

- Prix V1 : 5,99 EUR / mois et 59,99 EUR / an.
- Trial : 3 jours, sans carte bancaire.
- Trial unique par utilisateur.
- Quotas Premium annuel mensuels.
- Annulation avec droits conserves jusqu'a la fin de periode.
- Stripe Checkout pour l'achat initial.
- Stripe Customer Portal pour annuler, changer de moyen de paiement et consulter
  les factures.
- Stripe webhook comme source de verite des droits payants.

## Roadmap implementation

1. Corriger les quotas backend pour aligner `docs/rbac.md` et le code :
   - Trial IA : 10 generations sur 3 jours ;
   - Premium IA : 100 generations par mois ;
   - Drive Trial : 3 imports sur 3 jours ;
   - Drive Premium : 25 imports par mois.
2. Ajouter les champs billing au modele Prisma.
3. Ajouter la table d'idempotence Stripe events.
4. Creer le module backend `billing`.
5. Implementer `POST /billing/trial/start`.
6. Implementer `POST /billing/checkout`.
7. Implementer `POST /billing/portal`.
8. Implementer `POST /billing/webhook`.
9. Adapter `AccessPolicyService` pour :
   - conserver les droits Premium si `CANCELLED` mais periode encore active ;
   - repasser en Free apres fin de periode ;
   - exposer les champs utiles a l'UX.
10. Adapter la page abonnement frontend aux prix V1.
11. Ajouter les tests backend billing.
12. Tester un cycle complet en mode test Stripe.

## Criteres d'acceptation

- Un utilisateur Free eligible peut activer un trial sans carte.
- Un utilisateur ne peut pas activer deux trials.
- Un trial actif donne les droits Premium pendant 3 jours.
- Un trial expire applique les droits Free sans supprimer les donnees.
- Un utilisateur peut choisir Premium mensuel a 5,99 EUR.
- Un utilisateur peut choisir Premium annuel a 59,99 EUR.
- Le retour Checkout seul n'active pas Premium sans webhook valide.
- `checkout.session.completed` active Premium.
- Un renouvellement reussi met a jour la periode courante.
- Une annulation garde Premium jusqu'a la fin de periode.
- Une subscription terminee repasse aux droits Free.
- Un webhook rejoue deux fois ne double pas les effets.
- Le frontend affiche l'annuel comme offre recommandee.
- Les quotas visibles correspondent aux quotas backend.
- Les IDs Stripe ne sont jamais hardcodes dans le frontend.

## Points hors perimetre V1

- coupons complexes ;
- parrainage ;
- plan famille ;
- plan entreprise ;
- prorata manuel dans InEat ;
- remboursement automatique depuis l'application ;
- facturation multi-devise ;
- achat in-app mobile ;
- relance email billing maison, hors emails Stripe.
