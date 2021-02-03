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

            if (item?.OptionChoices?.OptionChoice) {
              if (!Array.isArray(item.OptionChoices.OptionChoice)) {
                item.OptionChoices.OptionChoice = [item.OptionChoices.OptionChoice];
              }

              data.data.description += "<h4>Abilities</h4>";

              await ImportHelpers.asyncForEach(item.OptionChoices.OptionChoice, async (o) => {
                let option = o.Options.Option;
                if (!Array.isArray(o.Options.Option)) {
                  option = [o.Options.Option];
                }

                if (option[0].DieModifiers) {
                  const dieModifiers = await ImportHelpers.processDieMod(option[0].DieModifiers);
                  data.data.attributes = mergeObject(data.data.attributes, dieModifiers.attributes);
                }

                data.data.description += `<p>${option[0].Name} : ${option[0].Description}</p>`;
              });
            }

            let imgPath = await ImportHelpers.getImageFilename(zip, "Species", "", data.flags.ffgimportid);
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
