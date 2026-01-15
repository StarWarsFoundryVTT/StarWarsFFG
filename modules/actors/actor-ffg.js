import PopoutEditor from "../popout-editor.js";
import ModifierHelpers from "../helpers/modifiers.js";

/**
 * Extend the base Actor entity.
 * @extends {Actor}
 */
export class ActorFFG extends Actor {

  // returns true if EditMode is not enabled, false otherwise. sends warning notification if EditMode is enabled and sendWarn is true
  verifyEditModeIsNotEnabled(sendWarn = true){
    const result = !this.getFlag("starwarsffg", "config.enableEditMode");
    if(sendWarn && !result) {
      ui.notifications.warn("Can't do this while EditMode is enabled");
    }
      return result;
  }

  static async create(data, options) {
    const createData = data;

    // Only apply defaults for newly created actors
    if (!(typeof data.system === "undefined")) {
      return super.create(createData, options);
    }

    switch (createData.type) {
      case "minion":
        createData.prototypeToken = {
          actorLink: false,
          disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
          bar1: {
            attribute: "stats.wounds",
          },
        };
        break;
      case "character":
        createData.prototypeToken = {
          actorLink: true,
          disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
          bar1: {
            attribute: "stats.wounds",
          },
          bar2: {
            attribute: "stats.strain",
          },
        };
        break;
      case "rival":
        createData.prototypeToken = {
          actorLink: false,
          disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
          bar1: {
            attribute: "stats.wounds",
          },
          bar2: {
            attribute: "stats.strain",
          },
          prependAdjective: game.settings.get("starwarsffg", "RivalTokenPrepend"),
        };
        break;
      case "nemesis":
        createData.prototypeToken = {
          actorLink: true,
          disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
          bar1: {
            attribute: "stats.wounds",
          },
          bar2: {
            attribute: "stats.strain",
          },
        };
        break;
      case "vehicle":
        createData.prototypeToken = {
          actorLink: true,
          bar1: {
            attribute: "stats.hullTrauma",
          },
          bar2: {
            attribute: "stats.systemStrain",
          },
        };
        break;
    }
    return super.create(createData, options);
  }

  /** @override **/
  async _preCreate(data, operation, user) {
    const defaultImages = {
      character: "systems/starwarsffg/images/defaults/actors/character.png",
      minion: "systems/starwarsffg/images/defaults/actors/minion.png",
      nemesis: "systems/starwarsffg/images/defaults/actors/nemesis.png",
      rival: "systems/starwarsffg/images/defaults/actors/rival.png",
      vehicle: "systems/starwarsffg/images/defaults/actors/vehicle.png",
    }
    if (game.user.id === user.id && (!data?.img || data?.img === "icons/svg/mystery-man.svg")) {
      if (Object.keys(defaultImages).includes(data.type)) {
        this.updateSource({img: defaultImages[data.type]});
      } else {
        // fall back to the previous default
        this.updateSource({img: "icons/svg/mystery-man.svg"});
      }
    }
    return {data, operation, user};
  }


