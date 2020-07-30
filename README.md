# StarWarsFFG

This is an implementation of the [Fantasy Flight Games Star Wars](https://www.fantasyflightgames.com/en/starwarsrpg/) roleplaying system for [Foundry Virtual Tabletop](https://foundryvtt.com/).

- For support on this game system : Discord [The Foundry](https://discord.gg/bNyxuk9) #starwars-ffg
- Read this document in another language : [Français](https://github.com/StarWarsFoundryVTT/StarWarsFFG/blob/master/README-fr.md)

# Installing Star Wars FFG game system

1. Open Foundry VTT
2. Go to the "Game Systems" Tab
3. Click the "Install System" button
4. Copy the Following link into the "Manifest URL" section:
   https://raw.githubusercontent.com/StarWarsFoundryVTT/StarWarsFFG/master/system.json
5. Click Install, after a few seconds the system should be installed.
6. Install (if not already done) "Special Dice Roller" module, see below for details.

# Contributing

Please see [CONTRIBUTING.md](https://github.com/StarWarsFoundryVTT/StarWarsFFG/blob/dev/CONTRIBUTING.md).

# To-do

See our current production goals and progress [here](https://github.com/StarWarsFoundryVTT/StarWarsFFG/projects/1).

# Changelog

- 30/07/2020 - Cstadther - Added ability to add modifiers to Force Powers and the Force Power Upgrades.  Updated imported to populate force power modifiers.
- 29/07/2020 - Cstadther - Fixes issue where Strain, Wounds, and Soak default values were not being calculated correctly.
- 29/07/2020 - Cstadther - Updated Critical Damage and Injury sheets to allow modifiers.  Fixed Adversary sheet to allow clicking on Criticals.  Refactored criticals to a partial.
- 29/07/2020 - Cstadther - Updated data importer to populate Force Boost modifiers on talents
- 29/07/2020 - Cstadther - Added Force Boost modifier.  When added to an item, if checked, it will add the max force pool to the rendered dice pool, and include that number of force die in the roll.
- 29/07/2020 - Cstadther - Bug Fix #270 - Fix which allows no PC characters to go above the max, however all NPCs no longer adhere to any maximum for skill rank.
- 29/07/2020 - Cstadther - Updated data importer to populate skill boost/skill setback/skill remove setback modifiers for armor, gear, talents, and weapons.
- 29/07/2020 - Cstadther - Added Remove Setback modifier, updated dice pool rendering display Remove Setback image, updated dice pool calculation on actor to cancel out setback dice with remove setback dice.
- 28/07/2020 - Cstadther - Added Species Import from Oggdude dataset.
- 28/07/2020 - Cstadther - Added Career Import from Oggdude dataset.
- 28/07/2020 - Cstadther - Added ranked talents to multiply modifier value correctly.
- 28/07/2020 - Cstadther - Updated importer to import career skills, skill ranks, and skill boosts on talents.
- 27/07/2020 - Cstadther - Added specialization modifiers via popout modifiers window (new cog icon on specialization screen)
- 24/07/2020 - Esrin - System is now compatible with Foundry VTT 0.7.0 and upwards only. Previous Foundry versions are not supported.
- 24/07/2020 - Esrin - Implemented new Roll / Dice system using the expanded Foundry VTT 0.7.x dice API. The requirement for Special-Dice-Roller module has now been removed.
- 23/07/2020 - Cstadther - Added Career item type, sheet and integration on character sheet.
- 23/07/2020 - Cstadther - Added Career item type, sheet and integration on character/adversary sheet.
- 23/07/2020 - Cstadther - Bug Fix #255 - Clicking on critical injuries was not bringing up sheet.
- 23/07/2020 - Cstadther - Added Skill Boost and Skill Setback modifiers, refactored dice pool display to include boost and setback.
- 22/07/2020 - Cstadther - Refactored minion sheet to use skills partial, updated skills partial to handle groupskills
- 22/07/2020 - Cstadther - Added sheet options for Adversary for removing auto soak calculation (but only unlocks the soak field)
- 22/07/2020 - Cstadther - Refactored character sheets using handlebar partials for skill, items, talents and force powers (shared with character and adversary sheets)
- 22/07/2020 - Cstadther - Added modifiers for Career Skills
- 22/07/2020 - Cstadther - Minor GroupManager fix to remove instance where groupmanager is undefined
- 21/07/2020 - Cstadther - Specialization Talents now apply stat/skill rank/characteristic modifiers.  Importer was updated to apply stat/skill rank/characteristic modifiers for weapons/armor/gear.
- 20/07/2020 - Cstadther - Refactored modifier part 2, fixed issue with weapon mods, added new mod (setback and career skill), updated importer to correctly populate talent and specialization characteristic and stat modifiers.
- 20/07/2020 - Cstadther - Bug Fix #243 - Updated english localization to used knowledge stripped values and updated skill grid layout.
- 20/07/2020 - Cstadther - Refactored modifier display to a partial.  Refactored applying logic.
- 20/07/2020 - Cstadther - Added skill rank modifiers, works for current skills and any new added skills correctly.
- 20/07/2020 - Cstadther - Stat modifiers save on update of actor and store value of difference in attribute.
- 19/07/2020 - Cstadther - Bug Fix #212 - Vehicle weapons are now imported correctly as Vehicle Weapons.
- 19/07/2020 - Cstadther - Enhancement #213 - When weapon skill is changed to `Melee` or `Brawl` damage field is disabled, as base damage for those weapon types is autocalculated using brawl when owned by an actor.  Specify damage as a modifier to damage (ie +3, etc)
- 19/07/2020 - Cstadther - Bug Fix #227 - Fixed issue with critical injuries and damage description areas not big enough.
- 19/07/2020 - Cstadther - Bug Fix #232 - Fixed issue with minion groupskill calculations
- 19/07/2020 - Cstadther - Bug Fix #222 - Fixed issue where soak options were not being used on Adversary Sheet.
- 18/07/2020 - Cstadther - Added characteristic and stat migration to attributes for existing characters.
- 17/07/2020 - Cstadther - Bug Fix #218 - Fixed the Minion Sheet's scrolling issue
- 17/07/2020 - Cstadther - Bug Fix #214 - disabling force pool will now also disable force powers section
- 17/07/2020 - Cstadther - Add stat modifiers, and reworked Soak/Defence calculation to allow for modifiers of just Melee or Ranged Defense
- 17/07/2020 - Cstadther - Add characteristic modifiers to character/adversary/minion sheets, add drag/drop of species onto character/adversaries (not minion)
- 16/07/2020 - Cstadther - Added species item type, values stored in modifiers, preparing for characteristic modifiers.
- 16/07/2020 - Cstadther - Fix for specialization and talent combined talent list for adversaries and characters.
- 15/07/2020 - Cstadther - Import fix for specializations, prepopulate data that is not being populated through item-ffg.js load routine.
- 15/07/2020 - Cstadther - CSS Fix, set flex to `auto` on character sheet to resolve issue with different form height between FF and Chrome
- 14/07/2020 - Cstadther - Added right click context menu to add skills (done from skill header row), and delete a skill by left clicking and selecting `Remove Skill`
- 14/07/2020 - Cstadther - Import fix for locked compendiums
- 14/07/2020 - Cstadther - Updated skill display code using new grid css, added context menu to skill list for modifing skill characteristic.
- 10/07/2020 - Cstadther - Fixed bug with latest dice roller update.
- 10/07/2020 - Cstadther - Bug fix for importing specializations
- 09/07/2020 - Esrin - Added Force Pool toggle to character sheet configuration.
- 09/07/2020 - Esrin - Fixed bug with Initiative Rolls caused by core changes in FVTT 0.6.5. This removes backwards compatibility with previous versions.
- 08/07/2020 - Cstadther - Enhancement #65, added hyperdrive and consumables to vehicle sheet.
- 08/07/2020 - Cstadther - Enhancement, updated padding on tooltips, and added rendering of dice images in tooltips.
- 08/07/2020 - Cstadther - Bug Fix, issue with combined talents not displaying item sheet when clicked on.
- 08/07/2020 - Cstadther - Bug Fix, issue with importer where connectors were incorrectly populated to due a variation in import data.
- 08/07/2020 - ezeri - Bug Fix, Character sheet configuration was not defaulting correctly, blocking character sheet drawing.
- 07/07/2020 - Cstadther - Enhancement #121, added character sheet configuration settings, morality/obligation/conflict/duty display can be toggled. (added through new actor-ffg-options module)
- 07/07/2020 - Cstadther - Enhancement #119, added equipped function for weapons.
- 07/07/2020 - Cstadther - Minor bug fix, where isForceTalent attribute is converted to string when should be boolean.
- 06/07/2020 - Cstadther - Combined Talents and Specialization Talents, added dialog to display talent calc source and ability to remove talents from owned items.
- 06/07/2020 - Cstadther - Refactored specializations to move specialization talent updates to `onUpdate` method for talent.
- 06/07/2020 - Cstadther - Refactored logging, added logging helper, added config option to enable debug level logging which defaults to false
- 03/07/2020 - Esrin - Updated the Group Manager to use game.settings for the Destiny Pool. This allows replication of the destiny pool values and changes across all connected clients and persists across sessions.
- 03/07/2020 - Esrin - Fixed Wound and Strain display on Group Manager, now uses .value instead of the deprecated .real_value.
- 02/07/2020 - CStadther - Import fixes. Fixed issue if there are locked compendiums with importing.
- 02/07/2020 - CStadther - Import fixes. Took specialization import out of promise all and run aftert to make sure talents in completed first.
- 30/06/2020 - Cstadther - Import fixes. All talents were listed as ranked because boolean was being interpreted as a string from the import file.
- 30/06/2020 - ezeri - Minor bugfix of the label of a skill
- 30/06/2020 - Cstadther - Refactor dice rolling code into helper module. Added ad-hoc die rolling by clicking on dice icon over chat box.
- 29/06/2020 - Cstadther - Added Specialization Importing from OggDude dataset
- 29/06/2020 - ezeri - Added french documentation (README-fr.md)
- 29/06/2020 - Cstadther - Added import log creation options
- 29/06/2020 - Cstadther - Added image import for oggDude data for weapons/armor/gear
- 24/06/2020 - Esrin - Bug fix #160 & #159 - Limited Adversary sheet registration to "character" actor types only.
- 24/06/2020 - Esrin - Bug fix #161 - Added check during character encumbrance calculation and do not add encumbrance for equipped armour.
- 23/06/2020 - Cstadther - Bug fix # 154 - Added damage add to damage characteristic for melee weapons. Added modifier calculations with damage for melee/brawl weapons.
- 23/06/2020 - Cstadther - Bug fix # 155 part 2 - Added attributes to the template.json structure for forcepower and specializations
- 23/06/2020 - Cstadther - Bug fix # 155 - Force talents from compendium do no have attributes field, until they are imported into the world from the compendium
- 23/06/2020 - Cstadther - Bug fix # 152 - Ship silhouette size
- 22/06/2020 - Cstadther - Added setting to disable Soak Autocalculation
- 22/06/2020 - Cstadther - Enhancement - Data Imported error handling and async importing.
- 21/06/2020 - Cstadther - Added Armor Import
- 21/06/2020 - Cstadther - Added Weapon Import
- 21/06/2020 - Cstadther - Added compendium item updates to talents and force powers, so that the import will update the data correctly.
- 21/06/2020 - Cstadther - Add Gear Import, plus 0.6.3 bug fix for compendium structure change
- 21/06/2020 - Esrin - Reworked Token HUD behaviour to allow for core functionality to behave properly with FFG style wounds / strain values.
- 21/06/2020 - Cstadther - Add Force Power Upgrade Cost to force power sheet.
- 21/06/2020 - Cstadther - Update Force Power Import - Removes unused rows for force powers that do not untilize them (ex Heal/Harm)
- 21/06/2020 - Cstadther - Bug fix #126 - Clicking embedded journal entries triggering editor also
- 21/06/2020 - Cstadther - Bug fix #138 - CSS fix to specialization connectors
- 20/06/2020 - Cstadther - Added additional OggDude symbol handling to enhance imported text
- 20/06/2020 - Cstadther - Added force power import from OggDude Data Set
- 20/06/2020 - Cstadther - Bug fix - Data importer mis-named variable
- 19/06/2020 - Cstadther - Bug fix #123 - localization of change characteristic dialog.
- 19/06/2020 - Cstadther - Bug fix for console error where pack index has not been populated.
- 19/06/2020 - Cstadther - Bug fix for talent upgrades not adding up correctly
- 18/06/2020 - Cstadther - First pass as Talent Import from OggDude Data Set
- 17/06/2020 - Cstadther - Added force talent checkbox to talent data, update specialization sheet rendering to include it.
- 17/06/2020 - Cstadther - Added Adversary Sheet, which hides everything for non-owner except picture, name, and species. Name is in the title bar and can't easily be changed.
- 17/06/2020 - Esrin - Localised all system settings.
- 17/06/2020 - Esrin - Added new Player Character List Mode system setting that determines how the Group Manager lists player characters.
- 17/06/2020 - Esrin - Added 'equipped' toggle to Armour in character inventory display. Only equipped armour will apply its soak value.
- 17/06/2020 - Cstadther - Bug fix - Width of Characteristic Selector
- 17/06/2020 - Cstadther - Bug fix #60 - Dice localization
- 17/06/2020 - Cstadther - Big fix #60 - Dice localization
- 17/06/2020 - Esrin - Added limited player view to the Group Manager tool.
- 17/06/2020 - Esrin - Made skill sorting by localised name an optional setting in System Settings, defaults to off.
- 17/06/2020 - Esrin - Fixed localised skill sorting for Knowledge skill types.
- 17/06/2020 - Cstadther - Enhancement #91, Specialization Color Difference between Active and Passive
- 16/06/2020 - Cstadther - Bug fix for 2-way binding.
- 16/06/2020 - Cstadther - Bug fix for #90, add talent cost in specialization tree.
- 16/06/2020 - Cstadther - Bug fix for #97, specialization talent click display.
- 16/06/2020 - Cstadther - Styled characteristic change dialog, and added localized values.
- 14/06/2020 - Cstadther - Added functionality to change characteristic associated to skill.
- 14/06/2020 - Cstadther - Bug fix for #87 (min/max values for skills and characteristics)
- 14/06/2020 - Cstadther - Bug fix in Character Sheet PrepareData.
- 14/06/2020 - Cstadther - Bug fix for item sheet rendering, more responsive design by removing set height on items.
- 14/06/2020 - Esrin - Bug fix for significant performance issues with synthetic actors containing specialisation items.
- 14/06/2020 - Cstadther - Bug fix for #92, adding scroll bar to talent/force boxes.
- 13/06/2020 - Cstadther - Added hook and text replace to add dice symbols to journal entries.
- 13/06/2020 - Esrin - Added 4 extra talent slots to the specialisation trees to match sourcebook examples.
- 13/06/2020 - Esrin - Added localisation to the talent activations on specialisation sheet.
- 13/06/2020 - Esrin - QoL improvements to specialisations to keep them synced up with any changes to linked talent descriptions or activations.
- 13/06/2020 - Esrin - Restored individual embedded talents to character sheets to allow for talents without associated specialisations (such as for rivals and nemesis).
- 13/06/2020 - Esrin - Bugfix to force power description display area.
- 12/06/2020 - Cstadther - Added Specializations Trees, utilizing drag and drop talents. Only for characters.
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
