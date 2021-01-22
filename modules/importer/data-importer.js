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
          promises.push(OggDude.Import.ForcePowers(xmlDoc, zip));
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
        await OggDude.Import.Specializations(zip);
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
