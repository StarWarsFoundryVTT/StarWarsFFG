import {DicePoolFFG, RollFFG} from "./dice-pool-ffg.js";
import PopoutEditor from "./popout-editor.js";

/**
 * Extend the base Combat entity.
 * @extends {Combat}
 */
export class CombatFFG extends Combat {
  /**
   * Adds a generic slot to the combat (via a flag)
   * @param round - INT - the round to add the slot to
   * @param disposition - INT - the disposition of the slot
   * @param initiative - FLOAT - the initiative value of the slot
   * @returns {Promise<void>}
   */
  async addExtraSlot(round, disposition, initiative) {
    const extraSlot = await new CombatantFFG(
  {
          name: "__GENERIC_SLOT__",
          disposition: disposition,
          id: foundry.utils.randomID(),
          combatantId: foundry.utils.randomID(),
          hidden: false,
          visible: true,
          initiative: initiative,
          flags: {
            fake: true,
            disposition: disposition,
          }
        },
      );
    await this.createEmbeddedDocuments("Combatant", [extraSlot]);
    return extraSlot.id;
  }

  /**
   * Handler for clicking the "add extra slot" button. Creates a dialog to get the slot details,
   * then calls the function to create the slot
   * @returns {Promise<void>}
   */
  async addInitiativeSlot() {
    // ask the user which disposition and initiative they would like, so we can add a generic slot

    let slotDialog = new Dialog({
      title: game.i18n.localize("SWFFG.Combats.Slots.Dialog.Title"),
      content: `
        <p>${game.i18n.localize("SWFFG.Combats.Slots.Dialog.Labels.Initiative")} :</p>
        <input type="number" id="initiative" name="initiative" value="0">
        <p>${game.i18n.localize("SWFFG.Combats.Slots.Dialog.Labels.Disposition")}:</p>
        <label><input type="radio" id="friendly" name="disposition" value="friendly">${game.i18n.localize("SWFFG.Combats.Slots.Dialog.Labels.Friendly")}</label>
        <label><input type="radio" id="neutral" name="disposition" value="neutral">${game.i18n.localize("SWFFG.Combats.Slots.Dialog.Labels.Neutral")}</label>
        <label><input type="radio" id="enemy" name="disposition" value="enemy">${game.i18n.localize("SWFFG.Combats.Slots.Dialog.Labels.Enemy")}</label>
      `,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("SWFFG.Combats.Slots.Dialog.Labels.Submit"),
          callback: async (obj, event) => {
            const jObj = $(obj);
            let disposition = undefined;
            if (jObj.find("#friendly")[0].checked) {
              disposition = CONST.TOKEN_DISPOSITIONS["FRIENDLY"];
            } else if (jObj.find("#neutral")[0].checked) {
              disposition = CONST.TOKEN_DISPOSITIONS["NEUTRAL"];
            } else if (jObj.find("#enemy")[0].checked) {
              disposition = CONST.TOKEN_DISPOSITIONS["HOSTILE"];
            }
            if (disposition === undefined) {
              ui.notifications.warn("You must select a disposition");
              return;
            }
            const initiative = jObj.find("#initiative")[0].value;
            if (initiative === "") {
              ui.notifications.warn("You must provide an initiative value");
              return;
            }
            this.debounceRender();
            await this.addExtraSlot(this.round, disposition, parseInt(initiative));
            this.setupTurns();
            game.socket.emit("system.starwarsffg", {event: "trackerRender", combatId: this.id});
          }
        }
      },
      default: "submit",
    });
    slotDialog.render(true);
  }

  debounceRender = foundry.utils.debounce(() => {
    if (ui.combat.viewed === this) {
      ui.combat.render();
    }
  }, 200);

  /** @override */
  _getInitiativeRoll(combatant, formula) {
    const cData = duplicate(combatant.actor.system);

    if (combatant.actor.type === "vehicle") {
      return new RollFFG("0");
    }

    if (formula === "Vigilance") {
      formula = _getInitiativeFormula(cData.skills.Vigilance, parseInt(cData.characteristics.Willpower.value));
    } else if (formula === "Cool") {
      formula = _getInitiativeFormula(cData.skills.Cool, parseInt(cData.characteristics.Presence.value));
    }

    const rollData = combatant.actor ? combatant.actor.getRollData() : {};

    let roll = new RollFFG(formula, rollData).roll();

    const total = roll.ffg.success + roll.ffg.advantage * 0.01;
    roll._result = total;
    roll._total = total;

    return roll;
  }

  /** @override */
  _getInitiativeFormula(combatant) {
    return CONFIG.Combat.initiative.formula || game.system.initiative;
  }

  /** @override */
  async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
    let initiative = this;

    let promise = new Promise(async function (resolve, reject) {
      const id = randomID();

      let whosInitiative = initiative.combatant?.name;
      let dicePools = [];
      let vigilanceDicePool = new DicePoolFFG({});
      let coolDicePool = new DicePoolFFG({});
      let addDicePool = new DicePoolFFG({});

      const defaultInitiativeFormula = formula || initiative._getInitiativeFormula();
      if (Array.isArray(ids) && ids.length > 1) {
        whosInitiative = "Multiple Combatants";
      } else {
        // Make sure we are dealing with an array of ids
        ids = typeof ids === "string" ? [ids] : ids;
        const c = initiative.getCombatantByToken(
            initiative.combatants.map(combatant => combatant)
            .filter(combatantData => combatantData._id == ids[0])[0]
            .tokenId);
        //const data = c.actor.system;
        const data = _findActorForInitiative(c);
        whosInitiative = c.actor.name;

        vigilanceDicePool = _buildInitiativePool(data, "Vigilance");
        coolDicePool = _buildInitiativePool(data, "Cool");

        const initSkills = Object.keys(data.skills).filter((skill) => data.skills[skill].useForInitiative);

        initSkills.forEach((skill) => {
          if (dicePools.find((p) => p.name === skill)) return;

          const skillPool = _buildInitiativePool(data, skill);
          skillPool.label = data.skills[skill].label;
          skillPool.name = skill;
          dicePools.push(skillPool);
        });
      }

      if (dicePools.findIndex((p) => p.name === "Vigilance") < 0) {
        vigilanceDicePool.label = "SWFFG.SkillsNameVigilance";
        vigilanceDicePool.name = "Vigilance";
        dicePools.push(vigilanceDicePool);
      }
      if (dicePools.findIndex((p) => p.name === "Cool") < 0) {
        coolDicePool.label = "SWFFG.SkillsNameCool";
        coolDicePool.name = "Cool";
        dicePools.push(coolDicePool);
      }

      const title = game.i18n.localize("SWFFG.InitiativeRoll") + ` ${whosInitiative}...`;
      const content = await renderTemplate("systems/starwarsffg/templates/dialogs/ffg-initiative.html", {
        id,
        dicePools,
        addDicePool,
        defaultInitiativeFormula,
      });

      new Dialog({
        title,
        content,
        buttons: {
          one: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("SWFFG.InitiativeRoll"),
            callback: async () => {
              const container = document.getElementById(id);
              const currentId = initiative.combatant?.id;

              const baseFormulaType = container.querySelector('input[name="skill"]:checked').value;

              // Iterate over Combatants, performing an initiative roll for each
              const [updates, messages] = await ids.reduce(
                async (results, id, i) => {
                  let [updates, messages] = await results;
                  // Get Combatant data
                  const c = initiative.getCombatantByToken(
                    initiative.combatants.map(combatant => combatant)
                    .filter(combatantData => combatantData._id == id)[0]
                    .tokenId);
                  if (!c || !c.isOwner) return resolve(results);

                  // Detemine Formula
                  const data = _findActorForInitiative(c);
                  let pool = _buildInitiativePool(data, baseFormulaType);

                  const addPool = DicePoolFFG.fromContainer(container.querySelector(`.addDicePool`));
                  pool.success += +addPool.success;
                  pool.advantage += +addPool.advantage;
                  pool.failure += +addPool.failure;
                  pool.threat += +addPool.threat;
                  pool.boost += +addPool.boost;
                  pool.setback += +addPool.setback;
                  pool.upgrade(addPool.upgrades)

                  const rollData = c.actor ? c.actor.getRollData() : {};
                  let roll = new RollFFG(pool.renderDiceExpression(), rollData, { success: pool.success, advantage: pool.advantage, failure: pool.failure, threat: pool.threat }).roll();
                  const total = roll.ffg.success + roll.ffg.advantage * 0.01;
                  roll._result = total;
                  roll._total = total;

                  // Roll initiative
                  updates.push({ _id: id, initiative: roll.total });

                  // Determine the roll mode
                  let rollMode = messageOptions.rollMode || game.settings.get("core", "rollMode");
                  if ((c.token.hidden || c.hidden) && rollMode === "roll") rollMode = "gmroll";

                  // Construct chat message data
                  let messageData = mergeObject(
                    {
                      speaker: {
                        scene: canvas.scene.id,
                        actor: c.actor ? c.actor.id : null,
                        token: c.token.id,
                        alias: c.token.name,
                      },
                      flavor: `${c.token.name} ${game.i18n.localize("SWFFG.InitiativeRoll")} (${game.i18n.localize(`SWFFG.SkillsName${baseFormulaType.replace(/[: ]/g, "")}`)})`,
                      flags: { "core.initiativeRoll": true },
                    },
                    messageOptions
                  );
                  const chatData = await roll.toMessage(messageData, { create: false, rollMode });

                  // Play 1 sound for the whole rolled set
                  if (i > 0) chatData.sound = null;
                  messages.push(chatData);

                  // Return the Roll and the chat data
                  return results;
                },
                [[], []]
              );
              if (!updates.length) return initiative;

              // Update multiple combatants
              await initiative.updateEmbeddedDocuments("Combatant", updates);

              // Ensure the turn order remains with the same combatant if there was one active
              if (updateTurn && !!currentId) {
                await initiative.update({ turn: initiative.turns.findIndex((t) => t.id === currentId) });
              }

              // Create multiple chat messages
              await CONFIG.ChatMessage.documentClass.create(messages);

              resolve(initiative);
            },
          },
          two: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("SWFFG.Cancel"),
          },
        },
      }).render(true);
    });

    return await promise;
  }

  /**
   * gets any existing initiative claims for this turn within the round of a given combat
   * @param round - INT - the round
   * @param slot_id - STRING - the ID of the native combatant for this turn
   * @returns {undefined|*}
   */
  getSlotClaims(round, slot_id) {
    const claims = this.getFlag('starwarsffg', 'combatClaims') || undefined;
    if (!claims) {
      return undefined;
    }
    return claims[round]?.[slot_id];
  }

  /**
   * gets any existing initiative claims for this round of a given combat
   * @param round - INT - the round
   * @returns {*|*[]} - a list of combatant IDs (NOT token IDs, NOT actor IDs)
   */
  getClaims(round) {
    const combatClaims = this.getFlag('starwarsffg', 'combatClaims');
    if (combatClaims) {
      return combatClaims[round] || [];
    }
    return [];
  }

  /**
   * Check if a given combatant has any claims in the current combat round
   * @param combatantId - STRING - the combatant ID (NOT token ID, NOT actor ID)
   * @returns {boolean|string} - false if no claims, otherwise the round of the claimant
   */
  hasClaims(combatantId) {
    const claims = this.getClaims(this.round);
    if (!claims) {
      return false;
    }
    if (Object.values(claims).includes(combatantId)) {
      return Object.keys(claims).find(key => claims[key] === combatantId);
    } else {
      return false;
    }
  }


  async handleCombatantRemoval(combatant, options, combatantId) {
    CONFIG.logger.debug(`Handling combatant removal of ${combatant?.name}`);
    const claims = this.hasClaims(combatant.id);
    if (!claims) {
      CONFIG.logger.debug("No claimed slots found, nothing to do!");
      return;
    }
    CONFIG.logger.debug("Claimed slots found, unclaiming...");
    await this.unclaimSlot(this.round, claims);
    CONFIG.logger.debug("...Done!");
  }

  async handleCombatantAddition(combatant, context, options, combatantI) {
    // there may be cases when this is needed, but for now, we don't need to do anything
    // (leaving as a placeholder until we know for sure)
  }

  /**
   * Claim a slot for a given combatant
   * @param round - INT - the round
   * @param slot_id - STRING - the ID of the native combatant for this turn
   * @param combatantId - STRING - the combatant ID (NOT token ID, NOT actor ID)
   * @returns {Promise<void>}
   */
  async claimSlot(round, slot_id, combatantId) {
    if (!game.user.isGM) {
      const data = {
        combatId: this.id,
        round: round,
        slot: slot_id,
        combatantId: combatantId,
      }
      game.socket.emit("system.starwarsffg", {event: "combat", data: data});
      return;
    }
    const claims = {
      ...this.getFlag('starwarsffg', 'combatClaims')
    };
    if (!claims[round]) {
      claims[round] = {};
    }
    claims[round][slot_id] = combatantId;
    await this.setFlag('starwarsffg', 'combatClaims', claims);
  }

  /**
   * Un-claim a slot for a given combatant
   * @param round - INT - the round
   * @param slot_id - STRING - the ID of the native combatant for this turn
   * @returns {Promise<void>}
   */
  async unclaimSlot(round, slot_id) {
    if (!game.user.isGM) {
      // only the GM can un-claim a slot
      return;
    }
    await this.unsetFlag('starwarsffg', `combatClaims.${round}.${slot_id}`);
  }
}

