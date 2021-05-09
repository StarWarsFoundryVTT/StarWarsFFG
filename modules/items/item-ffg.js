import ItemBaseFFG from "./itembase-ffg.js";
import PopoutEditor from "../popout-editor.js";
import ActorOptions from "../actors/actor-ffg-options.js";
import ImportHelpers from "../importer/import-helpers.js";
import ModifierHelpers from "../helpers/modifiers.js";
import Helpers from "../helpers/common.js";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class ItemFFG extends ItemBaseFFG {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    CONFIG.logger.debug(`Preparing Item Data ${this.type} ${this.name}`);

    // Get the Item's data
    const itemData = this.data;
    const actorData = this.actor ? this.actor.data : {};
    const data = itemData.data;

    if (this.compendium) {
      itemData.flags.isCompendium = true;
      itemData.flags.ffgUuid = this.uuid;
    } else {
      itemData.flags.isCompendium = false;
      itemData.flags.ffgIsOwned = false;
      if (this.isOwned) {
        itemData.flags.ffgIsOwned = true;
        itemData.flags.ffgUuid = this.uuid;
      } else if (itemData._id) {
        itemData.flags.ffgTempId = itemData._id;
      }
    }

    data.renderedDesc = PopoutEditor.renderDiceImages(data.description, actorData);

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

        if (data?.itemmodifier) {
          data.itemmodifier.forEach((modifier) => {
            modifier.data.rank_current = modifier.data.rank;
            data.adjusteditemmodifier.push({ ...modifier });
            data.damage.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "damage", "Weapon Stat");
            data.crit.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "critical", "Weapon Stat");
            data.encumbrance.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "encumbrance", "Weapon Stat");
            data.price.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "price", "Weapon Stat");
            data.rarity.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "rarity", "Weapon Stat");
            data.hardpoints.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "hardpoints", "Weapon Stat");
            const range = ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "range", "Weapon Stat");
            const currentRangeIndex = Object.values(CONFIG.FFG.ranges).findIndex((r) => r.value === data.range.value);
            let newRange = currentRangeIndex + range;
            if (newRange < 0) newRange = 0;
            if (newRange >= Object.values(CONFIG.FFG.ranges).length) newRange = Object.values(CONFIG.FFG.ranges).length - 1;

            data.range.adjusted = Object.values(CONFIG.FFG.ranges)[newRange].value;
          });
        }

        if (data?.itemattachment) {
          data.itemattachment.forEach((attachment) => {
            const activeModifiers = attachment.data.itemmodifier.filter((i) => i.data?.active);
            data.damage.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "damage", "Weapon Stat");
            data.crit.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "critical", "Weapon Stat");
            if (data.crit.adjusted < 1) data.crit.adjusted = 1;
            data.encumbrance.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "encumbrance", "Weapon Stat");
            data.price.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "price", "Weapon Stat");
            data.rarity.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "rarity", "Weapon Stat");
            data.hardpoints.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "hardpoints", "Weapon Stat");
            const range = ModifierHelpers.getCalculatedValueFromCurrentAndArray(attachment, activeModifiers, "range", "Weapon Stat");
            const currentRangeIndex = Object.values(CONFIG.FFG.ranges).findIndex((r) => r.value === data.range.value);
            let newRange = currentRangeIndex + range;
            if (newRange < 0) newRange = 0;
            if (newRange >= Object.values(CONFIG.FFG.ranges).length) newRange = Object.values(CONFIG.FFG.ranges).length - 1;

            data.range.adjusted = Object.values(CONFIG.FFG.ranges)[newRange].value;

            if (attachment?.data?.itemmodifier) {
              const activeMods = attachment.data.itemmodifier.filter((i) => i?.data?.active);

              activeMods.forEach((am) => {
                const foundItem = data.adjusteditemmodifier.find((i) => i.name === am.name);

                if (foundItem) {
                  foundItem.data.rank_current = parseInt(foundItem.data.rank_current, 10) + 1;
                } else {
                  am.data.rank_current = 1;
                  data.adjusteditemmodifier.push({ ...am, adjusted: true });
                }
              });
            }
          });
        }

        if (this.isOwned && this.actor) {
          let damageAdd = 0;
          for (let attr in data.attributes) {
            if (data.attributes[attr].mod === "damage" && data.attributes[attr].modtype === "Weapon Stat") {
              damageAdd += parseInt(data.attributes[attr].value, 10);
            }
          }
          if (this.actor.type !== "vehicle" && this.actor.data.type !== "vehicle") {
            if (ModifierHelpers.applyBrawnToDamage(data)) {
              const olddamage = data.damage.value;
              data.damage.value = parseInt(actorData.data.characteristics.Brawn.value, 10) + damageAdd;
              data.damage.adjusted += parseInt(data.damage.value, 10) - olddamage;
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
            modifier.data.rank_current = modifier.data.rank;
            data.adjusteditemmodifier.push({ ...modifier });
            data.soak.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "soak", "Armor Stat");
            data.defence.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "defence", "Armor Stat");
            data.encumbrance.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "encumbrance", "Armor Stat");
            data.price.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "price", "Armor Stat");
            data.rarity.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "rarity", "Armor Stat");
            data.hardpoints.adjusted += ModifierHelpers.getCalculatedValueFromCurrentAndArray(modifier, [], "hardpoints", "Armor Stat");
          });
        }

        if (this.isOwned && this.actor) {
          let soakAdd = 0, defenceAdd = 0, encumbranceAdd;
          for (let attr in data.attributes) {
            if (data.attributes[attr].modtype === "Armor Stat") {
              switch (data.attributes[attr].mod) {
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
          if (this.actor.type !== "vehicle" && this.actor.data.type !== "vehicle") {
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
      default:
    }

    if (["weapon", "armour"].includes(this.type)) {
      // get all item attachments
      let totalHPUsed = 0;

      if (data?.itemattachment?.length) {
        data.itemattachment.forEach((attachment) => {
          totalHPUsed += attachment.data.hardpoints.value;
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
    const itemData = this.data;
    const talents = itemData.data[collection];
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

    itemData[listProperty] = itemList;
  }

  async _prepareSpecializations() {
    this._prepareTalentTrees("talents", "talent", "talentList");
  }

  /**
   * Prepare Force Power Item Data
   */
  _prepareForcePowers() {
    this._prepareTalentTrees("upgrades", "upgrade", "powerUpgrades");
  }

  _prepareSignatureAbilities() {
    this._prepareTalentTrees("upgrades", "upgrade", "powerUpgrades");
  }

  _updateSpecializationTalentReference(specializationTalentItem, talentItem) {
    CONFIG.logger.debug(`Updating Specializations Talent ${specializationTalentItem.name} with ${talentItem.name}`);
    specializationTalentItem.name = talentItem.name;
    specializationTalentItem.description = talentItem.data.description;
    specializationTalentItem.activation = talentItem.data.activation.value;
    specializationTalentItem.activationLabel = talentItem.data.activation.label;
    specializationTalentItem.isRanked = talentItem.data.ranks.ranked;
    specializationTalentItem.isForceTalent = talentItem.data.isForceTalent;
    specializationTalentItem.isConflictTalent = talentItem.data.isConflictTalent;
    specializationTalentItem.attributes = talentItem.data.attributes;
  }

  /**
   * Prepare and return details of the item for display in inventory or chat.
   */
  getItemDetails() {
    const data = duplicate(this.data.data);

    // Item type specific properties
    const props = [];

    data.prettyDesc = PopoutEditor.renderDiceImages(data.description, this.actor?.data);

    if (this.type === "forcepower") {
      //Display upgrades

      // Get learned upgrades
      const upgrades = Object.values(data.upgrades).filter((up) => up.islearned);

      const upgradeDescriptions = [];

      upgrades.forEach((up) => {
        let index = upgradeDescriptions.findIndex((obj) => {
          return obj.name === up.name;
        });

        if (index >= 0) {
          upgradeDescriptions[index].rank += 1;
        } else {
          upgradeDescriptions.push({
            name: up.name,
            description: up.description,
            rank: 1,
          });
        }
      });

      upgradeDescriptions.forEach((upd) => {
        props.push(`<div class="ffg-sendtochat hover" onclick="">${upd.name} ${upd.rank}
          <div class="tooltip2">
            ${PopoutEditor.renderDiceImages(upd.description, this?.actor?.data)}
          </div>
        </div>`);
      });
    }
    // General equipment properties
    else if (this.type !== "talent") {
      if (data.hasOwnProperty("adjusteditemmodifier")) {
        const qualities = data.adjusteditemmodifier.map((m) => `<li class='item-pill ${m.adjusted ? "adjusted hover" : ""}' data-item-id='${this._id}' data-uuid='${this.uuid}' data-modifier-id='${m._id}' data-modifier-type='${m.type}'>${m.name} ${m.data.rank_current > 0 ? m.data.rank_current : ""} ${m.adjusted ? "<div class='tooltip2'>" + game.i18n.localize("SWFFG.FromAttachment") + "</div>" : ""}</li>`);

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
    return data;
  }
}
