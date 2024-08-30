import ImportHelpers from "../../import-helpers.js";

export default class Species {
  static async Import(zip) {
    try {
      const files = Object.values(zip.files).filter((file) => {
        return !file.dir && file.name.split(".").pop() === "xml" && file.name.includes("/Species/");
      });
      let totalCount = files.length;
      let currentCount = 0;

      if (files.length) {
        let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.Species`);
        CONFIG.logger.debug(`Starting Oggdude Species Import`);
        $(".import-progress.species").toggleClass("import-hidden");

        await ImportHelpers.asyncForEach(files, async (file) => {
          try {
            const zipData = await zip.file(file.name).async("text");
            const xmlData = ImportHelpers.stringToXml(zipData);
            const speciesData = JXON.xmlToJs(xmlData);
            const item = speciesData.Species;

            let data = ImportHelpers.prepareBaseObject(item, "species");

            data.data = {
              attributes: {},
              description: item.Description,
              talents: {},
              abilities: {},
              startingXP: item.StartingAttrs.Experience ? parseInt(item.StartingAttrs.Experience, 10) : 0,
              metadata: {
                tags: [
                  "species",
                ],
              },
            };

            // populate starting characteristics
            Object.keys(item.StartingChars).forEach((char) => {
              data.data.attributes[char] = {
                mod: char,
                modtype: "Characteristic",
                value: parseInt(item.StartingChars[char], 10),
                exclude: true,
              };
            });

            // populate starting stats
            Object.keys(item.StartingAttrs).forEach((attr) => {
              let mod;
              switch (attr) {
                case "WoundThreshold":
                case "StrainThreshold": {
                  mod = attr.replace("Threshold", "");
                  break;
                }
              }
              if (mod === "Wound") mod = "Wounds";

              if (mod) {
                data.data.attributes[mod] = {
                  mod,
                  modtype: "Stat",
                  value: item?.StartingAttrs?.[attr] ? parseInt(item.StartingAttrs[attr], 10) : 0,
                  exclude: true,
                };
              }
            });

            // populate species bonus skills
            if (item?.SkillModifiers?.SkillModifier) {
              if (!Array.isArray(item?.SkillModifiers?.SkillModifier)) {
                item.SkillModifiers.SkillModifier = [item.SkillModifiers.SkillModifier];
              }

              item.SkillModifiers.SkillModifier.forEach((skillMod) => {
                let skill = CONFIG.temporary.skills[skillMod.Key];
                if (skill) {
                  data.data.attributes[skill] = {
                    mod: skill,
                    modtype: "Skill Rank",
                    value: skillMod.RankStart ? parseInt(skillMod.RankStart, 10) : 0,
                    exclude: false,
                  };
                }
              });
            }

            // populate talents
            if (item?.TalentModifiers?.TalentModifier) {
              for (const talentData of Object.values(item.TalentModifiers)) {
                const talentKey = talentData.Key;
                let talent = await ImportHelpers.findCompendiumEntityByImportId("Item", talentKey, "starwarsffg.oggdudetalents", "talent", true);
                if (!talent) {
                  continue;
                }
                data.data.talents[talent._id] = {
                  name: talent.name,
                  source: talent.uuid,
                  id: talent._id,
                }
              }
            }

            if (item?.OptionChoices?.OptionChoice) {
              if (!Array.isArray(item.OptionChoices.OptionChoice)) {
                item.OptionChoices.OptionChoice = [item.OptionChoices.OptionChoice];
              }

              data.data.description += "<h4>Abilities</h4>";

              // populate abilities
              await ImportHelpers.asyncForEach(item.OptionChoices.OptionChoice, async (o) => {
                let option = o.Options.Option;
                if (!Array.isArray(o.Options.Option)) {
                  option = [o.Options.Option];
                }

                for (const curOption of option) {
                  data.data.abilities[foundry.utils.randomID()] = {
                    name: curOption.Name,
                    type: "ability",
                    system: {
                      description: curOption.Description,
                    },
                  };
                }

                if (option[0].DieModifiers) {
                  const dieModifiers = await ImportHelpers.processDieMod(option[0].DieModifiers);
                  data.data.attributes = foundry.utils.mergeObject(data.data.attributes, dieModifiers.attributes);
                }

                data.data.description += `<p>${option[0].Name} : ${option[0].Description}</p>`;
              });
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

            let imgPath = await ImportHelpers.getImageFilename(zip, "Species", "", data.flags.genesysk2.ffgimportid);
            if (imgPath) {
              data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
            }

            data.data.description += ImportHelpers.getSources(item.Sources ?? item.Source);

            await ImportHelpers.addImportItemToCompendium("Item", data, pack);
            currentCount += 1;

            $(".species .import-progress-bar")
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
  }
}
