import ModifierHelpers from "./modifiers.js";

export default class ItemHelpers {
  static async itemUpdate(event, formData) {
    formData = foundry.utils.expandObject(formData);

    if (this.object.isEmbedded && this.object.actor?.compendium?.metadata) {
      return;
    }
    CONFIG.logger.debug(`Updating ${this.object.type}`);

    if (this.object.type === "weapon") {
      if (ModifierHelpers.applyBrawnToDamage(formData.data)) {
        foundry.utils.setProperty(formData, `data.damage.value`, 0);
      }
    }

    // Handle the free-form attributes list
    const formAttrs = foundry.utils.expandObject(formData)?.data?.attributes || {};
    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      delete v["key"];
      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    if (this.object.system?.attributes) {
      for (let k of Object.keys(this.object.system.attributes)) {
        if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
      }
    }

    // apply active effects
    await ModifierHelpers.applyActiveEffectOnUpdate(this.object, formData);

    // recombine attributes to formData
    if (Object.keys(attributes).length > 0) {
      foundry.utils.setProperty(formData, `data.attributes`, attributes);
    }

    // migrate data to v10 structure
    let updated_id = formData._id;
    delete formData._id;

    foundry.utils.setProperty(formData, `flags.starwarsffg.loaded`, false);
    await this.object.update(formData);
    // sync the active effect state (if applicable). needs to be after the update so we have the updated state
    await ItemHelpers.syncAEStatus(this.object, this.object.getEmbeddedCollection("ActiveEffect"));
    await this.render(true);

    if (this.object.type === "talent") {
      if (this.object.flags?.clickfromparent?.length) {
        let listofparents = JSON.parse(JSON.stringify(this.object.flags.clickfromparent));
        while (listofparents.length > 0) {
          const parent = listofparents.shift();
          const spec = await fromUuid(parent.id);
          if (spec) {
            let updateData = {};
            foundry.utils.setProperty(updateData, `data.talents.${parent.talent}.name`, formData.name);
            foundry.utils.setProperty(updateData, `data.talents.${parent.talent}.description`, this.object.system.description);
            foundry.utils.setProperty(updateData, `data.talents.${parent.talent}.activation`, formData.data.activation.value);
            foundry.utils.setProperty(updateData, `data.talents.${parent.talent}.isRanked`, formData.data.ranks.ranked);
            foundry.utils.setProperty(updateData, `data.talents.${parent.talent}.isForceTalent`, formData.data.isForceTalent);
            foundry.utils.setProperty(updateData, `data.talents.${parent.talent}.isConflictTalent`, formData.data.isConflictTalent);

            // Remove attributes which are no longer used
            if (spec?.system?.talents?.[parent.talent]?.attributes) {
              for (let k of Object.keys(spec.system.talents[parent.talent].attributes)) {
                if (!formData.data.attributes.hasOwnProperty(k)) formData.data.attributes[`-=${k}`] = null;
              }
            }

            foundry.utils.setProperty(updateData, `data.talents.${parent.talent}.attributes`, formData.data.attributes);

            if (parent.id.includes(".OwnedItem.")) {
              const ids = parent.id.split(".OwnedItem.");
              const actor = await fromUuid(ids[0]);
              const item = await actor.items.get(ids[1]);
              foundry.utils.setProperty(updateData, `flags.starwarsffg.loaded`, false);
              await item.update(updateData);
              await item.sheet.render(true);
            } else {
              foundry.utils.setProperty(updateData, `flags.starwarsffg.loaded`, false);
              await spec.update(updateData);
              await spec.sheet.render(true);
            }
          }
        }
      }
    }
  }

