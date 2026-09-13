# Star Wars FFG Tonio — livraison à tester sous Windows

Système **2.1.0**, compendium **0.18.0**. Archives préparées localement, aucune publication GitHub. Les essais en jeu de cette combinaison restent à faire sous Windows, à la demande d’Antoine.

## Dans le système

Le système contient le fonctionnement des fiches, des dés et des effets, ainsi que les images des dés. Il ne contient pas les nouveaux journaux de référence ni les données privées de la campagne.

- Adaptation Foundry v14 : fiches et dialogues V2, modèles de données, migration des effets et API de jets/messages.
- Réserves de Destin : panneau compact, poignée de déplacement et position conservée.
- Fiches de personnages et d’objets : thème clair, onglets latéraux accessibles, taille initiale adaptée et indicateur de redimensionnement ; corrections de largeur du prix et de contraste des champs.
- Jets de dés : fenêtre claire, ajustement de la réserve et lancement.
- Effets : durée permanente lisible, affichage des attributs et prise en compte des bonus d’armure lors de l’équipement.
- Les trois correctifs auparavant limités au module sur Tonio 2.1.0-beta.1 sont intégrés au système : dépôt d’objets sur fiches V2, conservation de l’état équipé du matériel, recalcul des armes liées aux caractéristiques après préparation des effets du personnage.
- Tables critiques : modale `1d100 + modificateur`, résultats supérieurs à 100, gravité et icônes centrées. Un jet affiche le résultat sans appliquer automatiquement les blessures à une fiche.
- Prise en charge des libellés personnalisés de la table de campagne **Avaries**, conservée. Les résultats de cette table ne sont pas embarqués dans le système.

Vérifications : 98 fichiers JavaScript contrôlés, **65 tests système réussis**. Aucune modification des fichiers du cœur Foundry.

## Dans le compendium 0.18.0

**3 515 documents**, répartis dans les cinq packs existants. Une base anglaise et une traduction française Babele, avec les mêmes identifiants. Les 3 514 documents du ZIP 0.17.0 sont conservés à l’identique ; seul le journal d’équipement Roll20 est ajouté.

| Pack | Contenu |
|---|---|
| Personnages et équipement | 1 435 fiches : 58 espèces, 20 carrières, 24 spécialisations, 391 armes, 107 armures, 593 équipements, 130 modificateurs, 102 accessoires et 10 accessoires de vaisseaux |
| Talents | 308 talents |
| PNJ et véhicules | 1 431 PNJ et 331 véhicules |
| Documents de référence | 4 journaux, 30 pages, **38 tableaux numériques** ; les pages de guide et de source manquante ne sont pas des tableaux |
| Tables de tirage | 6 RollTables, 91 résultats |

Les tableaux documentaires servent à consulter les règles et les statistiques. Ils ne créent pas de nouveaux objets équipables ; ceux-ci se trouvent dans le pack Personnages et équipement.

### Tables du livre de base : toutes incluses en FR/EN

| Journal | Table |
|---|---|
| Combat et soins | 6-1 — Difficulté des attaques à distance |
| Combat et soins | 6-2 — Utilisation des avantages et triomphes au combat |
| Combat et soins | 6-3 — Utilisation des menaces et désastres au combat |
| Combat et soins | 6-4 — Modificateurs par distance |
| Combat et soins | 6-5 — Armes improvisées |
| Combat et soins | 6-6 — Gabarits et personnages |
| Combat et soins | 6-7 — Camouflage |
| Combat et soins | 6-8 — Feu, acide et atmosphères corrosives |
| Combat et soins | 6-9 — Dégâts de chute |
| Combat et soins | 6-10 — Blessures critiques, p. 217 |
| Combat et soins | 6-11 — Difficulté du test de Médecine |
| Création de personnage | 2-1 — Obligations, p. 39 |
| Création de personnage | 2-6 — Ambitions spécifiques, p. 95 |
| Création de personnage | 2-7 — Causes spécifiques, p. 95 |
| Création de personnage | 2-8 — Relations spécifiques, p. 96 |
| Vaisseaux et véhicules | 7-9 — Dégâts critiques de vaisseaux, p. 245 |

Ces **16 tableaux** reprennent le travail de ce projet déjà intégré par le projet Compendium en 0.17.0. Les textes et cellules sont numériques ; les dés utilisent les images du système. Les références aux sources sont en italique.

Les six tables à lancer correspondantes sont : **Blessures critiques**, **Dégâts critiques de vaisseaux**, **Obligations**, **Ambitions spécifiques**, **Causes spécifiques**, **Relations spécifiques**. Les critiques se terminent par **151+** pour les personnages et **154+** pour les vaisseaux ; la borne interne étendue sert au calcul. Les autres tables utilisent un d100 normal. Une instruction « tirer deux fois » reste à effectuer manuellement.

### Équipement Roll20 : ajouté en 0.18.0, en FR/EN

Dans **Documents de référence → Équipement · Références Roll20** :

