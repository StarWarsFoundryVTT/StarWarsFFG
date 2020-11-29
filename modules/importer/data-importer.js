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

      const skillsFileName = await this._enableImportSelection(zip.files, "Skills", false, true);

      if (skillsFileName) {
        // load skills for reference
        let data = await zip.file(skillsFileName).async("text");
        const xmlDoc = ImportHelpers.stringToXml(data);
        await this._loadSkillsList(xmlDoc);
      }

      const itemDescriptors = importFiles.find((item) => item.file.includes("ItemDescriptors.xml"));

      if (itemDescriptors) {
        let data = await zip.file(itemDescriptors.file).async("text");
        const xmlDoc = ImportHelpers.stringToXml(data);
        await this._loadItemDescriptors(xmlDoc);
      }

      await this.asyncForEach(importFiles, async (file) => {
        if (zip.files[file.file] && !zip.files[file.file].dir) {
          const data = await zip.file(file.file).async("text");
          const xmlDoc = ImportHelpers.stringToXml(data);

          promises.push(this._handleGear(xmlDoc, zip));
          promises.push(this._handleWeapons(xmlDoc, zip));
          promises.push(this._handleArmor(xmlDoc, zip));
          promises.push(this._handleTalents(xmlDoc, zip));
          promises.push(this._handleForcePowers(xmlDoc, zip));
          promises.push(this._handleSignatureAbilties(xmlDoc, zip));
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

  async _handleSignatureAbilties(xmlDoc, zip) {
    try {
      const sigAbilityNode = xmlDoc.getElementsByTagName("SigAbilityNode");

      if (sigAbilityNode.length > 0) {
        const signatureAbilityUpgrades = JXON.xmlToJs(xmlDoc);

        const signatureAbilityFiles = Object.values(zip.files).filter((file) => {
          return !file.dir && file.name.split(".").pop() === "xml" && file.name.includes("/SigAbilities/");
        });

        if (signatureAbilityUpgrades.SigAbilityNodes?.SigAbilityNode?.length > 0 && signatureAbilityFiles.length > 0) {
          $(".import-progress.signatureabilities").toggleClass("import-hidden");
          let pack = await this._getCompendiumPack("Item", `oggdude.SignatureAbilities`);
          let totalCount = signatureAbilityFiles.length;
          let currentCount = 0;
          this._importLogger(`Beginning import of ${signatureAbilityFiles.length} signature abilities`);

          await this.asyncForEach(signatureAbilityFiles, async (file) => {
            try {
              const data = await zip.file(file.name).async("text");
              const xmlDoc1 = ImportHelpers.stringToXml(data);
              const sa = JXON.xmlToJs(xmlDoc1);

              let signatureAbility = {
                name: sa.SigAbility.Name,
                type: "signatureability",
                flags: {
                  importid: sa.SigAbility.Key,
                },
                data: {
                  description: sa.SigAbility.Description,
                  attributes: {},
                  upgrades: {},
                },
              };

              for (let i = 1; i < sa.SigAbility.AbilityRows.AbilityRow.length; i += 1) {
                try {
                  const row = sa.SigAbility.AbilityRows.AbilityRow[i];
                  row.Abilities.Key.forEach((keyName, index) => {
                    let rowAbility = {};

                    let rowAbilityData = signatureAbilityUpgrades.SigAbilityNodes.SigAbilityNode.find((a) => {
                      return a.Key === keyName;
                    });

                    rowAbility.name = rowAbilityData.Name;
                    rowAbility.description = rowAbilityData.Description;
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

                    const talentKey = `upgrade${(i - 1) * 4 + index}`;
                    signatureAbility.data.upgrades[talentKey] = rowAbility;
                  });
                } catch (err) {
                  CONFIG.logger.error(`Error importing record : `, err);
                }
              }

              let imgPath = await ImportHelpers.getImageFilename(zip, "SigAbilities", "", signatureAbility.flags.importid);
              if (imgPath) {
                signatureAbility.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
              }

              let compendiumItem;
              await pack.getIndex();
              let entry = pack.index.find((e) => e.name === signatureAbility.name);

              if (!entry) {
                CONFIG.logger.debug(`Importing Signature Ability - Item`);
                compendiumItem = new Item(signatureAbility, { temporary: true });
                this._importLogger(`New Signature Ability ${signatureAbility.name} : ${JSON.stringify(compendiumItem)}`);
                pack.importEntity(compendiumItem);
              } else {
                CONFIG.logger.debug(`Updating Signature Ability - Item`);
                //let updateData = ImportHelpers.buildUpdateData(power);
                let updateData = signatureAbility;
                updateData["_id"] = entry._id;
                this._importLogger(`Updating Signature Ability ${signatureAbility.name} : ${JSON.stringify(updateData)}`);
                pack.updateEntity(updateData);
              }
              currentCount += 1;

              $(".signatureabilities .import-progress-bar")
                .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
                .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
              this._importLogger(`End importing Signature Ability ${sa.SigAbility.Name}`);
            } catch (err) {
              CONFIG.logger.error(`Error importing record : `, err);
            }
          });
          this._importLogger(`Completed Signature Ability Import`);
        } else {
          CONFIG.logger.error(`Error importing signature abilities, found ${signatureAbilityFiles.length} signature ability files and ${signatureAbilityUpgrades.SigAbilityNodes?.SigAbilityNode?.length} upgrades in data set`);
          this._importLogger(`Error importing signature abilities, found ${signatureAbilityFiles.length} signature ability files and ${signatureAbilityUpgrades.SigAbilityNodes?.SigAbilityNode?.length} upgrades in data set`);
        }
      }
    } catch (err) {
      CONFIG.logger.error(`Failed to import signature abilities`, err);
      this._importLogger(`Failed to import signature abilities`, err);
    }
  }

  async _loadItemDescriptors(xmlDoc) {
    this._importLogger(`Starting Item Qualities Import`);
    const descriptors = xmlDoc.getElementsByTagName("ItemDescriptor");
    if (descriptors.length > 0) {
      let totalCount = descriptors.length;
      let currentCount = 0;
      $(".import-progress.itemdescriptors").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack("JournalEntry", `oggdude.ItemQualities`);
      CONFIG.temporary["descriptors"] = {};

      await this.asyncForEach(descriptors, async (descriptor) => {
        try {
          const d = JXON.xmlToJs(descriptor);

          //if (d.Type) {
          let itemDescriptor = {
            name: d.Name,
            flags: {
              importid: d.Key,
            },
            content: d?.Description?.length && d.Description.length > 0 ? d.Description : "Dataset did not have a description",
          };

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find((e) => e.name === itemDescriptor.name);

          if (!entry) {
            CONFIG.logger.debug(`Importing Item Quality - JournalEntry`);
            compendiumItem = new JournalEntry(itemDescriptor, { temporary: true });
            this._importLogger(`New item quality ${d.Name} : ${JSON.stringify(compendiumItem)}`);
            let id = await pack.importEntity(compendiumItem);
            CONFIG.temporary["descriptors"][d.Key] = id.id;
          } else {
            CONFIG.logger.debug(`Updating Item Quality - JournalEntry`);
            //let updateData = ImportHelpers.buildUpdateData(itemDescriptor);
            let updateData = itemDescriptor;
            updateData["_id"] = entry._id;
            CONFIG.temporary["descriptors"][d.Key] = entry._id;
            this._importLogger(`Updating item quality ${d.Name} : ${JSON.stringify(updateData)}`);
            pack.updateEntity(updateData);
          }
          //}
          currentCount += 1;

          $(".itemdescriptors .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          this._importLogger(`End importing item quality ${d.Name}`);
        } catch (err) {
          CONFIG.logger.error(`Error importing record : `, err);
        }
      });
    }
    this._importLogger(`Completed Item Qualities Import`);
  }

  async _handleTalents(xmlDoc, zip) {
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
          const conflicttalent = talent.getElementsByTagName("Conflict")[0]?.textContent?.length > 0 ? true : false;

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
              isConflictTalent: conflicttalent,
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
            if (diemod.DieModifier) {
              if (!Array.isArray(diemod.DieModifier)) {
                diemod.DieModifier = [diemod.DieModifier];
              }
              diemod.DieModifier.forEach((mod) => {
                const attr = ImportHelpers.getBaseModAttributeObject({
                  Key: mod.SkillKey,
                  ...mod,
                });
                if (attr) {
                  item.data.attributes[attr.type] = attr.value;
                }
              });
            }
          }

          // does an image exist?
          let imgPath = await ImportHelpers.getImageFilename(zip, "Talent", "", item.flags.importid);
          if (imgPath) {
            item.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
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
            //let updateData = ImportHelpers.buildUpdateData(item);
            let updateData = item;
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
          const xmlDoc1 = ImportHelpers.stringToXml(data);
          const fp = JXON.xmlToJs(xmlDoc1);

          // setup the base information

          let power = {
            name: fp.ForcePower.Name,
            type: "forcepower",
            flags: {
              importid: fp.ForcePower.Key,
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
          let imgPath = await ImportHelpers.getImageFilename(zip, "ForcePowers", "", power.flags.importid);
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
          let imgPath = await ImportHelpers.getImageFilename(zip, "Equipment", "Gear", newItem.flags.importid);
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
            //let updateData = ImportHelpers.buildUpdateData(newItem);
            let updateData = newItem;
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
          const range = weapon.getElementsByTagName("RangeValue")[0]?.textContent.replace("wr", "");
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
                value: "",
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

          const qualities = [];

          if (fp?.Qualities?.Quality && !Array.isArray(fp?.Qualities?.Quality)) {
            fp.Qualities.Quality = [fp.Qualities.Quality];
          }

          if (fp?.Qualities?.Quality && fp.Qualities.Quality.length > 0) {
            await this.asyncForEach(fp.Qualities.Quality, async (quality) => {
              let descriptor = await ImportHelpers.findCompendiumEntityByImportId("JournalEntry", quality.Key);

              if (descriptor?.compendium?.metadata) {
                qualities.push(`<a class="entity-link" draggable="true" data-pack="${descriptor.compendium.metadata.package}.${descriptor.compendium.metadata.name}" data-id="${descriptor.id}"> ${quality.Key}  ${quality.Count ? quality.Count : ""}</a>`);
              } else {
                qualities.push(`${quality.Key} ${quality.Count ? quality.Count : ""}`);
              }

              if (quality.Key === "DEFENSIVE") {
                const nk = Object.keys(newItem.data.attributes).length + 1;
                const count = quality.Count ? parseInt(quality.Count) : 0;

                newItem.data.attributes[`attr${nk}`] = {
                  isCheckbox: false,
                  mod: "Defence-Melee",
                  modtype: "Stat",
                  value: count,
                };
              }
            });
          }

          newItem.data.special.value = qualities.join(",");

          if ((skill === "Melee" || skill === "Brawl") && damage === "0") {
            newItem.data.skill.useBrawn = true;
          }

          const baseMods = weapon.getElementsByTagName("BaseMods")[0];
          if (baseMods) {
            const mods = await ImportHelpers.getBaseModObject(baseMods);
            if (mods) {
              newItem.data.attributes = mods;
            }
          }

          if (damageAdd && parseInt(damageAdd, 10) > 0 && newItem.type === "weapon") {
            const nk = Object.keys(newItem.data.attributes).length + 1;

            newItem.data.attributes[`attr${nk}`] = {
              isCheckbox: false,
              mod: "damage",
              modtype: "Weapon Stat",
              value: damageAdd,
            };
          }

          // does an image exist?
          let imgPath = await ImportHelpers.getImageFilename(zip, "Equipment", "Weapon", newItem.flags.importid);
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
            //let updateData = ImportHelpers.buildUpdateData(newItem);
            let updateData = newItem;
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
          CONFIG.logger.error(`Error importing record (${weapons[i].getElementsByTagName("Name")[0]?.textContent}) : `, err);
          this._importLogger(`Error importing weapon: ${JSON.stringify(err)}`);
        }
      }
    }
    this._importLogger(`Completed Weapon Import`);
  }

  async _handleArmor(xmlDoc, zip) {
    this._importLogger(`Starting Armor Import`);

    const fa = JXON.xmlToJs(xmlDoc);

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
          let imgPath = await ImportHelpers.getImageFilename(zip, "Equipment", "Armor", newItem.flags.importid);
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
            //let updateData = ImportHelpers.buildUpdateData(newItem);
            let updateData = newItem;
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
          const xmlDoc = ImportHelpers.stringToXml(data);
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
          let imgPath = await ImportHelpers.getImageFilename(zip, "Specialization", "", specialization.flags.importid);
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
          const xmlDoc = ImportHelpers.stringToXml(data);
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

          // does an image exist?
          let imgPath = await ImportHelpers.getImageFilename(zip, "Career", "", career.flags.importid);
          if (imgPath) {
            career.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
          }

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
            //let updateData = ImportHelpers.buildUpdateData(career);
            let updateData = career;
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
          const xmlDoc = ImportHelpers.stringToXml(data);
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

          let abilities = [];

          if (speciesData?.Species?.OptionChoices?.OptionChoice) {
            let options = speciesData.Species.OptionChoices.OptionChoice;

            if (!Array.isArray(speciesData.Species.OptionChoices.OptionChoice)) {
              options = [speciesData.Species.OptionChoices.OptionChoice];
            }

            options.forEach((o) => {
              let option = o.Options.Option;
              if (!Array.isArray(o.Options.Option)) {
                option = [o.Options.Option];
              }
              abilities.push(`<p>${option[0].Name} : ${option[0].Description}</p>`);
            });
          }

          species.data.description = `<h4>Abilities</h4>` + abilities.join("") + "<p></p>" + species.data.description;

          // does an image exist?
          let imgPath = await ImportHelpers.getImageFilename(zip, "Species", "", species.flags.importid);
          if (imgPath) {
            species.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
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
            //let updateData = ImportHelpers.buildUpdateData(species);
            let updateData = species;

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
              importid: vehicleData.Vehicle.Key,
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
                  max: parseInt(vehicleData.Vehicle.Encumbrance, 10),
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

                vehicle.items.push(weaponData);
              }
            } catch (err) {
              CONFIG.logger.warn(`Unable to locate weapon ${weapon.Key} while import ${vehicle.name}`);
              this._importLogger(`Unable to locate weapon ${weapon.Key} for ${vehicle.name}`);
            }
          };

          if (vehicleData.Vehicle.VehicleWeapons?.VehicleWeapon) {
            const temp = new Actor(vehicle, { temporary: true });
            if (Array.isArray(vehicleData.Vehicle.VehicleWeapons.VehicleWeapon)) {
              await this.asyncForEach(vehicleData.Vehicle.VehicleWeapons.VehicleWeapon, async (weapon) => {
                await funcAddWeapon(weapon);
              });
            } else {
              await funcAddWeapon(vehicleData.Vehicle.VehicleWeapons.VehicleWeapon);
            }
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