  /**
   * Takes formData and move anything under .data into .system in preparation for an item.update() call
   * @param formData
   * @returns {*}
   */
  static normalizeDataStructure(formData) {
    const updatedData = foundry.utils.deepClone(formData);
    if (Object.keys(formData).includes('data')) {
      if (!Object.keys(formData).includes('system')) {
        // sometimes we get formData with a mix of data and system...
        updatedData.system = {};
      }
      updatedData.system = foundry.utils.mergeObject(
          updatedData.system,
          updatedData.data
      );
      delete updatedData.data;
    }
    // Initialize updatedData.system if the key is present with no value
    if (Object.keys(updatedData).includes('system') && typeof updatedData.system === "undefined")
      {
        updatedData.system = {};
      }
    return updatedData;
  }

  /**
   * Takes formData and converts certain fields into an array, rather than the odd name they have by default
   * For example, submitting a form with a modifier on it results in a field value of "itemmodifier[0]", rather than
   *  a field named "itemmodifier" with a single entry in an array
   * @param formData
   */
  static explodeFormData(formData) {
    // convert the formdata into a dict
    formData = foundry.utils.expandObject(formData);
    // collapse the resulting entries with an index into an array
    const relevantEntries = Object.keys(formData?.system).filter(i => i.includes("[") && i.includes("]"));
    for (const cur_entry in relevantEntries) {
      const updatedKeyName =  relevantEntries[cur_entry].replace(/\[.*\]/, "");
      if (!Object.keys(formData.system).includes(updatedKeyName)) {
        formData.system[updatedKeyName] = [];
      }
      formData.system[updatedKeyName].push(formData.system[relevantEntries[cur_entry]]);
      delete formData.system[relevantEntries[cur_entry]];
    }
    return formData;
  }

  /**
   * Determines if a given Active Effect should have a status updated or not - based on the item it's a part of
   * For example, if a piece of armor has an attachment with a modification with a mod that's not installed,
   *  that mod should not apply any effect to the actor - even if the armor is equipped / unequipped
   * Similarly, unpurchased talents on specializations should not do anything until they are purchased
   * @param item - the item the active effect is a part of
   * @param activeEffect - the specific active effect to check
   * @returns {Promise<boolean>} - bool representing if the changes should be applied or not
   *
   */
  static async shouldUpdateAEStatus(item, activeEffect) {
    CONFIG.logger.debug(`Checking if ${activeEffect.name} from ${item.name} should be applied`);
    if (["armour", "weapon", "shipweapon"].includes(item.type)) {
      for (const attachment of item.system.itemattachment) {
        for (const modification of attachment.system.itemmodifier) {
          try {
            const foundMod = modification.system.attributes[activeEffect.name];
            CONFIG.logger.debug(`Located mod ${activeEffect.name}, checking if it's active or not`);
            if (foundMod && !modification.system.active) {
              CONFIG.logger.debug(`Mod ${activeEffect.name} is not active, not syncing AE status`);
              return false;
            } else {
              CONFIG.logger.debug(`Mod ${activeEffect.name} is active, syncing AE status`);
              return true;
            }
          } catch {
            CONFIG.logger.debug(`No mod located, continuing search...`);
          }
        }
      }
    }
    CONFIG.logger.debug(`No reason to avoid updating status found, syncing AE status`);
    return true;
  }

