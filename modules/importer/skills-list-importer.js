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

      currentSkillList.push(newSkillList);
      const newMasterSkillListData = JSON.stringify(currentSkillList);

      const defaultBlob = new Blob([newMasterSkillListData], {
        type: "text/plain",
      });
      const i = new File([defaultBlob], "skills.json");

      const fd = new FormData();
      fd.set("source", "data");
      fd.set("target", `worlds/${game.world.id}/`);
      fd.set("upload", i);
      Object.entries({ bucket: null }).forEach((o) => fd.set(...o));

      const request = await fetch(FilePicker.uploadURL, { method: "POST", body: fd });
      if (request.status === 413) {
        return ui.notifications.error(game.i18n.localize("FILES.ErrorTooLarge"));
      } else if (request.status !== 200) {
        return ui.notifications.error(game.i18n.localize("FILES.ErrorSomethingWrong"));
      }

      window.location.reload();

      this.close();
    });
  }
}
