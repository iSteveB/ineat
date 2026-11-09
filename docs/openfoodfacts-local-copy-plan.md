# Copie locale Open Food Facts — plan d'implémentation

## Statut

Implémentation démarrée le 9 novembre 2026.

Décisions confirmées :

- catalogue mondial complet ;
- PostgreSQL Railway dédié à la copie OFF ;
- import de factures comme premier consommateur ;
- scan et saisie manuelle migrés vers le même service backend dans un second
  temps ;
- fallback distant synchrone court et globalement régulé ;
- export CSV/TSV pour la première version.

## Problème rencontré

Lors de l'import d'une facture, le backend enrichit les lignes à partir des EAN
proposés par l'analyse. Les lectures Open Food Facts sont actuellement envoyées
depuis le backend Railway.

Open Food Facts limite officiellement les lectures de produits à **15 requêtes
par minute et par adresse IP**. Tous les utilisateurs servis par la même adresse
IP sortante Railway partagent donc ce quota. Plusieurs imports simultanés, ou
une seule facture comportant beaucoup d'EAN inconnus du cache, peuvent produire
des réponses HTTP `429`.

Le cas observé avec l'EAN `3280220923007` n'était pas un produit absent d'Open
Food Facts : le produit existait, mais la requête du backend avait reçu un
`HTTP_429`.

Open Food Facts peut également appliquer des limites globales et renvoyer des
`503`, indépendamment de l'adresse IP.

Documentation :

- <https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/>

## Fonctionnement actuel

Le service concerné est :

- `ineat-backend/src/invoice/services/openfoodfacts-invoice-enrichment.service.ts`

Caractéristiques actuelles :

- API produit Open Food Facts v2 ;
- concurrence par défaut de 4 requêtes ;
- délai maximal de 5 secondes ;
- cache Redis partagé par tous les utilisateurs et workers d'un même
  environnement ;
- produit trouvé conservé 30 jours dans le cache ;
- produit réellement absent conservé 6 heures ;
- erreur technique ou `429` non mise en cache ;
- déduplication en mémoire des recherches simultanées d'un même EAN, limitée au
  processus courant.

Une concurrence de 1 ne suffirait pas à respecter la limite : les réponses
peuvent être assez rapides pour dépasser malgré tout 15 requêtes par minute. Il
faudrait un véritable limiteur global partagé entre les workers.

## Pourquoi une file d'attente seule n'est pas retenue

Pour respecter prudemment la limite, il faudrait espacer les nouvelles lectures
d'environ quatre secondes :

| EAN absents du cache | Durée approximative |
| -------------------: | ------------------: |
|                    5 |         20 secondes |
|                   10 |         40 secondes |
|                   20 |            1 min 20 |
|                   30 |           2 minutes |
|                   50 |            3 min 20 |

Une file globale et un enrichissement progressif resteraient utiles comme
protection ou solution de secours, mais ils ne constituent pas une réponse
satisfaisante à long terme pour plusieurs utilisateurs simultanés.

## Décision envisagée

La cible retenue pour plus tard est :

**Railway Pro + copie locale hebdomadaire de l'export Open Food Facts + API Open
Food Facts utilisée uniquement en secours.**

Le passage à Railway Pro ne modifie pas le quota Open Food Facts. Il fournit en
revanche la capacité de stockage et les ressources nécessaires pour héberger la
copie locale tout en conservant l'infrastructure actuelle au même endroit.

Railway Pro correspond à un engagement mensuel de 20 dollars couvrant les 20
premiers dollars de consommation ; les ressources ne sont pas illimitées et un
dépassement reste facturable.

Documentation Railway :

- <https://docs.railway.com/pricing/plans>
- <https://docs.railway.com/volumes/reference>
- <https://docs.railway.com/cron-jobs>

## Architecture cible

```text
Import de facture
      |
      v
EAN normalisé
      |
      v
Table Open Food Facts locale, indexée par EAN
      | trouvé                         | absent
      v                                v
Réponse immédiate              API OFF régulée + cache Redis
```

