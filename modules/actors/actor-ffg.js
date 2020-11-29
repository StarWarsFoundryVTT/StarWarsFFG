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
    CONFIG.logger.debug(`Preparing Actor Data ${this.data.type}`);
    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags;

    // Make separate methods for each Actor type (character, minion, etc.) to keep
    // things organized.

    // if the actor has skills, add custom skills and sort by abbreviation
    if (data.skills) {
      const actorSkills = {};
      Object.keys(data.skills)
        .filter((skill) => {
          return data.skills[skill].custom;
        })
        .forEach((skill) => {
          actorSkills[skill] = {
            value: skill,
            abrev: data.skills[skill].label,
            label: data.skills[skill].label,
            custom: data.skills[skill].custom,
          };
        });

      const skills = JSON.parse(JSON.stringify(CONFIG.FFG.skills));
      mergeObject(skills, actorSkills);

      const sorted = Object.keys(skills).sort(function (a, b) {
        const x = game.i18n.localize(skills[a].abrev);
        const y = game.i18n.localize(skills[b].abrev);

        return x < y ? -1 : x > y ? 1 : 0;
      });

      let ordered = {};
      sorted.forEach((skill) => {
        ordered[skill] = skills[skill];
      });

      CONFIG.FFG.skills = ordered;

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
    this._prepareSharedData(actorData);
    if (actorData.type === "minion") this._prepareMinionData(actorData);
    if (actorData.type === "character") this._prepareCharacterData(actorData);
  }

  _prepareSharedData(actorData) {
    const data = actorData.data;
    //data.biography = PopoutEditor.replaceRollTags(data.biography, actorData);
    data.biography = PopoutEditor.renderDiceImages(data.biography, actorData);

    // localize characteristic names
    if (actorData.type !== "vehicle") {
      for (let characteristic of Object.keys(data.characteristics)) {
        const strId = `SWFFG.Characteristic${this._capitalize(characteristic)}`;
        const localizedField = game.i18n.localize(strId);

        data.characteristics[characteristic].label = localizedField;
      }

      //localize skill names
      for (let skill of Object.keys(data.skills)) {
        const cleanedSkillName = skill.replace(/[\W_]+/g, "");

        const strId = `SWFFG.SkillsName${cleanedSkillName}`;
        const localizedField = game.i18n.localize(strId);

        if (!data.skills[skill].custom) {
          data.skills[skill].label = localizedField;
        }
        data.skills = this._sortSkills(data.skills);
      }
    }

    if (actorData.type === "minion" || actorData.type === "character") {
      this._applyModifiers.bind(this);
      this._applyModifiers(actorData);
      if (game.settings.get("starwarsffg", "enableSoakCalc")) {
        this._calculateDerivedValues(actorData);
      }
    } else if (actorData.type === "vehicle") {
      this._applyVehicelModifiers(actorData);
    }
  }

  /**
   * Prepare Minion type specific data
   */
  _prepareMinionData(actorData) {
    const data = actorData.data;

    // Set Wounds threshold to unit_wounds * quantity to account for minion group health.
    data.stats.wounds.max = Math.floor(data.unit_wounds.value * data.quantity.max);
    // Check we don't go below 0.
    if (data.stats.wounds.max < 0) {
      data.stats.wounds.max = 0;
    }

    //Calculate the number of alive minions
    data.quantity.value = Math.min(data.quantity.max, data.quantity.max - Math.floor(data.stats.wounds.value / data.unit_wounds.value));

    // Loop through Skills, and where groupskill = true, set the rank to 1*(quantity-1).
    for (let [key, skill] of Object.entries(data.skills)) {
      // Check to see if this is a group skill, otherwise do nothing.
      if (skill.groupskill) {
        skill.rank = Math.floor(1 * (data.quantity.value - 1));
        // Check we don't go below 0.
        if (skill.rank < 0) {
          skill.rank = 0;
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
        itemId: element._id,
        description: element.data.description,
        activation: element.data.activation.value,
        activationLabel: element.data.activation.label,
        isRanked: element.data.ranks.ranked,
        source: [{ type: "talent", typeLabel: "SWFFG.Talent", name: element.name, id: element._id }],
      };
      if (item.isRanked) {
        item.rank = element.data.ranks.current;
      } else {
        item.rank = "N/A";
      }

      if (CONFIG.FFG.theme !== "starwars") {
        item.tier = element.data.tier;
      }

      let index = globalTalentList.findIndex((obj) => {
        return obj.name === item.name;
      });

      if (index < 0 || !item.isRanked) {
        globalTalentList.push(item);
      } else {
        globalTalentList[index].source.push({ type: "talent", typeLabel: "SWFFG.Talent", name: element.name, id: element._id });
        globalTalentList[index].rank += element.data.ranks.current;
        if (CONFIG.FFG.theme !== "starwars") {
          globalTalentList[index].tier = Math.abs(globalTalentList[index].rank + (parseInt(element.data.tier, 10) - 1));
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
    const data = actorData.data;

    // Build complete talent list.

    const specializations = actorData.items.filter((item) => {
      return item.type === "specialization";
    });

    const globalTalentList = [];
    specializations.forEach((element) => {
      //go throut each list of talent where learned = true

      const learnedTalents = Object.keys(element.data.talents).filter((key) => element.data.talents[key].islearned === true);

      learnedTalents.forEach((talent) => {
        const item = JSON.parse(JSON.stringify(element.data.talents[talent]));
        item.firstSpecialization = element._id;
        item.source = [{ type: "specialization", typeLabel: "SWFFG.Specialization", name: element.name, id: element._id }];
        if (item.isRanked) {
          item.rank = element.data.talents[talent]?.rank ? element.data.talents[talent].rank : 1;
        } else {
          item.rank = "N/A";
        }
        let index = globalTalentList.findIndex((obj) => {
          return obj.name === item.name;
        });

        if (index < 0 || !item.isRanked) {
          globalTalentList.push(item);
        } else {
          globalTalentList[index].source.push({ type: "specialization", typeLabel: "SWFFG.Specialization", name: element.name, id: element._id });
          globalTalentList[index].rank += element.data.talents[talent]?.rank ? element.data.talents[talent].rank : 1;
        }
      });
    });

    const talents = actorData.items.filter((item) => {
      return item.type === "talent";
    });

    talents.forEach((element) => {
      const item = {
        name: element.name,
        itemId: element._id,
        description: element.data.description,
        activation: element.data.activation.value,
        activationLabel: element.data.activation.label,
        isRanked: element.data.ranks.ranked,
        source: [{ type: "talent", typeLabel: "SWFFG.Talent", name: element.name, id: element._id }],
      };

      if (item.isRanked) {
        item.rank = element.data.ranks.current;
      } else {
        item.rank = "N/A";
      }

      if (CONFIG.FFG.theme !== "starwars") {
        item.tier = element.data.tier;
      }

      let index = globalTalentList.findIndex((obj) => {
        return obj.name === item.name;
      });

      if (index < 0 || !item.isRanked) {
        globalTalentList.push(item);
      } else {
        globalTalentList[index].source.push({ type: "talent", typeLabel: "SWFFG.Talent", name: element.name, id: element._id });
        globalTalentList[index].rank += element.data.ranks.current;
        if (CONFIG.FFG.theme !== "starwars") {
          globalTalentList[index].tier = Math.abs(globalTalentList[index].rank + (parseInt(element.data.tier, 10) - 1));
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

  _calculateDerivedValues(actorData) {
    const data = actorData.data;
    const items = actorData.items;
    var encum = 0;

    // Loop through all items
    for (let [key, item] of Object.entries(items)) {
      try {
        // Calculate encumbrance, only if encumbrance value exists
        if (item.data?.encumbrance?.value) {
          if (item.type === "armour" && item?.data?.equippable?.equipped) {
            const equippedEncumbrance = +item.data.encumbrance.value - 3;
            encum += equippedEncumbrance > 0 ? equippedEncumbrance : 0;
          } else {
            let count = 1;
            if (item.data?.quantity?.value) {
              count = item.data.quantity.value;
            }
            encum += +item.data.encumbrance.value * count;
          }
        }
      } catch (err) {
        CONFIG.logger.error(`Error calculating derived Encumbrance`, err);
      }
    }

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

  // Sort skills by label
  _sortSkills(skills) {
    // Break down skills object into an array for sorting (I hate Javascript)
    let skillarray = Object.entries(skills).filter((skill) => {
      return skill[1]["type"] != "Knowledge";
    });
    let knowledgearray = Object.entries(skills).filter((skill) => {
      return skill[1]["type"] === "Knowledge";
    });
    if (game.settings.get("starwarsffg", "skillSorting")) {
      skillarray.sort(function (a, b) {
        // a should come before b in the sorted order
        if (a[1]["label"] < b[1]["label"]) {
          return -1 * 1;
          // a should come after b in the sorted order
        } else if (a[1]["label"] > b[1]["label"]) {
          return 1 * 1;
          // a and b are the same
        } else {
          return 0 * 1;
        }
      });
      knowledgearray.sort(function (a, b) {
        // a should come before b in the sorted order
        if (game.i18n.localize(CONFIG.FFG.skills_knowledgestripped[a[0]]) < game.i18n.localize(CONFIG.FFG.skills_knowledgestripped[b[0]])) {
          return -1 * 1;
          // a should come after b in the sorted order
        } else if (game.i18n.localize(CONFIG.FFG.skills_knowledgestripped[a[0]]) > game.i18n.localize(CONFIG.FFG.skills_knowledgestripped[b[0]])) {
          return 1 * 1;
          // a and b are the same
        } else {
          return 0 * 1;
        }
      });
    } else {
      skillarray.sort(function (a, b) {
        // a should come before b in the sorted order
        if (a[0] < b[0]) {
          return -1 * 1;
          // a should come after b in the sorted order
        } else if (a[0] > b[0]) {
          return 1 * 1;
          // a and b are the same
        } else {
          return 0 * 1;
        }
      });
      knowledgearray.sort(function (a, b) {
        // a should come before b in the sorted order
        if (a[0] < b[0]) {
          return -1 * 1;
          // a should come after b in the sorted order
        } else if (a[0] > b[0]) {
          return 1 * 1;
          // a and b are the same
        } else {
          return 0 * 1;
        }
      });
    }
    let skillobject = {};
    // Reconstruct skills object from sorted array.
    skillarray.forEach((skill) => {
      const skillname = skill[0];
      const value = skill[1];
      skillobject[skillname] = value;
    });
    knowledgearray.forEach((skill) => {
      const skillname = skill[0];
      const value = skill[1];
      skillobject[skillname] = value;
    });
    skills = skillobject;
    return skills;
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
    const actor = this;
    const data = actorData.data;
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
            if ((actor?._sheetClass?.name === "AdversarySheetFFG" && actorData.data.flags?.config?.enableAutoSoakCalculation) || game.settings.get("starwarsffg", "enableSoakCalc")) {
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
    const data = actorData.data;
    const isPC = this.hasPlayerOwner;
    if (!actorData.modifiers) {
      actorData.modifiers = {};
    }

    this._setModifiers.bind(this);

    /* Characteristics */
    this._setModifiers(actorData, CONFIG.FFG.characteristics, "characteristics", "Characteristic");
    Object.keys(CONFIG.FFG.characteristics).forEach((key) => {
      let total = 0;
      total += data.attributes[key].value;
      total += ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Characteristic");
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
          const speciesBrawn = ModifierHelpers.getBaseValue(actorData.items, "Brawn", "Characteristic");
          total = data.attributes.Brawn.value + speciesBrawn;
        }
      }
      if (key === "Strain") {
        if (data.attributes.Strain.value === 0) {
          const speciesWillpower = ModifierHelpers.getBaseValue(actorData.items, "Willpower", "Characteristic");
          total = data.attributes.Willpower.value + speciesWillpower;
        }
      }
      if (key === "Encumbrance") {
        total = 5 + data.characteristics.Brawn.value;
      }

      total += data.attributes[key].value;
      total += ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Stat");

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

      const skillValues = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Skill Rank", true);
      total += skillValues.total;
      skillValues.sources.push({ modtype: "purchased", key: "purchased", name: "purchased", value: data.attributes[key].value });

      /* Career Skills */
      if (!data.skills[key].careerskill) {
        const careerSkillValues = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Career Skill", true);
        data.skills[key].careerskill = careerSkillValues.checked;
        data.skills[key].careerskillsource = careerSkillValues.sources;
      }

      const boostValues = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Skill Boost", true);
      data.skills[key].boost = boostValues.total;
      data.skills[key].boostsource = boostValues.sources;

      const setback = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Skill Setback", true);
      const remsetback = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Skill Remove Setback", true);

      // const advantages = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Skill Add Advantage", true);
      // const dark = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Skill Add Dark", true);
      // const failures = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Skill Add Failure", true);
      // const light = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Skill Add Light", true);
      // const successes = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Skill Add Success", true);
      // const threats = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Skill Add Threat" true);

      const setValueAndSources = (modifiername, propertyname) => {
        const obj = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, modifiername, true);
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

      const forceboost = ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Force Boost", true);
      data.skills[key].force = 0;
      if (forceboost.total > 0) {
        const forcedice = data.stats.forcePool.max - data.stats.forcePool.value;
        if (forcedice > 0) {
          data.skills[key].force = forcedice.total;
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

  _applyVehicelModifiers(actorData) {
    const data = actorData.data;
    const isPC = this.hasPlayerOwner;
    if (!actorData.modifiers) {
      actorData.modifiers = {};
    }

    this._setModifiers(actorData, CONFIG.FFG.vehicle_stats, "stats", "Stat");
    Object.keys(CONFIG.FFG.vehicle_stats).forEach((k) => {
      const key = CONFIG.FFG.vehicle_stats[k].value;

      let total = 0;
      if (k === "shields") {
      } else {
        total += data.attributes[key].value;
      }
      total += ModifierHelpers.getCalculatedValueFromItems(actorData.items, key, "Stat");

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
