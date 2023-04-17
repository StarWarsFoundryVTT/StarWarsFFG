import Helpers from "../helpers/common.js";
import { defaultSkillList } from "../config/ffg-skillslist.js";

export default class SkillListImporter extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "swffg-skilllist-importer",
      classes: ["starwarsffg", "data-import"],
      title: "Skill List Importer",
      width: 385,
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

    const currentSkillTheme = await game.settings.get("starwarsffg", "skilltheme");

    const themes = CONFIG.FFG.alternateskilllists.map((list) => {
      return {
        name: list.id,
        isactive: currentSkillTheme === list.id,
        candelete: currentSkillTheme !== list.id && list.id !== "starwars" && list.id !== "genesys",
      };
    });

    return {
      cssClass: "data-importer-window",
      themes,
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".reset-button").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      game.settings.set("starwarsffg", "arraySkillList", defaultSkillList);
      game.settings.set("starwarsffg", "skilltheme", "starwars");

      debounce(() => window.location.reload(), 100);

      this.close();
    });

    html.find(".fa-download").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const target = event.currentTarget;
      const skilltheme = target.dataset.id;
      const currentSkillList = await game.settings.get("starwarsffg", "arraySkillList");

      const data = currentSkillList.find((i) => i.id === skilltheme);

      // Trigger file save procedure
      const filename = `swffg-skilltheme-${skilltheme.replace(/\s/g, "_")}.json`;
      saveDataToFile(JSON.stringify(data, null, 2), "text/json", filename);
    });

    html.find(".dialog-button").on("click", async (event) => {
      try {
        event.preventDefault();
        event.stopPropagation();

        const form = html[0];
        if (!form.data.files.length) return ui.notifications.error("You did not upload a data file!");
        const text = await readTextFromFile(form.data.files[0]);

        let currentSkillList = await game.settings.get("starwarsffg", "arraySkillList");

        const newSkillList = JSON.parse(text);

        Object.keys(newSkillList.skills).forEach((skill) => {
          if (!newSkillList.skills[skill].custom && !newSkillList.skills[skill].label.includes("SWFFG.")) {
            newSkillList.skills[skill].custom = true;
          }
        });

        // Check to find if imported skill list id is already in master skilltheme list
        const skillIndex = currentSkillList.findIndex((i) => i.id === newSkillList.id);
        if (skillIndex >= 0) {
          currentSkillList[skillIndex] = newSkillList;
        } else {
          currentSkillList.push(newSkillList);
        }

        const newMasterSkillListData = currentSkillList;
        await game.settings.set("starwarsffg", "arraySkillList", newMasterSkillListData);
        debounce(() => window.location.reload(), 100);

        this.close();
      } catch (error) {
        ui.notifications.warn(`Error importing the file. Check the console (f12) for details.`);
        CONFIG.logger.error(`Error importing the file`, error);
        this.close();
      }
    });
  }
}