  /** @override
   * We use this to update wounds, strain, and soak when characteristics are changed
   * It's implemented here since Edit Mode must be enabled to make a change here, which means
   *  any modifications from Active Effects are suspended and we can do simple math
   * It's somewhat assumed that direct characteristic modifications are being done during character creation
   * Anything else should be coming from Active Effects (e.g., on a talent giving +1 Brawn)
   */
  async _preUpdate(changes, options, user) {
    /**
     * Derived attributes:
     *  Wound Threshold - Species WT + Brawn. Further increases to Brawn DO NOT increase the WT.
     *  Strain Threshold - Species ST + Willpower. Further increases to Willpower DO NOT increase the ST.
     *  Soak - Brawn. Further increases to Brawn DO increase Soak.
     *  // this might be able to be done when you submit an update to the species item - we update the values of the existing AEs
     */

    CONFIG.logger.debug(`Performing pre-update on ${this.name}`);
    if (["character", "rival", "nemesis"].includes(this.type)) {
      const originalBrawn = this.system.characteristics.Brawn.value;
      const updatedBrawn = changes?.system?.characteristics?.Brawn?.value;
      if (originalBrawn !== undefined && updatedBrawn !== undefined && originalBrawn !== updatedBrawn) {
        CONFIG.logger.debug(`Detected modified Brawn (${originalBrawn} -> ${updatedBrawn}, updating derived values`);
        // get the wounds without brawn modifying it, then add the new brawn value in
        const originalWounds = this.system.stats?.wounds.max;
        const originalWoundsWithoutBrawn = originalWounds - originalBrawn;
        const updatedWounds = originalWoundsWithoutBrawn + parseInt(updatedBrawn);
        if (!Object.keys(changes.system).includes("stats")) {
          changes.system.stats = {};
        }
        CONFIG.logger.debug(`The character sheet showed ${originalWounds} wounds, while that value without Brawn was ${originalWoundsWithoutBrawn}. Updating to be ${updatedWounds}`);
        changes.system.stats = foundry.utils.mergeObject(
          changes.system.stats,
          {
            wounds: {
              max: updatedWounds,
            }
          }
        );
        // repeat the above process, but for soak
        const originalSoak = this.system.stats?.soak.value;
        const originalSoakWithoutBrawn = originalSoak - originalBrawn;
        const updatedSoak = originalSoakWithoutBrawn + updatedBrawn;
        CONFIG.logger.debug(`The character sheet showed ${originalSoak} soak, while that value without Brawn was ${originalSoakWithoutBrawn}. Updating to be ${updatedSoak}`);
        changes.system.stats = foundry.utils.mergeObject(
          changes.system.stats,
          {
            soak: {
              value: updatedSoak,
            }
          }
        );
      }
      const originalWillpower = this.system.characteristics.Willpower.value;
      const updatedWillpower = changes.system?.characteristics?.Willpower?.value;
      if (originalWillpower !== undefined && updatedWillpower !== undefined && originalWillpower !== updatedWillpower) {
        CONFIG.logger.debug(`Detected modified Willpower (${originalWillpower} -> ${updatedWillpower}, updating derived values`);
        if (this.system.stats?.strain) {
          // get the soak without willpower modifying it, then add the new willpower value in
          const originalStrain = this.system.stats?.strain.max;
          const originalStrainWithoutWillpower = originalStrain - originalWillpower;
          const updatedStrain = originalStrainWithoutWillpower + updatedWillpower;
          CONFIG.logger.debug(`The character sheet showed ${originalStrain} strain, while that value without Willpower was ${originalStrainWithoutWillpower}. Updating to be ${updatedStrain}`);
          changes.system.stats = foundry.utils.mergeObject(
            changes.system.stats,
            {
              strain: {
                max: updatedStrain,
              }
            }
          );
        }
      }
    }
    await super._preUpdate(changes, options, user);
  }

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareDerivedData() {
    const actor = this;
    const data = actor.system;
    const flags = actor.flags;

    // if the actor has skills, add custom skills
    if (data.skills) {
      let skills = JSON.parse(JSON.stringify(CONFIG.FFG.skills));

      data.skills = foundry.utils.mergeObject(skills, data.skills);

      // Filter out skills that are not custom (manually added) or part of the current system skill list
      Object.keys(data.skills)
      .filter(s => !data.skills[s].custom && !CONFIG.FFG.skills[s])
      .forEach(s => delete data.skills[s]);

      let unique = [...new Set(Object.values(data.skills).map((item) => item.type))];
      if (unique.indexOf("General") > 0) {
        const generalIndex = unique.indexOf("General");
        unique[generalIndex] = unique[0];
        unique[0] = "General";
      }
      data.skilltypes = unique.map((item) => {
        return { type: item, label: game.i18n.localize(`SWFFG.Skills${item}`) === `SWFFG.Skills${item}` ? item : game.i18n.localize(`SWFFG.Skills${item}`) };
      });
    }

    // add values for above threshold
    if (["character", "nemesis"].includes(actor.type)) {
      data.stats.woundsOverThreshold = data.stats.wounds.value - data.stats.wounds.max;
      data.stats.strainOverThreshold = data.stats.strain.value - data.stats.strain.max;
    } else if (["rival", "minion"].includes(actor.type)) {
      data.stats.woundsOverThreshold = data.stats.wounds.value - data.stats.wounds.max;
    } else if (["vehicle"].includes(actor.type)) {
      data.stats.hullOverThreshold = data.stats.hullTrauma.value - data.stats.hullTrauma.max;
      data.stats.systemStrainOverThreshold = data.stats.systemStrain.value - data.stats.systemStrain.max;
    }

    this._prepareSharedData.bind(this);
    this._prepareSharedData(actor);
    if (actor.type === "minion") this._prepareMinionData(actor);
    if (["character", "nemesis", "rival"].includes(actor.type)) {
      this._prepareCharacterData(actor);
      this._prepareSources(actor);
    }
  }

