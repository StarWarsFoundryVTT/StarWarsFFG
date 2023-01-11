import ItemBaseFFG from "../items/itembase-ffg.js";
import ImportHelpers from "./import-helpers.js";

export default class SWAImporter extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "swa-importer",
      classes: ["starwarsffg", "data-import"],
      title: "Adversaries Importer",
      template: "systems/starwarsffg/templates/importer/swa-importer.html",
    });
  }

  /**
   * Return a reference to the target attribute
   * @type {String}
   */
  get attribute() {
    return this.options.name;
  }

  /** @override */
  async getData() {
    $(".import-progress").addClass("import-hidden");

    if (!CONFIG?.temporary) {
      CONFIG.temporary = {};
    }

    if (!CONFIG?.temporary?.swa) {
      CONFIG.temporary.swa = {};
    }

    return {
      cssClass: "data-importer-window",
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    $(`<span class="debug"><label><input type="checkbox" /> Generate Log</label></span>`).insertBefore("#swa-importer header a");

    html.find(".dialog-button").on("click", this._dialogButton.bind(this));
  }

  async _dialogButton(event) {
    event.preventDefault();
    event.stopPropagation();
    const a = event.currentTarget;
    const action = a.dataset.button;

    if (action === "import") {
      CONFIG.logger.debug("Importing SW Adversaries Data Files");
      this._importLogger(`Starting SW Adversaries import`);

      const form = $("form.data-importer-window")[0];

      let zip;
      if (form.data.files.length) {
        zip = await ImportHelpers.readBlobFromFile(form.data.files[0]).then(JSZip.loadAsync);
      }
      let filter = $(form).find("[name=tag-filter]").val();

      if (zip) {
        // load ancillary files
        let filesToCache = [];

        filesToCache.push({ name: "skills", file: await this._enableImportSelection(zip.files, "skills", false, true) });
        filesToCache.push({ name: "weapons", file: await this._enableImportSelection(zip.files, "weapons", false, true) });
        filesToCache.push({ name: "abilities", file: await this._enableImportSelection(zip.files, "abilities", false, true) });
        filesToCache.push({ name: "force-powers", file: await this._enableImportSelection(zip.files, "force-powers", false, true) });
        filesToCache.push({ name: "talents", file: await this._enableImportSelection(zip.files, "talents", false, true) });
        filesToCache.push({ name: "mods", file: await this._enableImportSelection(zip.files, "mods", false, true) });
        filesToCache.push({ name: "qualities", file: await this._enableImportSelection(zip.files, "qualities", false, true) });

        await ImportHelpers.asyncForEach(filesToCache, async (f) => {
          CONFIG.logger.debug(`Caching file: ${f.name}`);
          this._importLogger(`Caching ancillary data file ${f.name}`);

          let file;
          try {
            file = await zip.file(f.file).async("text");
          } catch(e) {
            ui.notifications.error(`Failed to process data file ${f.name}! Import failed.`);
            console.error(e);
            return;
          }
          const data = JSON.parse(file);

          if (data.length > 0) {
            CONFIG.temporary.swa[`${f.name}`] = {};
            data.forEach((item) => {
              CONFIG.temporary.swa[`${f.name}`][item.name] = item;
            });
          }
        });
        const adversaries = this._enableImportSelection(zip.files, "adversaries", true, true);

        if (adversaries) {
          await this._handleAdversaries(zip, filter);
        }
      }
    }

    delete CONFIG.temporary.swa;

    CONFIG.logger.debug(`Completed Importing SW Adversaries Data Files`);
    this._importLogger(`Completed Importing SW Adversaries Data Files`);
    this.close();
  }

  _loadSkillsList(data) {
    if (data.length > 0) {
      CONFIG.temporary["swa_skills"] = {};
      data.forEach((item) => {
        CONFIG.temporary["swa_skills"][item.name] = item;

        const skill = Object.keys(CONFIG.FFG.skills).find((skill) => item.name.includes(skill));

        if (skill) {
          CONFIG.temporary["swa_skills"][item.name].ffg = skill;
        } else {
          CONFIG.temporary["swa_skills"][item.name].ffg = "custom";
        }
      });
    }
  }

  async _handleAdversaries(zip, filter) {
    this._importLogger(`Starting Adversary Import`);
    const adversaryFiles = Object.values(zip.files).filter((file) => {
      return !file.dir && file.name.split(".").pop() === "json" && file.name.includes("/adversaries/");
    });

    let overallTotalCount = adversaryFiles.length;
    let overallCurrentCount = 0;

    if (adversaryFiles.length > 0) {
      $(".import-progress.current").toggleClass("import-hidden");
      $(".import-progress.overall").toggleClass("import-hidden");

      let compendiumName = `swa.Adversaries`;

      const filename = $("form.data-importer-window")[0].data.files[0].name;

      if (!filename.includes("sw-adversaries")) {
        compendiumName = filename.replace(/\.[^/.]+$/, "");
      }

      let pack = await this._getCompendiumPack("Actor", compendiumName);

      await ImportHelpers.asyncForEach(adversaryFiles, async (f) => {
        try {
          const file = await zip.file(f.name).async("text");
          let fileData;
          try {
            fileData = JSON.parse(file);
          } catch (err) {
            const newfile = file.replace(/[^ -~]+/, "");
            const newFile1 = newfile.replace(/[\u0000-\u0019]+/g, "");

            fileData = JSON.parse(newFile1);
          }

          if (fileData.length > 0) {
            let currentTotalCount = fileData.length;
            let currentCurrentTotal = 0;

            await ImportHelpers.asyncForEach(fileData, async (item) => {
              try {
                if (filter.length > 0 && !item.tags.includes(filter)) {
                  return;
                }

                let skills = {
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
                };

                const skilltheme = await game.settings.get("starwarsffg", "skilltheme");

                if (skilltheme !== "starwars") {
                  skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === game.settings.get("starwarsffg", "skilltheme")).skills));
                }

                let adversary = {
                  name: item.name,
                  type: item.type === "Nemesis" ? "character" : "minion",
                  flags: {
                    starwarsffg: {
                      ffgimportid: `${f.name}-${item.type}-${item.name}`,
                      config: {
                        enableAutoSoakCalculation: false,
                        enableCriticalInjuries: item.type !== "Minion",
                      }
                    }
                  },
                  system: {
                    attributes: {},
                    characteristics: {},
                    skills,
                    stats: {},
                  },
                  items: [],
                };

                Object.values(CONFIG.FFG.characteristics).forEach((char) => {
                  adversary.system.characteristics[char.value] = {
                    value: item?.characteristics?.[char.value] ? item?.characteristics?.[char.value] : 0,
                    label: game.i18n.localize(char.label),
                    abrev: game.i18n.localize(char.abrev),
                  };
                });

                if (item.derived) {
                  ["soak", "wounds", "strain"].forEach((stat) => {
                    if (stat === "soak") {
                      adversary.system.stats[stat] = {
                        value: parseInt(item.derived[stat], 10),
                      };

                      adversary.system.attributes.Soak = {
                        mod: "Soak",
                        modtype: "Stat",
                        value: Math.abs(adversary.system.stats[stat].value - parseInt(adversary.system.characteristics.Brawn.value, 10)),
                      };
                    } else {
                      if (stat === "wounds" && adversary.type === "minion") {
                        adversary.system.quantity = {
                          value: 1,
                          max: 1,
                        };

                        adversary.system["unit_wounds"] = {
                          value: item.derived[stat],
                        };
                      } else {
                        adversary.system.stats[stat] = {
                          value: 0,
                          min: 0,
                          max: item.derived[stat],
                        };
                      }
                    }
                  });
                }

                if (item.skills) {
                  let isMinion = Array.isArray(item.skills);
                  let adversarySkills = isMinion ? item.skills : Object.keys(item.skills);
                  adversarySkills.forEach((skillRaw) => {
                    let skill = skillRaw.match(/^[^\(]*/)[0];
                    skill = $.trim(skill);
                    let alternateCharacteristic = skillRaw.match(/(?<=\()(.*?)(?=\))/)?.length ? skillRaw.match(/(?<=\()(.*?)(?=\))/)[0] : undefined;

                    const ffgSkill = Object.keys(skills).find((s) => skill.toLowerCase() === s.toLowerCase());

                    if (ffgSkill) {
                      adversary.system.skills[ffgSkill].groupskill = isMinion ? true : false;
                      if (!isMinion) {
                        adversary.system.attributes[skill] = {
                          key: skill,
                          mod: skill,
                          modType: 'Skill Rank',
                          value: item.skills[skill],
                        };
                        adversary.system.skills[ffgSkill].rank = item.skills[skill];
                      }
                      if (CONFIG.temporary.swa.skills?.[skill]?.characteristic) {
                        if (alternateCharacteristic) {
                          adversary.system.skills[ffgSkill].characteristic = alternateCharacteristic;
                        } else {
                          adversary.system.skills[ffgSkill].characteristic = CONFIG.temporary.swa.skills[skill].characteristic;
                        }
                      }

                      if ((!adversary.system.skills[ffgSkill]?.type && skilltheme !== "starwars") || (skilltheme === "starwars" && !CONFIG.FFG.skills[ffgSkill])) {
                        adversary.system.skills[ffgSkill].Key = ffgSkill.toUpperCase();
                        adversary.system.skills[ffgSkill].custom = true;
                        adversary.system.skills[ffgSkill].type = "General";
                        adversary.system.skills[ffgSkill].label = ffgSkill;
                      }
                    }
                  });
                }

                if (item.talents) {
                  item.talents.forEach((talent) => {
                    if (typeof talent === "object") {
                      let adversaryTalent = {
                        name: talent.name,
                        type: "talent",
                        flags: {},
                        data: {
                          attributes: {},
                          description: talent.description,
                          activation: {
                            value: "Passive",
                          },
                        },
                      };

                      adversary.items.push(adversaryTalent);
                    } else {
                      const swaTalentKey = Object.keys(CONFIG.temporary.swa.talents).find((t) => talent.includes(t));

                      if (swaTalentKey) {
                        const swaTalent = CONFIG.temporary.swa.talents[swaTalentKey];
                        let rank = 0;
                        if (swaTalent.ranked) {
                          if (talent.replace(swaTalentKey, "").length > 0) {
                            rank = parseInt(talent.replace(swaTalentKey, ""), 10);
                          }
                        }

                        let adversaryTalent = {
                          name: swaTalent.name,
                          type: "talent",
                          flags: {},
                          data: {
                            attributes: {},
                            description: swaTalent.description,
                            ranks: {
                              current: rank,
                              ranked: swaTalent.ranked,
                            },
                            activation: {
                              value: "Passive",
                            },
                            isForceTalent: false,
                          },
                        };

                        adversary.items.push(adversaryTalent);
                      }
                    }
                  });
                }

                if (item.weapons) {
                  const template = await ImportHelpers.getTemplate("weapon");
                  item.weapons.forEach((weapon) => {
                    let data = JSON.parse(JSON.stringify(template));
                    let weaponData;

                    if (typeof weapon === "object") {
                      weaponData = {
                        name: weapon.name,
                        type: "weapon",
                        flags: {},
                        system: {
                          attributes: {},
                          description: "No description provided",
                          damage: {
                            value: parseInt(!weapon?.damage ? weapon["plus-damage"] : weapon.damage, 10),
                          },
                          crit: {
                            value: parseInt(weapon.critical, 10),
                          },
                          special: {
                            value: weapon?.qualities?.length ? weapon.qualities.join(",") : "",
                          },
                          skill: {
                            value: weapon.skill,
                          },
                          range: {
                            value: weapon.range,
                          },
                        },
                      };
                      weaponData.system.skill.useBrawn = ["Melee", "Brawl", "Lightsaber"].some((element) => weaponData.system.skill.value.includes(element)) && (!weapon.damage || weapon.damage === "0");
                      if (weapon?.["plus-damage"] && parseInt(weapon["plus-damage"], 10) > 0) {
                        weaponData.system.attributes[randomID()] = {
                          isCheckbox: false,
                          mod: "damage",
                          modtype: "Weapon Stat",
                          value: parseInt(weapon["plus-damage"], 10),
                        };
                      }
                    } else {
                      const swaWeaponKey = Object.keys(CONFIG.temporary.swa.weapons).find((t) => weapon.includes(t));

                      if (swaWeaponKey) {
                        const swaWeapon = CONFIG.temporary.swa.weapons[swaWeaponKey];
                        weaponData = {
                          name: swaWeapon.name,
                          type: "weapon",
                          flags: {},
                          system: {
                            attributes: {},
                            description: "No description provided",
                            damage: {
                              value: parseInt(!swaWeapon?.damage ? swaWeapon["plus-damage"] : swaWeapon.damage, 10),
                            },
                            crit: {
                              value: parseInt(swaWeapon.critical, 10),
                            },
                            special: {
                              value: swaWeapon?.qualities?.length ? swaWeapon.qualities.join(",") : "",
                            },
                            skill: {
                              value: swaWeapon.skill,
                            },
                            range: {
                              value: swaWeapon.range,
                            },
                          },
                        };

                        weaponData.system.skill.useBrawn = ["Melee", "Brawl", "Lightsaber"].some((element) => weaponData.system.skill.value.includes(element)) && (!swaWeapon.damage || swaWeapon.damage === "0");

                        if (swaWeapon?.["plus-damage"] && parseInt(swaWeapon["plus-damage"], 10) > 0) {
                          weaponData.system.attributes[randomID()] = {
                            isCheckbox: false,
                            mod: "damage",
                            modtype: "Weapon Stat",
                            value: parseInt(swaWeapon["plus-damage"], 10),
                          };
                        }
                      }
                    }

                    if (weaponData) {
                      const templatedData = weaponData;
                      templatedData.system = mergeObject(data, weaponData.system);

                      if (templatedData.system.special?.value?.length > 0) {
                        templatedData.system.special.value.split(",").forEach((w) => {
                          const wName = w.match(/^.*([^0-9\s]+)/gim);
                          const wRank = w.match(/[^\w][0-9]/gim);

                          const id = randomID();
                          const unique = {
                            name: wName[0],
                            id: id,
                            _id: id,
                            type: "itemmodifier",
                            flags: {},
                            system: {
                              description: CONFIG.temporary.swa?.qualities?.[wName]?.description ? CONFIG.temporary.swa.qualities[wName].description : "No description provided",
                              attributes: {},
                              type: "all",
                              rank: wRank ? parseInt(wRank[0].replace(" ", ""), 10) : 1,
                            },
                          };
                          const descriptor = new CONFIG.Item.documentClass(unique, { temporary: true });
                          templatedData.system.itemmodifier.push(descriptor);
                        });
                      }

                      let w = new CONFIG.Item.documentClass(templatedData, { temporary: true });
                      adversary.items.push(duplicate(w));
                    }
                  });
                }

                if (item.gear) {
                  if (Array.isArray(item.gear)) {
                    item.gear.forEach((gear) => {
                      if (gear.includes("Soak") && gear.includes("Defence")) {
                        let Armordata = {
                          name: gear.slice(0, gear.indexOf("(") - 1).trim(),
                          type: "armour",
                          flags: {},
                          system: {
                            description: "No description provided",
                            defence: {
                              value: gear.charAt(gear.indexOf("Defence") - 2),
                            },
                            soak: {
                              value: gear.charAt(gear.indexOf("Soak") - 2),
                            },
                          },
                        };
                        adversary.items.push(Armordata);
                      } else if (gear.includes("Soak")) {
                        let Armordata = {
                          name: gear.slice(0, gear.indexOf("(") - 1).trim(),
                          type: "armour",
                          flags: {},
                          system: {
                            description: "No description provided",

                            soak: {
                              value: gear.charAt(gear.indexOf("Soak") - 2),
                            },
                          },
                        };
                        adversary.items.push(Armordata);
                      } else if (gear.includes("Defence")) {
                        let Armordata = {
                          name: gear.slice(0, gear.indexOf("(") - 1).trim(),
                          type: "armour",
                          flags: {},
                          system: {
                            description: "No description provided",
                            defence: {
                              value: gear.charAt(gear.indexOf("Defence") - 2),
                            },
                          },
                        };
                        adversary.items.push(Armordata);
                      } else {
                        let gearData = {
                          name: gear,
                          type: "gear",
                          flags: {},
                          system: {
                            description: "No description provided",
                          },
                        };
                        adversary.items.push(gearData);
                      }
                    });
                  } else if (item.gear.includes("Soak") && item.gear.includes("Defence")) {
                    let Armordata = {
                      name: item.gear.slice(0, item.gear.indexOf("(") - 1).trim(),
                      type: "armour",
                      flags: {},
                      system: {
                        description: "No description provided",
                        defence: {
                          value: item.gear.charAt(item.gear.indexOf("Defence") - 2),
                        },
                        soak: {
                          value: item.gear.charAt(item.gear.indexOf("Soak") - 2),
                        },
                      },
                    };
                    adversary.items.push(Armordata);
                  } else if (item.gear.includes("Soak")) {
                    let Armordata = {
                      name: item.gear.slice(0, item.gear.indexOf("(") - 1).trim(),
                      type: "armour",
                      flags: {},
                      system: {
                        description: "No description provided",

                        soak: {
                          value: item.gear.charAt(item.gear.indexOf("Soak") - 2),
                        },
                      },
                    };
                    adversary.items.push(Armordata);
                  } else if (item.gear.includes("Defence")) {
                    let Armordata = {
                      name: item.gear.slice(0, item.gear.indexOf("(") - 1).trim(),
                      type: "armour",
                      flags: {},
                      system: {
                        description: "No description provided",
                        defence: {
                          value: item.gear.charAt(item.gear.indexOf("Defence") - 2),
                        },
                      },
                    };
                    adversary.items.push(Armordata);
                  } else {
                    let gearData = {
                      name: item.gear,
                      type: "gear",
                      flags: {},
                      system: {
                        description: "No description provided",
                      },
                    };
                    adversary.items.push(gearData);
                  }
                }

                let biography = "";

                if (item.description) {
                  biography += `<p>${item.description}</p>`;
                }

                if (item.abilities) {
                  biography += `<h2>Abilities:</h2>`;
                  item.abilities.forEach((ability) => {
                    if (typeof ability === "object") {
                      biography += `<p><b>${ability.name}:</b> ${ability.description}</p>`;
                    } else {
                      const swaAbilityKey = Object.keys(CONFIG.temporary.swa.abilities).find((t) => ability.includes(t));

                      if (swaAbilityKey) {
                        const swaAbility = CONFIG.temporary.swa.abilities[swaAbilityKey];
                        biography += `<p><b>${swaAbility.name}:</b> ${swaAbility.description}</p>`;
                      }
                    }
                  });
                }

                adversary.system.biography = biography;

                let compendiumItem;
                await pack.getIndex();
                let entry = pack.index.find((e) => e.name === item.name);

                if (!entry) {
                  CONFIG.logger.debug(`Importing Adversary - Actor`);
                  compendiumItem = new CONFIG.Actor.documentClass(adversary, { temporary: true });
                  this._importLogger(`New Adversary ${name} : ${JSON.stringify(compendiumItem)}`);
                  await pack.importDocument(compendiumItem);
                } else {
                  CONFIG.logger.debug(`Update Adversary - Actor`);
                  //let updateData = ImportHelpers.buildUpdateData(item);
                  let updateData = adversary;
                  updateData["_id"] = entry._id;
                  this._importLogger(`Updating talent ${name} : ${JSON.stringify(updateData)}`);
                  let to_update = await pack.getDocument(updateData._id)
                  to_update.update(updateData);
                }
              } catch (err) {
                CONFIG.logger.error(`Error importing ${item.name} from ${f.name}`, err);
              }

              currentCurrentTotal += 1;
              $(".current .import-progress-bar")
                .width(`${Math.trunc((currentCurrentTotal / currentTotalCount) * 100)}%`)
                .html(`<span>${Math.trunc((currentCurrentTotal / currentTotalCount) * 100)}%</span>`);
            });
          }
        } catch (err) {
          CONFIG.logger.error(`Unable to import ${f.name}`, err);
        }

        overallCurrentCount += 1;
        $(".overall .import-progress-bar")
          .width(`${Math.trunc((overallCurrentCount / overallTotalCount) * 100)}%`)
          .html(`<span>${Math.trunc((overallCurrentCount / overallTotalCount) * 100)}%</span>`);
      });
    }
    this._importLogger(`Completed Adversary Import`);
  }

  _importLog = [];
  _importLogger(message) {
    if ($(".debug input:checked").length > 0) {
      this._importLog.push(`[${new Date().getTime()}] ${message}`);
    }
  }

  _enableImportSelection(files, name, isDirectory, returnFilename) {
    this._importLogger(`Checking zip file for ${name}`);
    let fileName;
    Object.values(files).findIndex((file) => {
      if (file.name.includes(`/${name}.json`) || (isDirectory && file.name.includes(`/${name}`))) {
        this._importLogger(`Found file ${file.name}`);
        $(`#import${name.replace(" ", "")}`)
          .removeAttr("disabled")
          .val(file.name);
        if (returnFilename) {
          fileName = file.name;
        }
        return true;
      }
      return false;
    }) > -1;

    return fileName;
  }

  async _getCompendiumPack(type, name) {
    this._importLogger(`Checking for existing compendium pack ${name}`);
    let pack = game.packs.find((p) => {
      return p.metadata.label === name;
    });
    if (!pack) {
      this._importLogger(`Compendium pack ${name} not found, creating new`);
      pack = await CompendiumCollection.createCompendium({ type: type, label: name });
    } else {
      this._importLogger(`Existing compendium pack ${name} found`);
    }

    return pack;
  }
}
