import ImportHelpers from "../../import-helpers.js";

export default class ForcePowers {
  static async Import(xml, zip) {
    try {
      const base = JXON.xmlToJs(xml);
      const abilities = base?.ForceAbilities?.ForceAbility;

      if (abilities?.length) {
        const files = Object.values(zip.files).filter((file) => {
          return !file.dir && file.name.split(".").pop() === "xml" && file.name.includes("/Force Powers/");
        });
        let totalCount = files.length;
        let currentCount = 0;

        if (files.length) {
          let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.ForcePowers`);
          CONFIG.logger.debug(`Starting Oggdude Force Powers Import`);
          $(".import-progress.force").toggleClass("import-hidden");

          await ImportHelpers.asyncForEach(files, async (file) => {
            try {
              const zipData = await zip.file(file.name).async("text");
              const xmlData = ImportHelpers.stringToXml(zipData);
              const forceData = JXON.xmlToJs(xmlData);
              const item = forceData.ForcePower;

              //
              const basePowerKey = item.AbilityRows.AbilityRow[0].Abilities.Key[0];
              let basepower = abilities.find((ability) => {
                return ability.Key === basePowerKey;
              });

              let data = ImportHelpers.prepareBaseObject(item, "forcepower");
              data.data = {
                attributes: {},
                description: basepower.Description,
                upgrades: {},
                required_force_rating: item?.MinForceRating ? item.MinForceRating : 1,
                metadata: {
                  tags: [
                      "forcepower",
                  ],
                  sources: ImportHelpers.getSourcesAsArray(item?.Sources ?? item?.Source),
                },
              };

              try {
                data.data.base_cost = item.AbilityRows.AbilityRow[0].Costs.Cost[0];
              } catch (err) {
                data.data.base_cost = 0;
              }

              //data.data.description += ImportHelpers.getSources(item?.Sources ?? item?.Source);
              if (basepower?.DieModifiers) {
                const dieModifiers = await ImportHelpers.processDieMod(basepower.DieModifiers);
                data.data.attributes = foundry.utils.mergeObject(data.data.attributes, dieModifiers.attributes);
              }

              // process all ability rows
              for (let i = 1; i < item.AbilityRows.AbilityRow.length; i += 1) {
                try {
                  const row = item.AbilityRows.AbilityRow[i];
                  await ImportHelpers.asyncForEach(row.Abilities.Key, async (keyName, index) => {
                    try {
                      let rowAbility = {};

                      let rowAbilityData = abilities.find((a) => {
                        return a.Key === keyName;
                      });

                      rowAbility.name = rowAbilityData.Name;
                      rowAbility.description = rowAbilityData.Description;
                      rowAbility.cost = row.Costs.Cost[index];
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

                      if (rowAbilityData?.DieModifiers) {
                        const dieModifiers = await ImportHelpers.processDieMod(rowAbilityData.DieModifiers);
                        rowAbility.attributes = foundry.utils.mergeObject(rowAbility.attributes, dieModifiers.attributes);
                      }

                      const talentKey = `upgrade${(i - 1) * 4 + index}`;
                      data.data.upgrades[talentKey] = rowAbility;
                    } catch (err) {
                      CONFIG.logger.error(`Error import force ability ${keyName} : `, err);
                    }
                  });
                } catch (err) {
                  CONFIG.logger.error(`Error importing record : `, err);
                }
              }

              // if there are less that 5 rows (include base power) row, hide excess rows
              if (item.AbilityRows.AbilityRow.length < 5) {
                for (let i = item.AbilityRows.AbilityRow.length; i < 5; i += 1) {
                  for (let index = 0; index < 4; index += 1) {
                    const talentKey = `upgrade${(i - 1) * 4 + index}`;
                    let rowAbility = { visible: false };
                    data.data.upgrades[talentKey] = rowAbility;
                  }
                }
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

              let imgPath = await ImportHelpers.getImageFilename(zip, "ForcePowers", "", data.flags.starwarsffg.ffgimportid);
              if (imgPath) {
                data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
              }

              await ImportHelpers.addImportItemToCompendium("Item", data, pack);

              currentCount += 1;

              $(".force .import-progress-bar")
                .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
                .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
            } catch (err) {
              CONFIG.logger.error(`Error importing record : `, err);
            }
          });
        }
      }
    } catch (err) {
      CONFIG.logger.error(`Error importing record : `, err);
    }
  }
}