  /**
   * Sync the status of an active effect to the parent object when an item is updated
   * For example, enable an active effect on a talent as a part of a specialization when that talent is purchased
   * @param item
   * @param activeEffects
   * @returns {Promise<void>}
   */
  static async syncAEStatus(item, activeEffects) {
    CONFIG.logger.debug(`Syncing ${activeEffects.length} Active Effects status...`);
    if (["specialization", "signatureability"].includes(item.type)) {
      CONFIG.logger.debug("specialization, or signature ability, looking through AEs to sync");
      for (const activeEffect of activeEffects) {
        if (["specialization"].includes(item.type)) {
          for (const talentKey of Object.keys(item.system.talents)) {
            const talent = item.system.talents[talentKey];
            try {
              const locatedMod = talent.attributes[activeEffect.name]; // this can throw an exception; best to handle it
              if (locatedMod) {
                if (talent.islearned) {
                  CONFIG.logger.debug(`located attribute granting AE (${activeEffect.name}) AND the talent (${talent.name}) is learned, unsuspending`);
                  await activeEffect.update({disabled: false});
                } else {
                  CONFIG.logger.debug(`located attribute granting AE (${activeEffect.name}), but the talent is not learned, suspending`);
                  await activeEffect.update({disabled: true});
                }
              }
            } catch {
              CONFIG.logger.debug("no attribute granting AE found");
            }
          }
        }
      }
    } else if (["forcepower"].includes(item.type)) {
      CONFIG.logger.debug("force power, looking through AEs to sync");
      for (const activeEffect of activeEffects) {
        if (["forcepower"].includes(item.type)) {
          for (const upgradeKey of Object.keys(item.system.upgrades)) {
            const upgrade = item.system.upgrades[upgradeKey];
            try {
              const locatedMod = upgrade.attributes[activeEffect.name]; // this can throw an exception; best to handle it
              if (locatedMod) {
                if (upgrade.islearned) {
                  CONFIG.logger.debug(`located attribute granting AE (${activeEffect.name}) AND the upgrade (${upgrade.name}) is learned, unsuspending`);
                  await activeEffect.update({disabled: false});
                } else {
                  CONFIG.logger.debug(`located attribute granting AE (${activeEffect.name}), but the upgrade is not learned, suspending`);
                  await activeEffect.update({disabled: true});
                }
              }
            } catch {
              CONFIG.logger.debug("no attribute granting AE found");
            }
          }
        }
      }
    } else if (["armour", "weapon", "shipweapon"].includes(item.type)) {
      CONFIG.logger.debug("armor and weapon, checking modifiers to sync value to rank");
      // sync AEs to the rank value - that is, if we have a mod which adds 1 to max wounds with 4 ranks, the AE should have a value of 4, not 1
      const existingEffects = item.getEmbeddedCollection("ActiveEffect");
      for (const modifier of item.system.itemmodifier) {
        for (const attr of Object.keys(modifier.system.attributes)) {
          const matchingEffect = existingEffects.find(effect => effect.name === attr);
          if (matchingEffect) {
            // the mod should be applied once per rank
            const newValue = modifier.system.rank * modifier.system.attributes[attr].value;
            CONFIG.logger.debug(`Located ${attr}, updating with new value of ${newValue}`);
            await matchingEffect.update({
              "changes": [{
                key: matchingEffect.changes[0].key,
                mode: matchingEffect.changes[0].mode,
                priority: matchingEffect.changes[0].priority,
                value: newValue,
              }],
            });
          }
        }
      }
    } else {
      CONFIG.logger.debug(`'other' item type ${item.type}, no need to sync AE status'`);
    }
  }

  /**
   * Update the inherent Encumbrance Active Effect when armor is equipped/unequipped
   * (because the encumbrance is reduced by 3 when worn)
   * @param item - item being equipped
   * @param activeEffect - inherent AE for that item
   * @param equipped - if the item is now equipped or not
   * @returns {Promise<void>} - N/A, updates the change on the AE
   */
  static async updateEncumbranceOnEquip(item, activeEffect, equipped) {
    CONFIG.logger.debug("Updating encumbrance Active Effect on equip state change");
    const realEncumbrance = item?.system?.encumbrance?.value;
    if (item.type === "armour" && realEncumbrance) {
      const encumbranceModPath = ModifierHelpers.getModKeyPath("Stat", "Encumbrance");
      let updatedEncumbrance;
      if (equipped) {
        updatedEncumbrance = Math.max(realEncumbrance - 3, 0);
      } else {
        updatedEncumbrance = realEncumbrance;
      }
      CONFIG.logger.debug(`Original encumbrance: ${realEncumbrance}, new encumbrance: ${updatedEncumbrance}`);
      for (const change of activeEffect.changes) {
        if (change.key === encumbranceModPath) {
          change.value = updatedEncumbrance;
          break;
        }
      }
      await activeEffect.update({changes: activeEffect.changes});
    }
  }

