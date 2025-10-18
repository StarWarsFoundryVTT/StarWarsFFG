import ImportHelpers from "./import-helpers.js";
import OggDude from "./oggdude/oggdude.js";

/**
 * A specialized form used to pop out the editor.
 * @extends {FormApplication}
 */
//V13 Todo: FormApplication is deprecated in v13. Need to update this window to use ApplicationV2
export default class DataImporter extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
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
    const files = data.files.map((file) => decodeURIComponent(file));

    document.querySelectorAll('.import-progress').forEach(el => el.classList.add('import-hidden'));

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

    // Native DOM (v13 or later)
    const debugSpan = document.createElement("span");
    debugSpan.className = "debug";
    debugSpan.innerHTML = `<label><input type="checkbox" /> Generate Log</label>`;
    // Find the anchor inside the header of #data-importer
    const headerA = html[0]?.querySelector("#data-importer header a");
    if (headerA && headerA.parentNode) {
      headerA.parentNode.insertBefore(debugSpan, headerA);
    }
    html[0].querySelectorAll(".dialog-button").forEach((el) => el.addEventListener("click", this._dialogButton.bind(this)));
    html[0].querySelector("#importAll").addEventListener("click", this._enableImportAll.bind(this));
    // Use a short timeout to ensure all async DOM updates are complete before positioning
    setTimeout(this.setPosition.bind(this), 50);
  }

  _importLog = [];
  _importLogger(message) {
    let checked = false;
    checked = Array.from(document.querySelectorAll('.debug input')).some(el => el.checked);
    if (checked) {
      this._importLog.push(`[${new Date().getTime()}] ${message}`);
    }
  }

  /**
   * Enable all checkboxes for import rather than forcing the user to click them all one at a time
   * @private
   */
  _enableImportAll() {
    document.querySelectorAll("input[type='checkbox'][name='imports']").forEach(el => el.checked = true);
  }

  async _dialogButton(event) {
    event.preventDefault();
    event.stopPropagation();
    const a = event.currentTarget;
    const action = a.dataset.button;

    // if clicking load file reset default
    const form = event.currentTarget.closest("form");
    if (form) {
      form.querySelectorAll("input[type='checkbox'][name='imports']").forEach(el => el.disabled = true);
    }

    // load the requested file
    if (action === "load") {
      try {
        let selectedFile, form, zip;
        const input = document.querySelector("#import-file");
        selectedFile = input ? input.value : "";

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
            form = document.querySelector("form.data-importer-window");
            if (form && form.data && form.data.files && form.data.files.length) {
              zip = await ImportHelpers.readBlobFromFile(form.data.files[0]).then(JSZip.loadAsync);
            }
        }

        const importAll = document.querySelector("input[id='importAll']");
        if (importAll) importAll.disabled = false;

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

      let importFiles, selectedFile;
      importFiles = Array.from(document.querySelectorAll("input[type='checkbox'][name='imports']:checked")).map(el => ({
        file: el.value,
        label: el.dataset.name,
        type: el.dataset.type,
        itemtype: el.dataset.itemtype
      }));
      const input = document.querySelector("#import-file");
      selectedFile = input ? input.value : "";
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
        let form;
        form = document.querySelector("form.data-importer-window");
        if (form && form.data && form.data.files && form.data.files.length) {
          zip = await ImportHelpers.readBlobFromFile(form.data.files[0]).then(JSZip.loadAsync);
        }
      }

      const promises = [];
      let isSpecialization = false;
      let isVehicle = false;
      let isCareer = false;
      let isSpecies = false;

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
          promises.push(OggDude.Import.ItemAttachments(xmlDoc));
        } else {
          if (file.file.includes("/Specializations/")) {
            isSpecialization = true;
          }
          if (file.file.includes("/Careers/")) {
            // delay career processing so specializations can be done first
            isCareer = true;
          }
          if (file.file.includes("/Species/")) {
            // delay species processing so talents are done first
            isSpecies = true;
          }
          if (file.file.includes("/Vehicles/")) {
            isVehicle = true;
          }
        }
      });
      await Promise.all(promises);

      if (isSpecies) {
        await OggDude.Import.Species(zip);
      }
      if (isSpecialization) {
        await OggDude.Import.Specializations(zip);
      }
      if (isCareer) {
        await OggDude.Import.Career(zip);
      }
      if (isVehicle) {
        await OggDude.Import.Vehicles(zip);
      }

      // import signature abilities (delayed so careers are done first)
      ImportHelpers.clearCache();
      const promisesPhase2 = [];
      await this.asyncForEach(importFiles, async (file) => {
        if (zip.files[file.file] && !zip.files[file.file].dir) {
          const data = await zip.file(file.file).async("text");
          const xmlDoc = ImportHelpers.stringToXml(data);

          promisesPhase2.push(OggDude.Import.SignatureAbilities(xmlDoc, zip));

        }
      });
      await Promise.all(promisesPhase2);

      let checked = false;
      checked = Array.from(document.querySelectorAll('.debug input')).some(el => el.checked);
      if (checked) {
        saveDataToFile(this._importLog.join("\n"), "text/plain", "import-log.txt");
      }

      CONFIG.temporary = {};
      this.close();
    }
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
        const inputId = `import${name.replace(" ", "")}`;
        const input = document.getElementById(inputId);
        if (input) {
          input.disabled = false;
          input.value = filename;
        }
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

  async _deleteCompendium(itemType) {
    const typeToCompendium = {
      armor: ["world.oggdudearmor"],
      career: ["world.oggdudecareers"],
      forcepower: ["world.oggdudeforcepowers"],
      gear: ["world.oggdudegear"],
      itemdescriptors: ["world.oggdudearmormods", "world.oggdudeweaponmods", "world.oggdudegenericmods", "world.oggdudevehiclemods"],
      itemattachments: ["world.oggdudearmorattachments", "world.oggdudeweaponattachments", "world.oggdudegenericattachments", "world.oggdudevehicleattachments"],
      signatureability: ["world.oggdudesignatureabilities"],
      skills: [],
      specialization: ["world.oggdudespecializations"],
      species: ["world.oggdudespecies"],
      talent: ["world.oggdudetalents"],
      vehicle: ["world.oggdudevehiclesplanetary", "world.oggdudevehiclesspace"],
      weapon: ["world.oggdudeweapons", "world.oggdudevehicleweapons"],
    };

    for (const curType of typeToCompendium[itemType]) {
      const pack = game.packs.get(curType);
      if (pack) {
        await pack.deleteCompendium();
      }
    }
  }
}
