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

  /** @override */
  constructor(options) {
    super(options);
    this.oggdude = OggDude;
    this.importers = this.oggdude.Meta;
    this.canImport = {};
    this.shouldImport = {};
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
    let data = await foundry.applications.apps.FilePicker.browse("data", "", { bucket: null, extensions: [".zip", ".ZIP"], wildcard: false });
    const files = data.files.map((file) => decodeURIComponent(file));

    document.querySelectorAll('.import-progress').forEach(el => el.classList.add('import-hidden'));

    if (!CONFIG?.temporary) {
      CONFIG.temporary = {};
    }

    return {
      importers: this.importers,
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
    CONFIG.logger.debug(message)
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

        for (const importer of Object.values(this.importers)) {
          this.canImport[importer.itemName] = this._enableImportSelection(importer.displayName, importer.className, zip.files);
        }

      } catch (err) {
        ui.notifications.warn("There was an error trying to load the import file, check the console log for more information.");
        console.error(err);
      }
    }

    if (action === "import") {
      CONFIG.logger.debug("Importing Data Files");
      this._importLogger(`Starting import`);

      let importFiles, selectedFile;
      importFiles = Array.from(document.querySelectorAll("input[type='checkbox'][name='imports']:checked")).map(el => (
        el.dataset.itemtype
      ));

      for (const importer of document.querySelectorAll("input[type='checkbox'][name='imports']")) {
        const itemName = $(importer).data("itemtype");
        this.shouldImport[itemName] = importer.checked;
      }

      const shouldDelete = document.querySelector("#deleteExisting").checked;
      if (shouldDelete) {
        for (const itemType of importFiles) {
          await this._deleteCompendium(itemType);
        }
      }

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

      for (let cur_phase = 1; cur_phase < 9; cur_phase++) {
        this._importLogger(`Beginning import phase ${cur_phase}`);
        const cur_phase_promises = [];
        const cur_phase_imports = Object.values(this.importers).filter(i => i.phase === cur_phase);
        await this.asyncForEach(cur_phase_imports, async (curImport) => {
          if (!this.shouldImport[curImport.itemName]) {
            this._importLogger(`Skipping unselected import of ${curImport.displayName}`);
          } else {
            if (curImport.filesAreDir && !["background"].includes(curImport.itemName) ) {
              cur_phase_promises.push(
                OggDude.Import[curImport.className](zip)
              );
            } else {
              for (const curFilename of curImport.fileNames) {
                this._importLogger(`Importing from ${curFilename}`);
                const selectedFile = Object.values(zip.files).find(f => f.name.includes(curFilename));
                const data = await zip.file(selectedFile.name).async("text");
                const xmlDoc = ImportHelpers.stringToXml(data);

                cur_phase_promises.push(
                  OggDude.Import[curImport.className](xmlDoc, zip)
                );
              }
            }
          }
        });
        await Promise.all(cur_phase_promises);
        this._importLogger(`Done importing phase ${cur_phase}!`);
      }
      this._importLogger("Done with import!");

      let checked = false;
      checked = Array.from(document.querySelectorAll('.debug input')).some(el => el.checked);
      if (checked) {
        saveDataToFile(this._importLog.join("\n"), "text/plain", "import-log.txt");
      }

      CONFIG.temporary = {};
      this.close();
    }
  }

  /**
   * Called when Load File is clicked - enables checkboxes for item types which are in the selected ZIP
   * @param displayName - the display name of the item type we're checking for (used for logging)
   * @param className - the class name of the item type we're checking for (used to find the input)
   * @param files - files object for the uploaded ZIP
   * @private
   */
  _enableImportSelection(displayName, className, files) {
    const element = $(this.element).find(`#import${className}`);
    const canEnable = this.canEnable(displayName, element, files);
    if (canEnable) {
      element.removeAttr("disabled");
    }
    return canEnable;
  }

  /**
   * Checks if a given input should be enabled based on the presence of pre-defined files in the selected ZIP
   * @param displayName - the display name of the input we're checking for (used for logging)
   * @param element - input element which contains additional metadata
   * @param zipFiles - files object for the uploaded ZIP
   * @returns {boolean} - should this be enabled or not?
   * @private
   */
  canEnable(displayName, element, zipFiles) {
    this._importLogger(`Determining if we should enable import for ${displayName}`);
    const fileNames = element.data("filenames").split(",");
    const filesAreDir = element.data("filesaredir");
    let shouldEnable = true;

    for (const file of fileNames) {
      const foundFile = Object.values(zipFiles).filter(i => i.name.includes(file) && i.dir === filesAreDir).length > 0;
      if (!foundFile) {
        shouldEnable = false;
        break;
      }
    }

    this._importLogger(`Should include outcome for ${displayName}: ${shouldEnable}`);
    return shouldEnable;
  }

  asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index += 1) {
      await callback(array[index], index, array);
    }
  };

  async _deleteCompendium(itemType) {
    const typeToCompendium = {
      armor: ["world.oggdudearmor"],
      background: ["world.oggdudebackgrounds"],
      career: ["world.oggdudecareers"],
      forcepower: ["world.oggdudeforcepowers"],
      gear: ["world.oggdudegear"],
      itemmodifier: ["world.oggdudearmormods", "world.oggdudeweaponmods", "world.oggdudegenericmods", "world.oggdudevehiclemods"],
      itemattachment: ["world.oggdudearmorattachments", "world.oggdudeweaponattachments", "world.oggdudegenericattachments", "world.oggdudevehicleattachments"],
      obligation: ["world.oggdudeobligation"],
      signatureability: ["world.oggdudesignatureabilities"],
      skills: ["world.oggdudeskilldescriptions"],
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
