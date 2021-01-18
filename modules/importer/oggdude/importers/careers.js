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
            };

            data.data.description += ImportHelpers.getSources(item.Sources ?? item.Source);

            // process career skills
            item.CareerSkills.Key.forEach((skillKey) => {
              let skill = CONFIG.temporary.skills[skillKey];
              if (skill) {
                data.data.attributes[`attr${randomID()}`] = {
                  mod: skill,
                  modtype: "Career Skill",
                  value: true,
                };
                data.data.attributes[`attr${randomID()}`] = {
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
                    data.data.attributes[`attr${randomID()}`] = {
                      mod: "ForcePool",
                      modtype: "Stat",
                      value: item.Attributes[attr],
                    };
                    break;
                  }
                }
              });
            }

            let imgPath = await ImportHelpers.getImageFilename(zip, "Career", "", data.flags.ffgimportid);
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
