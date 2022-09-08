import ImportHelpers from "../../import-helpers.js";

export default class Specializations {
  static async Import(zip) {
    try {
      const files = Object.values(zip.files).filter((file) => {
        return !file.dir && file.name.split(".").pop() === "xml" && file.name.includes("/Specializations/");
      });
      let totalCount = files.length;
      let currentCount = 0;

      if (files.length) {
        let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.Specializations`);
        CONFIG.logger.debug(`Starting Oggdude Specialization Import`);
        $(".import-progress.specializations").toggleClass("import-hidden");

        await ImportHelpers.asyncForEach(files, async (file) => {
          try {
            const zipData = await zip.file(file.name).async("text");
            const xmlData = ImportHelpers.stringToXml(zipData);
            const specializationData = JXON.xmlToJs(xmlData);
            const item = specializationData.Specialization;

            let data = ImportHelpers.prepareBaseObject(item, "specialization");
            data.system = {
              attributes: {},
              description: item.Description,
              talents: {},
              careerskills: {},
              isReadOnly: true,
            };

            data.system.description += ImportHelpers.getSources(item?.Sources ?? item?.Source);
            data.system.attributes = mergeObject(data.system.attributes, ImportHelpers.processStatMod(item?.Attributes));
            data.system.attributes = mergeObject(data.system.attributes, ImportHelpers.processCareerSkills(item?.CareerSkills, true));

            for (let i = 0; i < item.TalentRows.TalentRow.length; i += 1) {
              const row = item.TalentRows.TalentRow[i];

              await ImportHelpers.asyncForEach(row.Talents.Key, async (keyName, index) => {
                let rowTalent = {};

                let talentItem = await ImportHelpers.findCompendiumEntityByImportId("Item", keyName, undefined, "talent");
                if (!talentItem) {
                  talentItem = ImportHelpers.findEntityByImportId("items", keyName);
                }

                if (talentItem) {
                  rowTalent.name = talentItem.name;
                  rowTalent.description = talentItem.system.description;
                  rowTalent.activation = talentItem.system.activation.value;
                  rowTalent.activationLabel = talentItem.system.activation.label;
                  rowTalent.isForceTalent = talentItem?.system?.isForceTalent ? true : false;
                  rowTalent.isConflictTalent = talentItem?.system?.isConflictTalent ? true : false;
                  rowTalent.isRanked = talentItem?.system?.ranks?.ranked ? true : false;
                  rowTalent.size = "single";
                  rowTalent.canLinkTop = true;
                  rowTalent.canLinkRight = true;
                  rowTalent.itemId = talentItem._id;
                  rowTalent.attributes = talentItem.system.attributes;

                  if (row.Directions.Direction[index].Up && row.Directions.Direction[index].Up === "true") {
                    rowTalent["links-top-1"] = true;
                  }

                  if (row.Directions.Direction[index].Right && row.Directions.Direction[index].Right === "true") {
                    rowTalent["links-right"] = true;
                  }

                  if (talentItem.compendium) {
                    rowTalent.pack = `${talentItem.compendium.metadata.package}.${talentItem.compendium.metadata.name}`;
                  }

                  const talentKey = `talent${i * 4 + index}`;
                  data.system.talents[talentKey] = rowTalent;
                } else {
                  CONFIG.logger.warn(`Unable to find ${keyName}`);
                }
              });
            }

            let imgPath = await ImportHelpers.getImageFilename(zip, "Specialization", "", data.flags.starwarsffg.ffgimportid);
            if (imgPath) {
              data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
            }

            await ImportHelpers.addImportItemToCompendium("Item", data, pack, true);

            currentCount += 1;

            $(".specializations .import-progress-bar")
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
