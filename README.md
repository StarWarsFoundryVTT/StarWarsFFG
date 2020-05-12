( PLEASE NOTE: This is a custom fork based on [Jaxxa's implementation](https://github.com/jaxxa/StarWarsFFG/tree/master). )

# StarWarsFFG

This is an implementation of the [Fantasy Flight Games Star Wars](https://www.fantasyflightgames.com/en/starwarsrpg/) roleplaying system by in [Foundry Virtual Tabletop](https://foundryvtt.com/).

# Requirements

This Requires the "Special Dice Roller" Module to Roll the dice and calculate the results.
This is most easily available from the in-game Module browser. After installing it you will need to activate it on your world.
[foundry-vtt-community](https://foundry-vtt-community.github.io/wiki/Community-Modules/#special-dice-roller) or [GitHub](https://github.com/BernhardPosselt/foundryvtt-special-dice-roller)

# Installing

1. Open Foundry VTT
2. Go to the "Game Systems" Tab
3. Click the "Install System" button
4. Copy the Following link into the "Manifest URL" section:
https://raw.githubusercontent.com/Esrin/StarWarsFFG/esrin-dev/system.json
5. Click Install, after a few seconds the system should be installed.

# Changelog
* 12/05/2020 - Esrin - Reworked actorsheet entities back down to a single entity with dynamic options based on actor.type. Now much easier to maintain in single place.
* * 12/05/2020 - Esrin - First pass at improvements to inventory display to show more info on hover of certain areas (hover name for description, hover special for full text, etc). Still much more styling and layout work needed for sheets in general.
* 11/05/2020 - Esrin - First pass on some quality of life improvements to the inventory display (work in progress). Minor bugfixes.
* 11/05/2020 - Esrin - Fixed bug on vehicle sheet that was preventing data entry to some fields.
* 11/05/2020 - Esrin - Reworked the modifier tabs to be more foolproof and user friendly. Only Soak modifiers are calculated automatically at present. Automatic calculation of other stat / characteristic / skill modifiers is not a priority right now so putting on the backburner.
* 11/05/2020 - Esrin - Improved vehicle sheet design to have Defence in fore, aft, port, starboard cross pattern.
* 11/05/2020 - Esrin - Added Range, Skill, Firing Arc and Activation dropdowns to item and talent sheets where appropriate.
* 11/05/2020 - Esrin - Added skills filter to character and minion sheets, allowing filtering by General, Combat and Knowledge.
* 11/05/2020 - Esrin - Added career skills checkbox to character sheet.
* 11/05/2020 - Esrin - Fixed Handling on vehicle sheet. Now displays a + for positive values.
* 09/05/2020 - Esrin - Rollable table for Critical Injuries
* 09/05/2020 - Esrin - Cleaned up items to just use one JS class and get dynamic template by type.
* 09/05/2020 - Esrin - Built item sheet for ship weapons and ship attachments
* 09/05/2020 - Esrin - Built character sheet for vehicles
* 09/05/2020 - Esrin - Added data structure for ship weapons and ship attachments
* 09/05/2020 - Esrin - Added data structure for vehicles (using Jaxxa's work as a template)
* 09/05/2020 - Esrin - Added currency to characters
* 09/05/2020 - Esrin - Derived encumbrance from item values.
* 09/05/2020 - Esrin - Derived soak value from brawn, equipped armour, and modifiers on weapons, gear and talents as a test case for automation.
* 08/05/2020 - Esrin - Extended Actor class to allow for calculated Minion stat values (wounds from unit wounds * quantity, and skills from group skills * quantity-1)
* 08/05/2020 - Esrin - Added data structure for minions
* 08/05/2020 - Esrin - Built character sheet for minions
* 08/05/2020 - Esrin - Updated main character sheet to correctly display all three main item types, and talents.
* 08/05/2020 - Esrin - Added data structure for talents
* 08/05/2020 - Esrin - Updated main character sheet to show XP on all pages, and obligation types on Biography page.
* 08/05/2020 - Esrin - Built very basic item sheets for the three main item types.
* 08/05/2020 - Esrin - Added data structures for the three main item types, gear, weapons, armour.
* 07/05/2020 - Esrin - Minor tweaks to the character sheet styling. Begun restructuring the underlying data structure in template.json to introduce best practices, avoid unnecessary duplication and prepare for the addition of new actor and item types.
* 07/05/2020 - Esrin - First pass at character sheet styling. Next step, talents, items and derived modifiers.
* 06/05/2020 - Esrin - Added "Rolling <skillname>" into the chat message for FFG dice rolls to show which skill the person was rolling on.
* 06/05/2020 - Esrin - Added abbreviations (abrev) to characteristics, refactored skill display on ffg-actor-sheet.html to allow for linked characteristic abbreviations in display.
* 06/05/2020 - Esrin - Updated to TabsV2 class in actor-sheet-ffg.js to avoid deprecation of Tabs class in future FoundryVTT versions.
* 06/05/2020 - Esrin - Renamed remaining core files from Simple World Building to swffg naming scheme for consistency.
* 06/05/2020 - Esrin - Removed old SimpleWorldBuilding dependencies and fixed breakages where necessary.
