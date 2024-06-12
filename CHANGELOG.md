`1.901`
* Features:
  * Added a sheet option to disable Force Pool on Rival and Nemesis actor sheets ([#1502](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1502))
  * The importer will no longer include every source as a header element, making it easier to read
* Fixes:
  * Fixed a bug where item qualities sometimes showed "you do not have permission to view this item" for non-GMs ([#1552](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1552))
  * Fixed changing skill characteristics not working ([#1550](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1550))
  * Skill descriptions are now properly imported ([#1551](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1551))
  * Talents from species no longer multiply ranks when combined with purchased talents ([#1540](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1540))
  * Fixed a bug where some text disappeared from descriptions ([#1559](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1559))
  * Fixed a bug where paragraph tags did not properly result in new lines
  * Creating combat via the group manager now works again ([#1545](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1545))
  * Removing initiative slots from combat now works ([#1545](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1545))
  * Soak can now go below the Brawn value if auto-calculation is turned off ([#1371](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1371))
  * Imported Vehicle improvements ([#1537](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1537)):
    * Navicomputer is now imported
    * Hyperdrive primary is set to null if no hyperdrive is installed
    * Hyperdrive secondary is imported (and set to null if no hyperdrive is installed)

`1.900`
* Features:
  * Support for FoundryVTT v12
    * Compendiums are now system defined. This means they cannot be deleted, but was required for the v12 migration
  * **Characters / Nemesis / Rivals / Minions**
    * All actor sheets now default to v2 (they can still be manually changed back to v1)
    * v2 sheets: Critical injuries are now in a dedicated tab
    * Characters: Players can now buy levels in characteristics by clicking the characteristic name
    * Characters: XP available/total moved to XP log tab
    * Characters with v2 sheets: Obligation / morality / conflict moved to a dedicated tab
    * Nemesis / Rivals / Minions: Abilities created during the SWA import process are now created as "Ability" items instead of populating in the biography section
  * **Vehicles**
    * Overall tab layout updated
    * Vehicles can now be classified as "space" or "not space"
      * This data is automatically included when the importer is run
    * A single, dedicated "pilot" role was created which selects the appropriate skill based on how the vehicle is classified ("space" or "not space")
    * You can now roll a vehicle weapon using a crew member from that weapon
    * Crew selection is now a multi-select dropdown instead of requiring you to drag-and-drop the same actor multiple times
    * Dragging crew onto vehicles now prompts for the initial role selection, instead of assigning "(none)"
    * Defense silhouettes are now customizable
      * This data is automatically included when the importer is run
  * **Items**
    * All item sheets now default to v2 (they can still be manually changed back to v1)
    * Signature abilities can now have required specialization upgrades defined
      * This data is automatically included when the importer is run
      * If defined on a signature ability, attempting to purchasing it checks if the required specialization upgrades are purchased
    * Purchasing Force Powers now checks the required force rating
    * Species can now have starting XP defined
      * This data is automatically included when the importer is run
      * Dragging a species onto a player character grants the starting XP
    * Species can now include abilities to grant the actor they are added to
      * This data is automatically included when the importer is run
    * Obligations and duties may now have notes set on them
      * This data is automatically included when the character importer is run
  * **Combat**
    * The target's defense dice are now added if you target it (this is configurable per-client)
  * **Importer-specific changes**
    * The importer now includes categories from the source dataset intended for programmatic interpretation, e.g. the Holdout Blaster is tagged with "Blaster Pistol", "Holdout blaster", "Blaster", "Pistol", "Ranged"
* Fixes:
  * **Characters / Nemesis / Rivals / Minions**
    * Corrected tooltip for equipped/unequipped gear (and localized it)
    * Fixed a bug where talents displayed blank
    * Fixed a bug where attempting to view a talent on a specialization tree did not open anything
    * Swapped "melee" and "ranged" defense to match the printed books
    * Nemesis / Rivals / Minions: Removed ability to buy skill ranks
    * Characters: Added a check for sufficient XP for purchasing Signature Abilities and Force powers
    * Characters: The buy talent button on specializations no longer disappears when buying >1 talent at a time
    * Characters: "Fix" purchasing skills at the bottom of the skill list by adding a dedicated purchase button
    * Characters: The XP log no longer shows an edit button, as it is currently read only
    * Characters: Fixed a bug where talents directly granted to an actor (i.e. not via a specialization) did not appear on the first opening of the character sheet each load
    * Minions: Show "group skill" instead of "career skill"
  * **Vehicles**
    * Vehicle mods are now imported as the correct type (ship mods)
  * **Items**
    * Sending a signature ability to chat now includes purchased upgrades
    * Fix overflowing "special" field on weapons in Mandar theme
    * Correct default Signature ability height so the bottom isn't ever-so-slightly cut off
    * The "talent" tab on species items now uses the talent icon instead of the configure icon
    * The "item modifier" item type has had the description height corrected
  * **Combat**
    * Fixed double-slot-claim bug in the combat tracker
    * Fixed a bug preventing removing combatants from combat
    * Fixed a bug  where removing a combatant would un-claim another slot 
    * Fixed a bug where removing a combatant from the canvas would not properly update the tracker
  * **Importer**:
    * Career data (signature abilities, specializations) is now properly set when the OggDude importer is run with existing compendiums
    * Re-running the importer no longer duplicates weapons on vehicles
    * Vehicle images are now imported when "vehicles" are imported
  * **Misc**
    * Granting XP to the entire group now updates the XP logs for those players (previously, only single-actor grants updated the log)

`1.809`
* Features: 
  * You can now (optionally) spend XP! See [the wiki](https://github.com/StarWarsFoundryVTT/StarWarsFFG/wiki/new%E2%80%90features%E2%80%90v1.809#xp-spending) for more info
  * Added actor types for Nemesis and Rival
  * Weapons can now have stat mods (permitting setting e.g. the `defensive` quality)
  * Initiative rolls can be upgraded
  * Actor dice pools now show fixed results
  * `Remove setback dice` is now shown on crew dice pools
  * Wounds and stats are set as the default stats for tokens
  * Gear, weapons, and armor can now hide the `price` and `rarity` fields (via sheet options)
  * Macros are now created with the image of the item and can be created to display items
  * Specializations and signature abilities can be associated with careers (see "new importer features" below)
  * Signature abilities now have a base cost (see "new importer features" below)
  * Species can now include talents (see "new importer features" below)
  * New importer features:
    * Species talents are now set
    * Career specializations and signature abilities are now imported
    * Signature ability base cost is imported
    * Force power base cost and minimum force rating is imported
    * SWA importer imports actors as Nemesis/Rival/Minion as appropriate
* Fixes:
  * Corrected dice images for Genesys not properly embedded in Journals
  * CSS:
    * Reworked scroll heights for most sheets
    * Reworked name centering for most sheets
    * Fixed giant dice in expanded roll card in the Mandar theme. Again.
  * Importer improvements:
    * Ship attachments are now set to the correct item type
    * Misc qualities on weapons/armor are now imported properly
  * Improved GM detection for combat events
  * Fixed expanding items with `null` item qualities (e.g. expanding a weapon on an actor sheet)
  * Fixed viewing item qualities with HTML elements in them
  * Fix for non-GMs being unable to open some item qualities
  * Fix for drag-and-drop items from compendiums not working until the item sheet was opened at least once
  * Fixed a bug for adversary levels above 5 not showing up
