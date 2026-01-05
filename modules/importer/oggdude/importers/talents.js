import ImportHelpers from "../../import-helpers.js";

export default class Talents {
  static getMetaData() {
    return {
      displayName: 'Talents',
      className: "Talent",
      itemName: "talent",
      localizationName: "TYPES.Item.talent",
      fileNames: ["/Talents.xml"],
      filesAreDir: false,
      phase: 3,
    };
  }

  static async Import(xml, zip) {
    try {
      const base = JXON.xmlToJs(xml);
      let items = base?.Talents?.Talent;
      if (items?.length) {
        let totalCount = items.length;
        let currentCount = 0;
        let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.Talents`);
        CONFIG.logger.debug(`Starting Oggdude Talents Import`);
        $(".import-progress.talent").toggleClass("import-hidden");

        await ImportHelpers.asyncForEach(items, async (item) => {
          try {
            let data = ImportHelpers.prepareBaseObject(item, "talent");

            let activation = "Passive";
            let activationLabel = "SWFFG.TalentActivationsPassive";

            switch (item.ActivationValue) {
              case "taManeuver":
                activation = "Active (Maneuver)";
                activationLabel = "SWFFG.TalentActivationsActiveManeuver";
                break;
              case "taAction":
                activation = "Active (Action)";
                activationLabel = "SWFFG.TalentActivationsActiveAction";
                break;
              case "taIncidental":
                activation = "Active (Incidental)";
                activationLabel = "SWFFG.TalentActivationsActiveIncidental";
                break;
              case "taIncidentalOOT":
                activation = "Active (Incidental, Out of Turn)";
                activationLabel = "SWFFG.TalentActivationsActiveIncidentalOutofTurn";
                break;
              default:
                activation = "Passive";
                activationLabel = "SWFFG.TalentActivationsPassive";
            }

            if (item.Description.split('\n').length > 0 && item.Description.includes('[H4]')) {
              // remove the item name in the description....
              item.Description = item.Description.replace('\n\n', '\n').split('\n').slice(1).join('<br>');
            }

            data.data = {
              attributes: {},
              description: item.Description,
              longDesc: "",
              ranks: {
                ranked: item.Ranked === "true" ? true : false,
              },
              activation: {
                value: activation,
                label: activationLabel,
              },
              isForceTalent: item.ForceTalent === "true" ? true : false,
              isConflictTalent: item?.Conflict ? true : false,
              metadata: {
                tags: [
                  "talent",
                ],
                sources: ImportHelpers.getSourcesAsArray(item?.Sources ?? item?.Source),
              },
            };

            //data.data.description += ImportHelpers.getSources(item?.Sources ?? item?.Source);
            data.data.attributes = foundry.utils.mergeObject(data.data.attributes, await ImportHelpers.processStatMod(item?.Attributes));
            data.data.attributes = foundry.utils.mergeObject(data.data.attributes, await ImportHelpers.processCareerSkills(item?.ChooseCareerSkills?.NewSkills));
            if (item?.DieModifiers) {
              const dieModifiers = await ImportHelpers.processDieMod(item.DieModifiers);
              data.data.attributes = foundry.utils.mergeObject(data.data.attributes, dieModifiers.attributes);
            }

            // populate tags
            try {
              if (Array.isArray(item.Categories.Category)) {
                for (const tag of item.Categories.Category) {
                  data.data.metadata.tags.push(tag.toLowerCase());
                }
              } else {
                data.data.metadata.tags.push(item.Categories.Category.toLowerCase());
              }
            } catch (err) {
              CONFIG.logger.debug(`No categories found for item ${item.Key}`);
            }
            if (item?.Type) {
              // the "type" can be useful as a tag as well
              data.data.metadata.tags.push(item.Type.toLowerCase());
            }

            let imgPath = await ImportHelpers.getImageFilename(zip, "Talent", "", data.flags.starwarsffg.ffgimportid);
            if (imgPath) {
              data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
            }

            await ImportHelpers.addImportItemToCompendium("Item", data, pack);

            currentCount += 1;

            $(".talent .import-progress-bar")
              .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
              .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          } catch (err) {
            CONFIG.logger.error(`Error importing record : `, err);
          }
        });
      } else {
        CONFIG.logger.warn("Unable to find any talents!");
      }
    } catch (err) {
      CONFIG.logger.error(`Error importing record : `, err);
    }
    CONFIG.logger.debug(`Completed Oggdude Talents Import`);
  }
}
