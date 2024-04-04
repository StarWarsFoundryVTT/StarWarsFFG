# Genesys K² 

Ceci est une implémentation du jeu de rôle Genesys K², mon implémentation du système Genesys, Genesys avancée, pour le jeu de role Héroique fantastique (High fantasy) du {monde de K²](https://www-lagep.cpe.fr/public/lemonde2k2/) pour le programme [Foundry Virtual Tabletop](https://foundryvtt.com/).

- Pour le support de ce systeme de jeu : utiliser le wiki 
- Lire ce document dans une autre langue : [English](https://github.com/ZolOnTheNet/genesysK2/blob/main/README.md)

# Prérequis

D'après starwarsffg fvtt, il le faut, j'en ai pas eu besion, mais si vous rencontrez des problème

Ce système a besoin du module [Special Dice Roller](https://foundry-vtt-community.github.io/wiki/Community-Modules/#special-dice-roller) pour lancer les dés et évaluer les résultats.
Ce module est disponible dans la bibliothèque de modules intégré au logiciel. Après l'avoir installé, vous aurez besoin de l'activer dans le monde. [GitHub](https://github.com/BernhardPosselt/foundryvtt-special-dice-roller)

# Installation

Actuellement non foncitonnelle, et non modifié (ici pour starwarsffg, le super portage fait pas les fan de starwars et ffg)

1. Lancer Foundry VTT
2. Aller dans la tabulation "Systèmes de Jeu"
3. Cliquer sur le bouton "Installer un Système de jeu"
4. Copier le lien suivant dans le champ "URL du Manifest":
   https://raw.githubusercontent.com/StarWarsFoundryVTT/StarWarsFFG/master/system.json
5. Cliquer sur Installation, après quelques secondes le système devrait être installé.
6. Installer (si ce n'est pas déja fait) le module "Special Dice Roller", voir en-dessous pour les détails.

# Contribuer

Veuillez consulter [CONTRIBUTING.md](https://github.com/StarWarsFoundryVTT/StarWarsFFG/blob/dev/CONTRIBUTING.md).

# Journal des modifications

https://github.com/StarWarsFoundryVTT/StarWarsFFG/releases

l'implémentation utiliser une liste particulière, utilise aussi des dés "de magie", aka de force (pour rester au plus prés) n'ayant pas la même répartition (plus équilibré) que le dés de force Strarwars -d'après le code js-.

J'utilise principalement les dés de Genesys, mais par son système de base, qui est dit Naratif et héroïque, mais qui, de mon point de vu, ne l'est pas vraiment, certain grosse modification sont faite, je vais essayer de les mettre en options -modèle proche de Genesys ou modèle proche de Genesys avancée-

exemple : 
Ajout de Point d'Héroïsme (ou de panache) : Des points "journalier" permetant d'ajouter un dés de maitrise, une réussite directement, de transfromer 2 A(vantages) en une réussite ou de relancé un dé du pools. Raison : plus on lance de dés plus on est dans la moyenne, et on peut avoir un risque de n'avoir que des Avantages.

Le triomphe donnera 2 ou 3 réussites (au départ je pensais rajouter un dé d'aptitude) -il n'y a pas d'envoler des extrêmes au niveau dés-

Le critique des armes est utilisé plus sous le terme d'effet spéciaux, ce qui represente dans les faits.

Un effet critique sera réelement mis en place :( 6 - Rang ) Avantage pour le déclancher, avec une compétences