# StarWarsFFG

Ceci est une implémentation du jeu de rôle  [Star Wars de Fantasy Flight Games](http://www.fantasyflightgames.fr/jeux/collection/star_wars_aux_confins_de_lempire/) pour le programme [Foundry Virtual Tabletop](https://foundryvtt.com/).

- Pour le support de ce systeme de jeu : Discord [The Foundry](https://discord.gg/bNyxuk9) #starwars-ffg
- Pour le support de la communauté Francaise : Discord [La Fonderie](https://discord.gg/pPSDNJk) #starwars-ffg
- Lire ce document dans une autre langue : [English](https://github.com/StarWarsFoundryVTT/StarWarsFFG/blob/master/README.md)

# Prérequis

Ce système a besoin du module [Special Dice Roller](https://foundry-vtt-community.github.io/wiki/Community-Modules/#special-dice-roller) pour lancer les dés et évaluer les résultats.
Ce module est disponible dans la bibliothèque de modules intégré au logiciel. Après l'avoir installé, vous aurez besoin de l'activer dans le monde. [GitHub](https://github.com/BernhardPosselt/foundryvtt-special-dice-roller)

# Installation

## Installation du système de jeu Star Wars FFG

1. Lancer Foundry VTT
2. Aller dans la tabulation "Systèmes de Jeu"
3. Cliquer sur le bouton "Installer un Système de jeu"
4. Copier le lien suivant dans le champ "URL du Manifest":
   https://raw.githubusercontent.com/StarWarsFoundryVTT/StarWarsFFG/master/system.json
5. Cliquer sur Installation, après quelques secondes le système devrait être installé.
6. Installer (si ce n'est pas déja fait) le module "Special Dice Roller", voir en-dessous pour les détails.

## Installation du module "Special Dice Roller"

1. Aller dans la tabualtion "Modules"
2. Cliquer sur le bouton "Installer un Module"
3. Dans le champ de recherche, taper "Special"
4. Appuyer sur le bouton "Installation" pour le module "Special Dice Roller".

# Contribuer

Veuillez consulter [CONTRIBUTING.md](https://github.com/StarWarsFoundryVTT/StarWarsFFG/blob/dev/CONTRIBUTING.md).

# A Faire

Voyez nos objectifs de productions et nos progés [ici](https://github.com/StarWarsFoundryVTT/StarWarsFFG/projects/1).

# Journal des modifications

- 03/07/2020 - Esrin - Lise à jour du gestionnaire de groupes pour utiliser "game.settings" pour la réserve de points de destins. Ceci permet la réplication des valeurs sur tout les clients connectés ainsi que la persistance entre les sessions.
- 03/07/2020 - Esrin - Répara l'affichage des Blessures et du Stree dans le gestionnaire de groupes, utilise l'attribut ".value" au lieu de ".real_value" maintenant.
- 02/07/2020 - CStadther - Correctif de bug - Système d'imports. Répara le soucis si des compendiums vérouillés sont présents au moment de l'import.
- 02/07/2020 - CStadther - Correctif de bug - Système d'imports. Sépara l'import des spécialisation des autres éléments pour que les talents soient prêt avant la création des spécialisations.
- 30/06/2020 - Cstadther - Correctif de bug - Système d'imports. Tout les talents listés étaient listés comme des talents ayant des rangs a cause des booleans mal interprétés.
- 30/06/2020 - ezeri - Correctif de bug mineur sur le nommage d'une compétence
- 30/06/2020 - Cstadther - Refactorisation du code gérant les lancés de dés dans un module externe. Intégra l'utilisation du bouton de lancé de dé du chat.
- 29/06/2020 - Cstadther - Rajout de l'import des Spédialisation depuis les données OggDude
- 29/06/2020 - ezeri - Localisation Francaise etendue dans la documentation (rajout de README-fr.md)
- 29/06/2020 - Cstadther - Rajout de l'option pour créer un log au moment de l'import
- 29/06/2020 - Cstadther - Rajout de la fonction d'import des images pour les armes / armures / equipement depuis les donnees de OggDude
- 24/06/2020 - Esrin - Correction de bug #160 & #159 - Limité l'utilisation des feuilles de personnages Adversaires aux acteurs de type "character".
- 24/06/2020 - Esrin - Correction de bug #161 - Intégré la vérification qu'une armure est portée pour le calcul de l'encombrance.
- 23/06/2020 - Cstadther - Correction de bug # 154 - Rajouté la différenciation de types de dégats pour les armes de mélée (Dégâts rajoutés) Intégré ces modifications dans le calcul des dégâts de l'arme (en complément de la vigeur).
- 23/06/2020 - Cstadther - Correction de bug # 155 partie 2 - Rajouté des attributs dans le template.json structure pour les pouvoirs de force et les specializations
- 23/06/2020 - Cstadther - Correction de bug # 155 - Les talents de force du compendium n'ont pas de champ d'attributes jusqu'à ce qu'ils soient importés dans le monde depuis le compendium.
- 23/06/2020 - Cstadther - Correction de bug # 152 - Taille des silhouette des vaisseaux.
- 22/06/2020 - Cstadther - Rajouta une option pour désactiver le calcul automatique de l'encaissement.
- 22/06/2020 - Cstadther - Amélioration - Gestion des erreurs a l'import des datas, et import asyncrhone.
- 21/06/2020 - Cstadther - Rajout de l'import des armures.
- 21/06/2020 - Cstadther - Rajout de l'import des armes.
- 21/06/2020 - Cstadther - Rajouta la mise a jour des items présent dans le compendium, de façon à ce que l'import puisse mettre aà jour correctement.
- 21/06/2020 - Cstadther - Intégra l'import de l'équipement, correction de bug avec la version 0.6.3 lié au changement de structure des compendiums.
- 21/06/2020 - Esrin - Retravailla le comportement du HUD pour que les fonctionalités core marchent avec la gestion des seuils de blessur et de stress de FFG.
- 21/06/2020 - Cstadther - Intégra le coût d'améliorations aux fiches de pouvoir de force.
- 21/06/2020 - Cstadther - Mise à jour Import de pouvoir de force - Suppression des rangées inutiles pour les pouvoirs de force qui ne les utilisent pas (ex. Soin/Blessure)
- 21/06/2020 - Cstadther - Correction de bug #126 - Cliquer sur un journal integre (dans une autre page) déclenche maintenant l'editeur aussi.
- 21/06/2020 - Cstadther - Correction de bug #138 - Fix CSS pour les connecteurs dans les spécialisations.
- 20/06/2020 - Cstadther - Intégra la gestion des symboles de OggDude pour améliorer le texte importé.
- 20/06/2020 - Cstadther - Rajoute l'import des pouvoirs de force depuis OggDude.
- 20/06/2020 - Cstadther - Correction de bug - Variable mal nomée dans l'importer.
- 19/06/2020 - Cstadther - Correction de bug #123 - Intégra la valeur localisée dans le dialogue de changement de caractéristiques.
- 19/06/2020 - Cstadther - Correction de bug pour l'erreure consle quand l'index du pack n'avait pas encore été généré.
- 19/06/2020 - Cstadther - Correction de bug pour les rangs de talents qui ne se cumulait pas correctement.
- 18/06/2020 - Cstadther - Première passe a l'Import des Talents depuis les données de OggDude.
- 17/06/2020 - Cstadther - Rajouta une case "Talent de Force" aux talents, intégration dans les feuilles de spécialisation.
- 17/06/2020 - Cstadther - Création feuille des Adversaires qui cache tout pour les non-owner sauf l'image, le nom et l'espèce. Le nom est dans le titre du Dialogue et ne peut pas facilement être changé.
- 17/06/2020 - Esrin - Localisation de tout les paramêtres systèmes.
- 17/06/2020 - Esrin - Rajouta un nouveau mode pour lister les joueurs dans le gestionnaire de groupes pour les gens qui partagent une session.
- 17/06/2020 - Esrin - Intégra l'option 'équipé' dans la partie des armures de l'inventaire du personnage. Seul l'armuer équipée appliquera sa valeur d'encaissement.
- 17/06/2020 - Cstadther - Correction de bug - Largeur du dialogue de séléction des caractéristiques.
- 17/06/2020 - Cstadther - Correction de bug #60 - Localization des dés.
- 17/06/2020 - Cstadther - Correction de bug #60 - Localization des dés.
- 17/06/2020 - Esrin - Intégra une vue limitée pour les joueurs dans le système de gestion des groupes.
- 17/06/2020 - Esrin - Fit en sorte que le tri alphabétique des compétences soit optionnel. Par défaut c'est désactivé.
- 17/06/2020 - Esrin - Répara la localisation des compétences pour les compétences de type Connaissances.
- 17/06/2020 - Cstadther - Amélioration #91, Différence de couleur pour les talents dans les arbres de spécialisation entre Actif et Passif.
- 16/06/2020 - Cstadther - Correction de bug vis à vis du lien bi-directionnel talents <-> spécialisation
- 16/06/2020 - Cstadther - Correction de bug #90, intégra le coût des talents dans les arbres de spécialisation.
- 16/06/2020 - Cstadther - Correction de bug #97, Réparation de l'apercu des talents quand on clique dessus.
- 16/06/2020 - Cstadther - Création du dialogue de changement de caratéristique, et intégration des valeurs localisés.
- 14/06/2020 - Cstadther - Rajouté la fonctionalité de change la caractéristque associe a une compétence.
- 14/06/2020 - Cstadther - Correction de bug #87 Valeur min/max des compétences et des caractéristiques
- 14/06/2020 - Cstadther - Correction de bug dans la fonction PrepareData de la feuille de personnage.
- 14/06/2020 - Cstadther - Correction de bug pour l'affichage des items, design plus réactif en enlevant la hauteure fixe établie.
- 14/06/2020 - Esrin - Correction de bug pour pas mal de soucis de performances dût a des faux acteurs contenant des objets de spécialisations.
- 14/06/2020 - Cstadther - Correction de bug #92, intégration d'un scrollbar dans les boites de dialogue des talents et des forces.
- 13/06/2020 - Cstadther - Rajouta un hook et le remplacement du texte pour rajouter les symboles de des dans les Journaux.
- 13/06/2020 - Esrin - Rajouta 4 points de talent supplémentaire a l'arbre de spécialisation pour correspondre aux exemples du livre de regles.
- 13/06/2020 - Esrin - Rajouta la localisation lies aux talents sur la feuille de specialisation.
- 13/06/2020 - Esrin - Améliorations QoL des spécialisations pour les garder synchronises avec des changements dans les descriptions et les activations des talents lies.
- 13/06/2020 - Esrin - Restaura le systeme de talents individuels sur les feuilles de personnage pour permettre le rajout de talents non-associe a une specialisation (rivaux, nemesis par exemple)
- 13/06/2020 - Esrin - Correction de bug du champ de description des pouvoirs de force.
- 12/06/2020 - Cstadther - Rajouta les arbres de spécialisation, en utilisant le systeme de glisse-depose. Seulemen tpour les personnages.
- 12/06/2020 - Esrin - Fini la premiere implementation du gestionnaire de groupe et rajoute les derniers hooks de localisation.
- 12/06/2020 - Cstadther - Rajouta l'editeur externe et le rendu des symbols des dés. Améliora l'éditeur pour spécifier la hauter/largeur/gauche et haut.
- 12/06/2020 - Cstadther - Rajouta l'editeur externe pour les specialisations et le rendu des symboles.
- 12/06/2020 - Esrin - Rajouta des messages d'alerte au demarrage si le module 'Special-Dice-Roller' n'est pas installe et activé.
- 12/06/2020 - Esrin - Première passe sur la feuille de groupe. Rajoute automatiquement les personnages joueurs, permet d'ouvrir leurs feuills, changer le mode d'initiative et utiliser les points de destin. D'autres fonctionalites en cours.
- 10/06/2020 - Cstadther - Réintégra les points de force dans l'onglet des talents.
- 10/06/2020 - CStadther - Correction de bug pour le champ de description des pouvoirs de force.
- 09/06/2020 - CStadther - Rajouta la fonction glisser-deposer sur les armes, armures et l'equipement entre acteurs.
- 08/06/2020 - CStadther - Rajouta les pouvoirs arbres des pouvoirs de force et les vues associes dans les feuilles de personnage.
- 07/06/2020 - Esrin - Debut de localisation de la fenetre de gestion de groupe.
- 07/06/2020 - Esrin - Rajouta de nouvelles options de localisation pour les types de modificateur.
- 07/06/2020 - Esrin - Ajouta de nouvelles localisations pour les talents.
- 07/06/2020 - Esrin - Repara la localisation sur les feuilles des personnages, sbires et vehicules pour la distance des armes et l'orientation des armes.
- 07/06/2020 - Jaxxa - Modifia les systemes de seuil de blessure et de stress pour etre compatible avec les barres de ressources.
- 06/06/2020 - Jaxxa - Rajouta des automatisations a la feuille de personnage des sbires pour calculer le nombre de minions vivant et reduit leurs competences quand ils meurent.
- 05/06/2020 - CStadther - Integra les librairies select2 libraries pour de meilleurs dropdowns.
- 05/06/2020 - CStadther - Integra les types d'objet pour les Blessures Critiques et les Coups Critiques, ainsi que leurs zones dedies dans les feuilles de personnages des vehicules et des personnages.
- 05/06/2020 - CStadther - Standardisation de tout les hook de localisation pour toutes les langues.
- 05/06/2020 - Esrin - Enleva les tables legacie de Blessure Critiques.
- 04/06/2020 - Esrin - Completa la transition complete a SASS, enleva les anciens fichiers swffg.css et porta toute la logique CSS dans les bons fichiers SASS.
- 04/06/2020 - HDScurox - Mise a jour du fichier de langue Allemand.
- 04/06/2020 - ForjaSalvaje - Mise a jour du fichier de langue Espagnole.
- 03/06/2020 - CStadther - Integra la localisation pour toutes les valeurs dans `swffg-config.js`.
- 03/06/2020 - Esrin - Modifications aux valeurs de la distance des senseurs.
- 03/06/2020 - CStadther - Repara les soucis de position sur les tool tips des feuilles de vehicules.
- 03/06/2020 - CStadther - Transforma la partie inoccupe du bas dans la section biographie des vehicules.
- 03/06/2020 - CStadther - Integra la localisation pour tout les noms de competences.
- 03/06/2020 - HDScurox - Mise a jour de la localisation Allemande.
- 03/06/2020 - Esrin - Integra l'implementation de la position du scroll pour conserver la position sur la feuille de personnage quand des elements sont rajoutes sur les feuilles de personnages des acteurs. Ca ne remonte plus chaque fois que tu fais un changement!
- 03/06/2020 - CStadther - Refit la stylisation des feuilles de personnages des vehicules.
- 03/06/2020 - Esrin - Correction de bug sur l'affichage des competences des feuilles de personnages des sbires.
- 02/06/2020 - Esrin - Modifications legeres sur les feuilles de styles.
- 02/06/2020 - Esrin - Correctif de bugs sur la feuille des sbires.
- 02/06/2020 - CStadther - Stylisation de le feuille des vehicules.
- 02/06/2020 - ForjaSalvaje - Traduction Espagnol.
- 02/06/2020 - Esrin - Modification de la stylisation et des correctifs sur les feuilles des sbires sur les suggestions de Mandaar.
- 02/06/2020 - Mandaar - Localisation Francaise.
- 02/06/2020 - HDScurox - Localisation Allemande.
- 02/06/2020 - CStadther - Feuilles de stylisation des sbires.
- 02/06/2020 - Esrin - Correctifs temporaire pour les feuilles des vehicules et des sbires en attendant la refonte de CStadther.
- 02/06/2020 - Esrin - Correctifs mineurs aux feuilles de personnages, valeurs d'encaissement desactive pour le calcul automatique, les valeurs max et actuels d'encombrement sont remit dans les bons champs.
- 02/06/2020 - CStadther - Refonte majeur des feuilles de style.
- 02/06/2020 - Jaxxa - Rajout des icones dans la fenetre de lancer de dés.
- 31/05/2020 - Esrin - Travail sur le systeme de gestion des groupes. La reserve de dés de destin fonctionne maintenant (se remettra a zero une fois la page actualisee). Liste des joueurs en cours.
- 31/05/2020 - Esrin - Correctif sur les hooks de localisation pour la quantite d'equipement sur les feuilles de personnage (merci Alex | HDScurox d'avoir remonte le soucis).
- 31/05/2020 - CStadther - Rajout du systeme de configuration SASS en utilisant Gulp.
- 31/05/2020 - CStadther - Correctif mineur sur les evenments de bouton appuye sur les .item pour empecher des erreurs dans la console quand des .item non lites a la feuille de personnage sont declenches, tel les tabulations.
- 31/05/2020 - CStadther - Integration de la localisation pour les feuilles de personnage.
- 29/05/2020 - Esrin - Correctif mineur sur les feuilles des vehicules, divers champs accepteront des valeurs en string pour permettre des changements aller-retour comme demande par Alex | HDScurox.
- 28/05/2020 - Esrin - Mis a jour la feuille de personnage des sbires pour incorporer les derniers changements fait sur les feuilles des personnages. Rajout des talents aux sbires. Correctif de bug mineur dans le calcul des competences de groupe(merci Alex | HDScurox de l'avoir remarque).
- 25/05/2020 - Esrin - Modification des feuilles de personnages. Amelioration continues sur l'affichage de l'inventaire en preparation pour la possibilite d'eaquiper les objets.
- 22/05/2020 - Esrin - Correctifs mineurs et ameliorations mineurs, verification de compatibilite avec la release FVTT 0.6.0.
- 18/05/2020 - alfarobl - Amelioration de l'ordre d'affichage des des pour correspondre a l'ordre fait dans le chat, fourni aimablement par alfarobl.
- 18/05/2020 - Esrin - Une methodologie extremement douteuse a ete introduit pour permettre au systeme de gestion des combats de FoudnryVTT de comprendre les systemes de lances de des de FFG. Le nombre est resultat est une operation mathemtique base sur les succes et les avantages. Par exemple 1 succes et 2 avantages donne la valeur 1.02 en initiative. Attention, il y aura peut-etre des soucis avec cette solution. L'initiative peut etre base sur Calme ou Sang-Froid grace aux options dans la configuration du monde.
- 13/05/2020 - Esrin - Suite des modifications des feuilles de personnages.
- 12/05/2020 - Esrin - Retravailla l'entite des feuilles de personnages pour etre une seule entitee avec des options dynamiques bases sur actor.type. Beaucoup plus simple a maintenir dans un seul endroit maintenant.
- 12/05/2020 - Esrin - Premiere passe des amelioration de l'affichage de l'inventaire pour montrer plus d'information quand on passe la souris sur certaines wones (le nom donne la descruption, le champ special donne le text entier, etc...) Il reste encore beaucoup de travail sur les feuilles en general.
- 11/05/2020 - Esrin - Premiere passe sur des ameliorations de Qualite de Vie pour l'affichage de l'inventaire (en cours). Correctifs de bugs mineurs.
- 11/05/2020 - Esrin - Correctif de bug sur les feuilles de vehicules qui empechait l'ecriture de donnees dans certains champs.
- 11/05/2020 - Esrin - Retravail des obglies des modificateurs pour etre plus sur et facile a utiliser pour l'utilisateur. Seul l'encaissement est calcule automatiquement pour l'instant. Le calcul automatique des autres stats / characteristiques / talents n'est pas une priorite actuellement, alors on va lever le pied sur le sujet.
- 11/05/2020 - Esrin - Amelioration le design des feuilles des vehicules pour avoir la Defence a visible de tout les cotes dans une visualisation en croix.
- 11/05/2020 - Esrin - Integra la Portee, le Talent, et l'ARc de tir, ainsi que l'activation des menu déroulants pour les items et pour les talents quand approprié.
- 11/05/2020 - Esrin - Rajout du filtre des talents sur les personnages et les champs des sbires, ermettant un filtrage par "General", "Combat" et "Connaissances".
- 11/05/2020 - Esrin - Integration d'une case a coche pour indiquer qu'une competence est de carriere.
- 11/05/2020 - Esrin - Correctif sur le maniement sur les feuilles de vehicules. Affiche maintenant un + pour les valeurs positifs.
- 09/05/2020 - Esrin - Nouvelle table pour les Blessures Critiques.
- 09/05/2020 - Esrin - Nettoyage des items pour utiliser juste une classe JS et recuperer les templates dynamiques par type.
- 09/05/2020 - Esrin - Elaboration des feuilles pour les armes des vehicules et pour les ameliorations des vehicules.
- 09/05/2020 - Esrin - Creation feuille de personnage pour les vehicules.
- 09/05/2020 - Esrin - Integration structure de donnee pour les armes des vaisseaux et pour les modificateurs des vaisseaux
- 09/05/2020 - Esrin - Integration structure pour les vehicules (en utilisant le travail de Jaxxa's en tant que base)
- 09/05/2020 - Esrin - Integration de l'argent pour les joueurs
- 09/05/2020 - Esrin - Calcul de l'encombrement pour les objets
- 09/05/2020 - Esrin - Calcul de la valeur d'encaissement base sur la vigeur, l'armure équipée et les modificateurs sur els armes, léquipement et les talents en tant que test pour l'automatisation.
- 08/05/2020 - Esrin - Etendue la classe Actor pour permettre le calcule des statistiques des sbires (seuil de blessure base sur l'unite de blessure, et competences base sur les competences de groupe)
- 08/05/2020 - Esrin - Rajout de la structure de donnees pour les sbires.
- 08/05/2020 - Esrin - Creation de la feuille de personnage pour les sbires.
- 08/05/2020 - Esrin - Mis a jour de la feuille de personnage principal pour montrer orrectement les 3 types d'items prinicipaux, ainsi que les talents.
- 08/05/2020 - Esrin - Integration de la structure pour les talents.
- 08/05/2020 - Esrin - Mise a jour de la feuille de personnage principal pour montrer l'XP sur toutes les pages, et l'obligation etc. uniquement sur la page biographie.
- 08/05/2020 - Esrin - Mis en place d'une feuille de personnage tres simple pour les 3 types d'objets principaux.
- 08/05/2020 - Esrin - Integration de la structure de donnees pour les 3 types d'items principayx (equipement, armes, et armures)
- 07/05/2020 - Esrin - Modification mineur aux styles visuels de la feuille de personnage. Debut de restructuration de la structure de donnees soujacentes dans le fichier templates.json pour introduire les meilleures pratiques, en evitant des duplication inutiles de donnees et en preparation pour l'ajout de nouveaux acteurs et types d'objets.
- 07/05/2020 - Esrin - Premiere passe sur les feuilles de styles de la feuille de personnage. Prochaine etape, talents, objets et les modificateurs derives.
- 06/05/2020 - Esrin - Rajouta "En train de lancer <skillname>" dans la fenetre de discussion pour les lancés de dés pour montrer quelle compétence la personne est en train de lancer.
- 06/05/2020 - Esrin - Rajouta une abbréviation aux caractéristiques, et refacorisation de la méthode d'affichage des compétences dans ffg-actor-sheet.html pour permettre a l'abbrevation des caractéristiques liés de s'afficher.
- 06/05/2020 - Esrin - Mise à jour de la calsse TabsV2 dans actor-sheet-ffg.js pour eviter la depreciation de la classe de Tabs dans les versions futures de FoundryVTT.
- 06/05/2020 - Esrin - Renomma les fichiers de base du systeme Simple World Building pour correspondre a la nomenclature de swffg.
- 06/05/2020 - Esrin - Enleva les vieilles dépendances du systeme SimpleWorldBuilding et fit la reparation selon besoin.