  /**
   * Ensures unique attribute keys for a dropped item by checking and modifying its attributes, modifiers, and attachments
   * to avoid key collisions within the parent item. Also updates any matching active effects to align with the new attribute keys.
   *
   * @param {Object} droppedItem - The item being added or moved, whose attributes need to be checked and adjusted if necessary
   * @param {Object} parentItem - The target item that will contain the dropped item, used to determine existing keys for comparison
   * @return {Object} - Returns the modified dropped item with updated attribute keys and effects
   */
  static async uniqueAttrs(droppedItem, parentItem) {
    CONFIG.logger.debug(`Unique-ing attributes for dropped item ${droppedItem.name} on parent item ${parentItem.name}`);
    // collect the existing attrs so we can determine if there's a collision
    let existingAttrs = Object.keys(parentItem.system.attributes) || [];
    if (Object.keys(parentItem.system).includes("itemmodifier")) {
      for (const modifier of parentItem.system.itemmodifier) {
        existingAttrs = [...existingAttrs, ...Object.keys(modifier.system.attributes)];
      }
    }
    if (Object.keys(parentItem.system).includes("itemattachment")) {
      for (const attachment of parentItem.system.itemattachment) {
        existingAttrs = [...existingAttrs, ...Object.keys(attachment.system.attributes)];
        for (const modification of attachment.system.itemmodifier) {
          existingAttrs = [...existingAttrs, ...Object.keys(modification.system.attributes)];
        }
      }
    }
    if (Object.keys(parentItem.system).includes("talents")) {
      for (const talent of Object.keys(parentItem.system.talents)) {
        if (!Object.keys(parentItem.system.talents[talent]).includes("attributes")) {
          // some talent slots do not have the "attributes" key, so we can skip them
          continue;
        }
        existingAttrs = [...existingAttrs, ...Object.keys(parentItem.system.talents[talent].attributes)];
      }
    }
    CONFIG.logger.debug(`Existing attributes: ${JSON.stringify(existingAttrs)}`);

    // now that we know the existing attrs, start looking for ones in the dropped item
    if (Object.keys(droppedItem.system).includes("attributes")) {
      for (const attr of Object.keys(droppedItem.system.attributes)) {
        const matchingEffect = droppedItem.effects.find(effect => effect.name === attr);
        const newKey = `attr${new Date().getTime()}`;
        // copy the data to the new field
        droppedItem.system.attributes[newKey] = droppedItem.system.attributes[attr];
        // delete the old field
        delete droppedItem.system.attributes[attr];
        // update the active effect
        if (matchingEffect) {
          CONFIG.logger.debug(`located matching effect from attributes ${matchingEffect.name}, updating to ${newKey}`);
          matchingEffect.name = newKey;
        }
        // ensure further keys have a new entry
          await new Promise(r => setTimeout(r, 1));
      }
    }

    if (Object.keys(droppedItem.system).includes("itemmodifier")) {
      for (const droppedModifier of droppedItem.system.itemmodifier) {
        for (const attr of Object.keys(droppedModifier.system.attributes)) {
          CONFIG.logger.debug(`checking ${attr}`);
          const matchingEffect = droppedItem.effects.find(effect => effect.name === attr);
          const newKey = `attr${new Date().getTime()}`;
          CONFIG.logger.debug(`located matching effect from itemmodifier ${droppedModifier.name} for ${attr}, updating to ${newKey}`);
          // copy the data to the new field
          droppedModifier.system.attributes[newKey] = droppedModifier.system.attributes[attr];
          // delete the old field
          delete droppedModifier.system.attributes[attr];
          // update the active effect
          if (matchingEffect) {
            matchingEffect.name = newKey;
          }
          // ensure further keys have a new entry
          await new Promise(r => setTimeout(r, 1));
        }
      }
    }

    CONFIG.logger.debug(`Done Unique-ing attributes!`);
    return droppedItem;
  }
}
