`1.904`
* Features:
  * Optionally include GM Characters in the Group Manager ([#1680](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1680))
  * Add EditorConfig settings
  * Add basic Eslint config
* Fixes:
  * Apply Force Powers upgrades to character ([#1542](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1542))
  * Imported skill modifiers have better formatted attributes key names ([#1663](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1663))
  * Updated Spanish localizations
  * Updated French localizations
  * Retain token settings when copying actors ([#1673](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1673))
  * Non FFG Dice rolls with multiple terms are accepted again ([#1664](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1664))
  * Escape menu toggles in the normal way again ([#1670](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1670))
  * Force Power: Empty mod list doesn't reset basic force power anymore ([#1669](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1669))
  * Updating a talent from a specialization tree updates the tree ([#1643](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1643))
  * Force Power: Import basic force power mods ([#1686](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1686))
  * Get embedded item data from `system` variable instead of root
  * Use correct type when importing a Force Boost mods ([#1687](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1687))
  * Item attachments' mods use parent item mod type when present ([#1624](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1624))
  * Talent cost set when preparing tree instead of template ([#1704](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1704))
  * Qualities are linked to parent item ([#1612](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1612))
  * Assign correct modifiers type to armor: "armour" instead of "armor" ([#1697](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1697))
  * Remove Destiny Tracker hardcoded size, allowing it to grow and shrink when font size is changed ([#1688](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1688))
  * Assign correct modifiers type to armor: "armour" instead of "armor" ([#1697](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1697))
  * Skill purchases on actors now work via the dollar sign again ([#1713](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1713))
  * Allow zero as a valid value when updating vehicle stats ([#1717](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1717))
  * Replace deprecated Document.createDocuments calls with Document() constructor ([#1683](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1683))

`1.903`
* Features:
  * Updated "item cards" to match the Mandar theme
    * This change includes many minor improvements to the cards, such as showing damage on weapons and purchased talents on specializations
  * Generic slot combat tracker: The action to take when removing a combatant is now configurable. This is in place of the previously-confusing (and quite annoying) behavior where you had to claim a slot in order to remove a combatant
  * Dragging-and-dropping items on actors now prompts for spending XP to purchase that item ([#1588](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1588))
  * XP spending now consistently uses a dollar sign to trigger spending instead of the various methods it previously used ([#1629](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1629))
  * Settings have been refactored to be more organized and easier to navigate ([#1639](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1639))
  * Destiny point flipping is now themed ([#1658](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1658)
  * Set default token settings when creating new actor ([#1652](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1652)))
* Fixes:
  * Includes species characteristics bonus when calculating characteristic upgrade cost ([#1638](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1638))
  * Specializations: Talents are now correctly looked up in compendium ([#1642](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1642)))
  * Generic slot combat tracker: Removed "unused" slot checking (on combatant defeat) as they would sometimes lead to actors being unable to act
  * Weapon `special` text now properly renders dice icons ([#1625](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1625))
  * Species without ability don't cause an error preventing their talents from being loaded anymor ([1641](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1641)))
  * Specializations: Embedded talents are now correctly linked to their compendium ([#1650](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1650)))
  * Vehicle `Pilot` role now works for Genesys ([#1597](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1597))

`1.902`
* Features:
  * Modified the Specialization sheet; moved the XP cost off of the talents, changed the appearance of talent connections, and improved how the sheet scales when the window is resized.
  * Increased the default size of the popout editor (e.g., used for editing the description of a Specialization)
  * Purchase improvements
    * Grouped specializations in selection popup by in and out of career
    * Grouped force powers in selection popup  by required force rating
    * Spending XP now whispers the GM to notify them (this can be disabled in the system settings)
  * Manual XP adjustments now result in an entry in the XP log
  * Max characteristic and skill ranks are now configurable ([#1532](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1532))
* Fixes:
  * Removed the "purchase" context menu option when editing a Specialization that is not attached to a character
  * Improves nested tag formatting (e.g., allows for strings like `[B]Average ([di][di]) Skill[b]` to properly render)
  * Purchasing force powers now looks at the correct attribute (it should no longer claim you are not strong enough in the force for powers!) ([#1584](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1584))
  * Vehicle weapon images now have a max width of 500px (up from 130px) ([#1576](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1576))
  * Fixed talent descriptions not showing up on specializations after being dragged-and-dropped ([#1573](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1573))
  * Fixed destiny pool roll not populating in tracker ([#1592](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1592))
  * Specializations no longer take forever to open ([#1593](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1593))
  * SWA import now properly imports ranked talents ([#1572](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1572))
  * SWA import no longer improperly matches the wrong talents in rare occasions
  * Characteristic XP cost is now calculated excluding any boosts from modifiers ([#1594](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1594))

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
  * `system.json` no longer generates warnings ([#1538](https://github.com/StarWarsFoundryVTT/StarWarsFFG/issues/1538))
  * Weapon-on-actor macros now work with the Enhancements module animations ([enhancements module #202](https://github.com/wrycu/StarWarsFFG-Enhancements/issues/202))

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