  _prepareSharedData(actorData) {
    const data = actorData.system;
    //data.biography = PopoutEditor.replaceRollTags(data.biography, actorData);

    // localize characteristic names
    if (actorData.type !== "vehicle" && actorData.type !== "homestead") {
      for (let characteristic of Object.keys(data.characteristics)) {
        const strId = `SWFFG.Characteristic${this._capitalize(characteristic)}`;
        const localizedField = game.i18n.localize(strId);

        data.characteristics[characteristic].label = localizedField;
      }

      //localize skill names
      for (let skill of Object.keys(data.skills)) {
        let skillLabel = CONFIG.FFG.skills?.[skill]?.label;

        if (!skillLabel) {
          // this is a one-off skill added directly to the character
          skillLabel = data.skills[skill].label;
        }

        const localizedField = game.i18n.localize(skillLabel);

        data.skills[skill].label = localizedField;
      }
    }
    
    // Create list of active effects changing this actor
    data.effects = actorData.effects.contents;
    actorData.items.forEach(item => {
      data.effects.push(...item.effects.contents);
    });

    if (["character", "nemesis", "rival", "minion"].includes(actorData.type)) {
      if (game.settings.get("starwarsffg", "enableSoakCalc")) {
        this._calculateDerivedValues(actorData);
      }
    } else if (["vehicle"].includes(actorData.type)) {
      this._calculateDerivedValues(actorData);
    }
  }

