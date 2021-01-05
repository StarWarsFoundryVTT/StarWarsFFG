import ItemBaseFFG from "./itembase-ffg.js";
import PopoutEditor from "../popout-editor.js";
import ActorOptions from "../actors/actor-ffg-options.js";
import ImportHelpers from "../importer/import-helpers.js";
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

    data.renderedDesc = PopoutEditor.renderDiceImages(data.description, actorData);

    // perform localisation of dynamic values
    switch (this.type) {
      case "weapon":
        const rangeId = `SWFFG.WeaponRange${this._capitalize(data.range.value)}`;
        data.range.label = rangeId;

        if (this.isOwned && this.actor && this.actor.type !== "vehicle" && this.actor.data.type !== "vehicle") {
          let damageAdd = 0;
          for (let attr in data.attributes) {
            if (data.attributes[attr].mod === "damage" && data.attributes[attr].modtype === "Weapon Stat") {
              damageAdd += parseInt(data.attributes[attr].value, 10);
            }
          }
          if ((data.skill.value.includes("Melee") || data.skill.value.includes("Brawl")) && data.skill.useBrawn) {
            data.damage.value = parseInt(actorData.data.characteristics.Brawn.value, 10) + damageAdd;
            data.damage.adjusted = +data.damage.value;
          } else {
            data.damage.value = parseInt(data.damage.value, 10);
            data.damage.adjusted = +data.damage.value + damageAdd;
          }
        }

        break;
      case "shipweapon":
        const vehiclerangeId = `SWFFG.VehicleRange${this._capitalize(data.range.value)}`;
        data.range.label = vehiclerangeId;

        let damageAdd = 0;
        for (let attr in data.attributes) {
          if (data.attributes[attr].mod === "damage" && data.attributes[attr].modtype === "Weapon Stat") {
            damageAdd += parseInt(data.attributes[attr].value, 10);
          }
        }

        data.damage.value = parseInt(data.damage.value, 10);
        data.damage.adjusted = +data.damage.value + damageAdd;
        break;
      case "talent":
        const cleanedActivationName = data.activation.value.replace(/[\W_]+/g, "");
        const activationId = `SWFFG.TalentActivations${this._capitalize(cleanedActivationName)}`;
        data.activation.label = activationId;
        break;
      default:
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
      if (data.hasOwnProperty("special")) {
        props.push(`<div>Special qualities: ${data.special.value}</div>`);
      }
      if (data.hasOwnProperty("equippable")) {
        props.push(game.i18n.localize(data.equippable.equipped ? "SWFFG.Equipped" : "SWFFG.Unequipped"));
      }
      if (data.hasOwnProperty("encumbrance")) {
        props.push(`Encumbrance: ${data.encumbrance.value}`);
      }
      if (data.hasOwnProperty("price")) {
        props.push(`Price: ${data.price.value}`);
      }
      if (data.hasOwnProperty("rarity")) {
        props.push(`Rarity: ${data.rarity.value}`);
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
