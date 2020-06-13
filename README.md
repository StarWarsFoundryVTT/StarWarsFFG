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
   https://raw.githubusercontent.com/StarWarsFoundryVTT/StarWarsFFG/master/system.json
5. Click Install, after a few seconds the system should be installed.

# Contributing

Please see [CONTRIBUTING.md](https://github.com/StarWarsFoundryVTT/StarWarsFFG/blob/dev/CONTRIBUTING.md).

# To-do

See our current production goals and progress [here](https://github.com/StarWarsFoundryVTT/StarWarsFFG/projects/1).

# Changelog

- 12/06/2020 - Cstadther - Added Specializations Trees, utilizing drag and drop talents.  Only for characters.
- 12/06/2020 - Esrin - Completed all initial Group Manager functionality and added last localisation hooks.
- 12/06/2020 - Cstadther - Added popout editor and dice symbol rendering for force powers. Updated popout editor to specify height/width/left/top.
- 12/06/2020 - Cstadther - Added popout editor for specials and dice symbol rendering in descriptions and specials
- 12/06/2020 - Esrin - Added warning on startup if Special-Dice-Roller module is not installed and activated.
- 12/06/2020 - Esrin - First pass on the group sheet. Now automatically populates with player characters, can open character sheets, change initiative mode and use the destiny pool. Other functionality under construction.
- 10/06/2020 - Cstadther - Readded Force Pool to Talent Tab
- 10/06/2020 - CStadther - Buxfix for Force Power Description field.
- 09/06/2020 - CStadther - Added drag-drop transfer of weapon, armour and gear items between owned character sheets.
- 08/06/2020 - CStadther - Added force power trees and associated view on the character sheets.
- 07/06/2020 - Esrin - Began localisation of Group Manager popup.
- 07/06/2020 - Esrin - Added new localisation for modifier types.
- 07/06/2020 - Esrin - Added new localisation for talent activations.
- 07/06/2020 - Esrin - Fixed localisation on character, minion and vehicle sheets for weapon range and firing arc display in inventory.
- 07/06/2020 - Jaxxa - Modify Wound / Strain tracking to be compatible with resource bars.
- 06/06/2020 - Jaxxa - Added Minion sheet calculating number of minions alive and reduce their skills as they die.
- 05/06/2020 - CStadther - Added select2 libraries for better dropdowns.
- 05/06/2020 - CStadther - Added Critical Injury and Critical Hit item types, along with associated display areas on character and vehicle sheets.
- 05/06/2020 - CStadther - Standardised localisation hooks for all langs.
- 05/06/2020 - Esrin - Removed legacy Critical Injury rolltable.
- 04/06/2020 - Esrin - Completed full transition to SASS. Removed old swffg.css file and ported all CSS logic into relevant SASS files.
- 04/06/2020 - HDScurox - Updated German language file.
- 04/06/2020 - ForjaSalvaje - Updated Spanish language file.
- 03/06/2020 - CStadther - Added localisation for all `swffg-config.js` values.
- 03/06/2020 - Esrin - Tweaked sensor range dropdown values.
- 03/06/2020 - CStadther - Fixed positioning issue with tool tips on vehicle sheet.
- 03/06/2020 - CStadther - Restyled bottom of vehicle biography section.
- 03/06/2020 - CStadther - Added localisation for skill names.
- 03/06/2020 - HDScurox - Updated German language file.
- 03/06/2020 - Esrin - Implemented scroll position saving when actor sheet elements are updated. No more popping back to the top of the skills list every time you make a change!
- 03/06/2020 - CStadther - Restyled vehicle weapon and attachment sheets.
- 03/06/2020 - Esrin - Bugfix to minion sheet groupskill display.
- 02/06/2020 - Esrin - Sheet styling tweaks.
- 02/06/2020 - Esrin - Bug fixes to minion sheet.
- 02/06/2020 - CStadther - Continued restyling vehicle sheet.
- 02/06/2020 - ForjaSalvaje - Spanish language translation.
- 02/06/2020 - Esrin - Some styling tweaks and fixes to the minion sheet skills display as suggested by Mandaar.
- 02/06/2020 - Mandaar - French language translation.
- 02/06/2020 - HDScurox - German language translation.
- 02/06/2020 - CStadther - Continued restyling minion sheet.
- 02/06/2020 - Esrin - Temporary display fixes to Minion and Vehicle sheets awaiting CStadther's eventual restyle.
- 02/06/2020 - Esrin - Minor bugfix to character sheet, soak value set to disabled for auto-calculation, encumbrance max and current values swapped to correct fields and current set to disabled for auto-calculation.
- 02/06/2020 - CStadther - Major sheet restyling
- 02/06/2020 - Jaxxa - Added Icons in the Dice roller, visually indicating the dice types.
- 31/05/2020 - Esrin - Work in progress on the group management GM tool. Destiny Pool now working (will reset on page refresh). Player Character list under construction.
- 31/05/2020 - Esrin - Bugfix to localisation hook for Gear Quantity on Character Sheet (thanks Alex | HDScurox for the bug report).
- 31/05/2020 - CStadther - Added SASS configuration using Gulp.
- 31/05/2020 - CStadther - Minor bugfix on .item click listener to prevent console errors when .item class components with no related item sheet are clicked, such as tabs.
- 31/05/2020 - CStadther - Added localization for character sheet.
- 29/05/2020 - Esrin - Minor bugfix to vehicle sheet, various fields will now accept string values to allow for from-to values as requested by Alex | HDScurox.
- 28/05/2020 - Esrin - Brought the Minion sheet inventory in line with the latest Character sheet changes. Added talents to Minion sheet. Fixed a minor bug with group skill calculations (thanks Alex | HDScurox for the bug report).
- 25/05/2020 - Esrin - Character sheet tweaks. Continued improvements to the inventory display in advance of equipable item support.
- 22/05/2020 - Esrin - Minor bug fixes and tweaks, compatibility check with FVTT 0.6.0 stable release.
- 18/05/2020 - alfarobl - Tweak to dice display orders to match the chat order, kindly provided by alfarobl.
- 18/05/2020 - Esrin - A very hacky method has been introduced to allow the built in FoundryVTT combat tracker to roll initiative using FFG dice results. The resulting number is made up of successes and advantages. For example 1 success and 2 advantage would result in 1.02 for the initiative tracker. Warning, there might be bugs with this solution! Initiative can be switched between Vigilance and Cool via the System Settings section of the world configuration.
- 13/05/2020 - Esrin - Continued sheet design tweaks.
- 12/05/2020 - Esrin - Reworked actorsheet entities back down to a single entity with dynamic options based on actor.type. Now much easier to maintain in single place.
- 12/05/2020 - Esrin - First pass at improvements to inventory display to show more info on hover of certain areas (hover name for description, hover special for full text, etc). Still much more styling and layout work needed for sheets in general.
- 11/05/2020 - Esrin - First pass on some quality of life improvements to the inventory display (work in progress). Minor bugfixes.
- 11/05/2020 - Esrin - Fixed bug on vehicle sheet that was preventing data entry to some fields.
- 11/05/2020 - Esrin - Reworked the modifier tabs to be more foolproof and user friendly. Only Soak modifiers are calculated automatically at present. Automatic calculation of other stat / characteristic / skill modifiers is not a priority right now so putting on the backburner.
- 11/05/2020 - Esrin - Improved vehicle sheet design to have Defence in fore, aft, port, starboard cross pattern.
- 11/05/2020 - Esrin - Added Range, Skill, Firing Arc and Activation dropdowns to item and talent sheets where appropriate.
- 11/05/2020 - Esrin - Added skills filter to character and minion sheets, allowing filtering by General, Combat and Knowledge.
- 11/05/2020 - Esrin - Added career skills checkbox to character sheet.
- 11/05/2020 - Esrin - Fixed Handling on vehicle sheet. Now displays a + for positive values.
- 09/05/2020 - Esrin - Rollable table for Critical Injuries
- 09/05/2020 - Esrin - Cleaned up items to just use one JS class and get dynamic template by type.
- 09/05/2020 - Esrin - Built item sheet for ship weapons and ship attachments
- 09/05/2020 - Esrin - Built character sheet for vehicles
- 09/05/2020 - Esrin - Added data structure for ship weapons and ship attachments
- 09/05/2020 - Esrin - Added data structure for vehicles (using Jaxxa's work as a template)
- 09/05/2020 - Esrin - Added currency to characters
- 09/05/2020 - Esrin - Derived encumbrance from item values.
- 09/05/2020 - Esrin - Derived soak value from brawn, equipped armour, and modifiers on weapons, gear and talents as a test case for automation.
- 08/05/2020 - Esrin - Extended Actor class to allow for calculated Minion stat values (wounds from unit wounds _ quantity, and skills from group skills _ quantity-1)
- 08/05/2020 - Esrin - Added data structure for minions
- 08/05/2020 - Esrin - Built character sheet for minions
- 08/05/2020 - Esrin - Updated main character sheet to correctly display all three main item types, and talents.
- 08/05/2020 - Esrin - Added data structure for talents
- 08/05/2020 - Esrin - Updated main character sheet to show XP on all pages, and obligation types on Biography page.
- 08/05/2020 - Esrin - Built very basic item sheets for the three main item types.
- 08/05/2020 - Esrin - Added data structures for the three main item types, gear, weapons, armour.
- 07/05/2020 - Esrin - Minor tweaks to the character sheet styling. Begun restructuring the underlying data structure in template.json to introduce best practices, avoid unnecessary duplication and prepare for the addition of new actor and item types.
- 07/05/2020 - Esrin - First pass at character sheet styling. Next step, talents, items and derived modifiers.
- 06/05/2020 - Esrin - Added "Rolling <skillname>" into the chat message for FFG dice rolls to show which skill the person was rolling on.
- 06/05/2020 - Esrin - Added abbreviations (abrev) to characteristics, refactored skill display on ffg-actor-sheet.html to allow for linked characteristic abbreviations in display.
- 06/05/2020 - Esrin - Updated to TabsV2 class in actor-sheet-ffg.js to avoid deprecation of Tabs class in future FoundryVTT versions.
- 06/05/2020 - Esrin - Renamed remaining core files from Simple World Building to swffg naming scheme for consistency.
- 06/05/2020 - Esrin - Removed old SimpleWorldBuilding dependencies and fixed breakages where necessary.
