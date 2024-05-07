import Helpers from "../helpers/common.js";
import {migrateDataToSystem} from "../helpers/migration.js";
import {ItemFFG} from "../items/item-ffg.js";

export default class ImportHelpers {
  /**
   * Verifies server path exists, and if it doesn't creates it.
   *
   * @param  {string} startingSource - Source
   * @param  {string} path - Server path to verify
   * @returns {boolean} - true if verfied, false if unable to create/verify
   */
  static async verifyPath(startingSource, path) {
    try {
      const paths = path.split("/");
      let currentSource = paths[0];

      for (let i = 0; i < paths.length; i += 1) {
        try {
          if (currentSource !== paths[i]) {
            currentSource = `${currentSource}/${paths[i]}`;
          }
          await FilePicker.createDirectory(startingSource, `${currentSource}`, { bucket: null });
        } catch (err) {
          CONFIG.logger.debug(`Error verifying path ${startingSource}, ${path}`, err);
        }
      }
    } catch (err) {
      return false;
    }

    return true;
  }

  /**
   * Imports binary file, by extracting from zip file and uploading to path.
   *
   * @param  {string} path - Path to image within zip file
   * @param  {object} zip - Zip file
   * @param  {object} pack - Compendium Pack
   * @returns {string} - Path to file within VTT
   */
  static async importImage(path, zip, pack) {
    if (path) {
      const serverPath = `worlds/${game.world.id}/images/packs/${pack.metadata.name}`;
      const filename = path.replace(/^.*[\\\/]/, "");
      if (!CONFIG.temporary.images) {
        CONFIG.temporary.images = [];
      }
      try {
        if (!CONFIG.temporary.images.includes(`${serverPath}/${filename}`)) {
          CONFIG.temporary.images.push(`${serverPath}/${filename}`);
          await ImportHelpers.verifyPath("data", serverPath);
          const img = await zip.file(path).async("uint8array");
          var arr = img.subarray(0, 4);
          var header = "";
          for (var a = 0; a < arr.length; a++) {
            header += arr[a].toString(16);
          }
          const type = Helpers.getMimeType(header);

          const i = new File([img], filename, { type });
          await Helpers.UploadFile("data", `${serverPath}`, i, { bucket: null });
        }

        return `${serverPath}/${filename}`;
      } catch (err) {
        CONFIG.logger.error(`Error Uploading File: ${path} to ${serverPath}`);
      }
    }
  }

  /**
   * Returns the name of a file within the zip file based on a built string.
   *
   * @param  {object} zip - Zip file
   * @param  {string} type - Object Type
   * @param  {string} itemtype - Item Type
   * @param  {string} key - Item Key
   * @returns {string} - Path to file within Zip File
   */
  static async getImageFilename(zip, type, itemtype, key) {
    const imgFileName = `${type}Images/${itemtype}${key}`;

    return Object.values(zip.files).find((file) => {
      if (file.name.includes(imgFileName)) {
        return file.name;
      }
      return undefined;
    });
  }

  /**
   * Converts and object into an update object for entity update function
   * @param  {object} newItem - Object data
   * @returns {object} - Entity Update Object
   */
  static buildUpdateData = (newItem) => {
    CONFIG.logger.debug(`Starting BuildUpdateData for item - ${newItem.name}`);
    let updateData = {};
    if (newItem.img) {
      updateData.img = newItem.img;
    }

    for (let key in newItem.data) {
      const recursiveObject = (itemkey, obj) => {
        for (let objkey in obj) {
          if (typeof obj[objkey] === "object") {
            recursiveObject(`${itemkey}.${objkey}`, obj[objkey]);
          } else {
            if (typeof obj[objkey] !== undefined) {
              const datakey = `data.${itemkey}.${objkey}`;
              updateData[datakey] = obj[objkey];
            }
          }
        }
      };

      if (typeof newItem.data[key] === "object") {
        recursiveObject(key, newItem.data[key]);
      } else {
        const datakey = `data.${key}`;
        updateData[datakey] = newItem.data[key];
      }
    }
    CONFIG.logger.debug(`Completed BuildUpdateData for item - ${newItem.name}`);
    return updateData;
  };

  /**
   * Find an entity by the import key.
   * @param  {string} type - Entity type to search for
   * @param  {string} id - Entity Id
   * @returns {object} - Entity Object Data
   */
  static findEntityByImportId(type, id) {
    return game.data[type].find((item) => {
      return item.flags.starwarsffg.ffgimportid === id;
    });
  }

  /**
   * Find a compendium entity by type an id
   * @param  {string} type - Entity type to search for
   * @param  {string} id - Entity Id
   * @returns {object} - Entity Object Data
   */
  static async findCompendiumEntityById(type, id) {
    let packs = Array.from(await game.packs.keys());
    for (let i = 0; i < packs.length; i += 1) {
      let packId = packs[i];
      const pack = await game.packs.get(packId);
      if (pack.documentName === type) {
        const entity = await pack.getDocument(id);
        if (entity) {
          return entity;
        }
      }
    }
  }

  static clearCache() {
    CONFIG.temporary = {};
  }

  /**
   * Find an entity by the import key.
   * @param  {string} type - Entity type to search for
   * @param  {string} id - Entity Id
   * @returns {object} - Entity Object Data
   */
  static async findCompendiumEntityByImportId(type, id, packId, itemType, skipCache) {
    if (skipCache) {
      const pack = game.packs.get(packId);
      const contents = await pack.getDocuments();
      return contents.find((item) => {
        return item.flags.starwarsffg.ffgimportid === id;
      });
    }
    const cachePack = async (packid) => {
      if (!CONFIG.temporary[packid]) {
        const pack = await game.packs.get(packid);
        if (pack.documentName === type && !pack.locked) {
          CONFIG.logger.debug(`Caching pack content ${packid}`);
          CONFIG.temporary[packid] = {};

          const content = await pack.getDocuments();
          for (var i = 0; i < content.length; i++) {
            CONFIG.temporary[packid][content[i].flags?.starwarsffg?.ffgimportid] = foundry.utils.deepClone(content[i]);
          }
        }
      } else {
        CONFIG.logger.debug(`Using cached content for ${packid}`);
      }

      if (CONFIG.temporary?.[packid]?.[id]) {
        if (!itemType || CONFIG.temporary?.[packid]?.[id]?.type === itemType) {
          return packid;
        }
      }
      return undefined;
    };

    let packname;
    if (!packId) {
      let packs = Array.from(await game.packs.keys());

      await this.asyncForEach(packs, async (packid) => {
        const temppackname = await cachePack(packid);
        if (temppackname) {
          packname = temppackname;
        }
      });
    } else {
      packname = await cachePack(packId);
    }

    if (packname) {
      return CONFIG.temporary[packname][id];
    }

    return undefined;
  }

  static getAttributeObject(attributes) {
    const attrs = JXON.xmlToJs(attributes);

    let itemAttributes = {};
    if (attrs.SoakValue) {
      itemAttributes.Soak = { mod: "Soak", modtype: "Stat", value: attrs.SoakValue };
    }
    if (attrs.ForceRating) {
      itemAttributes.ForcePool = { mod: "ForcePool", modtype: "Stat", value: attrs.ForceRating };
    }
    if (attrs.StrainThreshold) {
      itemAttributes.Strain = { mod: "Strain", modtype: "Stat", value: attrs.StrainThreshold };
    }
    if (attrs.DefenseRanged) {
      itemAttributes["Defence-Ranged"] = { mod: "Defence-Ranged", modtype: "Stat", value: attrs.DefenseRanged };
    }
    if (attrs.DefenseMelee) {
      itemAttributes["Defence-Melee"] = { mod: "Defence-Melee", modtype: "Stat", value: attrs.DefenseMelee };
    }
    if (attrs.WoundThreshold) {
      itemAttributes.Wounds = { mod: "Wounds", modtype: "Stat", value: attrs.WoundThreshold };
    }

    return itemAttributes;
  }

  static getBaseModAttributeObject(mod) {
    let type;
    let modtype;
    let value = mod?.Count ? parseInt(mod.Count, 10) : 0;

    if (["BR", "AG", "INT", "CUN", "WIL", "PR"].includes(mod.Key)) {
      modtype = "Characteristic";
      type = ImportHelpers.convertOGCharacteristic(mod.Key);
    }

    if (Object.keys(CONFIG.temporary.skills).includes(mod.Key)) {
      if (mod.SkillIsCareer) {
        modtype = "Career Skill";
      } else if (mod.BoostCount || mod.SetbackCount || mod.AddSetbackCount || mod.ForceCount || mod.AdvantageCount || mod.ThreatCount || mod.SuccessCount || mod.FailureCount) {
        modtype = "Skill Boost";

        if (mod.AddSetbackCount) {
          modtype = "Skill Setback";
          value = parseInt(mod.AddSetbackCount, 10);
        }
        if (mod.SetbackCount) {
          modtype = "Skill Remove Setback";
          value = parseInt(mod.SetbackCount, 10);
        }
        if (mod.BoostCount) {
          value = parseInt(mod.BoostCount, 10);
        }
        if (mod.AdvantageCount) {
          modtype = "Skill Add Advantage";
          value = parseInt(mod.AdvantageCount, 10);
        }
        if (mod.ThreatCount) {
          modtype = "Skill Add Threat";
          value = parseInt(mod.ThreatCount, 10);
        }
        if (mod.SuccessCount) {
          modtype = "Skill Add Success";
          value = parseInt(mod.SuccessCount, 10);
        }
        if (mod.FailureCount) {
          modtype = "Skill Add Failure";
          value = parseInt(mod.FailureCount, 10);
        }
        if (mod.TriumphCount) {
          modtype = "Skill Add Triumph";
          value = parseInt(mod.TriumphCount, 10);
        }
        if (mod.DespairCount) {
          modtype = "Skill Add Despair";
          value = parseInt(mod.DespairCount, 10);
        }
      } else {
        modtype = "Skill Rank";
      }

      let skill = CONFIG.temporary.skills[mod.Key];

      if (skill.includes(":") && !skill.includes(": ")) {
        skill = skill.replace(":", ": ");
      }

      if (Object.keys(CONFIG.FFG.skills).includes(skill)) {
        type = skill;
      }
    }

    if (mod.Key === "ENCTADD") {
      modtype = "Stat";
      type = "Encumbrance";
      value = value;
    }

    if (type) {
      return { type, value: { mod: type, modtype, value } };
    }
  }

