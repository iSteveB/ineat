-- Harmonise les lieux de stockage sur la liste unique :
-- Réfrigérateur, Congélateur, Placard, Cave, Fruits et légumes, Autre.
-- « Garde-manger » est fusionné dans « Placard », « Fruitier » devient « Fruits et légumes »,
-- et les anciens codes en minuscules des formulaires d'ajout rapide sont convertis en libellés.

UPDATE "InventoryItem" SET "storageLocation" = CASE lower(trim("storageLocation"))
  WHEN 'refrigerateur' THEN 'Réfrigérateur'
  WHEN 'congelateur' THEN 'Congélateur'
  WHEN 'placard' THEN 'Placard'
  WHEN 'garde-manger' THEN 'Placard'
  WHEN 'cellier' THEN 'Cave'
  WHEN 'cave' THEN 'Cave'
  WHEN 'fruitier' THEN 'Fruits et légumes'
  WHEN 'autre' THEN 'Autre'
  ELSE "storageLocation"
END
WHERE lower(trim("storageLocation")) IN ('refrigerateur', 'congelateur', 'placard', 'garde-manger', 'cellier', 'cave', 'fruitier', 'autre');

UPDATE "InvoiceItem" SET "storageLocation" = CASE "storageLocation"
  WHEN 'Garde-manger' THEN 'Placard'
  WHEN 'Fruitier' THEN 'Fruits et légumes'
  ELSE "storageLocation"
END
WHERE "storageLocation" IN ('Garde-manger', 'Fruitier');

UPDATE "ReceiptItem" SET "storageLocation" = CASE "storageLocation"
  WHEN 'Garde-manger' THEN 'Placard'
  WHEN 'Fruitier' THEN 'Fruits et légumes'
  ELSE "storageLocation"
END
WHERE "storageLocation" IN ('Garde-manger', 'Fruitier');
