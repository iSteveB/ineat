# Référentiel CIQUAL

`ciqual-2025-fresh-foods.json` est dérivé de la **Table de composition
nutritionnelle des aliments Ciqual 2025** publiée par l’Anses sous Licence
Ouverte 2.0 : https://doi.org/10.57745/RDMHWY

Le fichier embarque uniquement les groupes nécessaires aux produits frais sans
code-barres : fruits/légumes/légumineuses/oléagineux et
viandes/œufs/poissons. Les valeurs sont exprimées pour 100 g.

Pour actualiser le référentiel, télécharger le classeur officiel puis exécuter :

```sh
python3 scripts/build-ciqual-reference.py /chemin/vers/Table_Ciqual.xlsx
```
