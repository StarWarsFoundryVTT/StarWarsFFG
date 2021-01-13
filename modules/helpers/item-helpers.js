import ImportHelpers from "../importer/import-helpers.js";

export default class ItemHelpers {
  static async itemUpdate(event, formData) {
    formData = expandObject(formData);

    if (this.object.isOwned && this.object.actor?.compendium?.metadata) {
      return;
    }
    CONFIG.logger.debug(`Updating ${this.object.type}`);

    if (this.object.data.type === "weapon") {
      const isMelee = formData?.data?.skill?.value ? formData.data.skill.value.includes("Melee") : formData[`data.skill.value`].includes("Melee");
      const isBrawl = formData?.data?.skill?.value ? formData.data.skill.value.includes("Brawl") : formData[`data.skill.value`].includes("Brawl");

      if ((isMelee || isBrawl) && formData?.data?.useBrawn) {
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
    this.item.data.flags.loaded = false;
    this.object.update(formData);

    if (this.object.data.type === "talent") {
      if (this.object.data.flags?.clickfromparent?.length) {
        let listofparents = JSON.parse(JSON.stringify(this.object.data.flags.clickfromparent));
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
              const item = await actor.getOwnedItem(ids[1]);
              spec.flags.loaded = false;
              await item.update(updateData);
              await item.sheet.render(true);
            } else {
              spec.data.flags.loaded = false;
              await spec.update(updateData);
              await spec.sheet.render(true);
            }
          }
        }
      }
    }
  }

  static oldItemUpdate(event, formData) {
    if (this.object.isOwned && this.object.actor?.compendium?.metadata) {
      return;
    }
    CONFIG.logger.debug(`Updating ${this.object.type}`);

    if (this.object.data.type === "weapon" && (formData["data.skill.value"] === "Melee" || formData["data.skill.value"] === "Brawl")) {
      formData["data.damage.value"] = 0;
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

    // Re-combine formData
    formData = Object.entries(formData)
      .filter((e) => !e[0].startsWith("data.attributes"))
      .reduce(
        (obj, e) => {
          obj[e[0]] = e[1];
          return obj;
        },
        { _id: this.object._id, "data.attributes": attributes }
      );

    // Update the Item
    this.item.data.flags.loaded = false;
    return this.object.update(formData);

    if (this.object.data.type === "talent") {
      let data = this.object.data.data;
      if (data.trees.length > 0) {
        CONFIG.logger.debug("Using Talent Tree property for update");
        data.trees.forEach((spec) => {
          const specializations = game.data.items.filter((item) => {
            return item.id === spec;
          });

          specializations.forEach((item) => {
            CONFIG.logger.debug(`Updating Specialization`);
            for (let talentData in item.data.talents) {
              this._updateSpecializationTalentReference(item.data.talents[talentData], itemData);
            }
          });
        });
      } else {
        CONFIG.logger.debug("Legacy item, updating all specializations");
        game.data.items.forEach((item) => {
          if (item.type === "specialization") {
            for (let talentData in item.data.talents) {
              if (item.data.talents[talentData].itemId === this.object.data._id) {
                if (!data.trees.includes(item._id)) {
                  data.trees.push(item._id);
                }
                this._updateSpecializationTalentReference(item.data.talents[talentData], itemData);
              }
            }
          }
        });
      }
    }
  }

  static async loadItemModifierSheet(itemId, modifierType, modifierId, actorId) {
    const actor = await game.actors.get(actorId);
    const ownedItem = await actor.getOwnedItem(itemId);
    let modifierIndex = ownedItem.data.data[modifierType].findIndex((i) => i._id === modifierId);
    let item = ownedItem.data.data[modifierType][modifierIndex];

    if (!item) {
      // this is a modifier on an attachment
      ownedItem.data.data.itemattachment.forEach((a) => {
        modifierIndex = a.data[modifierType].findIndex((m) => m._id === modifierId);
        if (modifierIndex > -1) {
          item = a.data[modifierType][modifierIndex];
        }
      });
    }

    const temp = {
      ...item,
      flags: {
        ffgTempId: itemId,
        ffgTempItemType: modifierType,
        ffgTempItemIndex: modifierIndex,
        ffgIsTemp: true,
        ffgUuid: ownedItem.uuid,
      },
    };

    let tempItem = await Item.create(temp, { temporary: true });
    tempItem.data._id = temp._id;
    tempItem.data.flags.readonly = true;
    if (!temp._id) {
      tempItem.data._id = randomID();
    }
    tempItem.sheet.render(true);
  }
}
