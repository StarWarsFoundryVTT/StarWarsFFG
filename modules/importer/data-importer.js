import ImportHelpers from "./import-helpers.js";
import OggDude from "./oggdude/oggdude.js";

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

        let zip;

        if (selectedFile) {
          zip = await fetch(`/${selectedFile}`)
            .then(function (response) {
              if (response.status === 200 || response.status === 0) {
                return Promise.resolve(response.blob());
              } else {
                return Promise.reject(new Error(response.statusText));
              }
            })
            .then(JSZip.loadAsync);
        } else {
          const form = $("form.data-importer-window")[0];

          if (form.data.files.length) {
            zip = await ImportHelpers.readBlobFromFile(form.data.files[0]).then(JSZip.loadAsync);
          }
        }

        this._enableImportSelection(zip.files, "Talents");
        this._enableImportSelection(zip.files, "Force Abilities");
        this._enableImportSelection(zip.files, "Gear");
        this._enableImportSelection(zip.files, "Weapons");
        this._enableImportSelection(zip.files, "Armor");
        this._enableImportSelection(zip.files, "Specializations", true);
        this._enableImportSelection(zip.files, "Careers", true);
        this._enableImportSelection(zip.files, "Species", true);
        this._enableImportSelection(zip.files, "Vehicles", true);
        this._enableImportSelection(zip.files, "ItemDescriptors");
        this._enableImportSelection(zip.files, "SigAbilityNodes");
        this._enableImportSelection(zip.files, "Skills");
        this._enableImportSelection(zip.files, "ItemAttachments");
      } catch (err) {
        ui.notifications.warn("There was an error trying to load the import file, check the console log for more information.");
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

      let zip;

      if (selectedFile) {
        zip = await fetch(`/${selectedFile}`)
          .then(function (response) {
            if (response.status === 200 || response.status === 0) {
              return Promise.resolve(response.blob());
            } else {
              return Promise.reject(new Error(response.statusText));
            }
          })
          .then(JSZip.loadAsync);
      } else {
        const form = $("form.data-importer-window")[0];

        if (form.data.files.length) {
          zip = await ImportHelpers.readBlobFromFile(form.data.files[0]).then(JSZip.loadAsync);
        }
      }

      const promises = [];
      let isSpecialization = false;
      let isVehicle = false;

      let skillsFileName;
      try {
        skillsFileName = importFiles.find((item) => item.file.includes("Skills.xml")).file;
      } catch (err) {
        CONFIG.logger.warn(`Not importing skills.`);
      }

      let createSkillJournalEntries = true;

      if (!skillsFileName) {
        skillsFileName = await this._enableImportSelection(zip.files, "Skills", false, true);
        createSkillJournalEntries = false;
      }

      if (skillsFileName) {
        // load skills for reference
        let data = await zip.file(skillsFileName).async("text");
        const xmlDoc = ImportHelpers.stringToXml(data);
        await OggDude.Import.Skills(xmlDoc, createSkillJournalEntries);
      }

      const itemDescriptors = importFiles.find((item) => item.file.includes("ItemDescriptors.xml"));

      if (itemDescriptors) {
        let data = await zip.file(itemDescriptors.file).async("text");
        const xmlDoc = ImportHelpers.stringToXml(data);
        await OggDude.Import.ItemDescriptors(xmlDoc);
      }

      await this.asyncForEach(importFiles, async (file) => {
        if (zip.files[file.file] && !zip.files[file.file].dir) {
          const data = await zip.file(file.file).async("text");
          const xmlDoc = ImportHelpers.stringToXml(data);

          promises.push(OggDude.Import.Gear(xmlDoc, zip));
          promises.push(OggDude.Import.Weapons(xmlDoc, zip));
          promises.push(OggDude.Import.Armor(xmlDoc, zip));
          promises.push(OggDude.Import.Talents(xmlDoc, zip));
          promises.push(this._handleForcePowers(xmlDoc, zip));
          promises.push(OggDude.Import.SignatureAbilities(xmlDoc, zip));
          promises.push(OggDude.Import.ItemAttachments(xmlDoc));
        } else {
          if (file.file.includes("/Specializations/")) {
            isSpecialization = true;
          }
          if (file.file.includes("/Careers/")) {
            promises.push(OggDude.Import.Career(zip));
          }
          if (file.file.includes("/Species/")) {
            promises.push(OggDude.Import.Species(zip));
          }
          if (file.file.includes("/Vehicles/")) {
            isVehicle = true;
          }
        }
      });

      await Promise.all(promises);
      if (isSpecialization) {
        await this._handleSpecializations(zip);
      }
      if (isVehicle) {
        await this._handleVehicles(zip);
      }

      if ($(".debug input:checked").length > 0) {
        saveDataToFile(this._importLog.join("\n"), "text/plain", "import-log.txt");
      }

      CONFIG.temporary = {};
      this.close();
    }
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
          const xmlDoc1 = ImportHelpers.stringToXml(data);
          const fp = JXON.xmlToJs(xmlDoc1);

          // setup the base information

          let power = {
            name: fp.ForcePower.Name,
            type: "forcepower",
            flags: {
              ffgimportid: fp.ForcePower.Key,
            },
            data: {
              attributes: {},
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
          power.data.description += ImportHelpers.getSources(fp?.ForcePower?.Sources ?? fp?.ForcePower?.Source);

          if (forceAbility?.DieModifiers?.DieModifier) {
            if (!Array.isArray(forceAbility.DieModifiers.DieModifier)) {
              forceAbility.DieModifiers.DieModifier = [forceAbility.DieModifiers.DieModifier];
            }
            forceAbility.DieModifiers.DieModifier.forEach((mod) => {
              const attr = ImportHelpers.getBaseModAttributeObject({
                Key: mod.SkillKey,
                ...mod,
              });
              if (attr) {
                power.data.attributes[attr.type] = attr.value;
              }
            });
          }

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
                rowAbility.attributes = {};

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

                const funcAddUpgradeDieModifier = (mod) => {
                  if (Object.keys(CONFIG.temporary.skills).includes(mod.SkillKey)) {
                    // only handling boosts initially
                    if (mod.BoostCount || mod.SetbackCount || mod.AddSetbackCount || mod.ForceCount) {
                      const skill = CONFIG.temporary.skills[mod.SkillKey];
                      const modKey = Object.keys(rowAbility.attributes).length + 1;
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
                      if (mod.ForceCount) {
                        modtype = "Force Boost";
                        count = true;
                      }
                      if (mod.BoostCount) {
                        count = mod.BoostCount;
                      }

                      rowAbility.attributes[`attr${keyName}${modKey}`] = {
                        mod: skill,
                        modtype,
                        value: count,
                      };
                    }
                  }
                };

                if (rowAbilityData?.DieModifiers?.DieModifier) {
                  if (Array.isArray(rowAbilityData.DieModifiers.DieModifier)) {
                    rowAbilityData.DieModifiers.DieModifier.forEach((mod) => {
                      funcAddUpgradeDieModifier(mod);
                    });
                  } else {
                    if (Object.keys(CONFIG.temporary.skills).includes(rowAbilityData.DieModifiers.DieModifier.SkillKey)) {
                      funcAddUpgradeDieModifier(rowAbilityData.DieModifiers.DieModifier);
                    }
                  }
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

          // does an image exist?
          let imgPath = await ImportHelpers.getImageFilename(zip, "ForcePowers", "", power.flags.ffgimportid);
          if (imgPath) {
            power.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
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
            //let updateData = ImportHelpers.buildUpdateData(power);
            let updateData = power;
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
          const xmlDoc = ImportHelpers.stringToXml(data);
          const specData = JXON.xmlToJs(xmlDoc);

          let specialization = {
            name: specData.Specialization.Name,
            type: "specialization",
            flags: {
              ffgimportid: specData.Specialization.Key,
            },
            data: {
              attributes: {},
              description: specData.Specialization.Description,
              talents: {},
              careerskills: {},
              isReadOnly: true,
            },
          };

          specialization.data.description += ImportHelpers.getSources(specData?.Specialization?.Sources ?? specData?.Specialization?.Source);
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

          if (specData.Specialization?.Attributes?.ForceRating) {
            specialization.data.attributes[`attrForceRating`] = {
              mod: "ForcePool",
              modtype: "Stat",
              value: 1,
            };
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
                rowTalent.isConflictTalent = talentItem.data.data.isConflictTalent === "true" ? true : false;
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

          // does an image exist?
          let imgPath = await ImportHelpers.getImageFilename(zip, "Specialization", "", specialization.flags.ffgimportid);
          if (imgPath) {
            specialization.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
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
            //let updateData = ImportHelpers.buildUpdateData(specialization);
            let updateData = specialization;
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

  async _handleVehicles(zip) {
    this._importLogger(`Starting Vehicles Import`);

    const vehicleFiles = Object.values(zip.files).filter((file) => {
      return !file.dir && file.name.split(".").pop() === "xml" && file.name.includes("/Vehicles/");
    });

    let totalCount = vehicleFiles.length;
    let currentCount = 0;

    if (vehicleFiles.length > 0) {
      $(".import-progress.vehicles").toggleClass("import-hidden");
      let packSpace = await this._getCompendiumPack("Actor", `oggdude.Vehicles.Space`);
      let packPlanetary = await this._getCompendiumPack("Actor", `oggdude.Vehicles.Planetary`);

      const isSpace = (vehicle) => {
        let result = false;

        const spacecategories = ["Starship", "Non-Fighter Starship", "Capital Ship", "Bulk Transport", "Station", "Medium Transport"];

        const spacetypes = ["Space-dwelling Creature", "Hyperdrive Sled", "Hyperdrive Docking Ring"];

        if (vehicle?.Vehicle?.Categories?.Category) {
          if (Array.isArray(vehicle.Vehicle.Categories.Category)) {
            vehicle.Vehicle.Categories.Category.forEach((cat) => {
              if (spacecategories.includes(cat)) {
                result = true;
              }
            });
          } else {
            if (spacecategories.includes(vehicle.Vehicle.Categories.Category)) {
              result = true;
            }
          }
        } else {
          if (vehicle.Vehicle.Type) {
            if (spacetypes.includes(vehicle.Vehicle.Type)) {
              result = true;
            }
          }
        }

        return result;
      };

      await this.asyncForEach(vehicleFiles, async (file) => {
        try {
          const data = await zip.file(file.name).async("text");
          const xmlDoc = ImportHelpers.stringToXml(data);
          const vehicleData = JXON.xmlToJs(xmlDoc);

          let sensorRange;

          switch (vehicleData.Vehicle.SensorRangeValue) {
            case "srClose":
              sensorRange = "Close";
              break;
            case "srShort":
              sensorRange = "Short";
              break;
            case "srMedium":
              sensorRange = "Medium";
              break;
            case "srLong":
              sensorRange = "Long";
              break;
            case "srExtreme":
              sensorRange = "Extreme";
              break;
            default:
              sensorRange = "None";
          }

          let vehicle = {
            name: vehicleData.Vehicle.Name,
            type: "vehicle",
            flags: {
              ffgimportid: vehicleData.Vehicle.Key,
            },
            data: {
              biography: vehicleData.Vehicle.Description,
              stats: {
                silhouette: {
                  value: parseInt(vehicleData.Vehicle.Silhouette, 10),
                },
                speed: {
                  max: parseInt(vehicleData.Vehicle.Speed, 10),
                },
                handling: {
                  value: parseInt(vehicleData.Vehicle.Handling, 10),
                },
                hullTrauma: {
                  max: parseInt(vehicleData.Vehicle.HullTrauma, 10),
                },
                systemStrain: {
                  max: parseInt(vehicleData.Vehicle.SystemStrain, 10),
                },
                shields: {
                  fore: parseInt(vehicleData.Vehicle.DefFore, 10),
                  port: parseInt(vehicleData.Vehicle.DefPort, 10),
                  starboard: parseInt(vehicleData.Vehicle.DefStarboard, 10),
                  aft: parseInt(vehicleData.Vehicle.DefAft, 10),
                },
                armour: {
                  value: parseInt(vehicleData.Vehicle.Armor, 10),
                },
                sensorRange: {
                  value: sensorRange,
                },
                crew: {},
                passengerCapacity: {
                  value: parseInt(vehicleData.Vehicle.Passengers, 10),
                },
                encumbrance: {
                  max: parseInt(vehicleData.Vehicle.EncumbranceCapacity, 10),
                },
                cost: {
                  value: parseInt(vehicleData.Vehicle.Price, 10),
                },
                rarity: {
                  value: parseInt(vehicleData.Vehicle.Rarity, 10),
                },
                customizationHardPoints: {
                  value: parseInt(vehicleData.Vehicle.HP, 10),
                },
                hyperdrive: {
                  value: parseInt(vehicleData.Vehicle.HyperdrivePrimary, 10),
                },
                consumables: {
                  value: 1,
                  duration: "months",
                },
              },
            },
            items: [],
          };

          vehicle.data.biography += ImportHelpers.getSources(vehicleData?.Vehicle?.Sources ?? vehicleData?.Vehicle?.Source);

          const funcAddWeapon = async (weapon) => {
            try {
              let weaponData = JSON.parse(JSON.stringify(await ImportHelpers.findCompendiumEntityByImportId("Item", weapon.Key)));

              let weapons = 1;
              if (weapon.Count) {
                weapons = weapon.Count;
              }

              for (let i = 0; i < weapons; i += 1) {
                if (!weaponData.data.firingarc) {
                  weaponData.data.firingarc = {};
                }
                weaponData.data.firingarc.fore = weapon.FiringArcs.Fore === "true" ? true : false;
                weaponData.data.firingarc.aft = weapon.FiringArcs.Aft === "true" ? true : false;
                weaponData.data.firingarc.port = weapon.FiringArcs.Port === "true" ? true : false;
                weaponData.data.firingarc.starboard = weapon.FiringArcs.Starboard === "true" ? true : false;
                weaponData.data.firingarc.dorsal = weapon.FiringArcs.Dorsal === "true" ? true : false;
                weaponData.data.firingarc.ventral = weapon.FiringArcs.Ventral === "true" ? true : false;

                if (weapon?.Qualities?.Quality) {
                  const qualities = await ImportHelpers.getQualities(weapon.Qualities.Quality);

                  weaponData.data.special.value = qualities.qualities.join(", ");
                  weaponData.data.attributes = qualities.attributes;
                }

                vehicle.items.push(weaponData);
              }
            } catch (err) {
              CONFIG.logger.warn(`Unable to locate weapon ${weapon.Key} while import ${vehicle.name}`);
              this._importLogger(`Unable to locate weapon ${weapon.Key} for ${vehicle.name}`);
            }
          };

          if (vehicleData.Vehicle.VehicleWeapons?.VehicleWeapon) {
            const temp = new Actor(vehicle, { temporary: true });

            if (!Array.isArray(vehicleData.Vehicle.VehicleWeapons.VehicleWeapon)) {
              vehicleData.Vehicle.VehicleWeapons.VehicleWeapon = [vehicleData.Vehicle.VehicleWeapons.VehicleWeapon];
            }
            await this.asyncForEach(vehicleData.Vehicle.VehicleWeapons.VehicleWeapon, async (weapon) => {
              await funcAddWeapon(weapon);
            });
          }

          let pack;
          if (isSpace(vehicleData)) {
            pack = packSpace;
          } else {
            pack = packPlanetary;
          }

          let compendiumItem;
          let actor;
          await pack.getIndex();
          let entry = pack.index.find((e) => e.name === vehicle.name);
          if (!entry) {
            CONFIG.logger.debug(`Importing Vehicles - Actor`);
            compendiumItem = new Actor(vehicle, { temporary: true });
            this._importLogger(`New Vehicles ${vehicle.name} : ${JSON.stringify(compendiumItem)}`);
            actor = await pack.importEntity(compendiumItem);
          } else {
            CONFIG.logger.debug(`Updating Vehicles - Actor`);
            //let updateData = ImportHelpers.buildUpdateData(vehicle);
            let updateData = vehicle;
            updateData["_id"] = entry._id;
            this._importLogger(`Updating Vehicles ${vehicle.name} : ${JSON.stringify(updateData)}`);
            await pack.updateEntity(updateData);
            actor = await game.actors.get(entry._id);
          }

          currentCount += 1;

          $(".vehicles .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          this._importLogger(`End importing Vehicles ${vehicle.name}`);
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
        let filename = file.name;
        if (file.name.includes(`.xml`) && isDirectory) {
          filename = `${file.name.substring(0, file.name.lastIndexOf("/"))}/`;
        }
        $(`#import${name.replace(" ", "")}`)
          .removeAttr("disabled")
          .val(filename);
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