  /**
   * Prepare Minion type specific data
   */
  _prepareMinionData(actorData) {
    const data = actorData.system;

    // Set Wounds threshold to unit_wounds * quantity to account for minion group health.
    data.stats.wounds.max = Math.floor(data.unit_wounds.value * data.quantity.max);
    // Check we don't go below 0.
    if (data.stats.wounds.max < 0) {
      data.stats.wounds.max = 0;
    }

    //Calculate the number of alive minions
    data.quantity.value = Math.max(Math.min(data.quantity.max, data.quantity.max - Math.floor((data.stats.wounds.value - 1) / data.unit_wounds.value)), 0);

    // Loop through Skills, and where groupskill = true, set the rank to 1*(quantity-1).
    for (let [key, skill] of Object.entries(data.skills)) {
      // Check to see if this is a group skill, otherwise do nothing.
      if (skill.groupskill) {
        skill.rank = Math.floor(1 * (data.quantity.value - 1));
        // Check we don't go below 0.
        if (skill.rank < 0) {
          skill.rank = 0;
        } else if (skill.rank > 5) {
          skill.rank = 5;
        }
      } else if (!skill.groupskill) {
        skill.rank = data.skills[key].rank;
      }
    }

    // Loop through owned talent items and create the data.talentList object
    const globalTalentList = [];
    const talents = actorData.items.filter((item) => {
      return item.type === "talent";
    });
    talents.forEach((element) => {
      const item = {
        name: element.name,
        itemId: element.id,
        description: element.system?.description,
        activation: element.system.activation?.value,
        activationLabel: element.system.activation?.label,
        isRanked: element.system.ranks?.ranked,
        source: [{ type: "talent", typeLabel: "SWFFG.Talent", name: element.name, id: element.id }],
      };
      if (item.isRanked) {
        item.rank = element.system.ranks?.current;
      } else {
        item.rank = "N/A";
      }

      if (CONFIG.FFG.theme !== "starwars") {
        item.tier = parseInt(element.system.tier, 10);
      }

      let index = globalTalentList.findIndex((obj) => {
        return obj.name === item.name;
      });

      if (index < 0 || !item.isRanked) {
        globalTalentList.push(item);
      } else {
        globalTalentList[index].source.push({ type: "talent", typeLabel: "SWFFG.Talent", name: element.name, id: element.id });
        globalTalentList[index].rank += element.system.ranks?.current;
        if (CONFIG.FFG.theme !== "starwars") {
          globalTalentList[index].tier = Math.abs(globalTalentList[index].rank + (parseInt(element.system.tier, 10) - 1));
        }
      }
    });
    if (CONFIG.FFG.theme !== "starwars") {
      globalTalentList.sort((a, b) => {
        let comparison = 0;
        if (a.tier > b.tier) {
          comparison = 1;
        } else if (a.tier < b.tier) {
          comparison = -1;
        }
        return comparison;
      });
    } else {
      globalTalentList.sort((a, b) => {
        let comparison = 0;
        if (a.name > b.name) {
          comparison = 1;
        } else if (a.name < b.name) {
          comparison = -1;
        }
        return comparison;
      });
    }
    actorData.talentList = globalTalentList;
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    const data = actorData;

    // Build complete talent list.

    const specializations = actorData.items.filter((item) => {
      return item.type === "specialization";
    });

    const globalTalentList = [];
    specializations.forEach((element) => {
      //go through each list of talent where learned = true

      const learnedTalents = Object.keys(element.system.talents).filter((key) => element.system.talents[key].islearned === true);

      learnedTalents.forEach((talent) => {
        const item = JSON.parse(JSON.stringify(element.system.talents[talent]));
        item.firstSpecialization = element.id;
        item.source = [{ type: "specialization", typeLabel: "SWFFG.Specialization", name: element.name, id: element.id }];
        if (item.isRanked) {
          item.rank = element.system.talents[talent]?.rank ? element.system.talents[talent].rank : 1;
        } else {
          item.rank = "N/A";
        }
        let index = globalTalentList.findIndex((obj) => {
          return obj.name === item.name;
        });

        if (index < 0 || !item.isRanked) {
          globalTalentList.push(item);
        } else {
          globalTalentList[index].source.push({ type: "specialization", typeLabel: "SWFFG.Specialization", name: element.name, id: element.id });
          globalTalentList[index].rank += element.system.talents[talent]?.rank ? element.system.talents[talent].rank : 1;
        }
      });
    });

    const talents = actorData.items.filter((item) => {
      return item.type === "talent";
    });

    talents.forEach((element) => {
      const item = {
        name: element.name,
        itemId: element.id,
        description: element.system?.description,
        activation: element.system?.activation?.value,
        activationLabel: element.system?.activation?.label,
        isRanked: element.system?.ranks?.ranked,
        source: [{
          type: element?.flags?.starwarsffg?.fromSpecies ? "species" : "talent",
          typeLabel: element?.flags?.starwarsffg?.fromSpecies ? "SWFFG.Species" : "SWFFG.Talent",
          name: element.name,
          id: element.id,
        }],
      };

      if (item.isRanked) {
        item.rank = element.system.ranks.current;
      } else {
        item.rank = "N/A";
      }

      if (CONFIG.FFG.theme !== "starwars") {
        item.tier = parseInt(element.system?.tier, 10);
      }

      let index = globalTalentList.findIndex((obj) => {
        return obj.name === item.name;
      });

      if (index < 0 || !item.isRanked) {
        globalTalentList.push(item);
      } else {
        globalTalentList[index].source.push({
          type: element?.flags?.starwarsffg?.fromSpecies ? "species" : "talent",
          typeLabel: element?.flags?.starwarsffg?.fromSpecies ? "SWFFG.Species" : "SWFFG.Talent",
          name: element.name,
          id: element.id,
        });
        globalTalentList[index].rank += element.system.ranks.current;
        if (CONFIG.FFG.theme !== "starwars") {
          globalTalentList[index].tier = Math.abs(parseInt(globalTalentList[index].rank) + (parseInt(element.system?.tier, 10) - 1));
        }
      }
    });

    if (CONFIG.FFG.theme !== "starwars") {
      globalTalentList.sort((a, b) => {
        let comparison = 0;
        if (a.tier > b.tier) {
          comparison = 1;
        } else if (a.tier < b.tier) {
          comparison = -1;
        }
        return comparison;
      });
    } else {
      globalTalentList.sort((a, b) => {
        let comparison = 0;
        if (a.name > b.name) {
          comparison = 1;
        } else if (a.name < b.name) {
          comparison = -1;
        }
        return comparison;
      });
    }

    // enable talent sorting if global to true and sheet is set to inherit or sheet is set to true.
    if ((game.settings.get("starwarsffg", "talentSorting") && (!actorData.flags?.config?.talentSorting || actorData.flags?.config?.talentSorting === "0")) || actorData.flags?.config?.talentSorting === "1") {
      data.talentList = globalTalentList.slice().reverse().sort(this._sortTalents);
    } else {
      data.talentList = globalTalentList;
    }

    if (data?.obligationlist && Object.keys(data.obligationlist).length > 0) {
      let obligation = 0;
      Object.keys(data.obligationlist).forEach((element) => {
        const item = data.obligationlist[element];

        if (parseInt(item.magnitude, 10)) {
          obligation += parseInt(item.magnitude, 10);
        }
      });
      data.obligations.value = obligation;
    }

    if (data?.dutylist && Object.keys(data.dutylist).length > 0) {
      let duty = 0;
      Object.keys(data.dutylist).forEach((element) => {
        const item = data.dutylist[element];
        if (parseInt(item.magnitude, 10)) {
          duty += parseInt(item.magnitude, 10);
        }
      });
      data.duty.value = duty;
    }
  }

