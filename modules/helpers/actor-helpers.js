import ModifierHelpers from "./modifiers.js";
import {migrateDataToSystem} from "./migration.js";

export default class ActorHelpers {
  static async updateActor(event, formData) {
    formData = foundry.utils.expandObject(formData);
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
          // Handle credits
          if (formData.data.stats?.credits?.value) {
            const rawCredits = formData.data.stats?.credits.value
              ?.toString()
              .match(/^(?!.*\.).*|.*\./)[0]
              .replace(/[^0-9]+/g, "");
            formData.data.stats.credits.value = parseInt(rawCredits, 10);
          }
        }
      }
      if (this.object.type === "minion") {
        // include the updated quantity of minions in the group in the update object so automation can access it
        formData.data.quantity.value = Math.min(formData.data.quantity.max, formData.data.quantity.max - Math.floor(formData.data.stats.wounds.value - 1) / formData.data.unit_wounds.value);
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
    formData.data.attributes = attributes;

    // Update the Actor
    foundry.utils.setProperty(formData, `flags.starwarsffg.loaded`, false);

    // as of v12, "data" is no longer shimmed into "system" for you, so we must do it ourselves
    formData = migrateDataToSystem(formData);

    const curXP = this.object?.system?.experience?.available ? this.object.system.experience.available : 0;
    const newXP = formData?.system?.experience?.available ? formData.system.experience.available : 0;
    if (curXP > newXP) {
      // XP has been manually edited to a lower value (spent)
      await xpLogSpend(this.object, "manual spend", curXP - newXP, newXP, formData?.system?.experience?.total);
    } else if (curXP < newXP) {
      // XP has been manually edited to a higher value (granted)
      await xpLogEarn(this.object, newXP - curXP, newXP, formData?.system?.experience?.total, "manual grant", "Self");
    }

    return await this.object.update(formData);
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
    await notifyXpSpend(actor, action);
}

/**
 * Whisper the GM notifying them of spending XP
 * @param actor
 * @param action
 * @returns {Promise<void>}
 */
async function notifyXpSpend(actor, action) {
  if (game.settings.get("starwarsffg", "notifyOnXpSpend")) {
    const chatData = {
      speaker: {
        actor: actor,
      },
      content: `bought ${action}`,
      whisper: ChatMessage.getWhisperRecipients("GM"),
    };
    await ChatMessage.create(chatData);
  }
}

/**
 * Adds a GRANT log entry to the actor's XP log (accessed via the notebook under specializations)
 * @param actor - ffgActor object
 * @param grant - XP granted
 * @param available - XP available
 * @param total - XP total
 * @param note - note about the grant
 * @param granter - string for who did the granting
 * @returns {Promise<void>}
 */
export async function xpLogEarn(actor, grant, available, total, note, granter="GM") {
  const xpLog = actor.getFlag("starwarsffg", "xpLog") || [];
  const date = new Date().toISOString().slice(0, 10);
  let newEntry;
  if (note) {
    newEntry = `<font color="green"><b>${date}</b>: ${granter} granted <b>${grant}</b> XP, reason: ${note} (${available} available, ${total} total)</font>`;
  } else {
    newEntry = `<font color="green"><b>${date}</b>: ${granter} granted <b>${grant}</b> XP (${available} available, ${total} total)</font>`;
  }
  await actor.setFlag("starwarsffg", "xpLog", [newEntry, ...xpLog]);
}