Les données métier InEat et la copie Open Food Facts utilisent deux services
PostgreSQL Railway distincts. Cette séparation isole le stockage, les écritures
massives, les sauvegardes et le dimensionnement. Elle facilite également
l'identification de la base dérivée d'OFF pour les obligations ODbL.

## Source de données

Open Food Facts recommande de télécharger un export CSV ou JSONL lorsqu'une
application doit récupérer plus de quelques centaines de produits.

Ordres de grandeur publiés par Open Food Facts :

- export CSV : environ 800 Mo et champs principaux ;
- export JSONL complet : plus de 5 Go.

Le CSV est la première option à tester. Il contient notamment les codes,
noms, marques, quantités, catégories, images et de nombreux nutriments.

Références :

- <https://openfoodfacts.github.io/openfoodfacts-python/usage/>
- <https://github.com/openfoodfacts/openfoodfacts-server/blob/main/html/data-fields.txt>
- <https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz>
- <https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz>

## Champs requis par InEat

La copie locale doit reproduire au minimum les informations actuellement
consommées par le service d'enrichissement :

- code-barres ;
- nom du produit, avec priorité au français ;
- marque ;
- quantité ;
- URL de l'image frontale ;
- catégories normalisées ;
- Nutri-Score ;
- Eco-Score ;
- groupe NOVA ;
- texte des ingrédients, avec priorité au français ;
- nutriments utiles ;
- complétude si disponible ;
- date de dernière modification OFF, à ajouter pour le suivi de fraîcheur.

Avant l'implémentation, vérifier précisément que le CSV couvre tous ces champs.
Si certains champs indispensables sont absents, envisager soit le JSONL, soit
un modèle hybride où les données principales sont locales et les informations
secondaires sont chargées à la demande.

Les images elles-mêmes ne doivent pas être copiées dans un premier temps : seule
leur URL Open Food Facts doit être conservée.

## Import hebdomadaire envisagé

Un Cron Railway exécuté une fois par semaine devra :

1. télécharger l'export compressé dans un emplacement temporaire ;
2. vérifier le code HTTP, la taille minimale, le format et si possible une
   somme de contrôle ou un `ETag` ;
3. lire l'export en streaming sans le charger entièrement en mémoire ;
4. normaliser les EAN et ne conserver que les colonnes utiles ;
5. charger les données par lots dans une table de préparation ;
6. créer l'index unique sur le code-barres après le chargement massif ;
7. vérifier le nombre de produits et quelques EAN de référence ;
8. remplacer atomiquement la table active ;
9. conserver temporairement l'ancienne table pour permettre un retour arrière ;
10. nettoyer les fichiers et tables temporaires ;
11. publier des métriques et une alerte si l'import échoue.

L'import ne doit jamais vider ou remplacer la table active avant que la nouvelle
copie ait été intégralement chargée et validée.

## Recherche et stratégie de secours

Ordre de résolution recommandé :

1. cache Redis existant ;
2. copie locale Open Food Facts ;
3. API Open Food Facts pour un EAN absent de la copie locale ;
4. résultat `NOT_FOUND` uniquement après une réponse fiable, jamais après un
   `429`, un `503`, une interruption réseau ou un timeout.

Les appels de secours doivent utiliser :

- un limiteur distribué partagé par tous les workers ;
- un `User-Agent` identifiant clairement InEat et une adresse de contact ;
- le respect de `Retry-After` lorsqu'il est fourni ;
- un backoff exponentiel avec jitter sur `429` et `5xx` ;
- un nombre limité de nouvelles tentatives ;
- le cache Redis partagé existant.

Il faudra également migrer la lecture produit vers l'API v3 recommandée par OFF
si l'API distante reste utilisée.

## Volumétrie et coût estimés

L'estimation initiale pour une table PostgreSQL filtrée et indexée est de **2 à
5 Go**, à confirmer par un import réel. Pendant une mise à jour complète, il faut
prévoir temporairement l'ancienne table, la nouvelle table et les fichiers de
travail. Une marge de plusieurs dizaines de Go est donc préférable.

