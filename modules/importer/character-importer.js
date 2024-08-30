import ImportHelpers from "./import-helpers.js";

export default class CharacterImporter extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ogc-importer",
      classes: ["genesysk2", "data-import"],
      title: "OggDude Character Importer",
      width: 385,
      height: 200,
      template: "systems/genesysk2/templates/importer/character-importer.html",
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

    return {
      cssClass: "data-importer-window",
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".dialog-button").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const form = html[0];
      if (!form.data.files.length) return ui.notifications.error("You did not upload a data file!");
      const text = await readTextFromFile(form.data.files[0]);
      await ImportHelpers.characterImport(text);
      this.close();
    });
  }
}