  /**
   * @param  {object} basemods
   */
  static getBaseModObject(basemods) {
    const attrs = JXON.xmlToJs(basemods);
    let itemAttributes = {};

    if (Array.isArray(attrs.Mod)) {
      attrs.Mod.forEach((mod) => {
        if (mod.Key) {
          const attr = this.getBaseModAttributeObject(mod);
          if (attr) {
            itemAttributes[attr.type] = attr.value;
          }
        } else if (mod.DieModifiers?.DieModifier) {
          if (Array.isArray(mod.DieModifiers.DieModifier)) {
            mod.DieModifiers.DieModifier.forEach((diemod) => {
              const attr = this.getBaseModAttributeObject({
                Key: diemod.SkillKey,
                ...diemod,
              });
              if (attr) {
                itemAttributes[attr.type] = attr.value;
              }
            });
          } else {
            const attr = this.getBaseModAttributeObject({
              Key: mod.DieModifiers.DieModifier.SkillKey,
              ...mod.DieModifiers.DieModifier,
            });
            if (attr) {
              itemAttributes[attr.type] = attr.value;
            }
          }
        }
      });
    }

    if (attrs?.Mod?.Key) {
      const attr = this.getBaseModAttributeObject(attrs.Mod);
      if (attr) {
        itemAttributes[attr.type] = attr.value;
      }
    } else if (attrs?.Mod?.DieModifiers?.DieModifier) {
      if (!Array.isArray(attrs.Mod.DieModifiers.DieModifier)) {
        attrs.Mod.DieModifiers.DieModifier = [attrs.Mod.DieModifiers.DieModifier];
      }
      attrs.Mod.DieModifiers.DieModifier.forEach((mod) => {
        const attr = this.getBaseModAttributeObject({
          Key: mod.SkillKey,
          ...mod,
        });
        if (attr) {
          itemAttributes[attr.type] = attr.value;
        }
      });
    }

    return itemAttributes;
  }

  static async getQualities(qualityList) {
    let qualities = [];
    let attributes = {};

    if (qualityList && !Array.isArray(qualityList)) {
      qualityList = [qualityList];
    }

    if (qualityList && qualityList.length > 0) {
      await this.asyncForEach(qualityList, async (quality) => {
        let descriptor = await ImportHelpers.findCompendiumEntityByImportId("JournalEntry", quality.Key);

        if (descriptor?.compendium?.metadata) {
          qualities.push(`<a class="entity-link" draggable="true" data-pack="${descriptor.compendium.metadata.package}.${descriptor.compendium.metadata.name}" data-id="${descriptor.id}"> ${quality.Key}  ${quality.Count ? quality.Count : ""}</a>`);
        } else {
          qualities.push(`${quality.Key} ${quality.Count ? quality.Count : ""}`);
        }

        if (quality.Key === "DEFENSIVE") {
          const nk = randomId();
          const count = quality.Count ? parseInt(quality.Count) : 0;

          attributes[`attr${nk}`] = {
            isCheckbox: false,
            mod: "Defence-Melee",
            modtype: "Stat",
            value: count,
          };
        }
      });

      return { qualities, attributes };
    }
  }