  /**
   * Generate source data for dice pools - show where the dice come from
   * @param actorData - an instance of an actor
   * @private
   */
  _prepareSources(actorData) {
    // handle direct active effects - which only come from statuses
    const actorActiveEffects = actorData.getEmbeddedCollection("ActiveEffect");
    for (const effect of actorActiveEffects) {
      for (const change of effect.changes) {
        if (change.key.includes("system.skills")) {
          const skillName = change.key.split('.')[2].capitalize();
          const skillMod = change.key.split('.')[3];
          const modType = ModifierHelpers.getModTypeByModPath(change.key);
          if (!Object.keys(actorData.system.skills[skillName]).includes(`${skillMod}source`)) {
            actorData.system.skills[skillName][`${skillMod}source`] = [];
          }

          // this is an active effect modifying a skill, add the source
          if (effect.name.startsWith("purchased-")) {
            actorData.system.skills[skillName][`${skillMod}source`].push({
              modtype: modType,
              key: "purchased",
              name: "User Action",
              value: change.value,
              type: "XP Purchase",
            });
          } else {
            actorData.system.skills[skillName][`${skillMod}source`].push({
              modtype: modType,
              key: "purchased",
              name: "Status Effect",
              value: change.value,
              type: effect.name,
            });
          }
        }
      }
    }

    // handle indirect active effects - which come from items
    for (const item of actorData.items) {
      const itemActiveEffects = item.getEmbeddedCollection("ActiveEffect");
      for (const effect of itemActiveEffects) {
        if (!effect.disabled) {
          for (const change of effect.changes) {
            if (change.key.includes("system.skills")) {
              // system.skills.Astrogation.value
              const skillName = change.key.split('.')[2].capitalize();
              const skillMod = change.key.split('.')[3];
              const modType = ModifierHelpers.getModTypeByModPath(change.key);
              if (Object.keys(actorData.system.skills).includes(skillName)) {
                if (!Object.keys(actorData.system.skills[skillName]).includes(`${skillMod}source`)) {
                  actorData.system.skills[skillName][`${skillMod}source`] = [];
                }

                // this is an active effect modifying a skill, add the source
                actorData.system.skills[skillName][`${skillMod}source`].push({
                  modtype: modType,
                  key: "purchased",
                  name: effect.parent.type,
                  value: change.value,
                  type: effect.parent.name,
                });
              }
            }
          }
        }
      }
    }
  }

