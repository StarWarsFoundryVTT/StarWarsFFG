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

    console.debug(`Starwars FFG - Preparing Actor Data ${this.data.type}`);

    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags;

    // Make separate methods for each Actor type (character, minion, etc.) to keep
    // things organized.
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

      data.skills[skill].label = localizedField;
      data.skills = this._sortSkills(data.skills);
    }

    // Calculate the wound/strain value based on real_value and the max.
    // This is done so that real_value tracks health/strain like FFG does and value can be used for resource bars
    data.stats.wounds.value = data.stats.wounds.max - data.stats.wounds.real_value;
    data.stats.strain.value = data.stats.strain.max - data.stats.strain.real_value;
  }

  /**
   * Prepare Minion type specific data
   */
  _prepareMinionData(actorData) {
    this._prepareSharedData(actorData);

    const data = actorData.data;

    // Set Wounds threshold to unit_wounds * quantity to account for minion group health.
    data.stats.wounds.max = Math.floor(data.unit_wounds.value * data.quantity.max);
    // Check we don't go below 0.
    if (data.stats.wounds.max < 0) {
      data.stats.wounds.max = 0;
    }

    //Calculate the number of alive minions
    data.quantity.value = Math.min(data.quantity.max, data.quantity.max - Math.floor((data.stats.wounds.real_value - 1) / data.unit_wounds.value));

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
    this._prepareSharedData(actorData);

    const data = actorData.data;
    const items = actorData.items;
    var soak = 0;
    var armoursoak = 0;
    var othersoak = 0;
    var encum = 0;

    // Calculate soak based on Brawn value, and any Soak modifiers in weapons, armour, gear and talents.
    // Start with Brawn. Also calculate total encumbrance from items.
    soak = +data.characteristics.Brawn.value;

    // Loop through all items
    for (let [key, item] of Object.entries(items)) {
      // For armour type, get all Soak values and add to armoursoak.
      if (item.type == "armour") {
        armoursoak += +item.data.soak.value;
      }
      // Loop through all item attributes and add any modifiers to our collection.
      for (let [k, mod] of Object.entries(item.data.attributes)) {
        if (mod.mod == "Soak") {
          othersoak += +mod.value;
        }
      }

      // Calculate encumbrance, only if encumbrance value exists
      if (item.data?.encumbrance?.value) {
        encum += +item.data.encumbrance.value;
      }
    }

    // Set Encumbrance value on character.
    data.stats.encumbrance.value = encum;

    // Add together all of our soak results.
    soak += +armoursoak;
    soak += +othersoak;

    // Finally set Soak value on character.
    data.stats.soak.value = soak;

    // Build complete talent list.

    const specializations = actorData.items.filter((item) => {
      return item.type === "specialization";
    });

    const globalTalentList = [];
    specializations.forEach((element) => {
      if (element?.talentList && element.talentList.length > 0) {
        element.talentList.forEach((talent) => {
          const item = talent;
          item.firstSpecialization = element._id;

          if (item.isRanked) {
            item.rank = talent.rank;
          } else {
            item.rank = "N/A";
          }

          let index = globalTalentList.findIndex((obj) => {
            return obj.name === item.name;
          });

          if (index < 0 || !item.isRanked) {
            globalTalentList.push(item);
          } else {
            globalTalentList[index].rank += talent.rank;
          }
        });
      }
    });
    data.talentList = globalTalentList;
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
}
