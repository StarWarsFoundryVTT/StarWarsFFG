import ItemBaseFFG from "./itembase-ffg.js";
import PopoutEditor from "../popout-editor.js";
import ActorOptions from "../actors/actor-ffg-options.js";
import ImportHelpers from "../importer/import-helpers.js";
import ModifierHelpers from "../helpers/modifiers.js";
import Helpers from "../helpers/common.js";
import ItemHelpers from "../helpers/item-helpers.js";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class ItemFFG extends ItemBaseFFG {
  /** @override **/
  async _preCreate(data, operation, user) {
    const defaultImages = {
      armour: "systems/starwarsffg/images/defaults/items/armor.png",
      itemattachment: "systems/starwarsffg/images/defaults/items/attachment.png",
      gear: "systems/starwarsffg/images/defaults/items/gear.png",
      itemmodifier: "systems/starwarsffg/images/defaults/items/itemmodifier.png",
      weapon: "systems/starwarsffg/images/defaults/items/weapon.png",
    }
    if (game.user.id === user.id && (!data?.img || data?.img === "icons/svg/mystery-man.svg")) {
      if (Object.keys(defaultImages).includes(data.type)) {
        this.updateSource({img: defaultImages[data.type]});
      } else {
        // fall back to the old default
        this.updateSource({img: "icons/svg/item-bag.svg"});
      }
    }
    return {data, operation, user};
  }

  /** @override */
  async _onCreate(data, options, user) {
    if (user !== game.user.id) {
      // only run onCreate for the user actually performing the update
      return;
    }
    let force = false;
    // Ensure we're dealing with an embedded item
    if (this.isEmbedded && this.actor) {
      // If this is a weapon or armour item we must ensure its modifier-adjusted values are saved to the database
      if (["weapon", "shipweapon", "armour"].includes(this.type)) {
        let that = this.toObject(true);
        delete that._id;
        await this.update(that);
        force = true;
      }
    }

    // on create, run the first-time setup for deep data
    if (this.type === 'forcepower') {
      await this.update(
          this._prepareForcePowers()
      );
    } else if (this.type === 'signatureability') {
      await this.update(
          this._prepareSignatureAbilities()
      );
    } else if (this.type === 'specialization') {
      await this.update(
          await this._prepareSpecializations()
      );
    }

    await super._onCreate(data, options, user);

    await this._onCreateAEs(options, force);
  }

  async _onCreateAEs(options, force=false) {
    if (["species", "gear", "weapon", "armour", "shipattachment", "career", "specialization"].includes(this.type) && (!options.parent || force)) {
      const existingEffects = this.getEmbeddedCollection("ActiveEffect");
      // items are "created" when they are pulled from Compendiums, so don't duplicate Active Effects
      const inherentEffect = existingEffects.find(i => i.name === `(inherent)`);
      if (!inherentEffect) {
        CONFIG.logger.debug(`Creating inherent Active Effect for item ${this.name}`);
        const effects = {
          name: `(inherent)`,
          img: this.img,
          changes: [],
        };
        if (this.type === "species") {
          for (const attribute of Object.keys(this.system.attributes)) {
            if (attribute.startsWith("attr")) {
              // migrated data may contain attributes that the user has added, and we don't want this in the inherent effect
              continue;
            }
            const explodedMods = ModifierHelpers.explodeMod(
              this.system.attributes[attribute].modtype,
              attribute
            );
            for (const cur_mod of explodedMods) {
              const path = ModifierHelpers.getModKeyPath(
                cur_mod['modType'],
                cur_mod['mod']
              );
              effects.changes.push({
                key: path,
                mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                value: this.system.attributes[attribute].value,
              });
            }
          }
        } else if (["gear", "weapon"].includes(this.type)) {
          const explodedMods = ModifierHelpers.explodeMod(
            "Stat",
            "Encumbrance"
          );
          for (const cur_mod of explodedMods) {
            const path = ModifierHelpers.getModKeyPath(
              cur_mod['modType'],
              cur_mod['mod']
            );
            effects.changes.push({
              key: path,
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: 0,
            });
          }
        } else if (this.type === "armour") {
          for (const key of ["Encumbrance", "Defence", "Soak"]) {
            const explodedMods = ModifierHelpers.explodeMod(
              "Stat",
              key
            );
            for (const cur_mod of explodedMods) {
              const path = ModifierHelpers.getModKeyPath(
                cur_mod['modType'],
                cur_mod['mod']
              );
              effects.changes.push({
                key: path,
                mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                value: 0,
              });
            }
          }
        } else if (this.type === "shipattachment") {
          const explodedMods = ModifierHelpers.explodeMod(
            "Vehicle Stat",
            "Vehicle.Hardpoints"
          );
          for (const cur_mod of explodedMods) {
            const path = ModifierHelpers.getModKeyPath(
              cur_mod['modType'],
              cur_mod['mod']
            );
            effects.changes.push({
              key: path,
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: 0,
            });
          }
        } else if (this.type === "career") {
          for (let i = 0; i < 8; i++) {
            effects.changes.push({
              key: "(none)",
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: true,
            });
          }
        } else if (this.type === "specialization") {
          for (let i = 0; i < 5; i++) {
            effects.changes.push({
              key: "(none)",
              mode: CONST.ACTIVE_EFFECT_MODES.ADD,
              value: true,
            });
          }
        }

        if (["armour", "weapon", "gear"].includes(this.type)) {
          CONFIG.logger.debug("Detected equippible item creation, suspending Active Effects");
          effects.disabled = true;
        }

        CONFIG.logger.debug(`Creating Active Effect for ${this.name}/${this.type} on item creation`);
        CONFIG.logger.debug(effects);
        await this.createEmbeddedDocuments("ActiveEffect", [effects]);
      }
    }
  }

  /** @override */
  async _onUpdate(changed, options, userId) {
    CONFIG.logger.debug("Performing _onUpdate of item");
    await super._onUpdate(changed, options, userId);
    if (userId !== game.user.id) {
      // only run onCreate for the user actually performing the update
      return;
    }

    const existingEffects = this.getEmbeddedCollection("ActiveEffect");
    CONFIG.logger.debug(`On item ${this.name} update, found the following active effects:`);
    CONFIG.logger.debug(existingEffects);
    // update active effects from the item itself (e.g., stat boosts on species)
    const itemEffect = existingEffects.find(i => i.name === `(inherent)`);
    if (itemEffect) {
      CONFIG.logger.debug(`And located the following effects directly from this item: ${JSON.stringify(itemEffect)}`);
    } else {
      CONFIG.logger.debug("Unable to locate any inherent effect. This may be expected.");
    }
    if (itemEffect && Object.keys(changed).includes("system") && Object.keys(changed.system).includes("attributes")) {
      const newChanges = foundry.utils.deepClone(itemEffect.changes);
      for (const updateKey of Object.keys(changed.system.attributes)) {
        const existingChange = newChanges.find(c => c.key.startsWith(`system.attributes.${updateKey}`));
        if (existingChange) {
          existingChange.value = parseInt(changed.system.attributes[updateKey].value);
        }
      }
      await itemEffect.update({changes: newChanges});
    }

    // iterate over the changed data to look for any changes to attributes
    if (changed?.system?.attributes) {
      for (const attrKey of Object.keys(changed.system.attributes)) {
        const existingEffect = existingEffects.find(i => i.name === attrKey);
        const attr = this.system.attributes[attrKey];
        // Defensive: only explode mods if modtype and mod are defined
        let explodedMods = [];
        if (attr && typeof attr.modtype !== 'undefined' && typeof attr.mod !== 'undefined') {
          explodedMods = ModifierHelpers.explodeMod(attr.modtype, attr.mod);
        }

        const changes = [];
        for (const curMod of explodedMods) {
          changes.push({
            key: ModifierHelpers.getModKeyPath(curMod['modType'], curMod['mod']),
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: attr?.value,
          });
        }

        if (existingEffect) {
          // existing entry
          CONFIG.logger.debug(`> Staged AE changes for update: ${JSON.stringify(changes)}`);
          await existingEffect.update({
            changes: changes,
          });
        }
      }
    }

    // handle equip / unequip by suspending / unsuspending AEs
    const updatedExistingEffects = this.getEmbeddedCollection("ActiveEffect");
    if (changed?.system?.equippable && updatedExistingEffects) {
      const equipped = changed.system.equippable.equipped;
      CONFIG.logger.debug("caught equip / unequip, checking if Active Effect state should be synced");
      await ItemHelpers.syncAEStatus(this, updatedExistingEffects);
      for (const effect of updatedExistingEffects) {
        if (await ItemHelpers.shouldUpdateAEStatus(this, effect)) {
          await ItemHelpers.updateEncumbranceOnEquip(this, effect, equipped);
          await effect.update({disabled: !equipped});
        }
      }
    }
  }

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  async prepareData() {
    await super.prepareData();

    // Get the Item's data
    const item = this;
    const actor = this.actor ? this.actor : {};
    const data = item.system;

    if (!item.flags.starwarsffg) {
      await item.updateSource({
        flags: {
          starwarsffg: {
            isCompendium: !!this.compendium,
            ffgUuid: this.parent?.system ? this.uuid : null,
            ffgIsOwned: this.isEmbedded,
            loaded: false
          }
        }
      });
    } else {
      if (this.compendium) {
        item.flags.starwarsffg.isCompendium = true;
        // Temporary check on this.parent.data to avoid initialisation failing in Foundry VTT 0.8.6
        if (this.uuid) item.flags.starwarsffg.ffgUuid = this.uuid;
      } else {
        item.flags.starwarsffg.isCompendium = false;
        item.flags.starwarsffg.ffgIsOwned = false;
        if (this.isEmbedded) {
          item.flags.starwarsffg.ffgIsOwned = true;
          // Temporary check on this.parent.data to avoid initialisation failing in Foundry VTT 0.8.6
          if (this.parent) item.flags.starwarsffg.ffgUuid = this.uuid;
        } else if (item._id) {
          item.flags.starwarsffg.ffgTempId = item._id;
        }
      }
    }

    data.renderedDesc = await PopoutEditor.renderDiceImages(data.description, actor);

    // perform localisation of dynamic values
    switch (this.type) {
      case "weapon":
      case "shipweapon":
        // Apply item attachments / modifiers
        data.damage.value = parseInt(data.damage.value, 10);
        data.crit.value = parseInt(data.crit.value, 10);
        data.encumbrance.value = parseInt(data.encumbrance.value, 10);
        data.price.value = parseInt(data.price.value, 10);
        data.rarity.value = parseInt(data.rarity.value, 10);
        data.hardpoints.value = parseInt(data.hardpoints.value, 10);

        data.range.adjusted = data.range.value;
        data.damage.adjusted = parseInt(data.damage.value, 10);
        data.crit.adjusted = parseInt(data.crit.value, 10);
        data.encumbrance.adjusted = parseInt(data.encumbrance.value, 10);
        data.price.adjusted = parseInt(data.price.value, 10);
        data.rarity.adjusted = parseInt(data.rarity.value, 10);
        data.hardpoints.adjusted = parseInt(data.hardpoints.value, 10);

        data.adjusteditemmodifier = [];

        const rangeSetting = (this.type === "shipweapon") ? CONFIG.FFG.vehicle_ranges : CONFIG.FFG.ranges;

        if (data?.itemmodifier) {
          data.itemmodifier.forEach((modifier) => {
            if (modifier?.system) {
              modifier.system.rank_current = modifier.system.rank;
            }
            data.adjusteditemmodifier.push({ ...modifier });
            data.damage.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "damage", "Weapon Stat");
            data.crit.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "critical", "Weapon Stat");
            data.encumbrance.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "encumbrance", "Weapon Stat");
            data.price.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "price", "Weapon Stat");
            data.rarity.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "rarity", "Weapon Stat");
            data.hardpoints.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "hardpoints", "Weapon Stat");
            const range = ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "range", "Weapon Stat");
            const currentRangeIndex = Object.values(rangeSetting).findIndex((r) => r.value === data.range.value);
            let newRange = currentRangeIndex + range;
            if (newRange < 0) newRange = 0;
            if (newRange >= Object.values(rangeSetting).length) newRange = Object.values(rangeSetting).length - 1;

            data.range.adjusted = Object.values(rangeSetting)[newRange].value;
          });
        }

        if (data?.itemattachment) {
          data.itemattachment.forEach((attachment) => {
            const activeModifiers = attachment.system?.itemmodifier?.filter((i) => i?.system?.active) || [];
            data.damage.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "damage", "Weapon Stat");
            data.crit.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "critical", "Weapon Stat");
            if (data.crit.adjusted < 1) data.crit.adjusted = 1;
            data.encumbrance.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "encumbrance", "Weapon Stat");
            data.price.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "price", "Weapon Stat");
            data.rarity.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "rarity", "Weapon Stat");
            data.hardpoints.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "hardpoints", "Weapon Stat");
            const range = ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "range", "Weapon Stat");
            const currentRangeIndex = Object.values(rangeSetting).findIndex((r) => r.value === data.range.value);
            let newRange = currentRangeIndex + range;
            if (newRange < 0) newRange = 0;
            if (newRange >= Object.values(rangeSetting).length) newRange = Object.values(rangeSetting).length - 1;

            data.range.adjusted = Object.values(rangeSetting)[newRange].value;

            if (attachment?.system?.itemmodifier) {
              const activeMods = attachment.system.itemmodifier.filter((i) => i?.system?.active);

              activeMods.forEach((am) => {
                const foundItem = data.adjusteditemmodifier.find((i) => i.name === am.name);

                if (foundItem) {
                  if (foundItem.system?.rank) {
                    foundItem.system.rank_current = parseInt(foundItem.system.rank_current, 10) + 1;
                  }
                } else {
                  if (am.system?.rank) {
                    am.system.rank_current = 1;
                  } else {
                    am.system.rank_current = null;
                  }
                  data.adjusteditemmodifier.push({...am, adjusted: true});
                }
              });
            }
          });
        }

        if (this.isEmbedded && this.actor) {
          let damageAdd = 0;
          for (let attr in data.attributes) {
            if (data.attributes[attr].mod === "damage" && data.attributes[attr].modtype === "Weapon Stat") {
              damageAdd += parseInt(data.attributes[attr].value, 10);
            }
          }
          if (this.actor.type !== "vehicle") {
            if (ModifierHelpers.shouldApplyCharacteristicToDamage(data)) {
              const extraDamage = parseInt(actor.system.characteristics[data.characteristic.value].value, 10) + damageAdd;
              data.damage.adjusted += extraDamage;
            } else {
              data.damage.value = parseInt(data.damage.value, 10);
              data.damage.adjusted += damageAdd;
            }
          }
        }

        const rangeLabel = (this.type === "weapon" ? `SWFFG.WeaponRange` : `SWFFG.VehicleRange`) + this._capitalize(data.range.adjusted);
        data.range.label = rangeLabel;

        break;
      case "armour":
        data.soak.value = parseInt(data.soak.value, 10);
        data.defence.value = parseInt(data.defence.value, 10);
        data.encumbrance.value = parseInt(data.encumbrance.value, 10);
        data.price.value = parseInt(data.price.value, 10);
        data.rarity.value = parseInt(data.rarity.value, 10);
        data.hardpoints.value = parseInt(data.hardpoints.value, 10);

        data.soak.adjusted = parseInt(data.soak.value, 10);
        data.defence.adjusted = parseInt(data.defence.value, 10);
        data.encumbrance.adjusted = parseInt(data.encumbrance.value, 10);
        data.price.adjusted = parseInt(data.price.value, 10);
        data.rarity.adjusted = parseInt(data.rarity.value, 10);
        data.hardpoints.adjusted = parseInt(data.hardpoints.value, 10);

        data.adjusteditemmodifier = [];

        if (data?.itemmodifier) {
          data.itemmodifier.forEach((modifier) => {
            if (modifier?.system) {
              modifier.system.rank_current = modifier.system.rank;
            }
            data.adjusteditemmodifier.push({ ...modifier });
            data.soak.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "soak", "Armor Stat");
            data.defence.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "defence", "Armor Stat");
            data.encumbrance.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "encumbrance", "Armor Stat");
            data.price.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "price", "Armor Stat");
            data.rarity.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "rarity", "Armor Stat");
            data.hardpoints.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "hardpoints", "Armor Stat");
          });
        }

        if (data?.itemattachment) {
          data.itemattachment.forEach((attachment) => {
            const activeModifiers = attachment.system?.itemmodifier?.filter((i) => i?.system?.active) || [];
            data.soak.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "soak", "Armor Stat");
            data.defence.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "defence", "Armor Stat");
            data.encumbrance.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "encumbrance", "Armor Stat");
            data.price.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "price", "Armor Stat");
            data.rarity.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "rarity", "Armor Stat");
            data.hardpoints.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "hardpoints", "Armor Stat");

            if (attachment?.system?.itemmodifier) {
              const activeMods = attachment.system.itemmodifier.filter((i) => i?.system?.active);

              activeMods.forEach((am) => {
                const foundItem = data.adjusteditemmodifier.find((i) => i.name === am.name);

                if (foundItem) {
                  if (foundItem.system?.rank) {
                    foundItem.system.rank_current = parseInt(foundItem.system.rank_current, 10) + 1;
                  }
                } else {
                  if (am.system?.rank) {
                    am.system.rank_current = 1;
                  } else {
                    am.system.rank_current = null;
                  }
                  data.adjusteditemmodifier.push({...am, adjusted: true});
                }
              });
            }
          });
        }

        if (this.isEmbedded && this.actor && this.actor.system) {
          let soakAdd = 0, defenceAdd = 0, encumbranceAdd = 0;
          for (let attr in data.attributes) {
            let modtype = data.attributes[attr].modtype;
            if (modtype === "Armor Stat" || modtype === "Stat" || modtype === "Stat All") {
              switch (data.attributes[attr].mod.toLocaleLowerCase()) {
                case "soak":
                  soakAdd += parseInt(data.attributes[attr].value, 10);
                  break;
                case "defence":
                  defenceAdd += parseInt(data.attributes[attr].value, 10);
                  break;
                case "encumbrance":
                  encumbranceAdd += parseInt(data.attributes[attr].value, 10);
                  break;
                default:
                  break;
              }
            }
          }
          if (this.actor.type !== "vehicle") {
            data.soak.value = parseInt(data.soak.value, 10);
            data.soak.adjusted += soakAdd;
            data.defence.value = parseInt(data.defence.value, 10);
            data.defence.adjusted += defenceAdd;
            data.encumbrance.value = parseInt(data.encumbrance.value, 10);
            data.encumbrance.adjusted += encumbranceAdd;
          }
        }
        break;
      case "talent":
        const cleanedActivationName = data.activation.value.replace(/[\W_]+/g, "");
        const activationId = `SWFFG.TalentActivations${this._capitalize(cleanedActivationName)}`;
        data.activation.label = activationId;
        break;

      case "gear":
        data.encumbrance.value = parseInt(data.encumbrance.value, 10);
        break;

      default:
    }

    if (["weapon", "armour", "shipweapon"].includes(this.type)) {
      // get all item attachments
      let totalHPUsed = 0;

      if (data?.itemattachment?.length) {
        data.itemattachment.forEach((attachment) => {
          totalHPUsed += attachment.system?.hardpoints?.value || 0;
        });
      }

      data.hardpoints.current = data.hardpoints.value - totalHPUsed;
    }

    if (this.type === "forcepower") {
      this._prepareForcePowers();
    }

    if (this.type === "specialization") {
      this._prepareSpecializations();
    }

    if (this.type === "signatureability") {
      this._prepareSignatureAbilities();
    }
  }
  /**
   * Capitalize string
   * @param  {String} s   String value to capitalize
   */
  _capitalize(s) {
    if (typeof s !== "string") return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  _prepareTalentTrees(collection, itemType, listProperty, hasGlobalList) {
    const item = this;
    const talents = item.system[collection];
    let rowcount = 0;
    const controls = Object.keys(talents).filter((item) => {
      return item.includes(itemType);
    });

    let itemList = [];

    for (let upgrade of controls) {
      if (upgrade.includes(itemType)) {
        if (talents[upgrade].islearned) {
          const item = JSON.parse(JSON.stringify(talents[upgrade]));

          if (item.isRanked || listProperty === "powerUpgrades") {
            item.rank = 1;
          } else {
            item.rank = "N/A";
          }

          let index = itemList.findIndex((obj) => {
            return obj.name === item.name;
          });

          if (index < 0 || (!item.isRanked && listProperty !== "powerUpgrades")) {
            itemList.push(item);
          } else {
            itemList[index].rank += 1;
          }
        }

        if (itemType === "talent") {
          const id = parseInt(upgrade.replace("talent", ""), 10);
          talents[upgrade].cost = (Math.trunc(id / 4) + 1) * 5;
        }

        if (typeof talents[upgrade].visible === "undefined") {
          talents[upgrade].visible = true;
        }

        if (talents[upgrade].visible) {
          if (!talents[upgrade].size || talents[upgrade].size === "single") {
            talents[upgrade].size = "single";
            talents[upgrade].canSplit = false;
            rowcount += 1;
          } else if (talents[upgrade].size === "double") {
            rowcount += 2;
            talents[upgrade].canSplit = true;
          } else if (talents[upgrade].size === "triple") {
            rowcount += 3;
            talents[upgrade].canSplit = true;
          } else {
            rowcount += 4;
            talents[upgrade].canSplit = true;
          }
        }

        talents[upgrade].canCombine = false;
        talents[upgrade].canLinkTop = true;
        talents[upgrade].canLinkRight = true;

        if (rowcount === 4) {
          talents[upgrade].canLinkRight = false;
        }

        const controlNumber = parseInt(upgrade.replace(itemType, ""), 10);

        if (rowcount < 4) {
          talents[upgrade].canCombine = true;
        } else {
          rowcount = 0;
        }
      }
    }

    itemList.sort((a, b) => {
      return a.name - b.name;
    });

    item[listProperty] = itemList;
    return {system: {collection: talents}};
  }

  async _prepareSpecializations() {
    return this._prepareTalentTrees("talents", "talent", "talentList");
  }

  /**
   * Prepare Force Power Item Data
   */
  _prepareForcePowers() {
    return this._prepareTalentTrees("upgrades", "upgrade", "powerUpgrades");
  }

  _prepareSignatureAbilities() {
    return this._prepareTalentTrees("upgrades", "upgrade", "powerUpgrades");
  }

  _updateSpecializationTalentReference(specializationTalentItem, talentItem) {
    CONFIG.logger.debug(`Updating Specializations Talent ${specializationTalentItem.name} with ${talentItem.name}`);
    specializationTalentItem.name = talentItem.name;
    specializationTalentItem.description = talentItem.system.description;
    specializationTalentItem.activation = talentItem.system.activation.value;
    specializationTalentItem.activationLabel = talentItem.system.activation.label;
    specializationTalentItem.isRanked = talentItem.system.ranks.ranked;
    specializationTalentItem.isForceTalent = talentItem.system.isForceTalent;
    specializationTalentItem.isConflictTalent = talentItem.system.isConflictTalent;
    specializationTalentItem.attributes = talentItem.system.attributes;
  }

  /**
   * Prepare and return details of the item for display in inventory or chat.
   */
  async getItemDetails() {
    const data = foundry.utils.duplicate(this.system);

    // Item type specific properties
    const props = [];
    const purchasedUpgrades = [];
    const specializations = [];
    const signatureAbilities = [];

    data.prettyDesc = await PopoutEditor.renderDiceImages(data.description, this.actor);

    if (["weapon", "armor", "armour", "shipweapon"].includes(this.type)) {
      data.doNotSubmit = (await this.sheet.getData()).data.doNotSubmit;
    }

    if (["talent"].includes(this.type) && data.longDesc) {
      data.description = data.longDesc;
    }

    if (this.type === "weapon") {
      const ammoEnabled = this.getFlag("starwarsffg", "config.enableAmmo");
      if (ammoEnabled) {
        props.push(`Ammo: ${data.ammo.value}/${data.ammo.max}`);
      }
    }

    if (this.type === "forcepower" || this.type === "signatureability") {
      //Display upgrades

      // Get learned upgrades
      const upgrades = Object.values(data.upgrades).filter((up) => up.islearned);

      const upgradeDescriptions = [];

      for (const up of upgrades) {
        let index = upgradeDescriptions.findIndex((obj) => {
          return obj.name === up.name;
        });

        if (index >= 0) {
          upgradeDescriptions[index].rank += 1;
        } else {
          upgradeDescriptions.push({
            name: up.name,
            description: await foundry.applications.ux.TextEditor.enrichHTML(up.description),
            rank: 1,
          });
        }
      }

      for (const upd of upgradeDescriptions) {
        props.push(`<div class="ffg-sendtochat hover" onclick="">${upd.name} ${upd.rank}
          <div class="tooltip2">
            ${upd.description}
          </div>
        </div>`);
        purchasedUpgrades.push({
          name: upd.name,
          rank: upd.rank,
          description: upd.description,
        })
      }
    }
    // General equipment properties
    else if (this.type !== "talent") {
      if (data.hasOwnProperty("doNotSubmit")) {
        const modifiers = data.doNotSubmit.qualities;
        const qualities = [];
        for (const modifier of modifiers) {
          qualities.push(`
          <div class='item-pill-hover hover-tooltip' data-item-type="itemmodifier" data-item-embed-name="${ modifier.name }" data-item-embed-img="${ modifier.img }" data-desc="${ (await foundry.applications.ux.TextEditor.enrichHTML(modifier.description)).replaceAll('"', "'") }" data-item-ranks="${ modifier.totalRanks }" data-tooltip="Loading...">
            ${modifier.name} ${modifier.totalRanks === null || modifier.totalRanks === 0 ? "" : modifier.totalRanks}
          </div>
          `);
        }

        props.push(`<div>${game.i18n.localize("SWFFG.ItemDescriptors")}: <ul>${qualities.join("")}<ul></div>`);
      }

      if (data.hasOwnProperty("encumbrance")) {
        props.push(`${game.i18n.localize("SWFFG.Encumbrance")}: ${data.encumbrance?.adjusted ? data.encumbrance.adjusted : data.encumbrance.value}`);
      }
      if (data.hasOwnProperty("price")) {
        props.push(`${game.i18n.localize("SWFFG.ItemsPrice")}: ${data.price?.adjusted ? data.price.adjusted : data.price.value}`);
      }
      if (data.hasOwnProperty("rarity")) {
        props.push(`${game.i18n.localize("SWFFG.ItemsRarity")}: ${data.rarity?.adjusted ? data.rarity.adjusted : data.rarity.value} ${data.rarity.isrestricted ? "<span class='restricted'>" + game.i18n.localize("SWFFG.IsRestricted") + "</span>" : ""}`);
      }
      if (data.hasOwnProperty("talents")) {
        for (const talentKey of Object.keys(data.talents)) {
          const talent = data.talents[talentKey];
          if (talent?.islearned) {
            purchasedUpgrades.push({
              name: talent.name,
              rank: 0,
              description: talent.enrichedDescription,
            });
          }
        }
      }
      if (data.hasOwnProperty("specializations")) {
        for (const specializationKey of Object.keys(data.specializations)) {
          const specialization = data.specializations[specializationKey];
          const fullSpecialization = fromUuidSync(specialization.source);
          specializations.push({
            name: specialization.name,
            uuid: specialization.uuid,
            description: fullSpecialization?.system?.description,
            img: fullSpecialization?.img,
          });
        }
      }
      if (data.hasOwnProperty("signatureabilities")) {
        for (const SAKey of Object.keys(data.signatureabilities)) {
          const signatureAbility = data.signatureabilities[SAKey];
          const fullSignatureAbility = fromUuidSync(signatureAbility.source);
          signatureAbilities.push({
            name: signatureAbility.name,
            uuid: signatureAbility.uuid,
            description: fullSignatureAbility?.system?.description,
            img: fullSignatureAbility?.img,
          });
        }
      }
    }

    // Weapon properties
    if (this.type === "weapon") {
      if (data.hasOwnProperty("skill")) {
        const cleanedSkillName = data.skill.value.replace(/[\W_]+/g, "");
        const skillLabel = "SWFFG.SkillsName" + cleanedSkillName;
        props.push(`Skill: ${game.i18n.localize(skillLabel)}`);
      }
    }

    // Talent properties
    if (data.hasOwnProperty("isForceTalent")) {
      if (data.isForceTalent) props.push(game.i18n.localize("SWFFG.ForceTalent"));
    }
    if (data.hasOwnProperty("ranks")) {
      if (data.ranks.ranked) props.push(game.i18n.localize("SWFFG.Ranked"));
    }

    // Filter properties and return
    data.properties = props.filter((p) => !!p);
    data.textProperties = purchasedUpgrades;
    data.specializations = specializations;
    data.signatureAbilities = signatureAbilities;
    return data;
  }
}
