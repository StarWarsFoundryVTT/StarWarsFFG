import ModifierHelpers from "./modifiers.js";

export default class ActorHelpers {
  static updateActor(event, formData) {
    formData = expandObject(formData);
    const ownedItems = this.actor.items.map((item) => item);

    if (this.object.type !== "homestead") {
      if (this.object.type !== "vehicle") {
        // Handle characteristic updates
        Object.keys(CONFIG.FFG.characteristics).forEach((key) => {
          let total = ModifierHelpers.getCalculateValueForAttribute(key, this.actor.system.attributes, ownedItems, "Characteristic");
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

          let total = ModifierHelpers.getCalculateValueForAttribute(key, this.actor.system.attributes, ownedItems, "Stat");

          let statValue = 0;
          let isFormValueVisible = true;
          if (key === "Soak") {
            if (formData.data.stats[k]?.value) {
              statValue = parseInt(formData.data.stats[k].value, 10);
              // the soak value is autocalculated we need to account for Brawn
              statValue = statValue - parseInt(formData.data.characteristics.Brawn.value, 10);
            } else {
              statValue = 0;
              isFormValueVisible = false;
            }
          } else if (key === "Encumbrance") {
            if (formData.data.stats[k]?.max) {
              statValue = parseInt(formData.data.stats[k].max, 10);
              // the encumbrance value is autocalculated we need to account for 5 + Brawn
              statValue = statValue - parseInt(formData.data.characteristics.Brawn.value + 5, 10);
            } else {
              statValue = 0;
              isFormValueVisible = false;
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
              isFormValueVisible = false;
            }
          }

          let x = statValue - (isFormValueVisible ? total : 0);

          let y = parseInt(formData.data.attributes[key].value, 10) + x;
          if (key === "Soak") {
            const autoSoakCalculation = (typeof this.actor.flags?.config?.enableAutoSoakCalculation === "undefined" && game.settings.get("starwarsffg", "enableSoakCalc")) || this.actor.flags.starwarsffg?.config.enableAutoSoakCalculation;

            if (autoSoakCalculation) {
              y = 0;
            }
          }

          if (y > 0) {
            formData.data.attributes[key].value = y;
          } else {
            formData.data.attributes[key].value = 0;
          }
        });
        // Handle skill rank updates
        Object.keys(this.object.system.skills).forEach((key) => {
          let total = ModifierHelpers.getCalculateValueForAttribute(key, this.actor.system.attributes, ownedItems, "Skill Rank");
          let x = parseInt(formData.data.skills[key]?.rank, 10) - total;
          let y = parseInt(formData.data.attributes[key]?.value, 10) + x;
          if (y > 0) {
            formData.data.attributes[key].value = y;
          } else {
            formData.data.attributes[key].value = 0;
          }
        });

        // Handle credits

        if (formData.data.stats?.credits?.value) {
          const rawCredits = formData.data.stats?.credits.value
            ?.toString()
            .match(/^(?!.*\.).*|.*\./)[0]
            .replace(/[^0-9]+/g, "");
          formData.data.stats.credits.value = parseInt(rawCredits, 10);
        }
      } else {
        // Handle stat updates
        Object.keys(CONFIG.FFG.vehicle_stats).forEach((k) => {
          const key = CONFIG.FFG.vehicle_stats[k].value;

          let total = ModifierHelpers.getCalculateValueForAttribute(key, this.actor.system.attributes, ownedItems, "Stat");

          let statValue = 0;
          let isFormValueVisible = true;
          if (k === "shields") {
          } else if (formData.data?.stats[k]?.max) {
            statValue = parseInt(formData.data.stats[k].max, 10);
          } else {
            if (formData.data.stats[k]?.value) {
              statValue = parseInt(formData.data.stats[k].value, 10);
            } else {
              statValue = 0;
              isFormValueVisible = false;
            }
          }

          if (k === "shields") {
            let newAttr = formData.data.attributes[key].value.split(",");
            ["fore", "port", "starboard", "aft"].forEach((position, index) => {
              let shieldValue = parseInt(formData.data.stats[k][position], 10);
              let x = shieldValue - (total[index] ? total[index] : 0);
              let y = parseInt(newAttr[index], 10) + x;
              if (y > 0) {
                newAttr[index] = y;
              } else {
                newAttr[index] = 0;
              }
            });
            formData.data.attributes[key].value = newAttr;
          } else {
            let allowNegative = false;
            if (statValue < 0 && k === "handling") {
              allowNegative = true;
            }
            let x = statValue - (isFormValueVisible ? total : 0);
            let y = parseInt(formData.data.attributes[key].value, 10) + x;
            if (y > 0 || allowNegative) {
              formData.data.attributes[key].value = y;
            } else {
              formData.data.attributes[key].value = 0;
            }
          }
        });
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
    formData.data.attributes = attributes;

    // Update the Actor
    setProperty(formData, `flags.starwarsffg.loaded`, false);
    return this.object.update(formData);
  }
}
