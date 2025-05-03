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
        setProperty(formData, `data.damage.value`, 0);
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
            CONFIG.logger.debug(`Located mod ${foundMod.name}, checking if it's active or not`);
            if (foundMod && !modification.system.active) {
              CONFIG.logger.debug(`Mod ${foundMod.name} is not active, not syncing AE status`);
              return false;
            } else {
              CONFIG.logger.debug(`Mod ${foundMod.name} is active, syncing AE status`);
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
    if (["specialization", "forcepower", "signatureability"].includes(item.type)) {
      CONFIG.logger.debug("specialization, force power, or signature ability, looking through AEs to sync");
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
                  CONFIG.logger.debug("located attribute granting AE, but the talent is not learned, suspending");
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
      CONFIG.logger.debug("armor and weapon, not doing anything yet");
    } else {
      CONFIG.logger.debug(`'other' item type ${item.type}, no need to sync AE status'`);
    }
  }
}
