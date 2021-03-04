import ImportHelpers from "../../import-helpers.js";

export default class Talents {
  static async Import(xml, zip) {
    try {
      const base = JXON.xmlToJs(xml);
      let items = base?.Talents?.Talent;
      if (items?.length) {
        let totalCount = items.length;
        let currentCount = 0;
        let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.Talents`);
        CONFIG.logger.debug(`Starting Oggdude Talents Import`);
        $(".import-progress.talents").toggleClass("import-hidden");

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

            data.data = {
              attributes: {},
              description: item.Description,
              ranks: {
                ranked: item.Ranked === "true" ? true : false,
              },
              activation: {
                value: activation,
                label: activationLabel,
              },
              isForceTalent: item.ForceTalent === "true" ? true : false,
              isConflictTalent: item?.Conflict ? true : false,
            };

            data.data.description += ImportHelpers.getSources(item?.Sources ?? item?.Source);
            data.data.attributes = mergeObject(data.data.attributes, ImportHelpers.processStatMod(item?.Attributes));
            data.data.attributes = mergeObject(data.data.attributes, ImportHelpers.processCareerSkills(item?.ChooseCareerSkills?.NewSkills));
            if (item?.DieModifiers) {
              const dieModifiers = await ImportHelpers.processDieMod(item.DieModifiers);
              data.data.attributes = mergeObject(data.data.attributes, dieModifiers.attributes);
            }

            let imgPath = await ImportHelpers.getImageFilename(zip, "Talent", "", data.flags.ffgimportid);
            if (imgPath) {
              data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
            }

            await ImportHelpers.addImportItemToCompendium("Item", data, pack);

            currentCount += 1;

            $(".talents .import-progress-bar")
              .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
              .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          } catch (err) {
            CONFIG.logger.error(`Error importing record : `, err);
          }
        });
      }
    } catch (err) {
      CONFIG.logger.error(`Error importing record : `, err);
    }
    CONFIG.logger.debug(`Completed Oggdude Talents Import`);
  }
}