| Catégorie | Lignes disponibles |
|---|---:|
| Armures | 54 |
| Communication | 10 |
| Cybernétique | Source manquante — page explicative, pas de tableau inventé |
| Détection | 11 |
| Armes | 207 |
| Drogues & poisons | 20 |
| Infiltration & espionnage | 14 |
| Informatique | 14 |
| Loisirs | 10 |
| Médical | 14 |
| Outils | 23 |
| Sécurité | 13 |
| Survie | 13 |
| **Total** | **403** |

Les armes sont réparties en dix rubriques : corps à corps, jet, pugilat, exotiques, percussion, blasters légers, blasters lourds, grenades, mines/explosifs, missiles/torpilles/lanceurs. Les blasters lourds occupent deux tableaux dans la source : cela donne **22 tableaux d’équipement** au total, ajoutés aux 16 tableaux du livre.

Les 1 053 segments de texte disposent d’une version anglaise. L’anglais est une traduction de travail de la source française, pas une transcription certifiée des éditions anglaises. Les références de livres et pages conservent leurs libellés d’origine. Les incohérences de la source restent visibles, notamment quelques difficultés dont le nom et le nombre diffèrent ; les cellules numériques et les icônes ne sont pas changées.

La page Cybernétique de Roll20 était vide et son image renvoyait 404. Les fiches individuelles cybernétiques déjà présentes dans le pack d’équipement restent disponibles ; c’est le **tableau documentaire Roll20** qui manque.

## Projet Source Roll20 : contenu de campagne distinct

Le projet « Star Wars FFG - Source Roll20 » a installé les éléments suivants dans le **monde de test WSL**, pas dans le compendium public ni dans les fichiers du système :

- Premier lot : 23 journaux de campagne, avec notes, résumés, messages et documents des personnages. Deux documents composés uniquement d’images restent incomplets ; d’autres images manquantes sont signalées dans son inventaire.
- Complément : 16 journaux (6 backgrounds de PJ, 2 notes, 6 documents Fragments de Guerre, 2 règles), plus un journal d’accueil avec les liens.
- Les deux règles sont **Astrogation** et **Carburant, entretien et réparation des vaisseaux**.
- Quatre véhicules : **Redsword**, **Prophecy**, **GX1 Condor**, **voiture des nuages Killik**, avec 9 armes et 15 kits intégrés. Certaines armes avaient zéro dégât dans la source et restent à vérifier.
- Trois PNJ provisoires : **Garde Nikto**, **Vrblther**, **Diagona**. Les biographies ont été récupérées ; leurs statistiques n’étaient pas accessibles.
- **Avaries** : table de campagne distincte des dégâts critiques de vaisseaux du livre. 34 résultats sources et une ligne **90–99 : « À préciser avec Fred »**, conservée avec accord d’Antoine. Dernière plage **265+**. Le jet utilise la modale et un modificateur total saisi manuellement.

Ces imports existent dans la copie WSL ; installer le système et le compendium sous Windows ne transfère pas ces documents privés. Leur import Windows constitue une opération séparée avec le lot du projet Source Roll20. Ils ne seront pas publiés accidentellement dans les deux ZIP.

## Installation pour les essais Windows

1. Sauvegarder le monde et arrêter Foundry.
2. Mettre de côté l’ancien dossier du système `Data/systems/starwarsffg`, puis le remplacer par le contenu de `system.zip` dans un dossier `starwarsffg`.
3. Mettre de côté l’ancien module `Data/modules/swffg-compendium-bilingual`, puis extraire le ZIP 0.18.0 dans `Data/modules` : il contient déjà son dossier `swffg-compendium-bilingual`.
4. Relancer Foundry v14, activer Babele et le compendium. Le module demande désormais le système 2.1.0, qui contient ses correctifs.
5. Tester le dépôt d’espèce/carrière, l’équipement d’une armure et d’un matériel à effet, les dégâts liés à la Vigueur, les pages FR/EN et un critique avec modificateur.

Les anciens modules de référence séparés `swffg-reference-tables-fr` et `swffg-roll20-equipment` ne sont plus nécessaires pour ouvrir ces nouveaux packs. Conserver ceux vers lesquels pointent encore d’anciens liens de ton monde, ou remplacer ces liens avant de les désactiver. Les documents déjà importés restent des copies indépendantes.

Validation hors jeu : intégrité LevelDB, traductions par identifiant, conservation du ZIP précédent, 403 lignes et cellules numériques, 394 occurrences d’images de dés dans les références FR/EN, neuf cas de modale critique. **Les essais en jeu Windows de 0.18.0 restent à effectuer** ; les anciens résultats en jeu 0.17.0 ne sont pas présentés comme des tests de cette livraison.

Les deux archives peuvent être jointes à une même release GitHub du dépôt `misterWhite25/StarWarsFFG`, avec `system.json` et `module.json`. Rien n’a été publié. Les liens distants de mise à jour ne seront utilisables pour cette version qu’après publication.
