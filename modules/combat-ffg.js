import {DicePoolFFG, RollFFG} from "./dice-pool-ffg.js";
import PopoutEditor from "./popout-editor.js";

/**
 * Extend the base Combat entity.
 * @extends {Combat}
 */
export class CombatFFG extends Combat {
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
   * @param slot - INT - the turn
   * @returns {undefined|*}
   */
  getSlotClaims(round, slot) {
    const claims = this.getFlag('starwarsffg', 'combatClaims') || undefined;
    if (!claims) {
      return undefined;
    }
    return claims[round]?.[slot];
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
   * @param slot - INT - the turn
   * @param combatantId - STRING - the combatant ID (NOT token ID, NOT actor ID)
   * @returns {Promise<void>}
   */
  async claimSlot(round, slot, combatantId) {
    if (!game.user.isGM) {
      const data = {
        combatId: this.id,
        round: round,
        slot: slot,
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
    claims[round][slot] = combatantId;
    await this.setFlag('starwarsffg', 'combatClaims', claims);
  }

  /**
   * Un-claim a slot for a given combatant
   * @param round - INT - the round
   * @param slot - INT - the turn
   * @returns {Promise<void>}
   */
  async unclaimSlot(round, slot) {
    if (!game.user.isGM) {
      // only the GM can un-claim a slot
      return;
    }
    await this.unsetFlag('starwarsffg', `combatClaims.${round}.${slot}`);
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
    const slotDisposition = this.viewed.turns[slot]?.token?.disposition ?? this.viewed.turns[slot]?.actor?.token?.disposition ?? 0;
    if (slotDisposition !== combatantDisposition) {
      ui.notifications.warn(game.i18n.localize("SWFFG.Notifications.Combat.Claim.SlotType"));
      return;
    }
    await this.viewed.claimSlot(this.viewed.round, slot, combatant.id);
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

    const initiatives = combat.combatants.reduce((accumulator, combatant) => {
      accumulator[combatant.id] = [{activationId: -1, initiative: combatant.initiative}];
      return accumulator;
    }, {});

    // used to track how many slots have occurred per side - we care to mark slots as "unused" if they're past the number of alive combatants
    let turnTracker = {
      [CONST.TOKEN_DISPOSITIONS.FRIENDLY]: 0,
      [CONST.TOKEN_DISPOSITIONS.NEUTRAL]: 0,
      [CONST.TOKEN_DISPOSITIONS.HOSTILE]: 0,
    };

    const turns = data.turns.map((turn, index) => {
      const combatant = combat.combatants.get(turn.id);
      const claimantId = combat.getSlotClaims(combat.round, index);
      const claimant = claimantId ? (combat.combatants.get(claimantId)) : undefined;
      const claimed = combat.started ? claimantId !== undefined : true;
      const canClaim = ((combatant.token?.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY || combatant?.actor?.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) && !claimed) || game.user.isGM;

      // get the highest possible initiative for this combatant
      const slotInitiative = initiatives[combatant.id].pop();
      let claim = {};

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

        claim = {
          id: claimant.id,
          name: claimant.name,
          img: claimant.img ?? CONST.DEFAULT_TOKEN,
          owner: claimant.owner,
          defeated,
          hidden: hidden,
          canPing: claimant.sceneId === canvas.scene?.id && game.user.hasPermission("PING_CANVAS"),
          effects,
        };
        turn.hidden = hidden;
        turn.tokenId = claimant.tokenId;
      } else {
        CONFIG.logger.debug(`slot ${index} is unclaimed`);
        combatant.hidden = this._getTokenHidden(combatant.tokenId);
        turn.tokenId = combatant.tokenId;
        // sync the turn state to the token state
        turn.hidden = combatant.hidden;
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
      const disposition = combatant.token?.disposition ?? combatant.actor?.token.disposition ?? 0;
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

      return {
        ...turn,
        ...claim,
        slotType: slotType,
        initiative: slotInitiative.initiative,
        hasRolled: slotInitiative.initiative !== null,
        claimed,
        canClaim,
        activationId: slotInitiative.activationId,
        unused: unused,
      }
    });

    const claimantId = combat.getSlotClaims(combat.round, combat.turn);
    const claimant = claimantId ? (combat.combatants.get(claimantId)) : undefined;

    const turnData = {
      Friendly: data.turns.filter(i => combat.combatants.get(i.id).token.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY),
      Enemy: data.turns.filter(i => combat.combatants.get(i.id).token.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE),
      Neutral: data.turns.filter(i => combat.combatants.get(i.id).token.disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL),
    };

    // update visibility state for each token
    for (const turn of turnData['Friendly']) {
      turn.hidden = this._getTokenHidden(turn.tokenId);
      turn.claimed = combat.hasClaims(combat.combatants.find(i => i.tokenId === turn.tokenId).id);
    }

    for (const turn of turnData['Enemy']) {
      const combatant = combat.combatants.get(turn.id);
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
    const rawAlive = combat.combatants.filter(i => i.token.disposition === disposition && !i.isDefeated);
    const claimed = Object.values(combat.getClaims(combat.round));
    const defeated = combat.combatants.filter(i => i.token.disposition === disposition && i.isDefeated);
    return rawAlive.length + defeated.filter(i => i.id && claimed.includes(i.id)).length;
  }

  /** @override */
  _getEntryContextOptions() {
    const baseEntries = super._getEntryContextOptions();

    // Allow GMs to revoke an initiative slot claim.
    const unClaimSlot = {
      name: 'SWFFG.Notifications.Combat.Claim.UnClaim',
      icon: '<i class="fa-regular fa-xmark"></i>',
      callback: async (li) => {
        const index = +li.data('slot-index');
        if (!isNaN(index)) {
          await this.viewed.unclaimSlot(this.viewed.round, index);
        }
      },
    };

    return [...baseEntries, unClaimSlot];
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

/**
 * Force the combat tracker to re-render, which picks up "hidden" state changes of tokens
 */
export function updateCombatTracker() {
  // Used to force the tracker to re-render based on updated visibility state
  if (game.combat && game.settings.get("starwarsffg", "useGenericSlots")) {
    ui.combat.render(true);
  }
}
