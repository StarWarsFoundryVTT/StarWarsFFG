import PopoutEditor from "../popout-editor.js";

/**
 * Extend the base Actor entity.
 * @extends {Actor}
 */
export class ActorFFG extends Actor {
  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();
    CONFIG.logger.debug(`Preparing Actor Data ${this.data.type}`);
    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags;

    // Make separate methods for each Actor type (character, minion, etc.) to keep
    // things organized.

    this._prepareSharedData(actorData);
    if (actorData.type === "minion") this._prepareMinionData(actorData);
    if (actorData.type === "character") this._prepareCharacterData(actorData);
  }

  _prepareSharedData(actorData) {
    const data = actorData.data;

    // localize characteristic names
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

      if(!data.skills[skill].custom) { 
        data.skills[skill].label = localizedField;
      }
      data.skills = this._sortSkills(data.skills);
    }

    this._applyModifiers(actorData);
    if (game.settings.get("starwarsffg", "enableSoakCalc")) {
      this._calculateDerivedValues(actorData);
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
    data.quantity.value = Math.min(data.quantity.max, data.quantity.max - Math.floor((data.stats.wounds.value - 1) / data.unit_wounds.value));

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
        skill.rank = 0;
      }
    }
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

      const learnedTalents = Object.keys(element.data.talents).filter(key => element.data.talents[key].islearned === true);

      learnedTalents.forEach(talent => {
        const item = JSON.parse(JSON.stringify(element.data.talents[talent]));
        item.firstSpecialization = element._id;
        item.source = [{ type : "specialization", typeLabel: "SWFFG.Specialization", name: element.name, id: element._id }];
        item.safe_desc = PopoutEditor.renderDiceImages(item.description.replace(/(<([^>]+)>)/gi, ""));
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
          globalTalentList[index].source.push({ type : "specialization", typeLabel: "SWFFG.Specialization", name: element.name, id: element._id })
          globalTalentList[index].rank += element.data.talents[talent]?.rank ? element.data.talents[talent].rank : 1;
        }
      });
    });

    const talents = actorData.items.filter((item) => {
      return item.type === "talent";
    });

    talents.forEach((element) => {
      const item = {
        name : element.name,
        itemId : element._id,
        description : element.data.description,
        activation: element.data.activation.value,
        activationLabel: element.data.activation.label,
        isRanked: element.data.ranks.ranked,
        safe_desc: PopoutEditor.renderDiceImages(element.data.description.replace(/(<([^>]+)>)/gi, "")),
        source : [{ type : "talent", typeLabel: "SWFFG.Talent", name: element.name, id: element._id }]
      }

      if(item.isRanked) {
        item.rank = element.data.ranks.current;
      } else {
        item.rank = "N/A";
      }

      let index = globalTalentList.findIndex((obj) => {
        return obj.name === item.name;
      });

      if (index < 0 || !item.isRanked) {
        globalTalentList.push(item);
      } else {
        globalTalentList[index].source.push({ type : "talent", typeLabel: "SWFFG.Talent", name: element.name, id: element._id })
        globalTalentList[index].rank += element.data.ranks.current;
      }

    });

    globalTalentList.sort((a, b) => {
      let comparison = 0;
      if (a.name > b.name) {
        comparison = 1;
      } else if (a.name < b.name) {
        comparison = -1;
      }
      return comparison;
    });


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
          if (item.type === "armour" && !item?.data?.equippable?.equipped) {
            encum += +item.data.encumbrance.value;
          } else if (item.type !== "armour") {
            encum += +item.data.encumbrance.value;
          }
        }
      } catch (err) {
        CONFIG.logger.error(`Error calculating derived Soak`, err);
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


  _applyModifiers(actorData) {
    const data = actorData.data;
    /* Characteristics */
    // first get the attributes associated with the characteristics
    const attributesForCharacteristics = Object.keys(data.attributes).filter(key => {
      return Object.keys(CONFIG.FFG.characteristics).includes(key);
    });
    const characteristics = attributesForCharacteristics.map(key => Object.assign(data.attributes[key], { key }) );

    // loop through all characteristics and prepopulate any attributes not created yet.
    actorData.characteristics = Object.keys(CONFIG.FFG.characteristics).map(key => {
      let attr = (characteristics.find(item => item.mod === key));

      if(!attr) {
        // the expected attrbute for the characteristic doesn't exist, this is an older or new character, we need to migrate the current value to an attribute
        data.attributes[`${key}`] = {
          modtype : "Characteristic",
          mod : key,
          value : data.characteristics[key].value
        }
        attr = {
          key: `${key}`,
          value: data.characteristics[key].value
        }
      }

      return {
        id: attr.key,
        key,
        value: attr?.value ? parseInt(attr.value, 10) : 0,
        modtype : "Characteristic",
        mod : key,
        label : game.i18n.localize(CONFIG.FFG.characteristics[key].label)
      }
    })

    Object.keys(CONFIG.FFG.characteristics).forEach(key => {
      let total = 0;

      total += data.attributes[key].value;

      actorData.items.forEach(item => {
        const attrsToApply = Object.keys(item.data.attributes).filter(id => item.data.attributes[id].mod === key).map(i => item.data.attributes[i]);

        if(attrsToApply.length > 0) {
          attrsToApply.forEach(attr => {
            total += parseInt(attr.value, 10);
          })
          
        }
      });

      data.characteristics[key].value = total > 7 ? 7 : total;
    })

    /* Stats */

    const attributesForStats = Object.keys(data.attributes).filter(key => Object.keys(CONFIG.FFG.character_stats).includes(key)).map(key => Object.assign(data.attributes[key], { key }));

    const credits = data.stats.credits;
    actorData.stats = Object.keys(CONFIG.FFG.character_stats).map(k => {
      const key = CONFIG.FFG.character_stats[k].value;

      let attr = (attributesForStats.find(item => item.mod.toLowerCase() === key.toLowerCase()));

      if(!attr) {
        // the expected attrbute for the stat doesn't exist, this is an older or new character, we need to migrate the current value to an attribute
        let value = 0;

        if(key === "Soak") {
          value = data.stats[k].value;
        } else if (key === "Defence-Melee") {
          value = data.stats.defence.melee;
        } else if (key === "Defence-Ranged"){
          value = data.stats.defence.ranged;
        } else {
          value = data.stats[k].max;  
        }

        data.attributes[`${key}`] = {
          modtype : "Stat",
          mod : key,
          valuevalue
        }
        attr = {
          key: `${key}`,
          value
        }
      }

      return {
        id: attr.key,
        key,
        value: attr?.value ? parseInt(attr.value, 10) : 0,
        modtype : "Stat",
        mod : key,
        label : game.i18n.localize(CONFIG.FFG.character_stats[k].label)
      }
    });

    Object.keys(CONFIG.FFG.character_stats).forEach(k => {
      const key = CONFIG.FFG.character_stats[k].value;

      let total = 0;

      total += data.attributes[key].value;

      actorData.items.forEach(item => {
        const attrsToApply = Object.keys(item.data.attributes).filter(id => item.data.attributes[id].mod === key).map(i => item.data.attributes[i]);

        if (item.type === "armour" && item?.data?.equippable?.equipped) {
          if(key === "Soak") {
            total += parseInt(item.data.soak.value, 10);
          }
          if(key === "Defence-Melee" || key === "Defence-Ranged") {
            // get the highest defense item
            const shouldUse = actorData.items.filter(i => item.data.defence >= i.data.defence).length >= 0;
            if(shouldUse) {
              total += parseInt(item.data.defence.value, 10);
            }
          }
          
          //defence = Math.max(defence, item.data.defence.value)
        }

        if(attrsToApply.length > 0) {
          attrsToApply.forEach(attr => {
            total += parseInt(attr.value, 10);
          })
          
        }
      });

      if(key === "Soak") {
        data.stats[k].value = total;
      } else if (key === "Defence-Melee") {
        data.stats.defence.melee = total;
      } else if (key === "Defence-Ranged"){
        data.stats.defence.ranged = total;
      } else {
        data.stats[k].max = total;  
      }
     
    })

  }
}
