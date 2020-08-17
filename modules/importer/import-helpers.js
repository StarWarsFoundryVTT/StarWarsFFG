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
      await ImportHelpers.verifyPath("data", serverPath);
      const img = await zip.file(path).async("uint8array");
      const i = new File([img], filename);
      await FilePicker.upload("data", `${serverPath}`, i, { bucket: null });
      return `${serverPath}/${filename}`;
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
      return item.flags.importid === id;
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
  static async findCompendiumEntityByImportId(type, id, packId) {
    const cachePack = async (packid) => {
      if (!CONFIG.temporary[packid]) {
        const pack = await game.packs.get(packid);
        if (pack.entity === type && !pack.locked) {
          CONFIG.logger.debug(`Caching pack content ${packid}`);
          CONFIG.temporary[packid] = {};

          const content = await pack.getContent();
          for (var i = 0; i < content.length; i++) {
            CONFIG.temporary[packid][content[i].data.flags.importid] = content[i];
          }
        }
      } else {
        CONFIG.logger.debug(`Using cached content for ${packid}`);
      }

      if (CONFIG.temporary?.[packid]?.[id]) {
        return packid;
      }
      return undefined;
    };

    // first try finding item by import id in normal items
    const item = this.findEntityByImportId("items", id);
    if (item) {
      return item;
    }

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
    let value = mod?.count ? parseInt(mod.Count, 10) : 0;

    if (["BR", "AG", "INT", "CUN", "WIL", "PR"].includes(mod.Key)) {
      modtype = "Characteristic";
      switch (mod.Key) {
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
    }

    if (Object.keys(CONFIG.temporary.skills).includes(mod.Key)) {
      if (mod.SkillIsCareer) {
        modtype = "Career Skill";
      } else if (mod.BoostCount || mod.SetbackCount || mod.AddSetbackCount) {
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
      } else {
        modtype = "Skill Rank";
      }
      type = CONFIG.temporary.skills[mod.Key];
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
      if (Array.isArray(attrs.Mod.DieModifiers.DieModifier)) {
        attrs.Mod.DieModifiers.DieModifier.forEach((mod) => {
          const attr = this.getBaseModAttributeObject({
            Key: mod.SkillKey,
            ...mod,
          });
          if (attr) {
            itemAttributes[attr.type] = attr.value;
          }
        });
      } else {
        const attr = this.getBaseModAttributeObject({
          Key: attrs.Mod.DieModifiers.DieModifier.SkillKey,
          ...attrs.Mod.DieModifiers.DieModifier,
        });
        if (attr) {
          itemAttributes[attr.type] = attr.value;
        }
      }
    }

    return itemAttributes;
  }

  static asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index += 1) {
      await callback(array[index], index, array);
    }
  };

  static async characterImport(data) {
    const domparser = new DOMParser();
    const xmlDoc = domparser.parseFromString(data, "text/xml");
    const characterData = JXON.xmlToJs(xmlDoc);

    if (!CONFIG.temporary) {
      CONFIG.temporary = {};
    }

    let character = {
      name: characterData.Character.Description.CharName,
      type: "character",
      flags: {
        importid: characterData.Character.Key,
      },
      data: {
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
          total: parseInt(characterData.Character.Experience.ExperienceRanks.StartingRanks, 10) + parseInt(characterData.Character.Experience.ExperienceRanks.SpeciesRanks, 10) + parseInt(characterData.Character.Experience.ExperienceRanks.PurchasedRanks, 10),
          available: parseInt(characterData.Character.Experience.ExperienceRanks.StartingRanks, 10) + parseInt(characterData.Character.Experience.ExperienceRanks.SpeciesRanks, 10) + parseInt(characterData.Character.Experience.ExperienceRanks.PurchasedRanks, 10) - parseInt(characterData.Character.Experience.ExperienceRanks.UsedExperience, 10),
        },
      },
      items: [],
    };

    characterData.Character.Characteristics.CharCharacteristic.forEach((char) => {
      if (char.Rank?.PurchasedRanks) {
        character.data.characteristics[char.Name].value = parseInt(char.Rank.PurchasedRanks, 10);
      }
    });

    const skills = characterData.Character.Skills.CharSkill.filter((skill) => skill.Rank?.PurchasedRanks || skill.isCareer === "true");

    skills.forEach((skill) => {
      let charSkill = Object.keys(character.data.skills).find((s) => character.data.skills[s].Key === skill.Key);

      if (skill.isCareer) {
        character.data.skills[charSkill].careerskill = true;
      }
      if (skill.Rank?.PurchasedRanks) {
        character.data.skills[charSkill].rank = parseInt(skill.Rank.PurchasedRanks, 10);
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

    const species = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", characterData.Character.Species.SpeciesKey)));
    const career = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", characterData.Character.Career.CareerKey)));
    const specialization = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", characterData.Character.Career.StartingSpecKey)));

    characterData.Character.Career.CareerSkills.Key.forEach((key) => {
      let charSkill = Object.keys(character.data.skills).find((s) => character.data.skills[s].Key === key);
      let attrId = Object.keys(career.data.attributes).find((attr) => career.data.attributes[attr].modtype === "Skill Rank" && career.data.attributes[attr].mod === charSkill);

      if (career.data.attributes?.[attrId]?.value) {
        career.data.attributes[attrId].value += 1;
      } else {
        career.data.attributes[attrId] = {
          value: 1,
        };
      }
    });

    characterData.Character.Career.CareerSpecSkills.Key.forEach((key) => {
      let charSkill = Object.keys(character.data.skills).find((s) => character.data.skills[s].Key === key);
      let attrId = Object.keys(specialization.data.attributes).find((attr) => specialization.data.attributes[attr].modtype === "Skill Rank" && specialization.data.attributes[attr].mod === charSkill);

      if (specialization.data.attributes?.[attrId]?.value) {
        specialization.data.attributes[attrId].value += 1;
      } else {
        specialization.data.attributes[attrId] = {
          value: 1,
        };
      }
    });

    if (Array.isArray(characterData.Character.Specializations.CharSpecialization)) {
      await this.asyncForEach(characterData.Character.Specializations.CharSpecialization, async (spec) => {
        if (spec.isStartingSpec && spec.isStartingSpec === "true") {
          for (let i = 0; i < spec.Talents.CharTalent.length; i += 1) {
            if (spec.Talents.CharTalent[i].Purchased) {
              specialization.data.talents[`talent${i}`].islearned = true;
            }
          }
          character.items.push(specialization);
        } else {
          const newspec = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", spec.Key)));
          if (newspec) {
            for (let i = 0; i < spec.Talents.CharTalent.length; i += 1) {
              if (spec.Talents.CharTalent[i].Purchased) {
                newspec.data.talents[`talent${i}`].islearned = true;
              }
            }

            character.items.push(newspec);
          }
        }
      });
    } else {
      for (let i = 0; i < characterData.Character.Specializations.CharSpecialization.Talents.CharTalent.length; i += 1) {
        if (characterData.Character.Specializations.CharSpecialization.Talents.CharTalent[i].Purchased) {
          specialization.data.talents[`talent${i}`].islearned = true;
        }
      }
      character.items.push(specialization);
    }

    await this.asyncForEach(forcepowers, async (power) => {
      const force = JSON.parse(JSON.stringify(await this.findCompendiumEntityByImportId("Item", power.Key)));

      for (let i = 4; i < power.ForceAbilities.CharForceAbility.length; i += 1) {
        if (power.ForceAbilities.CharForceAbility[i].Purchased) {
          force.data.upgrades[`upgrade${i - 4}`].islearned = true;
        }
      }

      character.items.push(force);
    });

    character.items.push(species);
    character.items.push(career);

    if (characterData.Character?.Weapons?.CharWeapon) {
      if (Array.isArray(characterData.Character.Weapons.CharWeapon)) {
        await this.asyncForEach(characterData.Character.Weapons.CharWeapon, async (w) => {
          const weapon = await this.findCompendiumEntityByImportId("Item", w.ItemKey);
          if (weapon) {
            character.items.push(weapon);
          }
        });
      } else {
        const weapon = await this.findCompendiumEntityByImportId("Item", characterData.Character.Weapons.CharWeapon.ItemKey);
        if (weapon) {
          character.items.push(weapon);
        }
      }
    }

    if (characterData.Character?.Armor?.CharArmor) {
      if (Array.isArray(characterData.Character.Armor.CharArmor)) {
        await this.asyncForEach(characterData.Character.Armor.CharArmor, async (w) => {
          const armor = await this.findCompendiumEntityByImportId("Item", w.ItemKey);
          if (armor) {
            character.items.push(armor);
          }
        });
      } else {
        const armor = await this.findCompendiumEntityByImportId("Item", characterData.Character.Armor.CharArmor.ItemKey);
        if (armor) {
          character.items.push(armor);
        }
      }
    }

    if (characterData.Character?.Gear?.CharGear) {
      if (Array.isArray(characterData.Character.Gear.CharGear)) {
        await this.asyncForEach(characterData.Character.Gear.CharGear, async (w) => {
          const gear = await this.findCompendiumEntityByImportId("Item", w.ItemKey);
          if (gear) {
            character.items.push(gear);
          }
        });
      } else {
        const gear = await this.findCompendiumEntityByImportId("Item", characterData.Character.Gear.CharGear.ItemKey);
        if (gear) {
          character.items.push(gear);
        }
      }
    }

    const serverPath = `worlds/${game.world.id}/images/characters`;
    await ImportHelpers.verifyPath("data", serverPath);

    const imge = characterData.Character.Portrait;
    const img = this.b64toBlob(imge);
    const i = new File([img], `${characterData.Character.Key}.png`);
    await FilePicker.upload("data", serverPath, i, { bucket: null });
    character.img = `${serverPath}/${characterData.Character.Key}.png`;

    const exists = game.data.actors.find((actor) => actor.flags.importid === characterData.Character.Key);
    if (exists) {
      //let updateData = ImportHelpers.buildUpdateData(character);
      let updateData = character;
      updateData["_id"] = exists._id;
      await Actor.update(updateData);
    } else {
      await Actor.create(character);
    }

    delete CONFIG.temporary;
  }

  static async characterImportDialog() {
    new Dialog(
      {
        title: `Import Character`,
        content: await renderTemplate("systems/starwarsffg/templates/actors/dialogs/ffg-import-data.html", { entity: this.entity, name: this.name }),
        buttons: {
          import: {
            icon: '<i class="fas fa-file-import"></i>',
            label: "Import",
            callback: async (html) => {
              const form = html.find("form")[0];
              if (!form.data.files.length) return ui.notifications.error("You did not upload a data file!");
              const text = await readTextFromFile(form.data.files[0]);
              await this.characterImport(text);
            },
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
          },
        },
        default: "import",
      },
      {
        width: 400,
      }
    ).render(true);
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
}
