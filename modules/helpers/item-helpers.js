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

    // recombine attributes to formData
    if (Object.keys(attributes).length > 0) {
      foundry.utils.setProperty(formData, `data.attributes`, attributes);
    }

    // migrate data to v10 structure
    let updated_id = formData._id;
    delete formData._id;

    foundry.utils.setProperty(formData, `flags.starwarsffg.loaded`, false);
    await this.object.update(formData);
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
            foundry.utils.setProperty(updateData, `data.talents.${parent.talent}.description`, formData.data.description);
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
}
