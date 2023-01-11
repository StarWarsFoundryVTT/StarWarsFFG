import PopoutEditor from "../popout-editor.js";
import ModifierHelpers from "../helpers/modifiers.js";

/**
 * Extend the base Actor entity.
 * @extends {Actor}
 */
export class ActorFFG extends Actor {
  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareDerivedData() {
    CONFIG.logger.debug(`Preparing Actor Data ${this.type}`);
    const actor = this;
    const data = actor.system;
    const flags = actor.flags;

    // Make separate methods for each Actor type (character, minion, etc.) to keep
    // things organized.

    // if the actor has skills, add custom skills
    if (data.skills) {
      let skills = JSON.parse(JSON.stringify(CONFIG.FFG.skills));

      data.skills = mergeObject(skills, data.skills);

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
    this._prepareSharedData.bind(this);
    this._prepareSharedData(actor);
    if (actor.type === "minion") this._prepareMinionData(actor);
    if (actor.type === "character") this._prepareCharacterData(actor);
  }

  _prepareSharedData(actorData) {
    const data = actorData.system;
    //data.biography = PopoutEditor.replaceRollTags(data.biography, actorData);
    data.biography = PopoutEditor.renderDiceImages(data.biography, actorData);

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

    if (actorData.type === "minion" || actorData.type === "character") {
      this._applyModifiers.bind(this);
      this._applyModifiers(actorData);
      if (game.settings.get("starwarsffg", "enableSoakCalc")) {
        this._calculateDerivedValues(actorData);
      }
    } else if (actorData.type === "vehicle") {
      this._applyVehicleModifiers(actorData);
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
    data.quantity.value = Math.min(data.quantity.max, data.quantity.max - Math.floor((data.stats.wounds.value - 1) / data.unit_wounds.value));

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
        skill.rank = data.attributes[key].value;
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
    data.talentList = globalTalentList;
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
        source: [{ type: "talent", typeLabel: "SWFFG.Talent", name: element.name, id: element.id }],
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
        globalTalentList[index].source.push({ type: "talent", typeLabel: "SWFFG.Talent", name: element.name, id: element.id });
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
      data.talentList = globalTalentList.slice().sort(this._sortTalents);
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
      data.obligation.value = obligation;
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

  /**
   * Prepares the modifier data in the attributes object
   *
   * @param  {object} actorData
   * @param  {object} properties
   * @param  {string} name
   * @param  {string} modifierType
   */
  _setModifiers(actorData, properties, name, modifierType) {
    const data = actorData.system;
    const attributes = Object.keys(data.attributes)
      .filter((key) =>
        Object.keys(properties)
          .map((item) => {
            if (properties[item]?.value) {
              return properties[item].value.toLowerCase();
            } else {
              return item.toLowerCase();
            }
          })
          .includes(key.toLowerCase())
      )
      .map((key) => Object.assign(data.attributes[key], { key }));

    actorData.modifiers[name] = Object.keys(properties).map((k) => {
      let key;
      if (name === "skills") {
        key = k;
      } else {
        key = properties[k].value;
      }

      let attr = attributes.find((item) => item.key === key);

      if (!attr) {
        let value = 0;

        if (key === "Defence-Melee") {
          value = data.stats.defence.melee;
        } else if (key === "Defence-Ranged") {
          value = data.stats.defence.ranged;
        } else if (name === "skills") {
          value = data[name][k].rank;
        } else if (key === "Shields") {
          value = [data[name][k].fore, data[name][k].port, data[name][k].starboard, data[name][k].aft];
        } else if (key === "Soak") {
          try {
            if ((typeof actorData.flags?.starwarsffg?.config?.enableAutoSoakCalculation === undefined && game.settings.get("starwarsffg", "enableSoakCalc")) || actorData.flags?.starwarsffg?.config?.enableAutoSoakCalculation) {
              value = 0;
            }
          } catch (err) {
            // swallow this exception as it only occurs during initialization of system.
          }
        } else {
          if (data[name][k]?.max && name !== "characteristics") {
            value = data[name][k].max;
          } else {
            value = data[name][k].value;
          }
        }

        // the expected attrbute for the characteristic doesn't exist, this is an older or new character, we need to migrate the current value to an attribute
        data.attributes[`${key}`] = {
          modtype: modifierType,
          mod: key,
          value,
        };
        attr = {
          key: `${key}`,
          value,
        };
      } else {
        data.attributes[`${key}`].modtype = modifierType;
        data.attributes[`${key}`].mod = key;

        if (key === "Shields" && !Array.isArray(attr.value)) {
          data.attributes[`${key}`].value = [attr.value, attr.value, attr.value, attr.value];
        } else {
          data.attributes[`${key}`].value = attr.value;
        }
      }

      let outValue = 0;
      if (attr?.value) {
        if (Array.isArray(attr.value)) {
          outValue = attr.value;
        } else {
          outValue = parseInt(attr.value, 10);
        }
      }

      return {
        key,
        value: outValue,
        modtype: modifierType,
        mod: key,
      };
    });
  }

  /**
   * Applies the modifers from all attributes on all associated items for an actor
   *
   * @param  {object} actorData
   */
  _applyModifiers(actorData) {
    const data = actorData.system;
    const isPC = this.hasPlayerOwner;
    if (!actorData.modifiers) {
      actorData.modifiers = {};
    }
    const items = actorData.items;

    this._setModifiers.bind(this);

    /* Characteristics */
    this._setModifiers(actorData, CONFIG.FFG.characteristics, "characteristics", "Characteristic");
    Object.keys(CONFIG.FFG.characteristics).forEach((key) => {
      let total = 0;
      total += data.attributes[key].value;
      total += ModifierHelpers.getCalculatedValueFromItems(items, key, "Characteristic");
      data.characteristics[key].value = total > 7 ? 7 : total;
    });

    /* Stats */
    this._setModifiers(actorData, CONFIG.FFG.character_stats, "stats", "Stat");
    Object.keys(CONFIG.FFG.character_stats).forEach((k) => {
      const key = CONFIG.FFG.character_stats[k].value;

      let total = 0;

      if (key === "Soak") {
        total = data.characteristics.Brawn.value;
      }
      if (key === "Wounds") {
        if (data.attributes.Wounds.value === 0) {
          const speciesBrawn = ModifierHelpers.getBaseValue(items, "Brawn", "Characteristic");
          total = data.attributes.Brawn.value + speciesBrawn;
        }
      }
      if (key === "Strain") {
        if (data.attributes.Strain.value === 0) {
          const speciesWillpower = ModifierHelpers.getBaseValue(items, "Willpower", "Characteristic");
          total = data.attributes.Willpower.value + speciesWillpower;
        }
      }
      if (key === "Encumbrance") {
        total = 5 + data.characteristics.Brawn.value;
      }

      total += data.attributes[key].value;
      total += ModifierHelpers.getCalculatedValueFromItems(items, key, "Stat");

      if (key === "Soak") {
        data.stats[k].value = total;
      } else if (key === "Defence-Melee") {
        data.stats.defence.melee = total;
      } else if (key === "Defence-Ranged") {
        data.stats.defence.ranged = total;
      } else {
        data.stats[k].max = total;
      }
    });

    /* Skill Rank */
    this._setModifiers(actorData, data.skills, "skills", "Skill Rank");
    Object.keys(data.skills).forEach((key) => {
      let total = 0;
      total += data.attributes[key].value;

      const skillValues = ModifierHelpers.getCalculatedValueFromItems(items, key, "Skill Rank", true);
      total += skillValues.total;
      skillValues.sources.push({ modtype: "purchased", key: "purchased", name: "purchased", value: data.attributes[key].value });

      /* Career Skills */
      if (!data.skills[key].careerskill) {
        const careerSkillValues = ModifierHelpers.getCalculatedValueFromItems(items, key, "Career Skill", true);
        data.skills[key].careerskill = careerSkillValues.checked;
        data.skills[key].careerskillsource = careerSkillValues.sources;
      }

      const boostValues = ModifierHelpers.getCalculatedValueFromItems(items, key, "Skill Boost", true);
      data.skills[key].boost = boostValues.total;
      data.skills[key].boostsource = boostValues.sources;

      const setback = ModifierHelpers.getCalculatedValueFromItems(items, key, "Skill Setback", true);
      const remsetback = ModifierHelpers.getCalculatedValueFromItems(items, key, "Skill Remove Setback", true);

      const upgradesValues = ModifierHelpers.getCalculatedValueFromItems(items, key, "Skill Add Upgrade", true);
      data.skills[key].upgrades = upgradesValues.total;
      data.skills[key].upgradessource = upgradesValues.sources;

      const setValueAndSources = (modifiername, propertyname) => {
        const obj = ModifierHelpers.getCalculatedValueFromItems(items, key, modifiername, true);
        if (obj.total > 0) {
          data.skills[key][propertyname] = obj.total;
          data.skills[key][`${propertyname}source`] = obj.sources;
        }
      };

      setValueAndSources("Skill Add Advantage", "advantage");
      setValueAndSources("Skill Add Dark", "dark");
      setValueAndSources("Skill Add Failure", "failure");
      setValueAndSources("Skill Add Light", "light");
      setValueAndSources("Skill Add Success", "success");
      setValueAndSources("Skill Add Threat", "threat");
      setValueAndSources("Skill Add Triumph", "triumph");
      setValueAndSources("Skill Add Despair", "despair");
      setValueAndSources("Skill Add Upgrade", "upgrades");

      const forceboost = ModifierHelpers.getCalculatedValueFromItems(items, key, "Force Boost", true);
      data.skills[key].force = 0;
      if (forceboost.checked) {
        const forcedice = data.stats.forcePool.max - data.stats.forcePool.value;
        if (forcedice > 0) {
          data.skills[key].force = forcedice;
          data.skills[key].forcesource = forceboost.sources;
        }
      }

      if (remsetback.total >= setback.total) {
        data.skills[key].setback = 0;
        data.skills[key].remsetback = remsetback.total - setback.total;
      } else {
        data.skills[key].setback = setback.total - remsetback.total;
        data.skills[key].remsetback = 0;
      }
      data.skills[key].setbacksource = setback.sources;
      data.skills[key].remsetbacksource = remsetback.sources;

      if (isPC) {
        data.skills[key].rank = total > 6 ? 6 : total;
      } else {
        data.skills[key].rank = total;
      }
      data.skills[key].ranksource = skillValues.sources;
    });
  }

  _applyVehicleModifiers(actorData) {
    const data = actorData.system;
    const isPC = this.hasPlayerOwner;
    if (!actorData.modifiers) {
      actorData.modifiers = {};
    }

    const items = actorData.items;

    this._setModifiers(actorData, CONFIG.FFG.vehicle_stats, "stats", "Stat");
    Object.keys(CONFIG.FFG.vehicle_stats).forEach((k) => {
      const key = CONFIG.FFG.vehicle_stats[k].value;

      let total = 0;
      if (k === "shields") {
      } else {
        total += data.attributes[key].value;
      }
      total += ModifierHelpers.getCalculatedValueFromItems(items, key, "Stat");

      if (k === "shields") {
        data.stats[k].fore = data.attributes[key].value[0] + total > 0 ? data.attributes[key].value[0] + total : 0;
        data.stats[k].port = data.attributes[key].value[1] + total > 0 ? data.attributes[key].value[1] + total : 0;
        data.stats[k].starboard = data.attributes[key].value[2] + total > 0 ? data.attributes[key].value[2] + total : 0;
        data.stats[k].aft = data.attributes[key].value[3] + total > 0 ? data.attributes[key].value[3] + total : 0;
      } else {
        if (data.stats?.[k].max) {
          data.stats[k].max = total;
        } else {
          data.stats[k].value = total;
        }
      }
    });
  }
}
