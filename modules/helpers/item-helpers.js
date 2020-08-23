export default class ItemHelpers {
  static itemUpdate(event, formData) {
    formData = expandObject(formData);

    if (this.object.isOwned && this.object.actor?.compendium?.metadata) {
      return;
    }
    CONFIG.logger.debug(`Updating ${this.object.type}`);

    const isMelee = formData?.data?.skill?.value ? formData.data.skill.value === "Melee" : formData[`data.skill.value`] === "Melee";
    const isBrawl = formData?.data?.skill?.value ? formData.data.skill.value === "Brawl" : formData[`data.skill.value`] === "Brawl";

    if (this.object.data.type === "weapon" && (isMelee || isBrawl)) {
      setProperty(formData, `data.damage.value`, 0);
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
    formData.data.attributes = attributes;

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
}