  _calculateDerivedValues(actorData) {
    const data = actorData.system;
    const items = actorData.items;
    var encum = 0;

    // Loop through all items
    items.forEach(function(item) {
      try {
        // Calculate encumbrance, only if encumbrance value exists
        if (item.system?.encumbrance?.adjusted !== undefined || item.system?.encumbrance?.value !== undefined) {
          if (item.type === "armour" && item?.system?.equippable?.equipped) {
            const equippedEncumbrance = +item.system.encumbrance.adjusted - 3;
            encum += equippedEncumbrance > 0 ? equippedEncumbrance : 0;
          } else if (item.type === "armour" || item.type === "weapon" || item.type === "shipweapon") {
            let count = 0;
            if (item.system?.quantity?.value) {
              count = item.system.quantity.value;
            }
            encum += ((item.system?.encumbrance?.adjusted !== undefined) ? item.system?.encumbrance?.adjusted : item.system?.encumbrance?.value) * count;
          } else {
            let count = 0;
            if (item.system?.quantity?.value) {
              count = item.system.quantity.value;
            }
            encum += item.system?.encumbrance?.value * count;
          }
        }
      } catch (err) {
        CONFIG.logger.error(`Error calculating derived Encumbrance`, err);
      }
    });

    // Set Encumbrance value on character.
    data.stats.encumbrance.value = encum;
  }

  /**
   * Capitalize string
   * @param  {String} s   String value to capitalize
   */
  _capitalize(s) {
    if (typeof s !== "string") return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // group talents
  _sortTalents(a, b) {
    /*
        Active (Out)
        Active (Maneuver)
        Active (Incidental)
        Active
        Passive
    */
    if (a.activation.includes("Active") && a.activation.includes("Out")) {
      return -1;
    } else if (b.activation.includes("Active") && b.activation.includes("Out")) {
      return 1;
    }
    if (a.activation.includes("Active") && a.activation.includes("Maneuver")) {
      return -1;
    } else if (b.activation.includes("Active") && b.activation.includes("Maneuver")) {
      return 1;
    }
    if (a.activation.includes("Active") && a.activation.includes("Incidental")) {
      return -1;
    } else if (b.activation.includes("Active") && b.activation.includes("Incidental")) {
      return 1;
    }
    if (a.activation.includes("Active") && a.activation.includes("Incidental")) {
      return -1;
    } else if (b.activation.includes("Active") && b.activation.includes("Incidental")) {
      return 1;
    }
    if (a.activation.includes("Active")) {
      return -1;
    } else if (b.activation.includes("Active")) {
      return 1;
    }
    if (a.activation.includes("Passive")) {
      return -1;
    } else if (b.activation.includes("Passive")) {
      return 1;
    }
  }

  /** @override **/
  /*
    This function is identical to the overridden function except that it does not enforce a maximum value for the update
  */
  async modifyTokenAttribute(attribute, value, isDelta, isBar) {
    const attr = foundry.utils.getProperty(this.system, attribute);
    const current = isBar ? attr.value : attr;
    const update = isDelta ? current + value : value;
    if ( update === current ) return this;

    // Determine the updates to make to the actor data
    let updates;
    if (isBar && attribute === "stats.wounds") {
      updates = {[`system.${attribute}.value`]: Math.max(update, 0)};
    } else if (isBar) {
      updates = {[`system.${attribute}.value`]: Math.clamp(update, 0, attr.max)};
    } else {
      updates = {[`system.${attribute}`]: update};
    }

    // Allow a hook to override these changes
    const allowed = Hooks.call("modifyTokenAttribute", {attribute, value, isDelta, isBar}, updates);
    return allowed !== false ? this.update(updates) : this;
  }

  /** @override **/
  applyActiveEffects() {
    // collect force pool modifications since it appears the stat value is without AEs active
    let maxForceRating = parseInt(this.system?.stats?.forcePool?.max);
    for (const effect of this.allApplicableEffects()) {
      for (const change of effect.changes) {
        if (change.key === "system.stats.forcePool.max") {
          maxForceRating += parseInt(change.value);
        }
      }
    }
    // apply the resulting value (minus any committed dice)
    for (const effect of this.allApplicableEffects()) {
      for (const change of effect.changes) {
        if (change.key.includes("system.skills") && change.key.includes(".force")) {
          change.value = Math.max(maxForceRating - parseInt(this.system?.stats?.forcePool?.value), 0);
        }
      }
    }
    return super.applyActiveEffects();
  }
}
