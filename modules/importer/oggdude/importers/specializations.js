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
              metadata: {
                tags: [
                  "specialization",
                ],
                sources: ImportHelpers.getSourcesAsArray(item?.Sources ?? item?.Source),
              },
              careerSkills: {
                careerSkill0: "(none)",
                careerSkill1: "(none)",
                careerSkill2: "(none)",
                careerSkill3: "(none)",
                careerSkill4: "(none)",
              },
              universal: false,
            };

            // process career skills
            let currentSkill = 0;
            if (item?.CareerSkills && item.CareerSkills?.Key) {
              item.CareerSkills.Key.forEach((skillKey) => {
                let skill = CONFIG.temporary.skills[skillKey];
                if (skill) {
                  data.system.careerSkills[`careerSkill${currentSkill}`] = skill;
                  currentSkill++;
                }
              });
            }

            if (item?.Universal) {
              data.system.universal = item.Universal === 'true';
            }

            for (let i = 0; i < item.TalentRows.TalentRow.length; i += 1) {
              const row = item.TalentRows.TalentRow[i];

              let index = 0;
              for (const talentKey of row.Talents.Key) {
                let rowTalent = {};

                let talentItem = await ImportHelpers.findCompendiumEntityByImportId("Item", talentKey, undefined, "talent");
                if (!talentItem) {
                  talentItem = ImportHelpers.findEntityByImportId("items", talentKey);
                }

                const originalAttributes = foundry.utils.deepClone(talentItem.system.attributes);
                for (const attribute of Object.keys(originalAttributes)) {
                  const nk = new Date().getTime();
                  talentItem.system.attributes[`attr${nk}`] = foundry.utils.deepClone(originalAttributes[attribute]);
                  delete talentItem.system.attributes[attribute];
                  // ensure further keys have a new entry
                  await new Promise(r => setTimeout(r, 1));
                }

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
                rowTalent.longDesc = "";

                if (row.Directions.Direction[index].Up && row.Directions.Direction[index].Up === "true") {
                  rowTalent["links-top-1"] = true;
                }

                if (row.Directions.Direction[index].Right && row.Directions.Direction[index].Right === "true") {
                  rowTalent["links-right"] = true;
                }

                const talentIndex = `talent${i * 4 + index}`;
                data.system.talents[talentIndex] = foundry.utils.deepClone(rowTalent);

                index++;
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

            let imgPath = await ImportHelpers.getImageFilename(zip, "Specialization", "", data.flags.starwarsffg.ffgimportid);
            if (imgPath) {
              data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
            }

            await ImportHelpers.addImportItemToCompendium("Item", data, pack);

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