  static asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index += 1) {
      await callback(array[index], index, array);
    }
  };

  static characteristicKeyToName(key) {}

  static minionTemplate = {
    name: "no name",
    type: "minion",
    data: {
      biography: "",
      stats: {
        forcePool: {
          max: 0
        },
        credits: {
          value: 0,
        }
      },
      characteristics: {
        Brawn: {
          value: 0,
        },
        Agility: {
          value: 0,
        },
        Intellect: {
          value: 0,
        },
        Cunning: {
          value: 0,
        },
        Willpower: {
          value: 0,
        },
        Presence: {
          value: 0,
        }
      },
      skills: {
          "Astrogation": {
            "rank": 0,
            "groupskill": false,
            "Key": "ASTRO",
          },
          "Athletics": {
            "rank": 0,
            "groupskill": false,
            "Key": "ATHL",
          },
          "Brawl": {
            "rank": 0,
            "groupskill": false,
            "Key": "BRAWL",
          },
          "Charm": {
            "rank": 0,
            "groupskill": false,
            "Key": "CHARM",
          },
          "Coercion": {
            "rank": 0,
            "groupskill": false,
            "Key": "COERC",
          },
          "Computers": {
            "rank": 0,
            "groupskill": false,
            "Key": "COMP",
          },
          "Cool": {
            "rank": 0,
            "groupskill": false,
            "Key": "COOL",
          },
          "Coordination": {
            "rank": 0,
            "groupskill": false,
            "Key": "COORD",
          },
          "Deception": {
            "rank": 0,
            "groupskill": false,
            "Key": "DECEP",
          },
          "Discipline": {
            "rank": 0,
            "groupskill": false,
            "Key": "DISC",
          },
          "Gunnery": {
            "rank": 0,
            "groupskill": false,
            "Key": "GUNN",
          },
          "Leadership": {
            "rank": 0,
            "groupskill": false,
            "Key": "LEAD",
          },
          "Lightsaber": {
            "rank": 0,
            "groupskill": false,
            "Key": "LTSABER",
          },
          "Mechanics": {
            "rank": 0,
            "groupskill": false,
            "Key": "MECH",
          },
          "Medicine": {
            "rank": 0,
            "groupskill": false,
            "Key": "MED",
          },
          "Melee": {
            "rank": 0,
            "groupskill": false,
            "Key": "MELEE",
          },
          "Negotiation": {
            "rank": 0,
            "groupskill": false,
            "Key": "NEG",
          },
          "Perception": {
            "rank": 0,
            "groupskill": false,
            "Key": "PERC",
          },
          "Piloting: Planetary": {
            "rank": 0,
            "groupskill": false,
            "Key": "PILOTPL",
          },
          "Piloting: Space": {
            "rank": 0,
            "groupskill": false,
            "Key": "PILOTSP",
          },
          "Ranged: Heavy": {
            "rank": 0,
            "groupskill": false,
            "Key": "RANGHVY",
          },
          "Ranged: Light": {
            "rank": 0,
            "groupskill": false,
            "Key": "RANGLT",
          },
          "Resilience": {
            "rank": 0,
            "groupskill": false,
            "Key": "RESIL",
          },
          "Skulduggery": {
            "rank": 0,
            "groupskill": false,
            "Key": "SKUL",
          },
          "Stealth": {
            "rank": 0,
            "groupskill": false,
            "Key": "STEAL",
          },
          "Streetwise": {
            "rank": 0,
            "groupskill": false,
            "Key": "SW",
          },
          "Survival": {
            "rank": 0,
            "groupskill": false,
            "Key": "SURV",
          },
          "Vigilance": {
            "rank": 0,
            "groupskill": false,
            "Key": "VIGIL",
          },
          "Knowledge: Core Worlds": {
            "rank": 0,
            "groupskill": false,
            "Key": "CORE",
          },
          "Knowledge: Education": {
            "rank": 0,
            "groupskill": false,
            "Key": "EDU",
          },
          "Knowledge: Lore": {
            "rank": 0,
            "groupskill": false,
            "Key": "LORE",
          },
          "Knowledge: Outer Rim": {
            "rank": 0,
            "groupskill": false,
            "Key": "OUT",
          },
          "Knowledge: Underworld": {
            "rank": 0,
            "groupskill": false,
            "Key": "UND",
          },
          "Knowledge: Warfare": {
            "rank": 0,
            "groupskill": false,
            "Key": "WARF",
          },
          "Knowledge: Xenology": {
            "rank": 0,
            "groupskill": false,
            "Key": "XEN",
          },
          "Cybernetics": {
            "rank": 0,
            "groupskill": false,
            "Key": "CYBERNETICS",
            "custom": true,
            "type": "General",
            "characteristic": "Intellect",
            "label": "Cybernetics",
          },
      },
      attributes: {},
      quantity: {
        value: 1,
        max: 1,
      },
    },
    flags: {
    },
    items: [],
  };
  static characterTemplate = {
    name: "No Name",
    type: "character",
    flags: {
    },
    data: {
      attributes: {},
      characteristics: {
        "Brawn": {
          "value": 0,
        },
        "Agility": {
          "value": 0,
        },
        "Intellect": {
          "value": 0,
        },
        "Cunning": {
          "value": 0,
        },
        "Willpower": {
          "value": 0,
        },
        "Presence": {
          "value": 0,
        },
      },
      skills: {
        "Astrogation": {
          "rank": 0,
          "careerskill": false,
          "Key": "ASTRO",
        },
        "Athletics": {
          "rank": 0,
          "careerskill": false,
          "Key": "ATHL",
        },
        "Brawl": {
          "rank": 0,
          "careerskill": false,
          "Key": "BRAWL",
        },
        "Charm": {
          "rank": 0,
          "careerskill": false,
          "Key": "CHARM",
        },
        "Coercion": {
          "rank": 0,
          "careerskill": false,
          "Key": "COERC",
        },
        "Computers": {
          "rank": 0,
          "careerskill": false,
          "Key": "COMP",
        },
        "Cool": {
          "rank": 0,
          "careerskill": false,
          "Key": "COOL",
        },
        "Coordination": {
          "rank": 0,
          "careerskill": false,
          "Key": "COORD",
        },
        "Deception": {
          "rank": 0,
          "careerskill": false,
          "Key": "DECEP",
        },
        "Discipline": {
          "rank": 0,
          "careerskill": false,
          "Key": "DISC",
        },
        "Gunnery": {
          "rank": 0,
          "careerskill": false,
          "Key": "GUNN",
        },
        "Leadership": {
          "rank": 0,
          "careerskill": false,
          "Key": "LEAD",
        },
        "Lightsaber": {
          "rank": 0,
          "careerskill": false,
          "Key": "LTSABER",
        },
        "Mechanics": {
          "rank": 0,
          "careerskill": false,
          "Key": "MECH",
        },
        "Medicine": {
          "rank": 0,
          "careerskill": false,
          "Key": "MED",
        },
        "Melee": {
          "rank": 0,
          "careerskill": false,
          "Key": "MELEE",
        },
        "Negotiation": {
          "rank": 0,
          "careerskill": false,
          "Key": "NEG",
        },
        "Perception": {
          "rank": 0,
          "careerskill": false,
          "Key": "PERC",
        },
        "Piloting: Planetary": {
          "rank": 0,
          "careerskill": false,
          "Key": "PILOTPL",
        },
        "Piloting: Space": {
          "rank": 0,
          "careerskill": false,
          "Key": "PILOTSP",
        },
        "Ranged: Heavy": {
          "rank": 0,
          "careerskill": false,
          "Key": "RANGHVY",
        },
        "Ranged: Light": {
          "rank": 0,
          "careerskill": false,
          "Key": "RANGLT",
        },
        "Resilience": {
          "rank": 0,
          "careerskill": false,
          "Key": "RESIL",
        },
        "Skulduggery": {
          "rank": 0,
          "careerskill": false,
          "Key": "SKUL",
        },
        "Stealth": {
          "rank": 0,
          "careerskill": false,
          "Key": "STEAL",
        },
        "Streetwise": {
          "rank": 0,
          "careerskill": false,
          "Key": "SW",
        },
        "Survival": {
          "rank": 0,
          "careerskill": false,
          "Key": "SURV",
        },
        "Vigilance": {
          "rank": 0,
          "careerskill": false,
          "Key": "VIGIL",
        },
        "Knowledge: Core Worlds": {
          "rank": 0,
          "careerskill": false,
          "Key": "CORE",
        },
        "Knowledge: Education": {
          "rank": 0,
          "careerskill": false,
          "Key": "EDU",
        },
        "Knowledge: Lore": {
          "rank": 0,
          "careerskill": false,
          "Key": "LORE",
        },
        "Knowledge: Outer Rim": {
          "rank": 0,
          "careerskill": false,
          "Key": "OUT",
        },
        "Knowledge: Underworld": {
          "rank": 0,
          "careerskill": false,
          "Key": "UND",
        },
        "Knowledge: Warfare": {
          "rank": 0,
          "careerskill": false,
          "Key": "WARF",
        },
        "Knowledge: Xenology": {
          "rank": 0,
          "careerskill": false,
          "Key": "XEN",
        },
        "Cybernetics": {
          "rank": 0,
          "careerskill": false,
          "Key": "CYBERNETICS",
          "custom": true,
          "type": "General",
          "characteristic": "Intellect",
          "label": "Cybernetics",
        },
      },
      stats: {
        forcePool: {
          max: 0,
        },
        credits: {
          value: 0,
        },
      },
      experience: {
      },
      obligationlist: {},
      dutylist: {},
      morality: {},
      biography: "",
      general: {},
    },
    items: [],
  };

  static async extractAdversaryCharacteristic(adversaryData, adversary)
  {
    adversaryData.Characteristics.CharCharacteristic.forEach((char) =>{
      const name = ImportHelpers.convertOGCharacteristic(char.Key);
      if (!adversary.data.attributes?.[name]) {
        adversary.data.attributes[name] = {
          key: name,
          mod: name,
          modtype: "Characteristic",
          value: 0,
        };
      }
      if (char.Rank?.PurchasedRanks) {
        let val = parseInt(char.Rank.PurchasedRanks, 10) + parseInt(char.Rank.StartingRanks, 10);
        adversary.data.characteristics[name].value = val;
        adversary.data.attributes[name].value = val;
      } else {
        let val = parseInt(char.Rank.StartingRanks, 10);
        adversary.data.characteristics[name].value = val;
        adversary.data.attributes[name].value = val;
      }
    });

    return adversary;
  }

  static async extractAdversaryAbilities(adversaryData, adversary)
  {
    // hacky way to get magic adversary abilities out of OggDude's and into VTT
    if(adversaryData.Abilities?.AdvAbility) {
      if (!Array.isArray(adversaryData.Abilities.AdvAbility)) {
        adversaryData.Abilities.AdvAbility = [adversaryData.Abilities.AdvAbility];
      }

      adversary.data.biography += "<p>&nbsp;</p>"
      adversary.data.biography += "<h3>Abilities</h3>"
      adversaryData.Abilities.AdvAbility.forEach((ability) => {
        adversary.data.biography += "<h4>"+ability.Name+"</h4>";
        adversary.data.biography += "<p>"+ability.Description+"</p>";
      });
    }
    return adversary;
  }

  static async extractAdversaryAttrs(adversaryData, adversary)
  {
    const attrs = adversaryData.Attributes;

    if (attrs.DefenseMelee) {
      var meledef = parseInt(attrs.DefenceMelee, 10);
      adversary.data.attributes["Defence-Melee"] = {value: meledef};
    }

    if (attrs.DefenseRanged) {
      var rangeddef = parseInt(attrs.DefenseRanged, 10);
      adversary.data.attributes["Ranged-Melee"] = {value: rangeddef};
    }

    if (attrs.ForceRating) {
      var forcerating = parseInt(attrs.ForceRating, 10);
      adversary.data.attributes["ForcePool"] = {value: forcerating};
    }

    var soak = 0;
    // can ignore, based on BRAWN
    // if(attrs.SoakValue?.CharRanks) {
    //   soak = parseInt(attrs.SoakValue.CharRanks, 10);
    // }
    if(attrs.SoakValue?.ItemRanks) {
      soak += parseInt(attrs.SoakValue.ItemRanks, 10);
    }
    if(attrs.SoakValue?.PurchasedRanks) {
      soak += parseInt(attrs.SoakValue.PurchasedRanks, 10);
    }
    adversary.data.attributes.Soak = {value: soak};

    // Minions don't have strain so can skip in this case
    if(adversaryData.Type !== "Minion")
    {
      var strain = 0;
      if(attrs.StrainThreshold?.StartingRanks) {
        strain += parseInt(attrs.StrainThreshold.StartingRanks, 10);
      }
      if(attrs.StrainThreshold?.ItemRanks) {
        strain += parseInt(attrs.StrainThreshold.ItemRanks, 10);
      }
      if(attrs.StrainThreshold?.PurchasedRanks) {
        strain += parseInt(attrs.StrainThreshold.PurchasedRanks, 10);
      }
      if(attrs.StrainThreshold?.CharRanks) {
        strain += parseInt(attrs.StrainThreshold.CharRanks, 10);
      }
      adversary.data.attributes.Strain = {value: strain};
    }

    var wounds = 0;
    if(attrs.WoundThreshold?.StartingRanks) {
      wounds += parseInt(attrs.WoundThreshold.StartingRanks, 10);
    }
    if(attrs.WoundThreshold?.ItemRanks) {
      wounds += parseInt(attrs.WoundThreshold.ItemRanks, 10);
    }
    if(attrs.WoundThreshold?.PurchasedRanks) {
      wounds += parseInt(attrs.WoundThreshold.PurchasedRanks, 10);
    }
    if(attrs.WoundThreshold?.CharRanks) {
      wounds += parseInt(attrs.WoundThreshold.CharRanks, 10);
    }
    adversary.data.unit_wounds = {value: wounds};
    adversary.data.attributes.Wounds = {value: wounds};

    return adversary;
  }

  static async extractAdversaryWeapons(adversaryData, adversary)
  {
    if (adversaryData.Weapons?.CharWeapon) {
      if (!Array.isArray(adversaryData.Weapons.CharWeapon)) {
        adversaryData.Weapons.CharWeapon = [adversaryData.Weapons.CharWeapon];
      }
      await this.asyncForEach(adversaryData.Weapons.CharWeapon, async (w) => {
        try {
          const weapon = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", w.ItemKey, undefined, "weapon")));
          delete weapon._id;

          const weaponItems = adversary.items.filter((s) => s.flags.starwarsffg.ffgimportid === weapon.flags.starwarsffg.ffgimportid);

          if (weaponItems.length > 0) {
            for (let i = 0; i < adversary.items.length; i += 1) {
              if (adversary.items[i].type === "weapon" && adversary.items[i].flags.starwarsffg.ffgimportid === weapon.flags.starwarsffg.ffgimportid) {
                adversary.items[i] = mergeObject(weapon, adversary.items[i]);
              }
            }
          } else {
            if (w?.Count) {
              w.Count = parseInt(w.Count, 10);
            } else {
              w.Count = 1;
            }

            await this.asyncForEach(new Array(parseInt(w.Count, 10)), () => {
              adversary.items.push(weapon);
            });
          }
        } catch (err) {
          if (w.ItemKey?.length) {
            CONFIG.logger.error(`Unable to add weapon (${w.ItemKey}) to adversary.`, err);
          }
        }
      });
    }

    return adversary;
  }

  static async extractAdversaryTalents(adversaryData, adversary)
  {
    // cheese my way around getting the talents on the Adv sheet into the VTT sheet by following much the same formula
    // that we do for weapons/gear.
    if(adversaryData.Talents?.CharTalent)
    {
      if (!Array.isArray(adversaryData.Talents.CharTalent)) {
        adversaryData.Talents.CharTalent = [adversaryData.Talents.CharTalent];
      }

      await this.asyncForEach(adversaryData.Talents.CharTalent, async (t) => {
        try{
          const compTalent = await this.findCompendiumEntityByImportId("Item", t.Key, undefined, "talent");
          if(!compTalent){
            return;
          }
          const talent = JSON.parse(JSON.stringify(compTalent));
          delete talent._id;
          const talentItems = adversary.items.filter((s) => s.flags.starwarsffg.ffgimportid === talent.flags.starwarsffg.ffgimportid);
          if (talentItems.length > 0) {
            for (let i = 0; i < adversary.items.length; i += 1) {
              if (adversary.items[i].type === "talent" && adversary.items[i].flags.starwarsffg.ffgimportid === talent.flags.starwarsffg.ffgimportid) {
                adversary.items[i] = mergeObject(talent, adversary.items[i]);
              }
            }
          } else {
            if(t.Ranks) {
              if(talent.data?.ranks)
              {
                let ranks = parseInt(t.Ranks, 10);
                talent.data.ranks.current = ranks;
              }
            }
            adversary.items.push(talent);
          }
        } catch (err) {
          CONFIG.logger.error(`Unable to add talent (${t.ItemKey}) to adversary.`, err);
        }
      });
    }
    return adversary;
  }

  static async extractAdversaryArmor(adversaryData, adversary)
  {
    if (adversaryData.Armor?.CharArmor) {
      if (!Array.isArray(adversaryData.Armor.CharArmor)) {
        adversaryData.Armor.CharArmor = [adversaryData.Armor.CharArmor];
      }

      await this.asyncForEach(adversaryData.Armor.CharArmor, async (w) => {
        try {
          const compArmor = await this.findCompendiumEntityByImportId("Item", w.ItemKey, undefined, "armour");
          if(compArmor) {
            const armor = JSON.parse(JSON.stringify(compArmor));
            delete armor._id;
            const armorItems = adversary.items.filter((s) => s.flags.starwarsffg.ffgimportid === armor.flags.starwarsffg.ffgimportid);

            if (armorItems.length > 0) {
              for (let i = 0; i < adversary.items.length; i += 1) {
                if (adversary.items[i].type === "armor" && adversary.items[i].flags.starwarsffg.ffgimportid === armor.flags.starwarsffg.ffgimportid) {
                  adversary.items[i] = mergeObject(armor, adversary.items[i]);
                }
              }
            } else {
              if (w?.Count) {
                w.Count = parseInt(w.Count, 10);
              } else {
                w.Count = 1;
              }

              await this.asyncForEach(new Array(parseInt(w.Count, 10)), () => {
                adversary.items.push(armor);
              });
            }
          }
        } catch (err) {
          CONFIG.logger.error(`Unable to add armor (${w.ItemKey}) to adversary.`, err);
        }
      });
    }
    return adversary;
  }

  static async extractAdversaryGear(adversaryData, adversary)
  {
    if (adversaryData.Gear?.CharGear) {
      if (!Array.isArray(adversaryData.Gear.CharGear)) {
        adversaryData.Gear.CharGear = [adversaryData.Gear.CharGear];
      }
      await this.asyncForEach(adversaryData.Gear.CharGear, async (w) => {
        try {
          const compGear = await this.findCompendiumEntityByImportId("Item", w.ItemKey, undefined, "gear");
          if(compGear){
            const gear = JSON.parse(JSON.stringify(compGear));
            delete gear._id;

            let gearItem = adversary.items.find((s) => s.flags.starwarsffg.ffgimportid === gear.flags.starwarsffg.ffgimportid);

            let gearCount = 1;
            if (w?.Count) {
              gearCount = parseInt(w.Count, 10);
              gear.data.quantity = {
                value: gearCount,
              };
            }

            if (gearItem) {
              gearItem = mergeObject(gear, gearItem);
              gear.data.quantity.value = gearCount;
            } else {
              adversary.items.push(gear);
            }
          }
        } catch (err) {
          CONFIG.logger.error(`Unable to add gear (${w.ItemKey}) to adversary.`, err);
        }
      });
    }
    return adversary
  }

  static async extractAdversaryPowers(adversaryData, adversary)
  {
    let forcepowers = [];
    if (adversaryData.ForceAbilities?.CharForceAbility) {
      if (Array.isArray(adversaryData.ForceAbilities.CharForceAbility)) {
        forcepowers = adversaryData.ForceAbilities.CharForceAbility;
      } else {
        forcepowers.push(adversaryData.ForceAbilities.CharForceAbility);
      }
    }

    let basicPowers = forcepowers.filter((power) => power.Key.endsWith("BASIC"));

    await this.asyncForEach(basicPowers, async (power) => {
      try{
      let powerKey = power.Key.slice(0, -5);

      const comForceAbility = await this.findCompendiumEntityByImportId("Item", powerKey, undefined, "forcepower");
      if(comForceAbility)
      {
        let force = JSON.parse(JSON.stringify(comForceAbility));
        // Just add all upgrades since there's no good way of mapping the NPC upgrades to their Character-sheet Counterparts
        // todo : find a solution to this known issue.
        Object.keys(force.data.upgrades).forEach((key) => {
          force.data.upgrades[key].islearned = true;
        });

        let forceItem = adversary.items.find((s) => s.flags.starwarsffg.ffgimportid === force.flags.starwarsffg.ffgimportid);
        if (forceItem) {
          forceItem = mergeObject(force, forceItem);
        } else {
          adversary.items.push(force);
        }
      }
      } catch (err)
      {
        CONFIG.logger.error(`Unable to add force power ${power.Key} to adversary.`, err);
      }
    });
    return adversary;
  }

  static async appendKnownIssuesAndNotesToDesc(adversary)
  {
    adversary.data.biography += `<p>&nbsp;</p>
    <h1>Importer Notes</h1>
    <p>This Adversary sheet was imported from OggDude's GMTools with DrMattsuu's NPC importer for SWFVTT, there are currently a number of known issues with this process.&nbsp;</p>
    <ul>
    <li>This sheet may be missing alot of data if you skipped the Importing Data step of StarWarsFFG's <a href="https://github.com/StarWarsFoundryVTT/StarWarsFFG/wiki/Getting-started#importing-data" target="_blank" rel="noopener">Getting Started Guide</a>. It is strongly recommended that you follow that guide before attempting to import NPCs/PCs into your game</li>
    <li>Adversaries do not currently have any of the items created on the Custom Weapons, Custom Armor, or Custom Items tabs of GMTools, this is because those items do not exist in the compendium of imported items.</li>
    <li>In order for Adversary's Soak values to be displayed properly it is strongly recommended that you disable "Enable Soak Auto Calculation" in the Sheet Options.</li>
    <li>Adversaries with Force Powers are automatically granted every upgrade in the power-tree they are granted. This is because there's no good way to map the OggDude's exported Adversary force-power upgrades to the SWFVTT character ones.</li>
    <li>Adversaries Misc. abilities are currently written in the Biography section of the character sheet. This is because the Abilities are not provided in a format that can be easily mapped to Character Abilities.</li>
    <li>Talents that allow the character to exchange the characteristic used for a skill check (Lightsaber Mastery, for example) are not currently reflected on the character sheet and will need to be manually applied.</li>
    </ul>
    <p>&nbsp;</p>`;

    return adversary;
  }

  static async nemesisImport(adversaryData, updateDialog)
  {
    const npcName = adversaryData.Name;
    const npcKey = adversaryData.Key;
    const exists = game.data.actors.find((actor) => actor.flags.starwarsffg?.ffgimportid == npcKey);

    // copy template character json
    let adversary = JSON.parse(JSON.stringify(ImportHelpers.characterTemplate));
    adversary.name = npcName;
    if(adversaryData.Description)
      adversary.data.biography = adversaryData.Description;
    adversary.flags = {
      starwarsffg: {
        ffgimportid: npcKey
      }
    }

    adversary = await ImportHelpers.extractAdversaryCharacteristic(adversaryData, adversary)

    if(exists?.items)
    {
      adversary.items = exists.items;
    }

    if(adversaryData.Skills?.CharSkill)
    {
      const skills = adversaryData.Skills.CharSkill;
      skills.forEach((skill) => {
        let charSkill = Object.keys(adversary.data.skills).find((s) => adversary.data.skills[s].Key === skill.Key);

        if (!adversary.data.attributes?.[charSkill]) {
          adversary.data.attributes[charSkill] = {
            key: charSkill,
            mod: charSkill,
            modtype: "Skill Rank",
            value: 0,
          };
        }

        // Characteristic override
        if(skill.CharKeyOverride) {
          const characteristicName = ImportHelpers.convertOGCharacteristic(skill.CharKeyOverride);
          adversary.data.skills[charSkill].characteristic = characteristicName;
        }

        // add ranked skills
        if(skill.Rank) {
          adversary.data.skills[charSkill].rank = parseInt(skill.Rank.PurchasedRanks, 10);
          adversary.data.attributes[charSkill].value = parseInt(skill.Rank.PurchasedRanks, 10);
        }
        // don't need to bother with class skills, or specs/careers as adv don't have them.
      });
    }
    updateDialog(10);

    adversary = await ImportHelpers.extractAdversaryAbilities(adversaryData, adversary);

    updateDialog(20);

    adversary = await ImportHelpers.extractAdversaryAttrs(adversaryData, adversary);

    updateDialog(30);

    adversary = await ImportHelpers.extractAdversaryPowers(adversaryData, adversary);

    updateDialog(40);

    adversary = await ImportHelpers.extractAdversaryWeapons(adversaryData, adversary);

    updateDialog(50);

    adversary = await ImportHelpers.extractAdversaryTalents(adversaryData, adversary);

    updateDialog(60);

    adversary = await ImportHelpers.extractAdversaryArmor(adversaryData, adversary);

    updateDialog(70);

    adversary = await ImportHelpers.extractAdversaryGear(adversaryData, adversary);

    updateDialog(90);

    adversary = await ImportHelpers.appendKnownIssuesAndNotesToDesc(adversary);

    adversary = prep_for_v10(adversary);

    if (exists) {
      // v10 no longer allows you to clobber existing actors with mismatched items, so we rename the actor and make a new one
      adversary.name += " " + String(new Date().toLocaleString());
    }

    await Actor.create(adversary);

    updateDialog(100);
  }

  static async minionImport(adversaryData, updateDialog, subType)
  {
    const npcName = adversaryData.Name;
    const npcKey = adversaryData.Key;
    const exists = game.data.actors.find((actor) => actor.flags.starwarsffg?.ffgimportid == npcKey);

    // minion sheet data obtained from an export and reformed for importing here.
    // Deep copy our template so we don't have to have a bunch of json sat here
    let adversary = JSON.parse(JSON.stringify(ImportHelpers.minionTemplate));
    //adversary.type = subType;
    adversary.name = npcName;
    if(adversaryData.Description)
      adversary.data.biography = adversaryData.Description;
    adversary.flags = {
      starwarsffg: {
        ffgimportid: npcKey
      }
    }

    adversary = await ImportHelpers.extractAdversaryCharacteristic(adversaryData, adversary)

    if(adversaryData.Skills?.CharSkill)
    {
      const skills = adversaryData.Skills.CharSkill;
      skills.forEach((skill) => {
        let charSkill = Object.keys(adversary.data.skills).find((s) => adversary.data.skills[s].Key === skill.Key);

        if (!adversary.data.attributes?.[charSkill]) {
          adversary.data.attributes[charSkill] = {
            key: charSkill,
            mod: charSkill,
            modtype: "Skill Rank",
            value: 0,
          };
        }

        // Characteristic override
        if(skill.CharKeyOverride) {
          const characteristicName = ImportHelpers.convertOGCharacteristic(skill.CharKeyOverride);
          adversary.data.skills[charSkill].characteristic = characteristicName;
        }

        // check for purchased ranks, a sure sign of a rival class
        if(skill.Rank) {
          adversary.data.skills[charSkill].rank = parseInt(skill.Rank.PurchasedRanks, 10);
          adversary.data.attributes[charSkill].value = parseInt(skill.Rank.PurchasedRanks, 10);
          adversary.data.skills[charSkill].careerskill = true;
        }
        else {
          // minion types don't expose data unless they are group skills
          adversary.data.skills[charSkill].groupskill = true;
        }
      });
    }

    updateDialog(10);

    adversary = await ImportHelpers.extractAdversaryAbilities(adversaryData, adversary);

    updateDialog(20);

    adversary = await ImportHelpers.extractAdversaryAttrs(adversaryData, adversary);

    updateDialog(30);

    adversary = await ImportHelpers.extractAdversaryPowers(adversaryData, adversary);

    updateDialog(40);

    adversary = await ImportHelpers.extractAdversaryWeapons(adversaryData, adversary);

    updateDialog(50);

    adversary = await ImportHelpers.extractAdversaryTalents(adversaryData, adversary);

    updateDialog(60);

    adversary = await ImportHelpers.extractAdversaryArmor(adversaryData, adversary);

    updateDialog(70);

    adversary = await ImportHelpers.extractAdversaryGear(adversaryData, adversary);

    updateDialog(90);

    adversary = await ImportHelpers.appendKnownIssuesAndNotesToDesc(adversary);

    adversary = prep_for_v10(adversary);

    if (exists) {
      // v10 no longer allows you to clobber existing actors with mismatched items, so we rename the actor and make a new one
      adversary.name += " " + String(new Date().toLocaleString());
    }

    await Actor.create(adversary);

    updateDialog(100);
  }

  static async npcImport(data)
  {
    try{
      $(".import-progress.current").toggleClass("import-hidden");

      const updateDialog = (value, total = 100) => {
        $(".current .import-progress-bar")
          .width(`${Math.trunc((value / total) * 100)}%`)
          .html(`<span>${Math.trunc((value / total) * 100)}%</span>`);
      };

      const domparser = new DOMParser();
      const xmlDoc = domparser.parseFromString(data, "text/xml");
      const npcData = JXON.xmlToJs(xmlDoc);

      const adversaryData = npcData.Adversary;
      if(adversaryData === undefined){
        throw "This is not an Adversary ogd exported XML file.";
      }

      const type = adversaryData.Type;
      if(type === "Minion") {
        console.log("minion type detected");
        await ImportHelpers.minionImport(adversaryData, updateDialog, "minion");
      } else if(type === "Rival") {
        console.log("Rival type detected");
        await ImportHelpers.minionImport(adversaryData, updateDialog, "rival");
      } else if(type === "Nemesis") {
        console.log("Nemesis type detected");
        await ImportHelpers.nemesisImport(adversaryData, updateDialog);
      }

    } catch (err) {
      CONFIG.logger.error(`Error while importing NPC`, err);
      ui.notifications.error("An error occured while importing NPC!");
    }
  }

  static async characterImport(data) {
    try {
      $(".import-progress.current").toggleClass("import-hidden");

      const updateDialog = (value, total = 100) => {
        $(".current .import-progress-bar")
          .width(`${Math.trunc((value / total) * 100)}%`)
          .html(`<span>${Math.trunc((value / total) * 100)}%</span>`);
      };

      const domparser = new DOMParser();
      const xmlDoc = domparser.parseFromString(data, "text/xml");
      const characterData = JXON.xmlToJs(xmlDoc);

      if (!CONFIG.temporary) {
        CONFIG.temporary = {};
      }

      const characterName = characterData.Character.Description.CharName;

      const exists = game.data.actors.find((actor) => actor.flags?.starwarsffg?.ffgimportid === characterData.Character.Key);

      // copy template character json
      let character = JSON.parse(JSON.stringify(ImportHelpers.characterTemplate));

      if(characterName) {
        character.name = characterName;
      }

      character.flags = {
        starwarsffg: {
          ffgimportid: characterData.Character.Key
        }
      }

      character.data.stats.credits.value = parseInt(characterData.Character.Credits, 10);
      character.data.experience = {
        total: parseInt(characterData.Character.Experience.ExperienceRanks.StartingRanks ?? 0, 10) + parseInt(characterData.Character.Experience.ExperienceRanks.SpeciesRanks ?? 0, 10) + parseInt(characterData.Character.Experience.ExperienceRanks.PurchasedRanks ?? 0, 10),
        available: parseInt(characterData.Character.Experience.ExperienceRanks.StartingRanks ?? 0, 10) + parseInt(characterData.Character.Experience.ExperienceRanks.SpeciesRanks ?? 0, 10) + parseInt(characterData.Character.Experience.ExperienceRanks.PurchasedRanks ?? 0, 10) - parseInt(characterData.Character.Experience.UsedExperience ?? 0, 10),
      };
      character.data.morality = {
        label: "Morality",
        strength: characterData.Character.Morality?.MoralityPairs?.MoralityPair?.StrengthKey,
        type: "Number",
        value: parseInt(characterData.Character.Morality.MoralityValue ?? 0, 10),
        weakness: characterData.Character.Morality?.MoralityPairs?.MoralityPair?.WeaknessKey,
      };
      character.data.general = {
        age: characterData.Character.Description.Age,
        build: characterData.Character.Description.Build,
        eyes: characterData.Character.Description.Eyes,
        hair: characterData.Character.Description.Hair,
        features: characterData.Character.Description.OtherFeatures,
        height: characterData.Character.Description.Height,
        gender: characterData.Character.Description.Gender,
      }

      character.data.biography = characterData.Character.Story;

      if(exists?.items)
      {
        character.items = exists.items;
      }

      characterData.Character.Characteristics.CharCharacteristic.forEach((char) => {
        const name = ImportHelpers.convertOGCharacteristic(char.Key);

        if (!character.data.attributes?.[name]) {
          character.data.attributes[name] = {
            key: name,
            mod: name,
            modtype: "Characteristic",
            value: 0,
          };
        }
        if (char.Rank?.PurchasedRanks) {
          character.data.characteristics[name].value = parseInt(char.Rank.PurchasedRanks, 10);
          character.data.attributes[name].value = parseInt(char.Rank.PurchasedRanks, 10);
        }
      });

      const skills = characterData.Character.Skills.CharSkill;

      let speciesSkills = [];

      skills.forEach((skill) => {
        let charSkill = Object.keys(character.data.skills).find((s) => character.data.skills[s].Key === skill.Key);

        if (skill.isCareer) {
          character.data.skills[charSkill].careerskill = true;
        }

        if (!character.data.attributes?.[charSkill]) {
          character.data.attributes[charSkill] = {
            key: charSkill,
            mod: charSkill,
            modtype: "Skill Rank",
            value: 0,
          };
        }

        if (skill.Rank?.PurchasedRanks) {
          character.data.skills[charSkill].rank = parseInt(skill.Rank.PurchasedRanks, 10);
          character.data.attributes[charSkill].value = parseInt(skill.Rank.PurchasedRanks, 10);
        } else if (skill.Rank?.SpeciesRanks) {
          const speciesSkill = {
            key: charSkill,
            mod: charSkill,
            modtype: "Skill Rank",
            value: parseInt(skill.Rank.SpeciesRanks, 10),
          };
          speciesSkills.push(speciesSkill);
        } else {
          character.data.skills[charSkill].rank = 0;
          character.data.attributes[charSkill].value = 0;
        }
      });

      let forcepowers = [];
      if (characterData?.Character?.ForcePowers?.CharForcePower) {
        if (Array.isArray(characterData.Character.ForcePowers.CharForcePower)) {
          forcepowers = characterData.Character.ForcePowers.CharForcePower.filter((power) => {
            if (power.ForceAbilities.CharForceAbility.find((fa) => fa.Purchased === "true")) {
              return true;
            }
            return false;
          });
        } else {
          forcepowers.push(characterData.Character.ForcePowers.CharForcePower);
        }
      }

      updateDialog(10);

      try {
        const speciesDBItem = await this.findCompendiumEntityByImportId("Item", characterData.Character.Species.SpeciesKey, undefined, "species");

        if (speciesDBItem) {
          let species = JSON.parse(JSON.stringify(speciesDBItem));

          for (let i = 0; i < speciesSkills.length; i += 1) {
            // first determine if the modifier exists, oggdudes doesn't differentiate between chosen skills (ie human) vs static skill (ie Nautolan)

            const found = Object.values(species.system.attributes).filter((attr) => attr.mod === speciesSkills[i].mod && attr.modtype === speciesSkills[i].modtype && attr.value === speciesSkills[i].value);

            if (!found?.length) {
              let attrId = Object.keys(species.system.attributes).length + 1;
              species.system.attributes[attrId] = speciesSkills[i];
            }
          }

          // does the character data already include the species
          let speciesItem = character.items.find((s) => s.flags.starwarsffg.ffgimportid === species.flags.starwarsffg.ffgimportid);

          if (speciesItem) {
            species = mergeObject(species, speciesItem);
          } else {
            character.items.push(species);
          }
        }
      } catch (err) {
        CONFIG.logger.error(`Unable to add species ${characterData.Character.Species.SpeciesKey} to character.`, err);
      }

      let obligationlist = [];
      if (characterData.Character.Obligations.CharObligation) {
        let obligation = 0;
        if (Array.isArray(characterData.Character.Obligations.CharObligation)) {
          characterData.Character.Obligations.CharObligation.forEach((CharObligation) => {
            const nk = randomID();
            const charobligation = {
              key: nk,
              type: CharObligation.Name,
              magnitude: CharObligation.Size,
            };
            character.data.obligationlist[charobligation.key] = charobligation;
            if (parseInt(CharObligation.Size, 10)) {
              obligation += parseInt(CharObligation.Size, 10);
            }
          });
        } else {
          const nk = randomID();
          const charobligation = {
            key: nk,
            type: characterData.Character.Obligations.CharObligation.Name,
            magnitude: characterData.Character.Obligations.CharObligation.Size,
          };
          character.data.obligationlist[charobligation.key] = charobligation;
          if (parseInt(characterData.Character.Obligations.CharObligation.Size, 10)) {
            obligation += parseInt(characterData.Character.Obligations.CharObligation.Size, 10);
          }
        }
      }

      let dutylist = [];
      if (characterData.Character.Duties.CharDuty) {
        let duty = 0;
        if (Array.isArray(characterData.Character.Duties.CharDuty)) {
          characterData.Character.Duties.CharDuty.forEach((CharDuty) => {
            const nk = randomID();
            const charduty = {
              key: nk,
              type: CharDuty.Name,
              magnitude: CharDuty.Size,
            };
            character.data.dutylist[charduty.key] = charduty;
            if (parseInt(CharDuty.Size, 10)) {
              duty += parseInt(CharDuty.Size, 10);
            }
          });
        } else {
          const nk = randomID();
          const charduty = {
            key: nk,
            type: characterData.Character.Duties.CharDuty.Name,
            magnitude: characterData.Character.Duties.CharDuty.Size,
          };
          character.data.dutylist[charduty.key] = charduty;
          if (parseInt(characterData.Character.Duties.CharDuty.Size, 10)) {
            duty += parseInt(characterData.Character.Duties.CharDuty.Size, 10);
          }
        }
      }

      updateDialog(20);

      try {
        const career = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", characterData.Character.Career.CareerKey, undefined, "career")));
        if (career) {
          if (characterData.Character.Career.CareerSkills?.Key) {
            characterData.Character.Career.CareerSkills.Key.forEach((key) => {
              let charSkill = Object.keys(character.data.skills).find((s) => character.data.skills[s].Key === key);
              let attrId = Object.keys(career.system.attributes).find((attr) => career.system.attributes[attr].modtype === "Skill Rank" && career.system.attributes[attr].mod === charSkill);

              if (career.system.attributes?.[attrId]?.value) {
                const careerValue = parseInt(career.system.attributes[attrId].value, 10);
                career.system.attributes[attrId].value = careerValue + 1;
                if (!career.system.attributes[attrId].key) {
                  career.system.attributes[attrId].key = charSkill;
                }
              } else {
                career.system.attributes[attrId] = {
                  key: charSkill,
                  mod: charSkill,
                  modtype: "Skill Rank",
                  value: 1,
                };
              }
            });
          }

          let careerItem = character.items.find((s) => s.flags.starwarsffg.ffgimportid === career.flags.starwarsffg.ffgimportid);

          if (careerItem) {
            careerItem = mergeObject(career, careerItem);
          } else {
            character.items.push(career);
          }
        }
      } catch (err) {
        CONFIG.logger.error(`Unable to add career ${characterData.Character.Career.CareerKey} to character.`, err);
      }

      updateDialog(30);

      try {
        let specialization = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", characterData.Character.Career.StartingSpecKey, undefined, "specialization")));
        if (specialization) {
          if (characterData.Character.Career.CareerSpecSkills?.Key) {
            characterData.Character.Career.CareerSpecSkills.Key.forEach((key) => {
              let charSkill = Object.keys(character.data.skills).find((s) => character.data.skills[s].Key === key);
              let attrId = Object.keys(specialization.system.attributes).find((attr) => specialization.system.attributes[attr].modtype === "Skill Rank" && specialization.system.attributes[attr].mod === charSkill);

              if (specialization.system.attributes?.[attrId]?.value) {
                const specializationValue = parseInt(specialization.system.attributes[attrId].value, 10);
                specialization.system.attributes[attrId].value = specializationValue + 1;
                if (!specialization.system.attributes[attrId].key) {
                  specialization.system.attributes[attrId].key = charSkill;
                }
              } else {
                specialization.system.attributes[attrId] = {
                  key: charSkill,
                  mod: charSkill,
                  modtype: "Skill Rank",
                  value: 1,
                };
              }
            });
          }

          const funcGetTalent = async (characterSpecTalent, itemId) => {
            if (characterSpecTalent.Purchased) {
              let output = {
                isRanked: false,
                rank: 0,
                activation: "Passive",
                islearned: false,
              };

              try {
                const talent = await this.findCompendiumEntityById("Item", itemId);
                if (talent) {
                  output.isRanked = talent.system.ranks.ranked;
                  output.rank = talent.system.ranks.current;
                  output.activation = talent.system.activation.value;
                }
                output.islearned = true;
              } catch (err) {
                CONFIG.logger.error(`Unable to add specialization ${characterSpecTalent.Key} to character.`, err);
              }
              return output;
            }
            return undefined;
          };
          let specTotal = 1;
          let specCount = 0;

          const updateDialogSpecialization = (count, total) => {
            let miniValue = Math.trunc((count / total) * 10);
            updateDialog(30 + miniValue);
          };

          if (!Array.isArray(characterData.Character.Specializations.CharSpecialization)) {
            characterData.Character.Specializations.CharSpecialization = [characterData.Character.Specializations.CharSpecialization];
          }

          if (characterData?.Character?.Specializations?.CharSpecialization?.length) {
            specTotal = characterData.Character.Specializations.CharSpecialization.length;
            updateDialogSpecialization(specCount, specTotal);
            await this.asyncForEach(characterData.Character.Specializations.CharSpecialization, async (spec) => {
              if (spec.isStartingSpec && spec.isStartingSpec === "true") {
                specTotal += spec.Talents.CharTalent.length;
                for (let i = 0; i < spec.Talents.CharTalent.length; i += 1) {
                  const talent = await funcGetTalent(spec.Talents.CharTalent[i], specialization.system.talents[`talent${i}`].itemId);
                  if (talent) {
                    specialization.system.talents[`talent${i}`] = { ...specialization.system.talents[`talent${i}`], ...talent };

                    if (spec.Talents.CharTalent[i]?.BonusChars?.BonusChar) {
                      if (Array.isArray(spec.Talents.CharTalent[i]?.BonusChars?.BonusChar)) {
                        await this.asyncForEach(spec.Talents.CharTalent[i].BonusChars.BonusChar, async (char) => {
                          let attrId = Object.keys(specialization.system.talents[`talent${i}`].attributes).length + 1;

                          specialization.system.talents[`talent${i}`].attributes[`attr${attrId}`] = {
                            isCheckbox: false,
                            mod: this.convertOGCharacteristic(char.CharKey),
                            modtype: "Characteristic",
                            value: char.Bonus,
                          };
                        });
                      } else {
                        let attrId = Object.keys(specialization.system.talents[`talent${i}`].attributes).length + 1;

                        specialization.system.talents[`talent${i}`].attributes[`attr${attrId}`] = {
                          isCheckbox: false,
                          mod: this.convertOGCharacteristic(spec.Talents.CharTalent[i].BonusChars.BonusChar.CharKey),
                          modtype: "Characteristic",
                          value: spec.Talents.CharTalent[i].BonusChars.BonusChar.Bonus,
                        };
                      }
                    }
                  }
                  specCount += 1;
                  updateDialogSpecialization(specCount, specTotal);
                }

                specCount += 1;
                updateDialogSpecialization(specCount, specTotal);

                let specializationItem = character.items.find((s) => s.flags.starwarsffg.ffgimportid === specialization.flags.starwarsffg.ffgimportid);

                if (specializationItem) {
                  specializationItem = mergeObject(specialization, specializationItem);
                } else {
                  character.items.push(specialization);
                }
              } else {
                try {
                  let newspec = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", spec.Key, undefined, "specialization")));
                  specTotal += spec.Talents.CharTalent.length;
                  updateDialogSpecialization(specCount, specTotal);
                  for (let i = 0; i < spec.Talents.CharTalent.length; i += 1) {
                    const talent = await funcGetTalent(spec.Talents.CharTalent[i], newspec.system.talents[`talent${i}`].itemId);
                    if (talent) {
                      newspec.system.talents[`talent${i}`] = { ...newspec.system.talents[`talent${i}`], ...talent };

                      if (spec.Talents.CharTalent[i]?.BonusChars?.BonusChar) {
                        if (Array.isArray(spec.Talents.CharTalent[i]?.BonusChars?.BonusChar)) {
                          await this.asyncForEach(spec.Talents.CharTalent[i].BonusChars.BonusChar, async (char) => {
                            let attrId = Object.keys(newspec.system.talents[`talent${i}`].attributes).length + 1;

                            newspec.system.talents[`talent${i}`].attributes[`attr${attrId}`] = {
                              isCheckbox: false,
                              mod: this.convertOGCharacteristic(char.CharKey),
                              modtype: "Characteristic",
                              value: char.Bonus,
                            };
                          });
                        } else {
                          let attrId = Object.keys(newspec.system.talents[`talent${i}`].attributes).length + 1;

                          newspec.system.talents[`talent${i}`].attributes[`attr${attrId}`] = {
                            isCheckbox: false,
                            mod: this.convertOGCharacteristic(spec.Talents.CharTalent[i].BonusChars.BonusChar.CharKey),
                            modtype: "Characteristic",
                            value: spec.Talents.CharTalent[i].BonusChars.BonusChar.Bonus,
                          };
                        }
                      }
                    }
                    specCount += 1;
                    updateDialogSpecialization(specCount, specTotal);
                  }

                  let specializationItem = character.items.find((s) => s.flags.starwarsffg.ffgimportid === newspec.flags.starwarsffg.ffgimportid);

                  if (specializationItem) {
                    specializationItem = mergeObject(newspec, specializationItem);
                  } else {
                    character.items.push(newspec);
                  }
                } catch (err) {
                  CONFIG.logger.error(`Unable to add specialization ${spec.Key} to character.`);
                }
                specCount += 1;
                updateDialogSpecialization(specCount, specTotal);
              }
            });
          }
        }
      } catch (err) {
        CONFIG.logger.error(`Unable to add specializations to character.`, err);
      }

      updateDialog(40);

      await this.asyncForEach(forcepowers, async (power) => {
        try {
          let force = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", power.Key, undefined, "forcepower")));
          for (let i = 4; i < power.ForceAbilities.CharForceAbility.length; i += 1) {
            if (power.ForceAbilities.CharForceAbility[i].Purchased) {
              force.system.upgrades[`upgrade${i - 4}`].islearned = true;
            }
          }

          let forceItem = character.items.find((s) => s.flags.starwarsffg.ffgimportid === force.flags.starwarsffg.ffgimportid);

          if (forceItem) {
            forceItem = mergeObject(force, forceItem);
          } else {
            character.items.push(force);
          }
        } catch (err) {
          CONFIG.logger.error(`Unable to add force power ${forcepowers.Key} to character.`, err);
        }
      });

      updateDialog(50);

      if (characterData.Character?.Weapons?.CharWeapon) {
        if (!Array.isArray(characterData.Character.Weapons.CharWeapon)) {
          characterData.Character.Weapons.CharWeapon = [characterData.Character.Weapons.CharWeapon];
        }
        await this.asyncForEach(characterData.Character.Weapons.CharWeapon, async (w) => {
          try {
            const weapon = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", w.ItemKey, undefined, "weapon")));
            delete weapon._id;

            const weaponItems = character.items.filter((s) => s.flags.starwarsffg.ffgimportid === weapon.flags.starwarsffg.ffgimportid);

            if (weaponItems.length > 0) {
              for (let i = 0; i < character.items.length; i += 1) {
                if (character.items[i].type === "weapon" && character.items[i].flags.starwarsffg.ffgimportid === weapon.flags.starwarsffg.ffgimportid) {
                  character.items[i] = foundry.utils.mergeObject(weapon, character.items[i]);
                }
              }
            } else {
              if (w?.Count) {
                w.Count = parseInt(w.Count, 10);
              } else {
                w.Count = 1;
              }

              await this.asyncForEach(new Array(parseInt(w.Count, 10)), () => {
                character.items.push(weapon);
              });
            }
          } catch (err) {
            if (w.ItemKey?.length) {
              CONFIG.logger.error(`Unable to add weapon (${w.ItemKey}) to character.`, err);
            }
          }
        });
      }

      updateDialog(60);

      if (characterData.Character?.Armor?.CharArmor) {
        if (!Array.isArray(characterData.Character.Armor.CharArmor)) {
          characterData.Character.Armor.CharArmor = [characterData.Character.Armor.CharArmor];
        }

        await this.asyncForEach(characterData.Character.Armor.CharArmor, async (w) => {
          try {
            const armor = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", w.ItemKey, undefined, "armour")));
            delete armor._id;
            const armorItems = character.items.filter((s) => s.flags.starwarsffg.ffgimportid === armor.flags.starwarsffg.ffgimportid);

            if (armorItems.length > 0) {
              for (let i = 0; i < character.items.length; i += 1) {
                if (character.items[i].type === "armor" && character.items[i].flags.starwarsffg.ffgimportid === armor.flags.starwarsffg.ffgimportid) {
                  character.items[i] = mergeObject(armor, character.items[i]);
                }
              }
            } else {
              if (w?.Count) {
                w.Count = parseInt(w.Count, 10);
              } else {
                w.Count = 1;
              }

              await this.asyncForEach(new Array(parseInt(w.Count, 10)), () => {
                character.items.push(armor);
              });
            }
          } catch (err) {
            CONFIG.logger.error(`Unable to add armor (${w.ItemKey}) to character.`, err);
          }
        });
      }

      updateDialog(70);

      if (characterData.Character?.Gear?.CharGear) {
        if (!Array.isArray(characterData.Character.Gear.CharGear)) {
          characterData.Character.Gear.CharGear = [characterData.Character.Gear.CharGear];
        }
        await this.asyncForEach(characterData.Character.Gear.CharGear, async (w) => {
          try {
            const gear = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", w.ItemKey, undefined, "gear")));
            delete gear._id;

            let gearItem = character.items.find((s) => s.flags.starwarsffg.ffgimportid === gear.flags.starwarsffg.ffgimportid);

            let gearCount = 1;
            if (w?.Count) {
              gearCount = parseInt(w.Count, 10);
              gear.system.quantity = {
                value: gearCount,
              };
            }

            if (gearItem) {
              gearItem = mergeObject(gear, gearItem);
              gear.system.quantity.value = gearCount;
            } else {
              character.items.push(gear);
            }
          } catch (err) {
            CONFIG.logger.error(`Unable to add gear (${w.ItemKey}) to character.`, err);
          }
        });
      }

      updateDialog(80);

      try {
        const serverPath = `worlds/${game.world.id}/images/characters`;
        await ImportHelpers.verifyPath("data", serverPath);

        const imge = characterData.Character.Portrait;
        if (imge) {
          const img = this.b64toBlob(imge);
          const i = new File([img], `${characterData.Character.Key}.png`, { type: "image/png" });
          await Helpers.UploadFile("data", serverPath, i, { bucket: null });
          character.img = `${serverPath}/${characterData.Character.Key}.png`;
        }
      } catch (err) {
        CONFIG.logger.error(`Failed to upload character portrait.`, err);
      }

      updateDialog(90);

      character = prep_for_v10(character);

      if (exists) {
        // v10 no longer allows you to clobber existing actors with mismatched items, so we rename the actor and make a new one
        character.name += " " + String(new Date().toLocaleString());
      }

      await Actor.create(character);

      updateDialog(100);
    } catch (err) {
      CONFIG.logger.error(`Error while importing character`, err);
      ui.notifications.error("An error occured while import character!");
    }

    CONFIG.temporary = {};
  }

  static b64toBlob = (b64Data, contentType, sliceSize) => {
    contentType = contentType || "";
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      var slice = byteCharacters.slice(offset, offset + sliceSize);

      var byteNumbers = new Array(slice.length);
      for (var i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      var byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, { type: contentType });
    return blob;
  };

  static stringToXml = (s) => {
    let data = s.replace(/^\uFEFF/, "");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, "text/xml");

    return xmlDoc;
  };

  /**
   * Read data from a user provided File object
   * @param {File} file           A File object
   * @return {Promise.<String>}   A Promise which resolves to the loaded text data
   */
  static readBlobFromFile(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = (ev) => {
        resolve(reader.result);
      };
      reader.onerror = (ev) => {
        reader.abort();
        reject();
      };
      reader.readAsBinaryString(file);
    });
  }

  static convertOGCharacteristic(value) {
    let type;

    switch (value) {
      case "BR":
        type = "Brawn";
        break;
      case "AG":
        type = "Agility";
        break;
      case "INT":
        type = "Intellect";
        break;
      case "CUN":
        type = "Cunning";
        break;
      case "WIL":
        type = "Willpower";
        break;
      case "PR":
        type = "Presence";
        break;
    }

    return type;
  }

  /**
   * Converts sources to text
   * @param  {} sources
   */
  static getSources(sources) {
    if (!sources) return "";

    let sourceArray = [];

    if (!sources?.Source) {
      sourceArray = [sources];
    } else {
      if (!Array.isArray(sources.Source)) {
        sourceArray = [sources.Source];
      } else {
        sourceArray = sources.Source;
      }
    }

    const text = sourceArray.map((s) => {
      if (s?.$Page) {
        return `[H4]Page ${s.$Page} - ${s._}[h4]`;
      } else {
        return `[H4]${s}[h4]`;
      }
    });

    const sourceText = `[P][H3]Sources:[h3]${text.join("")}`;

    return sourceText;
  }

  static prepareBaseObject(obj, type) {
    return {
      name: obj.Name,
      type,
      flags: {
        starwarsffg: {
          ffgimportid: obj.Key
        }
      },
      data: {},
    };
  }

  static async addImportItemToCompendium(type, data, pack, removeFirst) {
    let entry = await ImportHelpers.findCompendiumEntityByImportId(type, data.flags.starwarsffg.ffgimportid, pack.collection);
    let objClass;
    let dataType;
    switch (type) {
      case "Item": {
        objClass = Item;
        dataType = data.type;
        break;
      }
      case "JournalEntry": {
        objClass = JournalEntry;
        if (!data.img) {
          data.img = `icons/sundries/scrolls/scroll-rolled-white.webp`;
        }
        dataType = type;
        break;
      }
      case "Actor": {
        objClass = Actor;
        dataType = data.type;
        break;
      }
    }

    if (!entry) {
      let compendiumItem;
      CONFIG.logger.debug(`Importing ${type} ${dataType} ${data.name}`);
      data._id = foundry.utils.randomID();
      data.id = foundry.utils.randomID();
      data = migrateDataToSystem(data);
      switch (type) {
        case "Item":
          compendiumItem = await new CONFIG.Item.documentClass(data, { temporary: true });
          break;
        case "Actor":
          compendiumItem = await new CONFIG.Actor.documentClass(data, { temporary: true });
          break;
        case "JournalEntry":
          compendiumItem = await new CONFIG.JournalEntry.documentClass(data, { temporary: true });
          break;
        default:
          CONFIG.logger.error(`Unable to import item type ${type}, unhandled type.`);
      }
      CONFIG.logger.debug(`New ${type} ${dataType} ${data.name} : ${JSON.stringify(compendiumItem)}`);
      const crt = await pack.importDocument(compendiumItem);
      CONFIG.temporary[pack.collection][data.flags.starwarsffg.ffgimportid] = foundry.utils.deepClone(crt);
      return crt;
    } else {
      CONFIG.logger.debug(`Found existing ${type} ${dataType} ${data.name} : ${JSON.stringify(entry)}`);
      let upd;
      if (removeFirst) {
        await pack.delete(entry._id);
        let compendiumItem;
        CONFIG.logger.debug(`Importing ${type} ${dataType} ${data.name}`);
        switch (type) {
          case "Item":
            compendiumItem = await new CONFIG.Item.documentClass(data, { temporary: true });
            break;
          case "Actor":
            compendiumItem = await new CONFIG.Actor.documentClass(data, { temporary: true });
            break;
          case "JournalEntry":
            compendiumItem = await new CONFIG.JournalEntry.documentClass(data, { temporary: true });
            break;
          default:
            CONFIG.logger.error(`Unable to import item type ${type}, unhandled type.`);
        }

        compendiumItem = migrateDataToSystem(compendiumItem);
        CONFIG.logger.debug(`New ${type} ${dataType} ${data.name} : ${JSON.stringify(compendiumItem)}`);
        upd = await pack.importDocument(compendiumItem);
      } else {
        CONFIG.logger.debug(`Updating ${type} ${dataType} ${data.name}`);

        let updateData = data;
        updateData["_id"] = entry._id;

        if (updateData?.data?.attributes) {
          // Remove and repopulate all modifiers
          if (entry.system?.attributes) {
            for (let k of Object.keys(entry.system.attributes)) {
              if (!updateData.data.attributes.hasOwnProperty(k)) updateData.data.attributes[`-=${k}`] = null;
            }
          }
        }
        if (updateData?.data?.specializations) {
          // Remove and repopulate all specializations
          if (entry.system?.specializations) {
            for (let k of Object.keys(entry.system.specializations)) {
              if (!updateData.data.specializations.hasOwnProperty(k)) updateData.data.specializations[`-=${k}`] = null;
            }
          }
        }
        if (updateData?.data?.talents) {
          // Remove and repopulate all talents
          if (entry.system?.talents) {
            for (let k of Object.keys(entry.system.talents)) {
              if (!updateData.data.talents.hasOwnProperty(k)) updateData.data.talents[`-=${k}`] = null;
            }
          }
        }

        upd = foundry.utils.duplicate(entry);
        updateData = migrateDataToSystem(updateData);
        CONFIG.logger.debug(`Updating ${type} ${dataType} ${data.name} : ${JSON.stringify(updateData)}`);
        try {
          await pack.get(updateData._id).update(updateData);
          // update here does not return the UUID, so retrieve the item from the pack to get it
          const updatedItem = await pack.get(updateData._id);
          upd.uuid = updatedItem.uuid;
        } catch (e) {
          CONFIG.logger.error(`Failed to update ${type} ${dataType} ${data.name} : ${e.toString()}`);
        }
        if (upd.data) {
          upd.data = foundry.utils.mergeObject(upd.data, data.data);
        }
      }
      upd = migrateDataToSystem(upd);
      CONFIG.temporary[pack.collection][data.flags.starwarsffg.ffgimportid] = upd;
      return upd;
    }
  }

  static async getCompendiumPack(type, name) {
    CONFIG.logger.debug(`Checking for existing compendium pack ${name}`);
    const searchName = "starwarsffg." + name.toString().replaceAll(".", "").toLowerCase();
    const pack = game.packs.get(searchName);
    if (!pack) {
      return ui.notifications.error(`Could not find compendium pack ${name}! (try restarting Foundry)`);
    } else {
      await pack.configure({locked: false});
    }

    return pack;
  }

  static processCharacteristicMod(mod) {
    const modtype = "Characteristic";
    const type = ImportHelpers.convertOGCharacteristic(mod.Key);

    return {
      type,
      value: {
        mod: type,
        modtype,
        value: mod?.Count ? parseInt(mod.Count, 10) : 0,
      },
    };
  }

  static processSkillMod(mod, isDescriptor) {
    let type;
    let modtype;
    let value = mod?.Count ? parseInt(mod.Count, 10) : 0;

    if (isDescriptor) {
      // handle description modifiers ** Experimental **
      Object.keys(mod).forEach((m) => {
        value = parseInt(mod[m], 10);
        switch (m) {
          case "BoostCount": {
            modtype = "Roll Modifiers";
            type = "Add Boost";
          }
        }
      });
    } else {
      if (mod.SkillIsCareer) {
        modtype = "Career Skill";
      } else if (mod.BoostCount || mod.SetbackCount || mod.AddSetbackCount || mod.ForceCount || mod.AdvantageCount || mod.ThreatCount || mod.SuccessCount || mod.FailureCount) {
        modtype = "Skill Boost";

        if (mod.AddSetbackCount) {
          modtype = "Skill Setback";
          value = parseInt(mod.AddSetbackCount, 10);
        }
        if (mod.SetbackCount) {
          modtype = "Skill Remove Setback";
          value = parseInt(mod.SetbackCount, 10);
        }
        if (mod.BoostCount) {
          value = parseInt(mod.BoostCount, 10);
        }
        if (mod.AdvantageCount) {
          modtype = "Skill Add Advantage";
          value = parseInt(mod.AdvantageCount, 10);
        }
        if (mod.ThreatCount) {
          modtype = "Skill Add Threat";
          value = parseInt(mod.ThreatCount, 10);
        }
        if (mod.SuccessCount) {
          modtype = "Skill Add Success";
          value = parseInt(mod.SuccessCount, 10);
        }
        if (mod.FailureCount) {
          modtype = "Skill Add Failure";
          value = parseInt(mod.FailureCount, 10);
        }
      } else {
        modtype = "Skill Rank";
      }
      if (mod.Key) {
        let skill = CONFIG.temporary.skills[mod.Key];

        if (skill.includes(":") && !skill.includes(": ")) {
          skill = skill.replace(":", ": ");
        }

        if (Object.keys(CONFIG.FFG.skills).includes(skill)) {
          type = CONFIG.temporary.skills[mod.Key];
        }
      } else if (mod?.Skill) {
        type = mod.Skill;
      }
    }
    if (type) {
      return { type, value: { mod: type, modtype, value } };
    }
  }

  static async processDieMod(mod) {
    if (!Array.isArray(mod.DieModifier)) {
      mod.DieModifier = [mod.DieModifier];
    }

    let output = {
      attributes: {},
    };

    await ImportHelpers.asyncForEach(mod.DieModifier, async (dieMod) => {
      if (!dieMod) {
        return;
      } else if (dieMod.SkillKey) {
        // this is a skill modifier
        const skillModifier = ImportHelpers.processSkillMod({ Key: dieMod.SkillKey, ...dieMod });
        output.attributes[skillModifier.type] = skillModifier.value;
      } else if (dieMod.SkillChar) {
        // this is a skill modifier based on characteristic (ex all Brawn skills);
        const skillTheme = await game.settings.get("starwarsffg", "skilltheme");
        const allSkillsLists = await game.settings.get("starwarsffg", "arraySkillList");
        const skills = allSkillsLists.find((i) => i.id === skillTheme).skills;
        const characteristicSkills = Object.keys(skills).filter((s) => skills[s].characteristic === ImportHelpers.convertOGCharacteristic(dieMod.SkillChar));

        characteristicSkills.forEach((cs) => {
          const skillModifier = ImportHelpers.processSkillMod({ Skill: cs, ...dieMod });

          if (output.attributes[skillModifier.type]) {
            output.attributes[skillModifier.type].value += skillModifier.value.value;
          } else {
            output.attributes[skillModifier.type] = skillModifier.value;
          }
        });
      } else if (dieMod.SkillType) {
        const skillTheme = await game.settings.get("starwarsffg", "skilltheme");
        const allSkillsLists = await game.settings.get("starwarsffg", "arraySkillList");
        const skills = allSkillsLists.find((i) => i.id === skillTheme).skills;
        const characteristicSkills = Object.keys(skills).filter((s) => skills[s].type.toLowerCase() === dieMod.SkillType.toLowerCase());

        characteristicSkills.forEach((cs) => {
          const skillModifier = ImportHelpers.processSkillMod({ Skill: cs, ...dieMod });

          if (output.attributes[skillModifier.type]) {
            output.attributes[skillModifier.type].value += skillModifier.value.value;
          } else {
            output.attributes[skillModifier.type] = skillModifier.value;
          }
        });
      } else {
        const skillModifier = ImportHelpers.processSkillMod({ Key: dieMod.SkillKey, ...dieMod }, true);
        output.attributes[skillModifier.type] = skillModifier.value;
      }
    });

    return output;
  }

  static async processModsData(modifiersData) {
    let output = {
      attributes: {},
      description: "",
      itemattachment: [],
      itemmodifier: [],
    };

    if (modifiersData?.Mod || modifiersData?.Quality) {
      let mods;
      if (modifiersData?.Mod) {
        if (!Array.isArray(modifiersData.Mod)) {
          mods = [modifiersData.Mod];
        } else {
          mods = modifiersData.Mod;
        }
      } else {
        if (!Array.isArray(modifiersData.Quality)) {
          mods = [modifiersData.Quality];
        } else {
          mods = modifiersData.Quality;
        }
      }
      let unique_mods = 0;
      await this.asyncForEach(mods, async (modifier) => {
        if (modifier.Key) {
          // this is a characteristic or stat or skill or quality modifier.
          if (["BR", "AG", "INT", "CUN", "WIL", "PR"].includes(modifier.Key)) {
            // this is a characteristic modifier
            const attribute = ImportHelpers.processCharacteristicMod(modifier);

            output.attributes[attribute.type] = attribute.value;
          } else {
            const compendiumEntry = await ImportHelpers.findCompendiumEntityByImportId("Item", modifier.Key);
            if (compendiumEntry) {
              if (compendiumEntry?.type === "itemmodifier") {
                const descriptor = foundry.utils.duplicate(compendiumEntry);
                descriptor.id = foundry.utils.randomID();
                descriptor.system.rank = modifier?.Count ? parseInt(modifier.Count, 10) : 1;
                output.itemmodifier.push(descriptor);
                let rank = "";
                if (descriptor.system.rank > 1) {
                  rank = `${game.i18n.localize("SWFFG.Count")} ${descriptor.system.rank}`;
                }
                output.description += `<div>${descriptor.name} - ${descriptor.system.description} ${rank}</div>`;
              }
            } else if (Object.keys(CONFIG.temporary.skills).includes(modifier.Key)) {
              // this is a skill upgrade
              const skillModifier = ImportHelpers.processSkillMod(modifier);
              if (skillModifier) {
                output.attributes[skillModifier.type] = skillModifier.value;
              }
            } else {
              CONFIG.logger.warn(`${modifier.Key} not found`);
            }
          }
        } else if (modifier.DieModifiers) {
          // this is a die modifier
          const dieModifiers = await ImportHelpers.processDieMod(modifier.DieModifiers);
          output.attributes = foundry.utils.mergeObject(output.attributes, dieModifiers.attributes);
        } else {
          unique_mods++;
          // this is just a text modifier
          const unique = {
            name: `Unique Mod ${unique_mods}`,
            type: "itemmodifier",
            system: {
              description: modifier.MiscDesc,
              attributes: {},
              type: "all",
              rank: modifier?.Count ? parseInt(modifier.Count, 10) : 1,
            },
          };
          const descriptor = await Item.create(
              unique,
              { temporary: true }
          );
          let rank = "";
          if (unique.system.rank > 1) {
            rank = `${game.i18n.localize("SWFFG.Count")} ${unique.system.rank}`;
          }

          output.description += `<div>${unique.system.description} ${rank}</div>`;
          output.itemmodifier.push(descriptor);
        }
      });
    }
    return output;
  }

  static async processMods(obj) {
    let output = {};

    if (obj?.BaseMods?.Mod) {
      output.baseMods = await ImportHelpers.processModsData(obj.BaseMods);
    }

    if (obj?.AddedMods?.Mod) {
      output.addedMods = await ImportHelpers.processModsData(obj.AddedMods);
    }

    if (obj?.Qualities?.Quality) {
      output.qualities = await ImportHelpers.processModsData(obj.Qualities);
    }

    return output;
  }

  static processStatMod(mod) {
    let attributes = {};
    if (mod) {
      Object.keys(mod).forEach((m) => {
        const value = parseInt(mod[m], 10);
        const modtype = "Stat";
        let type;
        switch (m) {
          case "SoakValue": {
            type = "Soak";
            break;
          }
          case "ForceRating": {
            type = "ForcePool";
            break;
          }
          case "StrainThreshold": {
            type = "Strain";
            break;
          }
          case "DefenseRanged": {
            type = "Defence-Ranged";
            break;
          }
          case "DefenseMelee": {
            type = "Defence-Melee";
            break;
          }
          case "WoundThreshold": {
            type = "Wounds";
            break;
          }
        }

        if (type) {
          attributes[foundry.utils.randomID()] = { mod: type, modtype, value };
        }
      });
    }

    return attributes;
  }

  static processCareerSkills(skills, includeRank) {
    let attributes = {};
    if (skills?.Key) {
      if (!Array.isArray(skills.Key)) {
        skills.Key = [skills.Key];
      }

      skills.Key.forEach((skill) => {
        let mod = CONFIG.temporary.skills[skill];
        if (mod) {
          if (mod.includes(":") && !mod.includes(": ")) {
            mod = mod.replace(":", ": ");
          }

          if (Object.keys(CONFIG.FFG.skills).includes(mod)) {
            if (mod) {
              const modtype = "Career Skill";
              attributes[foundry.utils.randomID()] = { mod, modtype, value: true };

              if (includeRank) {
                attributes[foundry.utils.randomID()] = { mod, modtype: "Skill Rank", value: 0 };
              }
            } else {
              CONFIG.logger.warn(`Skill ${skill} was not found in the current skills list.`);
            }
          }
        } else {
          CONFIG.logger.warn(`Skill ${skill} was not found in the current skills list.`);
        }
      });
    }

    return attributes;
  }

  static async getTemplate(type) {
    const response = await fetch("systems/starwarsffg/template.json");
    const template = await response.json();

    const obj = Object.values(template).find((i) => i.types.includes(type));

    let item = obj[type];

    if (item.templates) {
      item.templates.forEach((i) => {
        item = foundry.utils.mergeObject(item, obj.templates[i]);
      });
      delete item.templates;
    }

    return item;
  }
}

/*
  Rather than update the functions to reflect v10, simply modify the resulting data structure to reflect the expected
    format
 */
function prep_for_v10(actor) {
  actor.system = actor.data;
  // iterate over items so we can iterate over their modifiers
  actor.items.forEach(function (item) {
    if (item.system.hasOwnProperty('itemmodifier')) {
      item.system?.itemmodifier.forEach(function (modifier) {
        if (modifier) { // handle null modifiers (often from bad input)
          modifier.system = modifier.data;
        }
      });
    }
  });
  return actor;
}
