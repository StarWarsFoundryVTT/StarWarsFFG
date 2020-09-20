import Helpers from "../helpers/common.js";

export default class SkillListImporter extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "swffg-skilllist-importer",
      classes: ["starwarsffg", "data-import"],
      title: "Skill List Importer",
      width: 385,
      height: 220,
      template: "systems/starwarsffg/templates/importer/skill-list-importer.html",
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

      let currentSkillList = await fetch(`/worlds/${game.world.id}/skills.json`).then((response) => response.json());
      const newSkillList = JSON.parse(text);

      Object.keys(newSkillList.skills).forEach((skill) => {
        if (!newSkillList[skill].custom) {
          newSkillList[skill].custom = true;
        }
      });

      currentSkillList.push(newSkillList);
      const newMasterSkillListData = JSON.stringify(currentSkillList);

      const defaultBlob = new Blob([newMasterSkillListData], {
        type: "text/plain",
      });
      const i = new File([defaultBlob], "skills.json");

      await Helpers.UploadFile("data", `worlds/${game.world.id}/`, i, { bucket: null });

      window.location.reload();

      this.close();
    });
  }
}
