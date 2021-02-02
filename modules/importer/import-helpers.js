import Helpers from "../helpers/common.js";

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
      return item.flags.ffgimportid === id;
    });
  }

  /**
   * Find a compendium entity by type an id
   * @param  {string} type - Entity type to search for
   * @param  {string} id - Entity Id
   * @returns {object} - Entity Object Data
   */
  static async findCompendiumEntityById(type, id) {
    let entity;

    let packs = Array.from(await game.packs.keys());
    for (let i = 0; i < packs.length; i += 1) {
      let packId = packs[i];
      const pack = await game.packs.get(packId);
      if (pack.entity === type) {
        await pack.getIndex();
        entity = await pack.index.find((e) => e._id === id);
        if (entity) {
          return await pack.getEntity(entity._id);
        }
      }
    }
  }

  /**
   * Find an entity by the import key.
   * @param  {string} type - Entity type to search for
   * @param  {string} id - Entity Id
   * @returns {object} - Entity Object Data
   */
  static async findCompendiumEntityByImportId(type, id, packId, itemType) {
    const cachePack = async (packid) => {
      if (!CONFIG.temporary[packid]) {
        const pack = await game.packs.get(packid);
        if (pack.entity === type && !pack.locked) {
          CONFIG.logger.debug(`Caching pack content ${packid}`);
          CONFIG.temporary[packid] = {};

          const content = await pack.getContent();
          for (var i = 0; i < content.length; i++) {
            CONFIG.temporary[packid][content[i].data.flags.ffgimportid] = duplicate(content[i]);
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

      let character = {
        name: characterName ? characterName : "No Name",
        type: "character",
        flags: {
          ffgimportid: characterData.Character.Key,
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
              value: parseInt(characterData.Character.Credits, 10),
            },
          },
          experience: {
            total: parseInt(characterData.Character.Experience.ExperienceRanks.StartingRanks ?? 0, 10) + parseInt(characterData.Character.Experience.ExperienceRanks.SpeciesRanks ?? 0, 10) + parseInt(characterData.Character.Experience.ExperienceRanks.PurchasedRanks ?? 0, 10),
            available: parseInt(characterData.Character.Experience.ExperienceRanks.StartingRanks ?? 0, 10) + parseInt(characterData.Character.Experience.ExperienceRanks.SpeciesRanks ?? 0, 10) + parseInt(characterData.Character.Experience.ExperienceRanks.PurchasedRanks ?? 0, 10) - parseInt(characterData.Character.Experience.UsedExperience ?? 0, 10),
          },
          obligationlist: {},
          dutylist: {},
          morality: {
            label: "Morality",
            strength: characterData.Character.Morality?.MoralityPairs?.MoralityPair?.StrengthKey,
            type: "Number",
            value: parseInt(characterData.Character.Morality.MoralityValue ?? 0, 10),
            weakness: characterData.Character.Morality?.MoralityPairs?.MoralityPair?.WeaknessKey,
          },
          biography: characterData.Character.Story,
          general: {
            age: characterData.Character.Description.Age,
            build: characterData.Character.Description.Build,
            eyes: characterData.Character.Description.Eyes,
            hair: characterData.Character.Description.Hair,
            features: characterData.Character.Description.OtherFeatures,
            height: characterData.Character.Description.Height,
            gender: characterData.Character.Description.Gender,
          },
        },
        items: [],
      };

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
        const x = await this.findCompendiumEntityByImportId("Item", characterData.Character.Species.SpeciesKey, undefined, "species");

        const species = JSON.parse(JSON.stringify(x));
        if (species) {
          for (let i = 0; i < speciesSkills.length; i += 1) {
            // first determine if the modifier exists, oggdudes doesn't differentiate between chosen skills (ie human) vs static skill (ie Nautolan)

            const found = Object.values(species.data.attributes).filter((attr) => attr.mod === speciesSkills[i].mod && attr.modtype === speciesSkills[i].modtype && attr.value === speciesSkills[i].value);

            if (!found?.length) {
              let attrId = Object.keys(species.data.attributes).length + 1;
              species.data.attributes[attrId] = speciesSkills[i];
            }
          }

          character.items.push(species);
        }
      } catch (err) {
        CONFIG.logger.error(`Unable to add species ${characterData.Character.Species.SpeciesKey} to character.`);
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
              let attrId = Object.keys(career.data.attributes).find((attr) => career.data.attributes[attr].modtype === "Skill Rank" && career.data.attributes[attr].mod === charSkill);

              if (career.data.attributes?.[attrId]?.value) {
                const careerValue = parseInt(career.data.attributes[attrId].value, 10);
                career.data.attributes[attrId].value = careerValue + 1;
                if (!career.data.attributes[attrId].key) {
                  career.data.attributes[attrId].key = charSkill;
                }
              } else {
                career.data.attributes[attrId] = {
                  key: charSkill,
                  mod: charSkill,
                  modtype: "Skill Rank",
                  value: 1,
                };
              }
            });
          }
          character.items.push(career);
        }
      } catch (err) {
        CONFIG.logger.error(`Unable to add career ${characterData.Character.Career.CareerKey} to character.`);
      }

      updateDialog(30);

      try {
        const specialization = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", characterData.Character.Career.StartingSpecKey, undefined, "specialization")));
        if (specialization) {
          if (characterData.Character.Career.CareerSpecSkills?.Key) {
            characterData.Character.Career.CareerSpecSkills.Key.forEach((key) => {
              let charSkill = Object.keys(character.data.skills).find((s) => character.data.skills[s].Key === key);
              let attrId = Object.keys(specialization.data.attributes).find((attr) => specialization.data.attributes[attr].modtype === "Skill Rank" && specialization.data.attributes[attr].mod === charSkill);

              if (specialization.data.attributes?.[attrId]?.value) {
                const specializationValue = parseInt(specialization.data.attributes[attrId].value, 10);
                specialization.data.attributes[attrId].value = specializationValue + 1;
                if (!specialization.data.attributes[attrId].key) {
                  specialization.data.attributes[attrId].key = charSkill;
                }
              } else {
                specialization.data.attributes[attrId] = {
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
                  output.isRanked = talent.data.data.ranks.ranked;
                  output.rank = talent.data.data.ranks.current;
                  output.activation = talent.data.data.activation.value;
                }
                output.islearned = true;
              } catch (err) {
                CONFIG.logger.error(`Unable to add specialization ${characterSpecTalent.Key} to character.`);
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

          if (Array.isArray(characterData.Character.Specializations.CharSpecialization)) {
            specTotal = characterData.Character.Specializations.CharSpecialization.length;
            updateDialogSpecialization(specCount, specTotal);
            await this.asyncForEach(characterData.Character.Specializations.CharSpecialization, async (spec) => {
              if (spec.isStartingSpec && spec.isStartingSpec === "true") {
                specTotal += spec.Talents.CharTalent.length;
                for (let i = 0; i < spec.Talents.CharTalent.length; i += 1) {
                  const talent = await funcGetTalent(spec.Talents.CharTalent[i], specialization.data.talents[`talent${i}`].itemId);
                  if (talent) {
                    specialization.data.talents[`talent${i}`] = { ...specialization.data.talents[`talent${i}`], ...talent };

                    if (spec.Talents.CharTalent[i]?.BonusChars?.BonusChar) {
                      if (Array.isArray(spec.Talents.CharTalent[i]?.BonusChars?.BonusChar)) {
                        await this.asyncForEach(spec.Talents.CharTalent[i].BonusChars.BonusChar, async (char) => {
                          let attrId = Object.keys(specialization.data.talents[`talent${i}`].attributes).length + 1;

                          specialization.data.talents[`talent${i}`].attributes[`attr${attrId}`] = {
                            isCheckbox: false,
                            mod: this.convertOGCharacteristic(char.CharKey),
                            modtype: "Characteristic",
                            value: char.Bonus,
                          };
                        });
                      } else {
                        let attrId = Object.keys(specialization.data.talents[`talent${i}`].attributes).length + 1;

                        specialization.data.talents[`talent${i}`].attributes[`attr${attrId}`] = {
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
                character.items.push(specialization);
              } else {
                try {
                  const newspec = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", spec.Key, undefined, "specialization")));
                  specTotal += spec.Talents.CharTalent.length;
                  updateDialogSpecialization(specCount, specTotal);
                  for (let i = 0; i < spec.Talents.CharTalent.length; i += 1) {
                    const talent = await funcGetTalent(spec.Talents.CharTalent[i], newspec.data.talents[`talent${i}`].itemId);
                    if (talent) {
                      newspec.data.talents[`talent${i}`] = { ...newspec.data.talents[`talent${i}`], ...talent };

                      if (spec.Talents.CharTalent[i]?.BonusChars?.BonusChar) {
                        if (Array.isArray(spec.Talents.CharTalent[i]?.BonusChars?.BonusChar)) {
                          await this.asyncForEach(spec.Talents.CharTalent[i].BonusChars.BonusChar, async (char) => {
                            let attrId = Object.keys(newspec.data.talents[`talent${i}`].attributes).length + 1;

                            newspec.data.talents[`talent${i}`].attributes[`attr${attrId}`] = {
                              isCheckbox: false,
                              mod: this.convertOGCharacteristic(char.CharKey),
                              modtype: "Characteristic",
                              value: char.Bonus,
                            };
                          });
                        } else {
                          let attrId = Object.keys(newspec.data.talents[`talent${i}`].attributes).length + 1;

                          newspec.data.talents[`talent${i}`].attributes[`attr${attrId}`] = {
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
                  character.items.push(newspec);
                } catch (err) {
                  CONFIG.logger.error(`Unable to add specialization ${spec.Key} to character.`);
                }
                specCount += 1;
                updateDialogSpecialization(specCount, specTotal);
              }
            });
          } else {
            specTotal += characterData.Character.Specializations.CharSpecialization.Talents.CharTalent.length;
            updateDialogSpecialization(specCount, specTotal);
            for (let i = 0; i < characterData.Character.Specializations.CharSpecialization.Talents.CharTalent.length; i += 1) {
              const talent = await funcGetTalent(characterData.Character.Specializations.CharSpecialization.Talents.CharTalent[i], specialization.data.talents[`talent${i}`].itemId);
              if (talent) {
                specialization.data.talents[`talent${i}`] = { ...specialization.data.talents[`talent${i}`], ...talent };

                if (characterData.Character.Specializations.CharSpecialization.Talents.CharTalent[i]?.BonusChars?.BonusChar) {
                  if (Array.isArray(characterData.Character.Specializations.CharSpecialization.Talents.CharTalent[i]?.BonusChars?.BonusChar)) {
                    await this.asyncForEach(characterData.Character.Specializations.CharSpecialization.Talents.CharTalent[i].BonusChars.BonusChar, async (char) => {
                      let attrId = Object.keys(specialization.data.talents[`talent${i}`].attributes).length + 1;

                      specialization.data.talents[`talent${i}`].attributes[`attr${attrId}`] = {
                        isCheckbox: false,
                        mod: this.convertOGCharacteristic(char.CharKey),
                        modtype: "Characteristic",
                        value: char.Bonus,
                      };
                    });
                  } else {
                    let attrId = Object.keys(specialization.data.talents[`talent${i}`].attributes).length + 1;

                    specialization.data.talents[`talent${i}`].attributes[`attr${attrId}`] = {
                      isCheckbox: false,
                      mod: this.convertOGCharacteristic(characterData.Character.Specializations.CharSpecialization.Talents.CharTalent[i].BonusChars.BonusChar.CharKey),
                      modtype: "Characteristic",
                      value: characterData.Character.Specializations.CharSpecialization.Talents.CharTalent[i].BonusChars.BonusChar.Bonus,
                    };
                  }
                }
              }
              specCount += 1;
              updateDialogSpecialization(specCount, specTotal);
            }
            specCount += 1;
            updateDialogSpecialization(specCount, specTotal);
            character.items.push(specialization);
          }
        }
      } catch (err) {
        CONFIG.logger.error(`Unable to add specializations to character.`);
      }

      updateDialog(40);

      await this.asyncForEach(forcepowers, async (power) => {
        try {
          const force = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", power.Key, undefined, "forcepower")));
          for (let i = 4; i < power.ForceAbilities.CharForceAbility.length; i += 1) {
            if (power.ForceAbilities.CharForceAbility[i].Purchased) {
              force.data.upgrades[`upgrade${i - 4}`].islearned = true;
            }
          }

          character.items.push(force);
        } catch (err) {
          CONFIG.logger.error(`Unable to add force power ${forcepowers.Key} to character.`);
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
            if (w?.Count) {
              weapon.data.quantity = {
                value: parseInt(w.Count, 10),
              };
            }
            character.items.push(weapon);
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
            if (w?.Count) {
              armor.data.quantity = {
                value: parseInt(w.Count, 10),
              };
            }
            character.items.push(armor);
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
            if (w?.Count) {
              gear.data.quantity = {
                value: parseInt(w.Count, 10),
              };
            }
            character.items.push(gear);
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

      const exists = game.data.actors.find((actor) => actor.flags.ffgimportid === characterData.Character.Key);
      if (exists) {
        //let updateData = ImportHelpers.buildUpdateData(character);
        let updateData = character;
        updateData["_id"] = exists._id;
        await Actor.update(updateData);
      } else {
        await Actor.create(character);
      }

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
        ffgimportid: obj.Key,
      },
      data: {},
    };
  }

  static async addImportItemToCompendium(type, data, pack) {
    let entry = await ImportHelpers.findCompendiumEntityByImportId(type, data.flags.ffgimportid, pack.collection);
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
      compendiumItem = new objClass(data, { temporary: true });
      CONFIG.logger.debug(`New ${type} ${dataType} ${data.name} : ${JSON.stringify(compendiumItem)}`);
      const crt = await pack.importEntity(compendiumItem);
      CONFIG.temporary[pack.collection][data.flags.ffgimportid] = duplicate(crt);
    } else {
      CONFIG.logger.debug(`Updating ${type} ${dataType} ${data.name}`);
      let updateData = data;
      updateData["_id"] = entry._id;

      if (updateData?.data?.attributes) {
        // Remove and repopulate all modifiers
        if (entry.data?.attributes) {
          for (let k of Object.keys(entry.data.attributes)) {
            if (!updateData.data.attributes.hasOwnProperty(k)) updateData.data.attributes[`-=${k}`] = null;
          }
        }
      }

      CONFIG.logger.debug(`Updating ${type} ${dataType} ${data.name} : ${JSON.stringify(updateData)}`);
      await pack.updateEntity(updateData);
      let upd = duplicate(entry);
      entry.data = mergeObject(entry.data, data.data);
      CONFIG.temporary[pack.collection][data.flags.ffgimportid] = upd;
    }
  }

  static async getCompendiumPack(type, name) {
    CONFIG.logger.debug(`Checking for existing compendium pack ${name}`);
    let pack = game.packs.find((p) => {
      return p.metadata.label === name;
    });
    if (!pack) {
      CONFIG.logger.debug(`Compendium pack ${name} not found, creating new`);
      pack = await Compendium.create({ entity: type, label: name });
    } else {
      CONFIG.logger.debug(`Existing compendium pack ${name} found`);
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
        const allSkillsLists = JSON.parse(await game.settings.get("starwarsffg", "arraySkillList"));
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
        const allSkillsLists = JSON.parse(await game.settings.get("starwarsffg", "arraySkillList"));
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
                const descriptor = duplicate(compendiumEntry);
                descriptor._id = randomID();
                descriptor.data.rank = modifier?.Count ? parseInt(modifier.Count, 10) : 1;
                output.itemmodifier.push(descriptor);
                let rank = "";
                if (descriptor.data.rank > 1) {
                  rank = `${game.i18n.localize("SWFFG.Count")} ${descriptor.data.rank}`;
                }
                output.description += `<div>${descriptor.name} - ${descriptor.data.description} ${rank}</div>`;
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
          output.attributes = mergeObject(output.attributes, dieModifiers.attributes);
        } else {
          // this is just a text modifier
          const unique = {
            name: "Unique Mod",
            type: "itemmodifier",
            data: {
              description: modifier.MiscDesc,
              attributes: {},
              type: "all",
              rank: modifier?.Count ? parseInt(modifier.Count, 10) : 1,
            },
          };
          const descriptor = new Item(unique, { temporary: true });
          descriptor.data._id = randomID();
          let rank = "";
          if (unique.data.rank > 1) {
            rank = `${game.i18n.localize("SWFFG.Count")} ${unique.data.rank}`;
          }

          output.description += `<div>${unique.data.description} ${rank}</div>`;
          output.itemmodifier.push(descriptor.data);
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
          attributes[randomID()] = { mod: type, modtype, value };
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
              attributes[randomID()] = { mod, modtype, value: true };

              if (includeRank) {
                attributes[randomID()] = { mod, modtype: "Skill Rank", value: 0 };
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
        item = mergeObject(item, obj.templates[i]);
      });
      delete item.templates;
    }

    return item;
  }
}
