import ImportHelpers from "../../import-helpers.js";

export default class Skills {
  static getMetaData() {
    return {
      displayName: 'Skills',
      className: "Skills",
      itemName: "skills",
      localizationName: "SWFFG.Skills",
      fileNames: ["Skills.xml"],
      filesAreDir: false,
      phase: 1,
    };
  }

  static async Import(xml, createJournalCompendium) {
    CONFIG.temporary["skills"] = {};

    const base = JXON.xmlToJs(xml);
    let items = base.Skills.Skill;
    let totalCount = items.length;
    let currentCount = 0;
    let pack;
    if (createJournalCompendium) {
      pack = await ImportHelpers.getCompendiumPack("JournalEntry", `oggdude.SkillDescriptions`);
      $(".import-progress.skills").toggleClass("import-hidden");
      CONFIG.logger.debug(`Starting Oggdude Skill Import`);
    }

    await ImportHelpers.asyncForEach(items, async (item) => {
      try {
        if (item.Description.split('\n').length > 0) {
          item.Description = item.Description.replace('\n\n', '\n').split('\n').slice(1).join('<br>');
        }

        let data = {
          name: `${item.TypeValue === "stKnowledge" ? "Knowledge: " : ""}${item.Name.replace(" - ", ": ")}`,
          flags: {
            starwarsffg: {
              ffgimportid: item.Key,
            }
          },
          pages: [{
            name: `${item.TypeValue === "stKnowledge" ? "Knowledge: " : ""}${item.Name.replace(" - ", ": ")}`,
            type: 'text',
            text: {
              content: item?.Description?.length && item.Description.length > 0 ? item.Description : "Dataset did not have a description",
              format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
            },
          }],
        };
        CONFIG.temporary.skills[data.flags.starwarsffg.ffgimportid] = data.name;

        if (createJournalCompendium) {
          switch (item.TypeValue) {
            case "stKnowledge": {
              data.img = `icons/svg/book.svg`;
              break;
            }
            case "stCombat": {
              data.img = `icons/svg/combat.svg`;
              break;
            }
            default: {
              data.img = `icons/svg/eye.svg`;
            }
          }
          data.content += ImportHelpers.getSources(item?.Sources ?? item?.Source);
          await ImportHelpers.addImportItemToCompendium("JournalEntry", data, pack);

          currentCount += 1;

          $(".skills .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
        }
      } catch (err) {
        CONFIG.logger.error(`Error importing record : `, err);
      }
    });
    CONFIG.logger.debug(`Completed Oggdude Skill Import`);
  }
}
