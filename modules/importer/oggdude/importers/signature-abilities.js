import ImportHelpers from "../../import-helpers.js";

export default class SignatureAbilities {
  static async Import(xml, zip) {
    const base = JXON.xmlToJs(xml);
    let items = base?.SigAbilityNodes?.SigAbilityNode;

    if (items?.length) {
      const files = Object.values(zip.files).filter((file) => {
        return !file.dir && file.name.split(".").pop() === "xml" && file.name.includes("/SigAbilities/");
      });

      let totalCount = files.length;
      let currentCount = 0;

      $(".import-progress.signatureabilities").toggleClass("import-hidden");
      let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.SignatureAbilities`);
      CONFIG.logger.debug(`Starting Oggdude Signature Ability (${files.length}) Import`);

      await ImportHelpers.asyncForEach(files, async (file) => {
        try {
          const zipData = await zip.file(file.name).async("text");
          const xmlData = ImportHelpers.stringToXml(zipData);
          const signatureAbility = JXON.xmlToJs(xmlData);
          const item = signatureAbility.SigAbility;

          let data = {
            name: item.Name,
            type: "signatureability",
            flags: {
              ffgimportid: item.Key,
            },
            data: {
              description: item.Description,
              attributes: {},
              upgrades: {},
            },
          };

          data.data.description += ImportHelpers.getSources(item.Sources ?? item.Source);
          item.AbilityRows.AbilityRow.forEach((row, i) => {
            try {
              // skip the first row because it is the large primary ability box
              if (i > 0) {
                row.Abilities.Key.forEach((keyName, index) => {
                  let rowAbility = {};

                  let rowAbilityData = items.find((a) => {
                    return a.Key === keyName;
                  });

                  rowAbility.name = rowAbilityData.Name;
                  rowAbility.description = rowAbilityData.Description;
                  rowAbility.visible = true;
                  rowAbility.attributes = {};

                  if (row.Directions.Direction[index].Up) {
                    rowAbility["links-top-1"] = true;
                  }

                  switch (row.AbilitySpan.Span[index]) {
                    case "1":
                      rowAbility.size = "single";
                      break;
                    case "2":
                      rowAbility.size = "double";
                      if (index < 3 && row.Directions.Direction[index + 1].Up) {
                        rowAbility["links-top-2"] = true;
                      }
                      break;
                    case "3":
                      rowAbility.size = "triple";
                      if (index < 2 && row.Directions.Direction[index + 1].Up) {
                        rowAbility["links-top-2"] = true;
                      }
                      if (index < 2 && row.Directions.Direction[index + 2].Up) {
                        rowAbility["links-top-3"] = true;
                      }
                      break;
                    case "4":
                      rowAbility.size = "full";
                      if (index < 1 && row.Directions.Direction[index + 1].Up) {
                        rowAbility["links-top-2"] = true;
                      }
                      if (index < 1 && row.Directions.Direction[index + 2].Up) {
                        rowAbility["links-top-3"] = true;
                      }
                      if (index < 1 && row.Directions.Direction[index + 3].Up) {
                        rowAbility["links-top-4"] = true;
                      }
                      break;
                    default:
                      rowAbility.size = "single";
                      rowAbility.visible = false;
                  }

                  if (row.Directions.Direction[index].Right) {
                    rowAbility["links-right"] = true;
                  }

                  const talentKey = `upgrade${(i - 1) * 4 + index}`;
                  data.data.upgrades[talentKey] = rowAbility;
                });
              }
            } catch (err) {
              CONFIG.logger.error(`Error importing record : `, data.name);
            }
          });
          let imgPath = await ImportHelpers.getImageFilename(zip, "SigAbilities", "", data.flags.ffgimportid);
          if (imgPath) {
            data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
          } else {
            data.img = `icons/svg/aura.svg`;
          }

          await ImportHelpers.addImportItemToCompendium("Item", data, pack);
          currentCount += 1;

          $(".signatureabilities .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
        } catch (err) {
          CONFIG.logger.error(`Error importing record : `, err);
        }
      });

      CONFIG.logger.debug(`Completed Oggdude Signature Ability (${files.length}) Import`);
    }
  }
}
