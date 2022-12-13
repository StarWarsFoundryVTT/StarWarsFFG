import ImportHelpers from "../importer/import-helpers.js";
import ModifierHelpers from "./modifiers.js";

export default class ItemHelpers {
  static async itemUpdate(event, formData) {
    formData = expandObject(formData);

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
    const formAttrs = expandObject(formData)?.data?.attributes || {};
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
      setProperty(formData, `data.attributes`, attributes);
    }

    // migrate data to v10 structure
    let updated_id = formData._id;
    delete formData._id;

    setProperty(formData, `flags.starwarsffg.loaded`, false);

    // Update the Item
    try {
      // v10 items are no longer created in the global scope if they exist only on an actor (or another item)
      if (this.object.flags.starwarsffg.ffgParent.starwarsffg.ffgTempId) {
        let parent_object = await game.items.get(this.object.flags.starwarsffg.ffgParent.starwarsffg.ffgTempId);

        // search for the relevant attachment
        let updated_items = [];
        parent_object.system.itemattachment.forEach(function (i) {
          if (i._id === updated_id) {
              // this is the item we want to update, replace it
              i = formData;
          }
          updated_items.push(i)
        });
        await parent_object.update({'system': {'itemattachment': updated_items}});

        // search for the relevant quality
        updated_items = [];
        parent_object.system.itemmodifier.forEach(function (i) {
          if (i._id === updated_id) {
              // this is the item we want to update, replace it
              i = formData;
          }
          updated_items.push(i)
        });
        await parent_object.update({'system': {'itemmodifier': updated_items}});

      }
    } catch (error) {
        await this.object.update(formData);
    }

    if (this.object.type === "talent") {
      if (this.object.flags?.clickfromparent?.length) {
        let listofparents = JSON.parse(JSON.stringify(this.object.flags.clickfromparent));
        while (listofparents.length > 0) {
          const parent = listofparents.shift();
          const spec = await fromUuid(parent.id);
          if (spec) {
            let updateData = {};
            setProperty(updateData, `data.talents.${parent.talent}.name`, formData.name);
            setProperty(updateData, `data.talents.${parent.talent}.description`, formData.data.description);
            setProperty(updateData, `data.talents.${parent.talent}.activation`, formData.data.activation.value);
            setProperty(updateData, `data.talents.${parent.talent}.isRanked`, formData.data.ranks.ranked);
            setProperty(updateData, `data.talents.${parent.talent}.isForceTalent`, formData.data.isForceTalent);
            setProperty(updateData, `data.talents.${parent.talent}.isConflictTalent`, formData.data.isConflictTalent);

            // Remove attributes which are no longer used
            if (spec?.system?.talents?.[parent.talent]?.attributes) {
              for (let k of Object.keys(spec.system.talents[parent.talent].attributes)) {
                if (!formData.data.attributes.hasOwnProperty(k)) formData.data.attributes[`-=${k}`] = null;
              }
            }

            setProperty(updateData, `data.talents.${parent.talent}.attributes`, formData.data.attributes);

            if (parent.id.includes(".OwnedItem.")) {
              const ids = parent.id.split(".OwnedItem.");
              const actor = await fromUuid(ids[0]);
              const item = await actor.items.get(ids[1]);
              setProperty(updateData, `flags.starwarsffg.loaded`, false);
              await item.update(updateData);
              await item.sheet.render(true);
            } else {
              setProperty(updateData, `flags.starwarsffg.loaded`, false);
              await spec.update(updateData);
              await spec.sheet.render(true);
            }
          }
        }
      }
    }
  }
}
