# StarWarsFFG

## Installation et mises à jour du fork Tonio

Manifest du système à utiliser dans **Game Systems → Install System → Manifest URL** :

```text
https://github.com/misterWhite25/StarWarsFFG/releases/latest/download/system.json
```

Téléchargements : https://github.com/misterWhite25/StarWarsFFG/releases . Pour une installation manuelle, choisir l’asset **system.zip** d’une release, pas les archives GitHub « Source code ».

Une fois installé avec le manifest de ce fork, le bouton **Update** de **Game Systems** permet d’installer les nouvelles releases compatibles. Il n’est pas nécessaire de réinstaller les mondes ni les compendiums à chaque mise à jour. Sauvegarder le monde avant une mise à jour du système, car la première ouverture peut migrer ses données. Les modules se mettent à jour séparément dans **Add-on Modules**. Les documents déjà importés d’un compendium restent des copies du monde, et ne sont pas remplacés par une mise à jour du pack.

Le fork conserve l’identifiant `starwarsffg`. Vérifier que son manifest pointe vers **misterWhite25/StarWarsFFG**, pas vers le dépôt amont. Les versions locales modifiées ne doivent pas être remplacées avec Update avant d’avoir été sauvegardées ou publiées.

Le compendium **Star Wars FFG — Compendium FR / EN** est un module séparé, pas inclus dans `system.zip`. Il est distribué sous forme de ZIP dans les releases du même dépôt **misterWhite25/StarWarsFFG** ; aucun second dépôt n’est nécessaire. Après sa première publication, son manifest prévu sera :

```text
https://github.com/misterWhite25/StarWarsFFG/releases/latest/download/module.json
```

Il s’installe via **Add-on Modules → Install Module**, avec Babele et ses dépendances. Son archive préparée est `swffg-compendium-bilingual-0.18.0-steelers.zip` ; le manifest prévu n’est pas annoncé comme actuellement téléchargeable.

Chaque release stable doit contenir **system.json**, **system.zip**, **module.json** et le **ZIP du compendium**, même si un seul paquet change. Les numéros de version des deux paquets restent indépendants ; leurs liens `download` doivent viser le tag commun de la release. Le ZIP du compendium est joint à la release, sans être committé dans le dépôt.

### Version 2.1.0 — essais Windows

Le système intègre les correctifs de dépôt V2, de persistance de l’état équipé du matériel et de recalcul des dégâts après les effets de caractéristiques. Ils ne dépendent plus d’un script propre au compendium. Le compendium 0.18.0 ajoute les références d’équipement Roll20 en FR/EN.

[Inventaire complet des contenus et installation Windows](CONTENU.md).

98 fichiers JavaScript vérifiés et 65 tests système réussis. Les tests en jeu de la combinaison système 2.1.0 + compendium 0.18.0 restent à effectuer sous Windows. Aucune release n’a été publiée. Le workflow prépare les champs du manifest à partir du tag réel et ne publie pas au catalogue officiel Foundry ; il conserve les assets du compendium joints à la release.

Le canal `releases/latest` vise les releases stables. Une préversion demande un canal distinct.

Références : https://foundryvtt.com/article/system-development/ ; https://foundryvtt.com/article/modules/ ; https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases







This is an unofficial implementation of the [Fantasy Flight Games Star Wars](https://www.fantasyflightgames.com/en/starwarsrpg/) series of Star Wars RPG systems for Foundry VTT.

Full support for other Genesys-based systems is also included.

This system is made by fans, for fans, and is not associated with Fantasy Flight Games or their partners in any way.

The system for Foundry VTT contains no rules or proprietary content from the various official RPG sourcebooks by Fantasy Flight Games. It is intended to make the process of enjoying the Star Wars and Genesys RPG systems via an online tabletop experience as easy as possible, but you will still need to purchase any and all official sourcebooks you desire in order to enjoy this system as intended.

## About this project

This project is based on the work of the original [StarWarsFFG Foundry VTT system](https://github.com/StarWarsFoundryVTT/StarWarsFFG), maintained by the StarWarsFoundryVTT community.

A great deal of credit belongs to the original developers and contributors who created and maintained that system over the years. Without their work, this project would not exist.

This repository is an independent continuation of that work and is not part of the official StarWarsFoundryVTT project.

### Why does this fork exist?

The initial purpose of this project was simple: to make the StarWarsFFG system compatible with **Foundry VTT v14** without having to wait for the upstream project to complete its own migration.

Rather than trying to replace the original project, this repository follows its own development path and will continue to do so for as long as maintaining it remains useful and relevant.

Future development may therefore diverge from the original StarWarsFFG system.

## AI-assisted development

Development and maintenance of this fork are performed entirely with the assistance of **OpenAI Codex Astra**.

Because of this development approach, this project is intentionally maintained as an independent fork rather than as a source of contributions to the original StarWarsFFG repository.

For the same reason, this version is **not intended to be submitted to or distributed through the official Foundry VTT package repository**.

Instead, releases are distributed directly from this GitHub repository and can be installed manually through their manifest URL.

## Installing Star Wars FFG game system

1. Open Foundry VTT.
2. Go to the **Game Systems** tab.
3. Click the **Install System** button.
4. Copy the following link into the **Manifest URL** field:

   `NEW_MANIFEST_URL_HERE`

5. Click **Install**.

After a few seconds, the system should be installed and available when creating or launching a world.

## Compatibility

This fork primarily targets recent versions of Foundry VTT, beginning with **Foundry VTT v14**.

Compatibility with earlier Foundry releases is not guaranteed.

Because this project develops independently from the original StarWarsFFG repository, compatibility, features, bug fixes, and internal architecture may gradually diverge from upstream.

## Issues and feedback

If you encounter a bug or compatibility issue specific to this fork, please report it in this repository rather than in the original StarWarsFFG project.

Before opening an issue, please verify that the problem can be reproduced with this version of the system.

## Upstream project

Original project:

[StarWarsFoundryVTT/StarWarsFFG](https://github.com/StarWarsFoundryVTT/StarWarsFFG)

Many thanks to its maintainers and contributors for creating the foundation on which this project is built.

## License

This project remains subject to the licensing terms inherited from the original StarWarsFFG project.

Star Wars, the Star Wars logo, characters, names, places, and related intellectual property are trademarks and/or copyrights of their respective owners.

This project is unofficial, non-commercial, and created for use by fans of the Fantasy Flight Games Star Wars RPG systems.