import ImportHelpers from "../../import-helpers.js";

export default class Career {
  static async Import(zip) {
    try {
      const files = Object.values(zip.files).filter((file) => {
        return !file.dir && file.name.split(".").pop() === "xml" && file.name.includes("/Careers/");
      });
      let totalCount = files.length;
      let currentCount = 0;

      if (files.length) {
        let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.Careers`);
        CONFIG.logger.debug(`Starting Oggdude Careers Import`);
        $(".import-progress.careers").toggleClass("import-hidden");

        await ImportHelpers.asyncForEach(files, async (file) => {
          try {
            const zipData = await zip.file(file.name).async("text");
            const xmlData = ImportHelpers.stringToXml(zipData);
            const careerData = JXON.xmlToJs(xmlData);
            const item = careerData.Career;

            let data = ImportHelpers.prepareBaseObject(item, "career");

            data.data = {
              attributes: {},
              description: item.Description,
              specializations: {},
              signatureabilities: {},
              metadata: {
                tags: [
                    "career",
                ],
                sources: ImportHelpers.getSourcesAsArray(item?.Sources ?? item?.Source),
              },
            };

            //data.data.description += ImportHelpers.getSources(item.Sources ?? item.Source);

            // process career skills
            item.CareerSkills.Key.forEach((skillKey) => {
              let skill = CONFIG.temporary.skills[skillKey];
              if (skill) {
                data.data.attributes[`attr${foundry.utils.randomID()}`] = {
                  mod: skill,
                  modtype: "Career Skill",
                  value: true,
                };
                data.data.attributes[`attr${foundry.utils.randomID()}`] = {
                  mod: skill,
                  modtype: "Skill Rank",
                  value: 0,
                };
              }
            });

            // process career attributes
            if (item?.Attributes) {
              Object.keys(item.Attributes).forEach((attr) => {
                switch (attr) {
                  case "ForceRating": {
                    data.data.attributes[`attr${foundry.utils.randomID()}`] = {
                      mod: "ForcePool",
                      modtype: "Stat",
                      value: item.Attributes[attr],
                    };
                    break;
                  }
                }
              });
            }

            // process specializations
            if (item?.Specializations) {
              for (const specializationKey of Object.values(item.Specializations.Key)) {
                let specializationItem = await ImportHelpers.findCompendiumEntityByImportId("Item", specializationKey, "starwarsffg.oggdudespecializations", "specialization");
                if (!specializationItem) {
                  continue;
                }
                data.data.specializations[specializationItem._id] = {
                  name: specializationItem.name,
                  source: specializationItem.uuid,
                  id: specializationItem._id,
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

            let imgPath = await ImportHelpers.getImageFilename(zip, "Career", "", data.flags.starwarsffg.ffgimportid);
            if (imgPath) {
              data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
            }

            await ImportHelpers.addImportItemToCompendium("Item", data, pack);
            currentCount += 1;

            $(".careers .import-progress-bar")
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