function _getInitiativeFormula(skill, ability) {
  const dicePool = new DicePoolFFG({
    ability: ability,
    boost: parseInt(skill.boost),
    setback: parseInt(skill.setback),
    force: parseInt(skill.force),
  });
  dicePool.upgrade(parseInt(skill.rank));
  return dicePool.renderDiceExpression();
}

function _findActorForInitiative(c) {
  let data = c.actor.system;
  const initiativeRole = game.settings.get('starwarsffg', 'initiativeCrewRole');
  CONFIG.logger.debug("Attempting to find initiative data for actor in combat");
  if (c.actor.type === "vehicle") {
    const crew = c.actor.getFlag("starwarsffg", "crew");
    CONFIG.logger.debug("Actor is a vehicle, looking for initiative crew role.");
    if (crew !== undefined && crew !== []) {
      const initiativeCrew = crew.find((c) => c.role === initiativeRole.role_name);
      if (initiativeCrew) {
        CONFIG.logger.debug("Found initiative crew role, swapping data to crew member");
        const realActor = game.actors.get(initiativeCrew.actor_id);
        if (realActor?.system) {
          data = realActor.system;
        }
      }
    } else {
      CONFIG.logger.warn("You must set a crew member with the initiative role to roll initiative for a vehicle");
    }
  }
  CONFIG.logger.debug("Finished checking");
  return data;
}