Railway facture notamment le stockage, la RAM et le CPU consommés. Le forfait
Pro simplifie la capacité disponible, mais il faudra mesurer après le premier
import :

- taille du fichier compressé ;
- taille de la table et de ses index ;
- durée de l'import ;
- pic de RAM et de CPU ;
- croissance hebdomadaire ;
- coût mensuel total de l'environnement.

Les tarifs doivent être revérifiés au moment de l'implémentation.

## Alternative étudiée : VPS

Un VPS dédié avec SQLite ou PostgreSQL serait techniquement viable et pourrait
coûter moins de 10 euros par mois. Cette option n'a pas été retenue pour le
moment, car elle ajouterait :

- administration système et mises à jour de sécurité ;
- pare-feu, HTTPS et authentification inter-services ;
- supervision et restauration des sauvegardes ;
- une nouvelle dépendance réseau entre Railway et le VPS ;
- davantage de maintenance opérationnelle.

Pour un coût final jugé proche, Railway Pro a été préféré afin de conserver les
déploiements, logs, métriques, redémarrages et services dans la même plateforme.

## Estimation d'effort

Estimation initiale pour une version robuste : **environ une semaine de travail**.

- validation du CSV et prototype d'import : 1 jour ;
- modèle de données, import en masse et indexation : 1 à 2 jours ;
- remplacement atomique et retour arrière : 1 jour ;
- intégration dans le service d'enrichissement : 1 jour ;
- limitation et secours API : 0,5 à 1 jour ;
- tests, métriques, documentation et déploiement : 1 à 2 jours.

## Critères d'acceptation

- un EAN présent localement est résolu sans appel réseau à OFF ;
- la recherche reste rapide avec plusieurs millions de lignes ;
- plusieurs imports de factures simultanés ne déclenchent pas de `429` dans le
  fonctionnement normal ;
- un import hebdomadaire échoué laisse la copie précédente utilisable ;
- les utilisateurs peuvent continuer leurs imports pendant la mise à jour ;
- les produits ajoutés récemment à OFF peuvent être récupérés par le secours
  distant ;
- aucune erreur technique distante n'est affichée comme « produit absent » ;
- l'âge de la copie locale et la date du dernier import réussi sont observables ;
- les coûts et la taille de stockage sont suivis après mise en production.

## Déploiement Railway

Créer un service PostgreSQL dédié nommé `OpenFoodFacts` et un service cron
nommé `openfoodfacts-import`, tous deux dans la région EU West. Le cron utilise
le répertoire racine `/ineat-backend`, la commande de démarrage
`pnpm run openfoodfacts:import` et une programmation hebdomadaire en UTC.

Variables à relier :

- `OPENFOODFACTS_DATABASE_URL=${{OpenFoodFacts.DATABASE_URL}}` sur le backend,
  le worker et le cron ;
- `REDIS_URL=${{Redis.REDIS_URL}}` sur le backend et le worker pour le limiteur
  distribué ;
- les seuils de validation de l'import restent aux valeurs par défaut lors du
  premier chargement complet.

Le cron doit être créé avec l'Infrastructure as Code Railway actuelle ou dans
le tableau de bord. Ne pas rattacher un nouveau service à un fichier
`railway.json`, ce mécanisme est retiré pour les nouveaux services.

## Première étape lors de la reprise

Ne pas commencer directement par modifier le service de production. Réaliser
d'abord un prototype reproductible qui :

1. télécharge le CSV officiel ;
2. inspecte ses colonnes actuelles ;
3. charge uniquement les champs nécessaires dans une table de test ;
4. mesure la taille, la durée et les ressources consommées ;
5. vérifie plusieurs EAN connus, dont `3280220923007` ;
6. confirme que les données obtenues sont équivalentes à la réponse API utilisée
   aujourd'hui.

Ces mesures permettront de valider définitivement le choix CSV/JSONL, le modèle
de table et le dimensionnement Railway avant toute migration.
