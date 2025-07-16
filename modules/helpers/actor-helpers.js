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
    if (curXP !== newXP && curXP !== 0 && newXP !== 0) {
      await xpLogEarn(this.object, newXP - curXP, newXP, this.object?.system?.experience.total, "manual adjustment", "Self");
    }

    return await this.object.update(formData);
  }

  static async beginEditMode(actor) {
    // Store initial state
    CONFIG.logger.debug(`Beginning Edit mode for ${actor.name}`);
    // Track both direct and item-based effects
    const initialState = {
      directEffects: [],
      itemEffects: {},
    };

    // Record direct effects
    for (const effect of actor.effects) {
      initialState.directEffects.push({
        id: effect.id,
        disabled: effect.disabled,
      });
      // update source so we don't persist disabling effects
      await effect.updateSource({disabled: true});
    }

    // Record item-based effects
    for (const item of actor.items) {
      CONFIG.logger.debug(`> examining ${item.name}`);
      initialState.itemEffects[item.id] = [];
      for (const effect of item.effects) {
        CONFIG.logger.debug(`>> Recording state for ${effect.name}`);
        initialState.itemEffects[item.id].push({
          id: effect.id,
          disabled: effect.disabled,
        });
        CONFIG.logger.debug(`>> Disabling AE for ${effect.name}`);
        await effect.updateSource({disabled: true});
      }
    }

    CONFIG.logger.debug(`Final initial state: ${JSON.stringify(initialState)}`);
    return initialState;
  }

  static async endEditMode(actor, originalState) {
    CONFIG.logger.debug(`Ending Edit mode for ${actor.name} - original state: ${JSON.stringify(originalState)}`);
    // revert the state for direct effects
    for (const effect of actor.effects) {
      const locatedEffect = originalState.directEffects.find((s) => s.id === effect.id);
      if (locatedEffect && effect.disabled !== locatedEffect.disabled) {
        // update source so we don't persist disabling effects
        await effect.updateSource({disabled: locatedEffect.disabled});
      }
    }

    // revert the state for item-based effects
    for (const item of actor.items) {
      CONFIG.logger.debug(`> examining ${item.name}`);
      if (item.id in originalState.itemEffects) {
        const storedItemState = originalState.itemEffects[item.id];
        CONFIG.logger.debug(`> found item AEs in stored state: ${JSON.stringify(storedItemState)}`);
        for (const effect of item.effects) {
          CONFIG.logger.debug(`>> examining ${effect.name}`);
          const storedEffectState = storedItemState.find((s) => s.id === effect.id);
          if (storedEffectState && effect.disabled !== storedEffectState.disabled) {
            CONFIG.logger.debug(">>> found a stored state for this effect, making adjustments");
            await effect.updateSource({disabled: storedEffectState.disabled});
          } else {
            CONFIG.logger.debug(">>> no stored state for this effect or the state is the same, not making adjustments");
          }
        }
      } else {
        CONFIG.logger.debug("> no item AEs in stored state, skipping further processing");
      }
    }
  }
}

/**
 * Adds a SPEND log entry to the actor's XP log (accessed via the notebook under specializations)
 * @param actor - ffgActor object
 * @param action - action taken (e.g. "skill rank Astrogation 1 --> 2")
 * @param cost - XP spent
 * @param available - XP available
 * @param total - XP total
 * @param statusId - ID of the associated active effect (if in use)
 * @returns {Promise<void>}
 */
export async function xpLogSpend(actor, action, cost, available, total, statusId=undefined) {
  const xpLog = actor.getFlag("starwarsffg", "xpLog") || [];
  const date = new Date().toISOString().slice(0, 10);
  const newEntry = {
    action: 'purchased',
    id: statusId,
    xp: {
      cost: cost,
      available: available,
      total: total,
    },
    date: date,
    description: action,
  };
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
export async function xpLogEarn(actor, grant, available, total, note, granter="GM", statusId=undefined) {
  const xpLog = actor.getFlag("starwarsffg", "xpLog") || [];
  const date = new Date().toISOString().slice(0, 10);
  let action;
  if (granter === "GM") {
    action = "granted";
  } else {
    action = "adjusted";
  }
  const newEntry = {
    action: action,
    id: statusId, // XP grants are not done by Active Effects
    xp: {
      cost: grant,
      available: available,
      total: total,
    },
    date: date,
    description: note,
  };
  await actor.setFlag("starwarsffg", "xpLog", [newEntry, ...xpLog]);
}