function _buildInitiativePool(data, skill) {
  const pool = new DicePoolFFG({
    ability: Math.max(data.characteristics[data.skills[skill].characteristic].value, data.skills[skill].rank),
    boost: data.skills[skill].boost,
    advantage: data.skills[skill].advantage,
    success: data.skills[skill].success,
  });
  pool.upgrade(Math.min(data.characteristics[data.skills[skill].characteristic].value, data.skills[skill].rank));

  return pool;
}

export class CombatTrackerFFG extends CombatTracker {
  /** @override */
  get template() {
    return "systems/starwarsffg/templates/dialogs/combat-tracker.html";
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('a[data-claim-slot]').on('click', this._claimInitiativeSlot.bind(this));
  }

  /**
   * Initial JS handler for the "claim slot" button on the combat tracker
   * @param event
   * @returns {Promise<void>}
   * @private
   */
  async _claimInitiativeSlot(event) {
    const slot = $(event.currentTarget).data('claim-slot');
    const slotId = this.viewed.turns[slot].id;
    const tokenCount = canvas.tokens.controlled.length;
    const ownedTokenCount = canvas.tokens.ownedTokens.length;
    // you must have a single token selected to claim a slot
    if (tokenCount !== 1 && ownedTokenCount !== 1) {
      ui.notifications.warn(game.i18n.localize("SWFFG.Notifications.Combat.Claim.OneToken"));
      return;
    }
    const token = ownedTokenCount === 1 ? canvas.tokens.ownedTokens[0] : canvas.tokens.controlled[0];
    const combatant = token.combatant;
    if (!combatant) {
      ui.notifications.warn(game.i18n.localize("SWFFG.Notifications.Combat.Claim.Combatant"));
      return;
    }
    // ensure combatant is permitted in this type of slot
    const combatantDisposition = combatant?.token?.disposition ?? combatant?.actor?.token?.disposition ?? token?.document?.disposition ?? 0;
    const slotDisposition = this.viewed.turns[slot]?.token?.disposition ?? this.viewed.turns[slot]?.actor?.token?.disposition ?? this.viewed.turns[slot]?.disposition ?? 0;
    if (slotDisposition !== combatantDisposition) {
      ui.notifications.warn(game.i18n.localize("SWFFG.Notifications.Combat.Claim.SlotType"));
      return;
    }
    await this.viewed.claimSlot(this.viewed.round, slotId, combatant.id);
  }

