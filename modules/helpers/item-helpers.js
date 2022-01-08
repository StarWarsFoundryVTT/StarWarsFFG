import ImportHelpers from "../importer/import-helpers.js";
import JournalEntryFFG from "../items/journalentry-ffg.js";
import ModifierHelpers from "./modifiers.js";

export default class ItemHelpers {
  static async itemUpdate(event, formData) {
    formData = expandObject(formData);

    if (this.object.isEmbedded && this.object.actor?.compendium?.metadata) {
      return;
    }
    CONFIG.logger.debug(`Updating ${this.object.type}`);

    if (this.object.data.type === "weapon") {
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
    if (this.object.data?.data?.attributes) {
      for (let k of Object.keys(this.object.data.data.attributes)) {
        if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
      }
    }

    // recombine attributes to formData
    if (Object.keys(attributes).length > 0) {
      setProperty(formData, `data.attributes`, attributes);
    }

    // Update the Item
    setProperty(formData, `flags.starwarsffg.loaded`, false)
    await this.object.update(formData);

    if (this.object.data.type === "talent") {
      if (this.object.data.flags?.clickfromparent?.length) {
        let listofparents = JSON.parse(JSON.stringify(this.object.data.flags.starwarsffg.clickfromparent));
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
            if (spec?.data?.data?.talents?.[parent.talent]?.attributes) {
              for (let k of Object.keys(spec.data.data.talents[parent.talent].attributes)) {
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
