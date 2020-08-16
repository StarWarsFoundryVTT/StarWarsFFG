import ModifierHelpers from "./modifiers.js";

export default class ActorHelpers {
  static updateActor(event, formData) {
    if (this.object.data.type !== "vehicle") {
      // Handle characteristic updates
      Object.keys(CONFIG.FFG.characteristics).forEach((key) => {
        let total = ModifierHelpers.getCalculateValueForAttribute(key, this.actor.data.data.attributes, this.actor.data.items, "Characteristic");
        let x = parseInt(formData.data.characteristics[key].value, 10) - total;
        let y = parseInt(formData.data.attributes[key].value, 10) + x;
        if (y > 0) {
          formData.data.attributes[key].value = y;
        } else {
          formData.data.attributes[key].value = 0;
        }
      });
      // Handle stat updates
      Object.keys(CONFIG.FFG.character_stats).forEach((k) => {
        const key = CONFIG.FFG.character_stats[k].value;

        let total = ModifierHelpers.getCalculateValueForAttribute(key, this.actor.data.data.attributes, this.actor.data.items, "Stat");

        let statValue = 0;
        if (key === "Soak") {
          if (formData.data.stats[k]?.value) {
            statValue = parseInt(formData.data.stats[k].value, 10);
          } else {
            statValue = 0;
          }
        } else if (key === "Defence-Melee") {
          statValue = parseInt(formData.data.stats.defence.melee, 10);
        } else if (key === "Defence-Ranged") {
          statValue = parseInt(formData.data.stats.defence.ranged, 10);
        } else {
          if (formData.data?.stats[k]?.max) {
            statValue = parseInt(formData.data.stats[k].max, 10);
          } else {
            statValue = 0;
          }
        }

        let x = statValue - total;
        let y = parseInt(formData.data.attributes[key].value, 10) + x;
        if (y > 0) {
          formData.data.attributes[key].value = y;
        } else {
          formData.data.attributes[key].value = 0;
        }
      });
      // Handle skill rank updates
      Object.keys(this.object.data.data.skills).forEach((key) => {
        let total = ModifierHelpers.getCalculateValueForAttribute(key, this.actor.data.data.attributes, this.actor.data.items, "Skill Rank");
        let x = parseInt(formData.data.skills[key]?.rank, 10) - total;
        let y = parseInt(formData.data.attributes[key]?.value, 10) + x;
        if (y > 0) {
          formData.data.attributes[key].value = y;
        } else {
          formData.data.attributes[key].value = 0;
        }
      });
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

    // Update the Actor
    this.actor.data.flags.loaded = false;
    return this.object.update(formData);
  }

  static oldUpdateActor(event, formData) {
    if (this.object.data.type !== "vehicle") {
      // Handle characteristic updates
      Object.keys(CONFIG.FFG.characteristics).forEach((key) => {
        let total = ModifierHelpers.getCalculateValueForAttribute(key, this.actor.data.data.attributes, this.actor.data.items, "Characteristic");
        let x = parseInt(formData[`data.characteristics.${key}.value`], 10) - total;
        let y = parseInt(formData[`data.attributes.${key}.value`], 10) + x;
        if (y > 0) {
          formData[`data.attributes.${key}.value`] = y;
        } else {
          formData[`data.attributes.${key}.value`] = 0;
        }
      });
      // Handle stat updates
      Object.keys(CONFIG.FFG.character_stats).forEach((k) => {
        const key = CONFIG.FFG.character_stats[k].value;

        let total = ModifierHelpers.getCalculateValueForAttribute(key, this.actor.data.data.attributes, this.actor.data.items, "Stat");

        let statValue = 0;
        if (key === "Soak") {
          statValue = parseInt(formData[`data.stats.${k}.value`], 10);
        } else if (key === "Defence-Melee") {
          statValue = parseInt(formData[`data.stats.defence.melee`], 10);
        } else if (key === "Defence-Ranged") {
          statValue = parseInt(formData[`data.stats.defence.ranged`], 10);
        } else {
          statValue = parseInt(formData[`data.stats.${k}.max`], 10);
        }

        let x = statValue - total;
        let y = parseInt(formData[`data.attributes.${key}.value`], 10) + x;
        if (y > 0) {
          formData[`data.attributes.${key}.value`] = y;
        } else {
          formData[`data.attributes.${key}.value`] = 0;
        }
      });
      // Handle skill rank updates
      Object.keys(this.object.data.data.skills).forEach((key) => {
        let total = ModifierHelpers.getCalculateValueForAttribute(key, this.actor.data.data.attributes, this.actor.data.items, "Skill Rank");
        let x = parseInt(formData[`data.skills.${key}.rank`], 10) - total;
        let y = parseInt(formData[`data.attributes.${key}.value`], 10) + x;
        if (y > 0) {
          formData[`data.attributes.${key}.value`] = y;
        } else {
          formData[`data.attributes.${key}.value`] = 0;
        }
      });
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

    // Update the Actor
    this.actor.data.flags.loaded = false;
    return this.object.update(formData);
  }
}
