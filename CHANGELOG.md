`1.810`
* Features:
  * Support for FoundryVTT v12
  * Compendiums moved to system defined, resulting in a cleaner compendium list
  * Add XP log link to available/total XP section
  * Move critical injuries to a dedicated tab in sheet v2
  * Signature abilities can now have required specialization upgrades defined
    * Re-running the importer will automatically apply this to specializations in the compendium
    * Purchasing Signature Abilities now takes these links into account, if defined
  * Purchasing Force Powers now checks the required force rating
  * Sheets now default to the v2 version (they can still be manually changed back to v1)
  * Species can now have starting XP defined
    * Dragging a species onto a player character grants the starting XP
    * The importer has been updated to import starting XP
  * Obligations and duties may now have notes set, and the character importer correctly populates this field
  * Defense dice are now added if an actor is targeted (this is configurable per-client) 
* Fixes:
  * Sending a signature ability to chat now includes purchased upgrades
  * Granting XP to the entire group now updates the XP logs
  * Fixed career data not being properly set when running the OggDude importer
  * Vehicle mods are now imported as the correct type (ship mods)
  * Re-running the importer for vehicles no longer duplicates the weapons on those vehicles
  * Fix overflowing "special" field on weapons in Mandar theme
  * Corrected tooltip for equipped/unequipped gear (and localized it)
  * non-character actors no longer show the option to buy skill ranks
  * Players can no longer purchase Signature Abilities or Force Powers if they do not have enough XP for them
  * Minion sheets now show "group skill" instead of "career skill"
  * Corrected a bug in the combat tracker where actors claiming a slot not originally belonging to them resulted in both the original slot owner and claiming actor being shown as having acted in the actor summary
  * The buy talent button on specializations no longer disappears when buying >1 talent at a time
  * Corrected a bug in the combat tracker where actors claiming a slot not originally belonging to them prevented them from being removed from combat
  * Correct default Signature ability height so the bottom isn't ever-so-slightly cut off
  * Fixed a bug where talents displayed blank when expanded on actor sheets
  * Fixed a bug where attempting to view a talent on a specialization tree did not open anything

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
