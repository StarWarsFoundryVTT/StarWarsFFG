import ImportHelpers from "./import-helpers.js";

/**
 * A specialized form used to pop out the editor.
 * @extends {FormApplication}
 */
export default class DataImporter extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "data-importer",
      classes: ["starwarsffg", "data-import"],
      title: "Data Importer",
      template: "systems/starwarsffg/templates/importer/data-importer.html",
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
    let data = await FilePicker.browse("data", "", { bucket: null, extensions: [".zip", ".ZIP"], wildcard: false });
    const files = data.files.map((file) => {
      return decodeURIComponent(file);
    });

    $(".import-progress").addClass("import-hidden");

    if (!CONFIG?.temporary) {
      CONFIG.temporary = {};
    }

    return {
      data,
      files,
      cssClass: "data-importer-window",
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    $(`<span class="debug"><label><input type="checkbox" /> Generate Log</label></span>`).insertBefore("#data-importer header a");

    html.find(".dialog-button").on("click", this._dialogButton.bind(this));
  }

  _importLog = [];
  _importLogger(message) {
    if ($(".debug input:checked").length > 0) {
      this._importLog.push(`[${new Date().getTime()}] ${message}`);
    }
  }

  async _dialogButton(event) {
    event.preventDefault();
    event.stopPropagation();
    const a = event.currentTarget;
    const action = a.dataset.button;

    // if clicking load file reset default
    $("input[type='checkbox'][name='imports']").attr("disabled", true);

    // load the requested file
    if (action === "load") {
      try {
        const selectedFile = $("#import-file").val();
        const zip = await fetch(`/${selectedFile}`)
          .then(function (response) {
            if (response.status === 200 || response.status === 0) {
              return Promise.resolve(response.blob());
            } else {
              return Promise.reject(new Error(response.statusText));
            }
          })
          .then(JSZip.loadAsync);

        this._enableImportSelection(zip.files, "Talents");
        this._enableImportSelection(zip.files, "Force Abilities");
        this._enableImportSelection(zip.files, "Gear");
        this._enableImportSelection(zip.files, "Weapons");
        this._enableImportSelection(zip.files, "Armor");
        this._enableImportSelection(zip.files, "Specializations", true);
        this._enableImportSelection(zip.files, "Careers", true);
        this._enableImportSelection(zip.files, "Species", true);
      } catch (err) {
        console.error(err);
      }
    }

    if (action === "import") {
      CONFIG.logger.debug("Importing Data Files");
      this._importLogger(`Starting import`);

      const importFiles = $("input:checkbox[name=imports]:checked")
        .map(function () {
          return { file: $(this).val(), label: $(this).data("name"), type: $(this).data("type"), itemtype: $(this).data("itemtype") };
        })
        .get();

      const selectedFile = $("#import-file").val();
      this._importLogger(`Using ${selectedFile} for import source`);

      const zip = await fetch(`/${selectedFile}`)
        .then(function (response) {
          if (response.status === 200 || response.status === 0) {
            return Promise.resolve(response.blob());
          } else {
            return Promise.reject(new Error(response.statusText));
          }
        })
        .then(JSZip.loadAsync);

      const promises = [];
      let isSpecialization = false;

      const skillsFileName = await this._enableImportSelection(zip.files, "Skills", false, true);

      if (skillsFileName) {
        // load skills for reference
        const data = await zip.file(skillsFileName).async("text");
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
        await this._loadSkillsList(xmlDoc);
      }

      await this.asyncForEach(importFiles, async (file) => {
        if (!zip.files[file.file].dir) {
          const data = await zip.file(file.file).async("text");

          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(data, "text/xml");

          promises.push(this._handleGear(xmlDoc, zip));
          promises.push(this._handleWeapons(xmlDoc, zip));
          promises.push(this._handleArmor(xmlDoc, zip));
          promises.push(this._handleTalents(xmlDoc));
          promises.push(this._handleForcePowers(xmlDoc, zip));
        } else {
          if (file.file.includes("/Specializations/")) {
            isSpecialization = true;
          }
          if (file.file.includes("/Careers/")) {
            promises.push(this._handleCareers(zip));
          }
          if (file.file.includes("/Species/")) {
            promises.push(this._handleSpecies(zip));
          }
        }
      });

      await Promise.all(promises);
      if (isSpecialization) {
        await this._handleSpecializations(zip);
      }

      if ($(".debug input:checked").length > 0) {
        saveDataToFile(this._importLog.join("\n"), "text/plain", "import-log.txt");
      }

      CONFIG.temporary = {};
      this.close();
    }

    /** Future functionality to allow users to select files to import */

    // const dataFiles = Object.values(zip.files).filter(file => {
    //   return !file.dir && file.name.split('.').pop() === 'xml';
    // })

    // const allProgress = (proms, progress_cb) => {
    //   let d = 0;
    //   progress_cb(0);
    //   for (const p of proms) {
    //     p.then(()=> {
    //       d ++;
    //       progress_cb( (d * 100) / proms.length );
    //     });
    //   }
    //   return Promise.all(proms);
    // }

    // const promises = [];
    // const filesData = dataFiles.map(file => {
    //   promises.push(zip.file(file.name).async("text"));
    // })

    // const data = await allProgress(promises, (p) => {
    //   console.log(`% Done = ${p.toFixed(2)}`);
    // });
  }

  async _loadSkillsList(xmlDoc) {
    const skills = xmlDoc.getElementsByTagName("Skill");
    if (skills.length > 0) {
      CONFIG.temporary["skills"] = {};
      for (let i = 0; i < skills.length; i += 1) {
        const skill = skills[i];
        const importkey = skill.getElementsByTagName("Key")[0]?.textContent;
        let name = skill.getElementsByTagName("Name")[0]?.textContent;

        name = name.replace(" - ", ": ");
        if (["CORE", "EDU", "LORE", "OUT", "UND", "WARF", "XEN"].includes(importkey)) {
          name = `Knowledge: ${name}`;
        }

        CONFIG.temporary.skills[importkey] = name;
      }
    }
  }

  async _handleTalents(xmlDoc) {
    this._importLogger(`Starting Talent Import`);
    const talents = xmlDoc.getElementsByTagName("Talent");
    if (talents.length > 0) {
      let totalCount = talents.length;
      let currentCount = 0;
      this._importLogger(`Beginning import of ${talents.length} talents`);
      $(".import-progress.talents").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack("Item", `oggdude.Talents`);

      for (let i = 0; i < talents.length; i += 1) {
        try {
          const talent = talents[i];
          const importkey = talent.getElementsByTagName("Key")[0]?.textContent;
          const name = talent.getElementsByTagName("Name")[0]?.textContent;
          const description = talent.getElementsByTagName("Description")[0]?.textContent;
          const ranked = talent.getElementsByTagName("Ranked")[0]?.textContent === "true" ? true : false;
          const activationValue = talent.getElementsByTagName("ActivationValue")[0]?.textContent;

          this._importLogger(`Start importing talent ${name}`);

          let activation = "Passive";

          switch (activationValue) {
            case "taManeuver":
              activation = "Active (Maneuver)";
              break;
            case "taAction":
              activation = "Active (Action)";
              break;
            case "taIncidental":
              activation = "Active (Incidental)";
              break;
            case "taIncidentalOOT":
              activation = "Active (Incidental, Out of Turn)";
              break;
            default:
              activation = "Passive";
          }

          const forcetalent = talent.getElementsByTagName("ForceTalent")[0]?.textContent === "true" ? true : false;

          const item = {
            name,
            type: "talent",
            flags: {
              importid: importkey,
            },
            data: {
              attributes: {},
              description,
              ranks: {
                ranked,
              },
              activation: {
                value: activation,
              },
              isForceTalent: forcetalent,
            },
          };

          const attributes = talent.getElementsByTagName("Attributes")[0];
          if (attributes) {
            item.data.attributes = Object.assign(item.data.attributes, ImportHelpers.getAttributeObject(attributes));
          }

          const careerskills = talent.getElementsByTagName("ChooseCareerSkills")[0];
          if (careerskills) {
            const cs = JXON.xmlToJs(careerskills);

            const funcAddCareerSkill = (s) => {
              if (Object.keys(CONFIG.temporary.skills).includes(s)) {
                const skill = CONFIG.temporary.skills[s];
                const careerKey = Object.keys(item.data.attributes).length + 1;
                item.data.attributes[`attr${careerKey}`] = {
                  mod: skill,
                  modtype: "Career Skill",
                  value: true,
                };
              }
            };

            if (cs?.NewSkills?.Key) {
              if (Array.isArray(cs.NewSkills.Key)) {
                cs.NewSkills.Key.forEach((s) => {
                  funcAddCareerSkill(s);
                });
              } else {
                funcAddCareerSkill(cs.NewSkills.Key);
              }
            }
          }

          const diemodifiers = talent.getElementsByTagName("DieModifiers")[0];
          if (diemodifiers) {
            const diemod = JXON.xmlToJs(diemodifiers);

            const funcAddDieModifier = (mod) => {
              if (Object.keys(CONFIG.temporary.skills).includes(mod.SkillKey)) {
                // only handling boosts initially
                if (mod.BoostCount || mod.SetbackCount || mod.AddSetbackCount) {
                  const skill = CONFIG.temporary.skills[mod.SkillKey];
                  const modKey = Object.keys(item.data.attributes).length + 1;
                  let modtype = "Skill Boost";
                  let count = 0;
                  if (mod.AddSetbackCount) {
                    modtype = "Skill Setback";
                    count = mod.AddSetbackCount;
                  }
                  if (mod.SetbackCount) {
                    modtype = "Skill Remove Setback";
                    count = mod.SetbackCount;
                  }
                  if (mod.BoostCount) {
                    count = mod.BoostCount;
                  }

                  item.data.attributes[`attr${modKey}`] = {
                    mod: skill,
                    modtype,
                    value: count,
                  };
                }
              }
            };

            if (diemod.DieModifier) {
              if (Array.isArray(diemod.DieModifier)) {
                diemod.DieModifier.forEach((mod) => {
                  funcAddDieModifier(mod);
                });
              } else {
                if (Object.keys(CONFIG.temporary.skills).includes(diemod.DieModifier.SkillKey)) {
                  funcAddDieModifier(diemod.DieModifier);
                }
              }
            }
          }

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find((e) => e.name === item.name);

          if (!entry) {
            CONFIG.logger.debug(`Importing Talent - Item`);
            compendiumItem = new Item(item, { temporary: true });
            this._importLogger(`New talent ${name} : ${JSON.stringify(compendiumItem)}`);
            pack.importEntity(compendiumItem);
          } else {
            CONFIG.logger.debug(`Update Talent - Item`);
            let updateData = ImportHelpers.buildUpdateData(item);
            updateData["_id"] = entry._id;
            this._importLogger(`Updating talent ${name} : ${JSON.stringify(updateData)}`);
            pack.updateEntity(updateData);
          }
          currentCount += 1;

          $(".talents .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          this._importLogger(`End importing talent ${name}`);
        } catch (err) {
          CONFIG.logger.error(`Error importing record : `, err);
          this._importLogger(`Error importing talent: ${JSON.stringify(err)}`);
        }
      }
    }
    this._importLogger(`Completed Talent Import`);
  }

  async _handleForcePowers(xmlDoc, zip) {
    this._importLogger(`Starting Force Power Import`);
    const forceabilities = xmlDoc.getElementsByTagName("ForceAbility");
    if (forceabilities.length > 0) {
      $(".import-progress.force").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack("Item", `oggdude.ForcePowers`);

      const fa = JXON.xmlToJs(xmlDoc);
      // now we need to loop through the files in the Force Powers folder

      const forcePowersFiles = Object.values(zip.files).filter((file) => {
        return !file.dir && file.name.split(".").pop() === "xml" && file.name.includes("/Force Powers/");
      });

      let totalCount = forcePowersFiles.length;
      let currentCount = 0;
      this._importLogger(`Beginning import of ${forcePowersFiles.length} force powers`);

      await this.asyncForEach(forcePowersFiles, async (file) => {
        try {
          const data = await zip.file(file.name).async("text");
          const domparser = new DOMParser();
          const xmlDoc1 = domparser.parseFromString(data, "text/xml");
          const fp = JXON.xmlToJs(xmlDoc1);

          // setup the base information

          let power = {
            name: fp.ForcePower.Name,
            type: "forcepower",
            flags: {
              importid: fp.ForcePower.Key,
            },
            data: {
              upgrades: {},
            },
          };

          this._importLogger(`Start importing force power ${fp.ForcePower.Name}`);

          // get the basic power informatio
          const importKey = fp.ForcePower.AbilityRows.AbilityRow[0].Abilities.Key[0];

          let forceAbility = fa.ForceAbilities.ForceAbility.find((ability) => {
            return ability.Key === importKey;
          });

          power.data.description = forceAbility.Description;

          // next we will parse the rows

          for (let i = 1; i < fp.ForcePower.AbilityRows.AbilityRow.length; i += 1) {
            try {
              const row = fp.ForcePower.AbilityRows.AbilityRow[i];
              row.Abilities.Key.forEach((keyName, index) => {
                let rowAbility = {};

                let rowAbilityData = fa.ForceAbilities.ForceAbility.find((a) => {
                  return a.Key === keyName;
                });

                rowAbility.name = rowAbilityData.Name;
                rowAbility.description = rowAbilityData.Description;
                rowAbility.cost = row.Costs.Cost[index];
                rowAbility.visible = true;

                if (row.Directions.Direction[index].Up) {
                  rowAbility["links-top-1"] = true;
                }

                switch (row.AbilitySpan.Span[index]) {
                  case "1":
                    rowAbility.size = "single";
                    break;
                  case "2":
                    rowAbility.size = "double";
                    if (index < 3 && row.Directions.Direction[index + 1].Up) {
                      rowAbility["links-top-2"] = true;
                    }
                    break;
                  case "3":
                    rowAbility.size = "triple";
                    if (index < 2 && row.Directions.Direction[index + 1].Up) {
                      rowAbility["links-top-2"] = true;
                    }
                    if (index < 2 && row.Directions.Direction[index + 2].Up) {
                      rowAbility["links-top-3"] = true;
                    }
                    break;
                  case "4":
                    rowAbility.size = "full";
                    if (index < 1 && row.Directions.Direction[index + 1].Up) {
                      rowAbility["links-top-2"] = true;
                    }
                    if (index < 1 && row.Directions.Direction[index + 2].Up) {
                      rowAbility["links-top-3"] = true;
                    }
                    if (index < 1 && row.Directions.Direction[index + 3].Up) {
                      rowAbility["links-top-4"] = true;
                    }
                    break;
                  default:
                    rowAbility.size = "single";
                    rowAbility.visible = false;
                }

                if (row.Directions.Direction[index].Right) {
                  rowAbility["links-right"] = true;
                }

                const talentKey = `upgrade${(i - 1) * 4 + index}`;
                power.data.upgrades[talentKey] = rowAbility;
              });
            } catch (err) {
              CONFIG.logger.error(`Error importing record : `, err);
            }
          }

          if (fp.ForcePower.AbilityRows.AbilityRow.length < 5) {
            for (let i = fp.ForcePower.AbilityRows.AbilityRow.length; i < 5; i += 1) {
              for (let index = 0; index < 4; index += 1) {
                const talentKey = `upgrade${(i - 1) * 4 + index}`;

                let rowAbility = { visible: false };

                power.data.upgrades[talentKey] = rowAbility;
              }
            }
          }

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find((e) => e.name === power.name);

          if (!entry) {
            CONFIG.logger.debug(`Importing Force Power - Item`);
            compendiumItem = new Item(power, { temporary: true });
            this._importLogger(`New force power ${fp.ForcePower.Name} : ${JSON.stringify(compendiumItem)}`);
            pack.importEntity(compendiumItem);
          } else {
            CONFIG.logger.debug(`Updating Force Power - Item`);
            let updateData = ImportHelpers.buildUpdateData(power);
            updateData["_id"] = entry._id;
            this._importLogger(`Updating force power ${fp.ForcePower.Name} : ${JSON.stringify(updateData)}`);
            pack.updateEntity(updateData);
          }
          currentCount += 1;

          $(".force .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          this._importLogger(`End importing force power ${fp.ForcePower.Name}`);
        } catch (err) {
          CONFIG.logger.error(`Error importing record : `, err);
        }
      });
    }
    this._importLogger(`Completed Force Power Import`);
  }

  async _handleGear(xmlDoc, zip) {
    this._importLogger(`Starting Gear Import`);
    const gear = xmlDoc.getElementsByTagName("Gear");

    if (gear.length > 0) {
      let totalCount = gear.length;
      let currentCount = 0;
      this._importLogger(`Beginning import of ${gear.length} gear`);

      $(".import-progress.gear").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack("Item", `oggdude.Gear`);

      for (let i = 0; i < gear.length; i += 1) {
        try {
          const item = gear[i];

          const importkey = item.getElementsByTagName("Key")[0]?.textContent;
          const name = item.getElementsByTagName("Name")[0]?.textContent;
          const description = item.getElementsByTagName("Description")[0]?.textContent;
          const price = item.getElementsByTagName("Price")[0]?.textContent;
          const rarity = item.getElementsByTagName("Rarity")[0]?.textContent;
          const encumbrance = item.getElementsByTagName("Encumbrance")[0]?.textContent;
          const type = item.getElementsByTagName("Type")[0]?.textContent;

          this._importLogger(`Start importing gear ${name}`);

          const newItem = {
            name,
            type: "gear",
            flags: {
              importid: importkey,
            },
            data: {
              attributes: {},
              description,
              encumbrance: {
                value: encumbrance,
              },
              price: {
                value: price,
              },
              rarity: {
                value: rarity,
              },
            },
          };

          const baseMods = item.getElementsByTagName("BaseMods")[0];
          if (baseMods) {
            const mods = await ImportHelpers.getBaseModObject(baseMods);
            if (mods) {
              newItem.data.attributes = mods;
            }
          }

          // does an image exist?
          let imgPath = await ImportHelpers.getImageFilename(zip, "Equipment", "Gear", importkey);
          if (imgPath) {
            newItem.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
          }

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find((e) => e.name === newItem.name);

          if (!entry) {
            CONFIG.logger.debug(`Importing Gear - Item`);
            compendiumItem = new Item(newItem, { temporary: true });
            this._importLogger(`New gear ${name} : ${JSON.stringify(compendiumItem)}`);
            pack.importEntity(compendiumItem);
          } else {
            CONFIG.logger.debug(`Updating Gear - Item`);
            let updateData = ImportHelpers.buildUpdateData(newItem);
            updateData["_id"] = entry._id;
            this._importLogger(`Updating gear ${name} : ${JSON.stringify(updateData)}`);
            pack.updateEntity(updateData);
          }
          currentCount += 1;

          $(".gear .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          this._importLogger(`End importing gear ${name}`);
        } catch (err) {
          CONFIG.logger.error(`Error importing record : `, err);
          this._importLogger(`Error importing gear: ${JSON.stringify(err)}`);
        }
      }
    }

    this._importLogger(`Completed Gear Import`);
  }

  async _handleWeapons(xmlDoc, zip) {
    this._importLogger(`Starting Weapon Import`);
    const weapons = xmlDoc.getElementsByTagName("Weapon");

    if (weapons.length > 0) {
      let totalCount = weapons.length;
      let currentCount = 0;
      this._importLogger(`Beginning import of ${weapons.length} weapons`);

      $(".import-progress.weapons").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack("Item", `oggdude.Weapons`);

      for (let i = 0; i < weapons.length; i += 1) {
        try {
          const weapon = weapons[i];

          const importkey = weapon.getElementsByTagName("Key")[0]?.textContent;
          const name = weapon.getElementsByTagName("Name")[0]?.textContent;
          const description = weapon.getElementsByTagName("Description")[0]?.textContent;
          const price = weapon.getElementsByTagName("Price")[0]?.textContent;
          const rarity = weapon.getElementsByTagName("Rarity")[0]?.textContent;
          const encumbrance = weapon.getElementsByTagName("Encumbrance")[0]?.textContent;
          const damage = weapon.getElementsByTagName("Damage")[0]?.textContent;
          const damageAdd = weapon.getElementsByTagName("DamageAdd")[0]?.textContent;
          const crit = weapon.getElementsByTagName("Crit")[0]?.textContent;

          const skillkey = weapon.getElementsByTagName("SkillKey")[0]?.textContent;
          const range = weapon.getElementsByTagName("Range")[0]?.textContent;
          const hardpoints = weapon.getElementsByTagName("HP")[0]?.textContent;

          const weaponType = weapon.getElementsByTagName("Type")[0]?.textContent;

          this._importLogger(`Start importing weapon ${name}`);

          let skill = "";

          switch (skillkey) {
            case "RANGLT":
              skill = "Ranged: Light";
              break;
            case "RANGHVY":
              skill = "Ranged: Heavy";
              break;
            case "GUNN":
              skill = "Gunnery";
              break;
            case "BRAWL":
              skill = "Brawl";
              break;
            case "MELEE":
              skill = "Melee";
              break;
            case "LTSABER":
              skill = "Lightsaber";
              break;
            default:
          }

          const fp = JXON.xmlToJs(weapon);

          const qualities = [];

          if (fp?.Qualities?.Quality && fp.Qualities.Quality.length > 0) {
            fp.Qualities.Quality.forEach((quality) => {
              qualities.push(`${quality.Key} ${quality.Count ? quality.Count : ""}`);
            });
          }

          let newItem = {
            name,
            type: weaponType === "Vehicle" ? "shipweapon" : "weapon",
            flags: {
              importid: importkey,
            },
            data: {
              attributes: {},
              description,
              encumbrance: {
                value: encumbrance,
              },
              price: {
                value: price,
              },
              rarity: {
                value: rarity,
              },
              damage: {
                value: !damage ? damageAdd : damage,
              },
              crit: {
                value: crit,
              },
              special: {
                value: qualities.join(","),
              },
              skill: {
                value: skill,
              },
              range: {
                value: range,
              },
              hardpoints: {
                value: hardpoints,
              },
            },
          };

          const baseMods = weapon.getElementsByTagName("BaseMods")[0];
          if (baseMods) {
            const mods = await ImportHelpers.getBaseModObject(baseMods);
            if (mods) {
              newItem.data.attributes = mods;
            }
          }

          if (damageAdd) {
            if (!newItem.data.attributes) {
              newItem.data.attributes = {};
            }
            const nk = Object.keys(newItem.data.attributes).length + 1;

            newItem.data.attributes[`attr${nk}`] = {
              isCheckbox: false,
              mod: "damage",
              modtype: "Weapon Stat",
              value: damageAdd,
            };
          }

          // does an image exist?
          let imgPath = await ImportHelpers.getImageFilename(zip, "Equipment", "Weapon", importkey);
          if (imgPath) {
            newItem.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
          }

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find((e) => e.name === newItem.name);

          if (!entry) {
            CONFIG.logger.debug(`Importing Weapon - Item`);
            compendiumItem = new Item(newItem, { temporary: true });
            this._importLogger(`New weapon ${name} : ${JSON.stringify(compendiumItem)}`);
            pack.importEntity(compendiumItem);
          } else {
            CONFIG.logger.debug(`Updating Weapon - Item`);
            let updateData = ImportHelpers.buildUpdateData(newItem);
            updateData["_id"] = entry._id;
            this._importLogger(`Updating weapon ${name} : ${JSON.stringify(updateData)}`);
            pack.updateEntity(updateData);
          }
          currentCount += 1;

          $(".weapons .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          this._importLogger(`End importing weapon ${name}`);
        } catch (err) {
          CONFIG.logger.error(`Error importing record : `, err);
          this._importLogger(`Error importing weapon: ${JSON.stringify(err)}`);
        }
      }
    }
    this._importLogger(`Completed Weapon Import`);
  }

  async _handleArmor(xmlDoc, zip) {
    this._importLogger(`Starting Armor Import`);
    const armors = xmlDoc.getElementsByTagName("Armor");

    if (armors.length > 0) {
      let totalCount = armors.length;
      let currentCount = 0;
      this._importLogger(`Beginning import of ${armors.length} armor`);

      $(".import-progress.armor").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack("Item", `oggdude.Armor`);

      for (let i = 0; i < armors.length; i += 1) {
        try {
          const armor = armors[i];

          const importkey = armor.getElementsByTagName("Key")[0]?.textContent;
          const name = armor.getElementsByTagName("Name")[0]?.textContent;
          const description = armor.getElementsByTagName("Description")[0]?.textContent;
          const price = armor.getElementsByTagName("Price")[0]?.textContent;
          const rarity = armor.getElementsByTagName("Rarity")[0]?.textContent;
          const encumbrance = armor.getElementsByTagName("Encumbrance")[0]?.textContent;

          const defense = armor.getElementsByTagName("Defense")[0]?.textContent;
          const soak = armor.getElementsByTagName("Soak")[0]?.textContent;
          const hardpoints = armor.getElementsByTagName("HP")[0]?.textContent;

          this._importLogger(`Start importing armor ${name}`);

          let newItem = {
            name,
            type: "armour",
            flags: {
              importid: importkey,
            },
            data: {
              attributes: {},
              description,
              encumbrance: {
                value: encumbrance,
              },
              price: {
                value: price,
              },
              rarity: {
                value: rarity,
              },
              defence: {
                value: defense,
              },
              soak: {
                value: soak,
              },
              hardpoints: {
                value: hardpoints,
              },
            },
          };

          const baseMods = armor.getElementsByTagName("BaseMods")[0];
          if (baseMods) {
            const mods = await ImportHelpers.getBaseModObject(baseMods);
            if (mods) {
              newItem.data.attributes = mods;
            }
          }

          // does an image exist?
          let imgPath = await ImportHelpers.getImageFilename(zip, "Equipment", "Armor", importkey);
          if (imgPath) {
            newItem.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
          }

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find((e) => e.name === newItem.name);

          if (!entry) {
            CONFIG.logger.debug(`Importing Armor - Item`);
            compendiumItem = new Item(newItem, { temporary: true });
            this._importLogger(`New armor ${name} : ${JSON.stringify(compendiumItem)}`);
            pack.importEntity(compendiumItem);
          } else {
            CONFIG.logger.debug(`Updating Armor - Item`);
            let updateData = ImportHelpers.buildUpdateData(newItem);
            updateData["_id"] = entry._id;
            this._importLogger(`Updating armor ${name} : ${JSON.stringify(updateData)}`);
            pack.updateEntity(updateData);
          }
          currentCount += 1;

          $(".armor .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          this._importLogger(`End importing armor ${name}`);
        } catch (err) {
          CONFIG.logger.error(`Error importing record : `, err);
          this._importLogger(`Error importing armor: ${JSON.stringify(err)}`);
        }
      }
    }
    this._importLogger(`Completed Armor Import`);
  }

  async _handleSpecializations(zip) {
    this._importLogger(`Starting Specialization Import`);

    const specializationFiles = Object.values(zip.files).filter((file) => {
      return !file.dir && file.name.split(".").pop() === "xml" && file.name.includes("/Specializations/");
    });

    let totalCount = specializationFiles.length;
    let currentCount = 0;

    if (specializationFiles.length > 0) {
      $(".import-progress.specializations").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack("Item", `oggdude.Specializations`);

      await this.asyncForEach(specializationFiles, async (file) => {
        try {
          const data = await zip.file(file.name).async("text");
          const domparser = new DOMParser();
          const xmlDoc = domparser.parseFromString(data, "text/xml");
          const specData = JXON.xmlToJs(xmlDoc);

          let specialization = {
            name: specData.Specialization.Name,
            type: "specialization",
            flags: {
              importid: specData.Specialization.Key,
            },
            data: {
              attributes: {},
              description: specData.Specialization.Description,
              talents: {},
              careerskills: {},
              isReadOnly: true,
            },
          };
          this._importLogger(`Start importing Specialization ${specialization.name}`);

          // assign career skills
          try {
            specData.Specialization.CareerSkills.Key.forEach((skillKey) => {
              let skill = CONFIG.temporary.skills[skillKey];

              if (skill) {
                // add career skill
                const careerKey = Object.keys(specialization.data.attributes).length + 1;
                specialization.data.attributes[`attr${careerKey}`] = {
                  mod: skill,
                  modtype: "Career Skill",
                  value: true,
                };

                // most specialization give players choice were to put points, create modifier but put value of 0
                const skillKey = Object.keys(specialization.data.attributes).length + 1;
                specialization.data.attributes[`attr${skillKey}`] = {
                  mod: skill,
                  modtype: "Skill Rank",
                  value: "0",
                };
              }
            });
          } catch (err) {
            // skipping career skills
          }

          for (let i = 0; i < specData.Specialization.TalentRows.TalentRow.length; i += 1) {
            const row = specData.Specialization.TalentRows.TalentRow[i];

            await this.asyncForEach(row.Talents.Key, async (keyName, index) => {
              let rowTalent = {};

              let talentItem = ImportHelpers.findEntityByImportId("items", keyName);
              if (!talentItem) {
                talentItem = await ImportHelpers.findCompendiumEntityByImportId("Item", keyName);
              }

              if (talentItem) {
                rowTalent.name = talentItem.data.name;
                rowTalent.description = talentItem.data.data.description;
                rowTalent.activation = talentItem.data.data.activation.value;
                rowTalent.activationLabel = talentItem.data.data.activation.label;
                rowTalent.isForceTalent = talentItem.data.data.isForceTalent === "true" ? true : false;
                rowTalent.isRanked = talentItem.data.data.ranks.ranked === "true" ? true : false;
                rowTalent.size = "single";
                rowTalent.canLinkTop = true;
                rowTalent.canLinkRight = true;
                rowTalent.itemId = talentItem.data._id;
                rowTalent.attributes = talentItem.data.data.attributes;

                if (row.Directions.Direction[index].Up && row.Directions.Direction[index].Up === "true") {
                  rowTalent["links-top-1"] = true;
                }

                if (row.Directions.Direction[index].Right && row.Directions.Direction[index].Right === "true") {
                  rowTalent["links-right"] = true;
                }

                if (talentItem.compendium) {
                  rowTalent.pack = `${talentItem.compendium.metadata.package}.${talentItem.compendium.metadata.name}`;
                }

                const talentKey = `talent${i * 4 + index}`;
                specialization.data.talents[talentKey] = rowTalent;
              }
            });
          }

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find((e) => e.name === specialization.name);
          if (!entry) {
            CONFIG.logger.debug(`Importing Specialization - Item`);
            compendiumItem = new Item(specialization, { temporary: true });
            this._importLogger(`New Specialization ${specialization.name} : ${JSON.stringify(compendiumItem)}`);
            pack.importEntity(compendiumItem);
          } else {
            CONFIG.logger.debug(`Updating Specialization - Item`);
            let updateData = ImportHelpers.buildUpdateData(specialization);
            updateData["_id"] = entry._id;
            this._importLogger(`Updating Specialization ${specialization.name} : ${JSON.stringify(updateData)}`);
            pack.updateEntity(updateData);
          }
          currentCount += 1;

          $(".specializations .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          this._importLogger(`End importing Specialization ${specialization.name}`);
        } catch (err) {
          CONFIG.logger.error(`Error importing record : `, err);
        }
      });
    }

    this._importLogger(`Completed Specialization Import`);
  }

  async _handleCareers(zip) {
    this._importLogger(`Starting Career Import`);

    const careerFiles = Object.values(zip.files).filter((file) => {
      return !file.dir && file.name.split(".").pop() === "xml" && file.name.includes("/Careers/");
    });

    let totalCount = careerFiles.length;
    let currentCount = 0;

    if (careerFiles.length > 0) {
      $(".import-progress.careers").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack("Item", `oggdude.Careers`);

      await this.asyncForEach(careerFiles, async (file) => {
        try {
          const data = await zip.file(file.name).async("text");
          const domparser = new DOMParser();
          const xmlDoc = domparser.parseFromString(data, "text/xml");
          const careerData = JXON.xmlToJs(xmlDoc);

          let career = {
            name: careerData.Career.Name,
            type: "career",
            flags: {
              importid: careerData.Career.Key,
            },
            data: {
              attributes: {},
              description: careerData.Career.Description,
            },
          };
          this._importLogger(`Start importing Career ${career.name}`);

          careerData.Career.CareerSkills.Key.forEach((skillKey) => {
            let skill = CONFIG.temporary.skills[skillKey];
            if (skill) {
              const careerKey = Object.keys(career.data.attributes).length + 1;
              career.data.attributes[`attr${careerKey}`] = {
                mod: skill,
                modtype: "Career Skill",
                value: true,
              };
              const skillKey = Object.keys(career.data.attributes).length + 1;
              career.data.attributes[`attr${skillKey}`] = {
                mod: skill,
                modtype: "Skill Rank",
                value: "0",
              };
            }
          });

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find((e) => e.name === career.name);
          if (!entry) {
            CONFIG.logger.debug(`Importing Career - Item`);
            compendiumItem = new Item(career, { temporary: true });
            this._importLogger(`New Career ${career.name} : ${JSON.stringify(compendiumItem)}`);
            pack.importEntity(compendiumItem);
          } else {
            CONFIG.logger.debug(`Updating Career - Item`);
            let updateData = ImportHelpers.buildUpdateData(career);
            updateData["_id"] = entry._id;
            this._importLogger(`Updating Career ${career.name} : ${JSON.stringify(updateData)}`);
            pack.updateEntity(updateData);
          }
          currentCount += 1;

          $(".careers .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          this._importLogger(`End importing Career ${career.name}`);
        } catch (err) {
          this._importLogger(`Error importing record : `, err);
          CONFIG.logger.error(`Error importing record : `, err);
        }
      });
    }
  }

  async _handleSpecies(zip) {
    this._importLogger(`Starting Species Import`);

    const speciesFiles = Object.values(zip.files).filter((file) => {
      return !file.dir && file.name.split(".").pop() === "xml" && file.name.includes("/Species/");
    });

    let totalCount = speciesFiles.length;
    let currentCount = 0;

    if (speciesFiles.length > 0) {
      $(".import-progress.species").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack("Item", `oggdude.Species`);
      await this.asyncForEach(speciesFiles, async (file) => {
        try {
          const data = await zip.file(file.name).async("text");
          const domparser = new DOMParser();
          const xmlDoc = domparser.parseFromString(data, "text/xml");
          const speciesData = JXON.xmlToJs(xmlDoc);

          let species = {
            name: speciesData.Species.Name,
            type: "species",
            flags: {
              importid: speciesData.Species.Key,
            },
            data: {
              attributes: {},
              description: speciesData.Species.Description,
            },
          };

          const funcAddAttribute = (modtype, mod, value, hidden) => {
            const charKey = Object.keys(species.data.attributes).length + 1;
            species.data.attributes[mod] = {
              mod,
              modtype,
              value: parseInt(value, 10),
              exclude: hidden,
            };
          };

          funcAddAttribute("Characteristic", "Brawn", speciesData.Species.StartingChars.Brawn, true);
          funcAddAttribute("Characteristic", "Agility", speciesData.Species.StartingChars.Agility, true);
          funcAddAttribute("Characteristic", "Intellect", speciesData.Species.StartingChars.Intellect, true);
          funcAddAttribute("Characteristic", "Cunning", speciesData.Species.StartingChars.Cunning, true);
          funcAddAttribute("Characteristic", "Willpower", speciesData.Species.StartingChars.Willpower, true);
          funcAddAttribute("Characteristic", "Presence", speciesData.Species.StartingChars.Presence, true);

          funcAddAttribute("Stat", "Wounds", speciesData.Species.StartingAttrs.WoundThreshold, true);
          funcAddAttribute("Stat", "Strain", speciesData.Species.StartingAttrs.StrainThreshold, true);

          if (speciesData?.Species?.SkillModifiers?.SkillModifier) {
            if (Array.isArray(speciesData.Species.SkillModifiers.SkillModifier)) {
              speciesData.Species.SkillModifiers.SkillModifier.forEach((s) => {
                let skill = CONFIG.temporary.skills[s.Key];
                if (skill) {
                  funcAddAttribute("Skill Rank", skill, s.RankStart, false);
                }
              });
            } else {
              let skill = CONFIG.temporary.skills[speciesData.Species.SkillModifiers.SkillModifier.Key];
              if (skill) {
                funcAddAttribute("Skill Rank", skill, speciesData.Species.SkillModifiers.SkillModifier.RankStart, false);
              }
            }
          }

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find((e) => e.name === species.name);
          if (!entry) {
            CONFIG.logger.debug(`Importing Species - Item`);
            compendiumItem = new Item(species, { temporary: true });
            this._importLogger(`New Species ${species.name} : ${JSON.stringify(compendiumItem)}`);
            pack.importEntity(compendiumItem);
          } else {
            CONFIG.logger.debug(`Updating Species - Item`);
            let updateData = ImportHelpers.buildUpdateData(species);
            updateData["_id"] = entry._id;
            this._importLogger(`Updating Species ${species.name} : ${JSON.stringify(updateData)}`);
            pack.updateEntity(updateData);
          }
          currentCount += 1;

          $(".species .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          this._importLogger(`End importing Species ${species.name}`);
        } catch (err) {
          this._importLogger(`Error importing record : `, err);
          CONFIG.logger.error(`Error importing record : `, err);
        }
      });
    }
  }

  async _getCompendiumPack(type, name) {
    this._importLogger(`Checking for existing compendium pack ${name}`);
    let pack = game.packs.find((p) => {
      return p.metadata.label === name;
    });
    if (!pack) {
      this._importLogger(`Compendium pack ${name} not found, creating new`);
      pack = await Compendium.create({ entity: type, label: name });
    } else {
      this._importLogger(`Existing compendium pack ${name} found`);
    }

    return pack;
  }

  _enableImportSelection(files, name, isDirectory, returnFilename) {
    this._importLogger(`Checking zip file for ${name}`);
    let fileName;
    Object.values(files).findIndex((file) => {
      if (file.name.includes(`/${name}.xml`) || (isDirectory && file.name.includes(`/${name}`))) {
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

  asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index += 1) {
      await callback(array[index], index, array);
    }
  };
}
