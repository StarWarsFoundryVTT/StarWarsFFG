import ModifierHelpers from "./modifiers.js";

export default class ActorHelpers {
  static updateActor(event, formData) {
    formData = expandObject(formData);
    const ownedItems = this.actor.items;

    // as of Foundry v10, saving an editor only submits the single entry for that editor
    if (Object.keys(formData).length > 1) {
      if (this.object.type === "minion") {
        Object.keys(formData?.data?.skills).forEach((skill) => {
          if (!formData.data.skills[skill].groupskill && this.object.system.skills[skill].groupskill) {
            // this is a minion group with a group skill being removed - reduce the rank by one (since we added 1 when it was checked)
            formData.data.skills[skill].rank -= this.object.system.quantity.value;
          }
        });
      }
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
          let stats;
          if (this.actor.type === "rival") {
            stats = CONFIG.FFG.rival_stats;
          } else {
            stats = CONFIG.FFG.character_stats;
          }
          Object.keys(stats).forEach((k) => {
            const key = stats[k].value;

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
              const autoSoakCalculation = (typeof this.actor.flags?.genesysk2?.config?.enableAutoSoakCalculation === "undefined" && game.settings.get("genesysk2", "enableSoakCalc")) || this.actor.flags.genesysk2?.config.enableAutoSoakCalculation;

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
      if (this.object.type === "minion") {
        // include the updated quantity of minions in the group in the update object so automation can access it
        formData.data.quantity.value = Math.min(formData.data.quantity.max, formData.data.quantity.max - Math.floor(formData.data.stats.wounds.value - 1) / formData.data.unit_wounds.value);
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

    // use system not data
    //formData.system = formData.data

    // Update the Actor
    setProperty(formData, `flags.genesysk2.loaded`, false);
    return this.object.update(formData);
  }
}

/**
 * Adds a SPEND log entry to the actor's XP log (accessed via the notebook under specializations)
 * @param actor - ffgActor object
 * @param action - action taken (e.g. "skill rank Astrogation 1 --> 2")
 * @param cost - XP spent
 * @param available - XP available
 * @param total - XP total
 * @returns {Promise<void>}
 */
export async function xpLogSpend(actor, action, cost, available, total) {
    const xpLog = actor.getFlag("starwarsffg", "xpLog") || [];
    const date = new Date().toISOString().slice(0, 10);
    let newEntry = `<font color="red"><b>${date}</b>: spent <b>${cost}</b> XP for <b>${action}</b> (${available} available, ${total} total)</font>`;
    await actor.setFlag("starwarsffg", "xpLog", [newEntry, ...xpLog]);
}

/**
 * Adds a GRANT log entry to the actor's XP log (accessed via the notebook under specializations)
 * @param actor - ffgActor object
 * @param grant - XP granted
 * @param available - XP available
 * @param total - XP total
 * @param note - note about the grant
 * @returns {Promise<void>}
 */
export async function xpLogEarn(actor, grant, available, total, note) {
  const xpLog = actor.getFlag("starwarsffg", "xpLog") || [];
  const date = new Date().toISOString().slice(0, 10);
  let newEntry;
  if (note) {
    newEntry = `<font color="green"><b>${date}</b>: GM granted <b>${grant}</b> XP, reason: ${note} (${available} available, ${total} total)</font>`;
  } else {
    newEntry = `<font color="green"><b>${date}</b>: GM granted <b>${grant}</b> XP (${available} available, ${total} total)</font>`;
  }
  await actor.setFlag("starwarsffg", "xpLog", [newEntry, ...xpLog]);
}