  /** @override */
  async getData(options) {
    const combat = this.viewed;
      if (!combat) {
      return await super.getData(options);
    }

    // create a copy of the turn data, then set hidden to false so non-GMs can view all turns, then set the data back
    const tempData = foundry.utils.deepClone(this.viewed.turns);
    for (const turn of this.viewed.turns) {
      turn.hidden = false;
    }
    const data = await super.getData(options);
    this.viewed.turns = tempData;

    const newInitiatives = {
      [CONST.TOKEN_DISPOSITIONS.FRIENDLY]: combat.combatants.filter(i => i.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY).map(i => i.initiative),
      [CONST.TOKEN_DISPOSITIONS.NEUTRAL]: combat.combatants.filter(i => i.disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL).map(i => i.initiative),
      [CONST.TOKEN_DISPOSITIONS.HOSTILE]: combat.combatants.filter(i => i.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE).map(i => i.initiative),
    }

    // sort the initiatives
    newInitiatives[CONST.TOKEN_DISPOSITIONS.FRIENDLY].sort(sortInit);
    newInitiatives[CONST.TOKEN_DISPOSITIONS.NEUTRAL].sort(sortInit);
    newInitiatives[CONST.TOKEN_DISPOSITIONS.HOSTILE].sort(sortInit);

    // used to track how many slots have occurred per side - we care to mark slots as "unused" if they're past the number of alive combatants
    let turnTracker = {
      [CONST.TOKEN_DISPOSITIONS.FRIENDLY]: 0,
      [CONST.TOKEN_DISPOSITIONS.NEUTRAL]: 0,
      [CONST.TOKEN_DISPOSITIONS.HOSTILE]: 0,
    };

    const turns = data.turns.map((turn, index) => {
      // check if anyone has claimed this slot
      const claimantId = combat.getSlotClaims(combat.round, turn.id);
      // if they have, pull the actor data
      const claimant = claimantId ? (combat.combatants.get(claimantId)) : undefined;
      // if there's a claim on the slot and combat has started, set claimed = true
      const claimed = combat.started ? claimantId !== undefined : true;
      // look up the normal actor for this slot
      const combatant = combat.combatants.get(turn.id);
      // track the disposition: the token, if it exists, then the actor, if it exists, then turn.defeated (which is where we stash extra slot initiative)
      const disposition = combatant.disposition;
      // determine if the user can claim this slot
      const canClaim = ((disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY || disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) && !claimed) || game.user.isGM;

      // get the highest possible initiative for this combatant
      const slotInitiative = newInitiatives[disposition].pop();

      let claim = {};
      let hasRolled = true;

      if (combat.started && claimant) {
        CONFIG.logger.debug(`slot ${index} has been claimed by ${claimant.name}`);
        let defeated = claimant.isDefeated;

        const effects = new Set();
        if (claimant.token) {
          claimant.token.effects.forEach((e) => effects.add(e))
          if (claimant.token.overlayEffect) {
            effects.add(claimant.token.overlayEffect);
          }
        }
        if (claimant.actor) {
          if (claimant.isDefeated) {
            defeated = true;
          }
          for (const effect of claimant.actor.temporaryEffects) {
            if (effect?.icon) {
              effects.add(effect.icon);
            }
          }
        }

        const hidden = this._getTokenHidden(claimant.tokenId);

        if (!hidden && turn.css) {
          turn.css = turn?.css?.replace('hidden', '');
        }

        if (claimant.initiative === null) {
          CONFIG.logger.debug("setting hasRolled to false (no initiative for claimant)");
          hasRolled = false;
        }

        claim = {
          id: claimant.id,
          name: claimant.name,
          img: claimant.img ?? CONST.DEFAULT_TOKEN,
          owner: claimant.isOwner,
          defeated,
          hidden: hidden,
          canPing: claimant.sceneId === canvas.scene?.id && game.user.hasPermission("PING_CANVAS"),
          effects,
          initiative: claimant.initiative,
        };
        turn.hidden = hidden;
        turn.tokenId = claimant.tokenId;
      } else {
        CONFIG.logger.debug(`slot ${index} is unclaimed`);
        if (combatant) {
          if (combatant && Object.keys(combatant).includes("tokenId")) {
            combatant.hidden = this._getTokenHidden(combatant.tokenId);
          } else {
            combatant.hidden = false;
          }
          turn.tokenId = combatant.tokenId;
          // sync the turn state to the token state
          turn.hidden = combatant.hidden;
          if (!combatant.initiative && !combat?.started) {
            hasRolled = false;
          }

          if (combatant.css === undefined) {
            combatant.css = "";
          }
          if (combat.turn === index) {
            combatant.active = true;
            combatant.css += " active";
          } else {
            combatant.active = false;
            combatant.css = "";
          }
        }
      }
      let slotType;
      if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
        slotType = 'Friendly';
      } else if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) {
        slotType = 'Enemy';
      } else {
        slotType = 'Neutral';
      }

      // determine if we should mark the slot as unneeded
      const aliveCount = this._getCombatantStateCount(combat, disposition);
      let unused = false;
      turnTracker[disposition]++;
      if (turnTracker[disposition] > aliveCount) {
        unused = true;
      }

      // we do not care about the defeated status since defeated units get their slot marked unused
      turn.css = turn.css.replace('defeated', '');

      return {
        ...turn,
        ...claim,
        slotType: slotType,
        initiative: slotInitiative,
        hasRolled: hasRolled,
        claimed,
        canClaim,
        activationId: slotInitiative ? slotInitiative.activationId : undefined,
        unused: unused,
      }
    });

    const claimantId = combat.getSlotClaims(combat.round, combat.turns[combat.turn]?.id);
    const claimant = claimantId ? (combat.combatants.get(claimantId)) : undefined;

    const turnData = {
      Friendly: data.turns.filter(i => combat.combatants.get(i.id)?.token?.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY),
      Enemy: data.turns.filter(i => combat.combatants.get(i.id)?.token?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE),
      Neutral: data.turns.filter(i => combat.combatants.get(i.id)?.token?.disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL),
    };

    // update visibility state for each token
    for (const turn of turnData['Friendly']) {
      turn.hidden = this._getTokenHidden(turn.tokenId);
      turn.claimed = combat.hasClaims(combat.combatants.find(i => i.tokenId === turn.tokenId).id);
    }

    for (const turn of turnData['Enemy']) {
      const combatant = combat.combatants.get(turn.id);
      if (!combatant) {
        //continue;
      }
      const claimantId = combat.hasClaims(combat.combatants.find(i => i.tokenId === turn.tokenId).id);
      const claimant = claimantId ? (combat.combatants.get(claimantId)) : undefined;
      if (combat.started && claimant) {
        turn.hidden = this._getTokenHidden(claimant.tokenId);
        turn.claimed = combat.hasClaims(combat.combatants.find(i => i.tokenId === claimant.tokenId).id );
      } else {
        turn.hidden = this._getTokenHidden(combatant.tokenId);
        turn.claimed = combat.hasClaims(combat.combatants.find(i => i.tokenId === combatant.tokenId).id);
      }
    }

    for (const turn of turnData['Neutral']) {
      turn.hidden = this._getTokenHidden(turn.tokenId);
      turn.claimed = combat.hasClaims(combat.combatants.find(i => i.tokenId === turn.tokenId).id);
    }

    return {
      ...data,
      turns,
      control: claimant?.players?.includes(game.user) ?? false,
      turnData,
    };
  }

  /**
   * get the number of alive combatants on a given side, including any who have claimed a slot and died
   * essentially, the claimed and dead ones need to be included to get an accurate count to determine unused slots
   * @param combat
   * @param disposition
   * @returns {number}
   * @private
   */
  _getCombatantStateCount(combat, disposition) {
    const total =  combat.combatants.filter(i => i.disposition === disposition);
    const defeated = combat.combatants.filter(i => i.disposition === disposition && i.isDefeated);
    CONFIG.logger.debug(`getting combatant state count for ${disposition}`)
    CONFIG.logger.debug(`detected ${total.length} real slots, and ${defeated.length} defeated slots`);
    return total.length - defeated.length;
  }

  /**
   * get the total number of slots for a given disposition, including any extra slots
   * @param combat
   * @param disposition
   * @returns {number}
   * @private
   */
  _getDispositionSlotCount(combat, disposition) {
    return combat.combatants.filter(i => i.disposition === disposition).length;
  }

  /** @override */
  _getEntryContextOptions() {
    const baseEntries = super._getEntryContextOptions();
    // replace the default remove combatant entry with our custom one, which allows us to detect and remove extra slots
    const removeCombatantEntry = baseEntries.find(i => i.name === "COMBAT.CombatantRemove");
    if (removeCombatantEntry) {
      removeCombatantEntry.callback = li => {
        this._removeCombatant(this, li);
      };
      baseEntries[3] = removeCombatantEntry;
    }

    const removeSlot = {
      name: 'SWFFG.Notifications.Combat.Claim.RemoveSlot',
      icon: '<i class="fa-regular fa-trash-alt"></i>',
      callback: async (li) => {
        const index = +li.data('slot-index');
        if (!isNaN(index)) {
          await this._removeSlot(this.viewed.round, li);
        }
      },
    };

    // Allow GMs to revoke an initiative slot claim.
    const unClaimSlot = {
      name: 'SWFFG.Notifications.Combat.Claim.UnClaim',
      icon: '<i class="fa-regular fa-xmark"></i>',
      callback: async (li) => {
        const index = +li.data('slot-index');
        if (!isNaN(index)) {
          await this.viewed.unclaimSlot(this.viewed.round, this.viewed.turns[index].id);
        }
      },
    };

    return [...baseEntries, removeSlot, unClaimSlot];
  }

  async _removeCombatant(tracker, li) {
    const combat = this.viewed;
    if (!combat) {
      ui.notifications.error("Error detecting combat, try starting/ending combat?");
    }
    const round = combat.round;
    const turn = li.data("slot-index");
    const combatantId = li.data("combatant-id");
    const claim = combat.getSlotClaims(round, combatantId);
    const claimed = claim !== undefined;
    if (!claimed) {
      ui.notifications.warn("You cannot remove a combatant without having the slot claimed");
      return;
    }
    // note the combatant's information
    // create a generic slot mirroring the combatant's data
    // remove the combatant's true slot
    const claimant = combat.combatants.get(claim);
    const disposition = CONST.TOKEN_DISPOSITIONS[li.data("disposition").replace('Enemy', 'Hostile').toUpperCase()];
    if (!claimant) {
      ui.notifications.error("Unable to find actor which claimed this slot, please report");
      return;
    }
    const initiative = claimant.initiative;
    combat.debounceRender();
    claimant.delete();
    // we create a generic slot to keep slots consistent (deleting a combatant removes their slot as well, which we do not want)
    await combat.addExtraSlot(round, disposition, initiative);
    combat.setupTurns();
    game.socket.emit("system.starwarsffg", {event: "trackerRender", combatId: combat.id});
  }

  async _removeSlot(tracker, li) {
    const combat = this.viewed;
    if (!combat) {
      ui.notifications.error("Error detecting combat, try starting/ending combat?");
    }
    const round = combat.round;
    const turn = li.data("slot-index");
    const combatant = combat.turns[turn];
    const claim = combat.getSlotClaims(round, combatant.id);
    const claimed = claim !== undefined;
    const disposition = CONST.TOKEN_DISPOSITIONS[li.data("disposition").replace('Enemy', 'Hostile').toUpperCase()];

    if (claimed) {
      ui.notifications.warn("You must un-claim the slot before removing it");
      return;
    }
    const slotCount = this._getDispositionSlotCount(combat, disposition)
    const presentCount = combat.combatants.filter(i => i?.token?.disposition === disposition).length;

    CONFIG.logger.debug(`detected ${presentCount} total combatants for disposition ${disposition}, along with ${slotCount} total slots`);

    if (slotCount - 1 < presentCount) {
      ui.notifications.warn(`You must retain enough slots for all actors in the combat (${presentCount})`);
      return;
    }
    // if it's a fake slot, delete it
    // otherwise, pick another slot, copy the data from it, copy claims over (if applicable), and delete this slot
    const fakeTurn = combatant?.flags?.fake || false;
    if (fakeTurn) {
      combatant.delete();
    } else {
      // this is a real slot, we need to find a replacement
      // locate a fake turn
      const replacementTurn = combat.turns.find(i => i.flags?.fake && i.disposition === combatant.disposition);
      if (!replacementTurn) {
        CONFIG.logger.warn("Unable to find a replacement turn, likely concurrency issues");
        return;
      }
      await combatant.update({initiative: replacementTurn.initiative});
      const replacementClaimed = combat.getSlotClaims(round, replacementTurn.id);
      if (replacementClaimed) {
        await combat.unclaimSlot(round, replacementTurn.id);
        await combat.claimSlot(round, combatant.id, replacementClaimed);
      }
      replacementTurn.delete();
    }
  }

  /** @override */
  async _onCombatantHoverIn(event) {
    event.preventDefault();

    if (!(event.currentTarget).classList.contains('claimed') && !(event.currentTarget).classList.contains('actor-header')) {
      return;
    }
    return super._onCombatantHoverIn(event);
  }

  /** @override */
  async _onCombatantMouseDown(event) {
    event.preventDefault();

    if (!(event.currentTarget).classList.contains('claimed') && !(event.currentTarget).classList.contains('actor-header')) {
      return;
    }
    return super._onCombatantMouseDown(event);
  }

  /**
   * Determine the hidden status of a token, since the state in the combat tracker seems to lag
   * @param tokenId
   * @returns {boolean}
   * @private
   */
  _getTokenHidden(tokenId) {
    let hidden = true;
    const scene = game.scenes.get(this.viewed.scene.id);
    const token = scene.tokens.get(tokenId);
    if (token) {
      hidden = token.hidden;
    }
    CONFIG.logger.debug(`looking up hidden state for ${token?.name}/${tokenId} on scene ${scene.id}: ${hidden}`);
    return hidden;
  }
}

export default class CombatantFFG extends Combatant {
  get disposition() {
    if (this.flags?.fake) {
      return this.flags.disposition;
    } else {
      return this?.token ? this.token?.disposition : this?.actor?.prototypeToken?.disposition;
    }
  }
}

/**
 * Force the combat tracker to re-render, which picks up "hidden" state changes of tokens
 */
export function updateCombatTracker() {
  // Used to force the tracker to re-render based on updated visibility state
  if (game.combat && game.settings.get("starwarsffg", "useGenericSlots")) {
    ui.combat.render(true);
  }
}

/**
 * Sort function for initiatives. Puts NULL to the end.
 * @param a
 * @param b
 * @returns {number|number}
 */
function sortInit(a, b) {
  // equal items sort equally
  if (a === b) {
      return 0;
  }
  // nulls sort before anything else
  if (a === null) {
      return -1;
  }
  if (b === null) {
      return 1;
  }
  return a < b ? -1 : 1;
}
