import ImportHelpers from "../../import-helpers.js";

export default class Vehicles {
  static async Import(zip) {
    try {
      const files = Object.values(zip.files).filter((file) => {
        return !file.dir && file.name.split(".").pop() === "xml" && file.name.includes("/Vehicles/");
      });
      let totalCount = files.length;
      let currentCount = 0;

      if (files.length) {
        CONFIG.logger.debug(`Starting Oggdude Vehicles Import`);
        $(".import-progress.vehicles").toggleClass("import-hidden");

        await ImportHelpers.asyncForEach(files, async (file) => {
          try {
            const zipData = await zip.file(file.name).async("text");
            const xmlData = ImportHelpers.stringToXml(zipData);
            const vehicleData = JXON.xmlToJs(xmlData);
            const item = vehicleData.Vehicle;

            const isSpaceVehicle = ["Starship", "Non-Fighter Starship", "Capital Ship", "Station", "Medium Transport"].some((element) => item?.Categories?.Category?.includes(element)) || ["Space-dwelling Creature", "Hyperdrive Sled", "Hyperdrive Docking Ring"].includes(item.Type);

            const pack = isSpaceVehicle ? await ImportHelpers.getCompendiumPack("Actor", `oggdude.Vehicles.Space`) : await ImportHelpers.getCompendiumPack("Actor", `oggdude.Vehicles.Planetary`);

            let data = ImportHelpers.prepareBaseObject(item, "vehicle");
            data.items = [];
            data.system = {
              biography: item.Description,
              stats: {
                silhouette: {
                  value: item.Silhouette ? parseInt(item.Silhouette, 10) : 0,
                },
                speed: {
                  max: item.Speed ? parseInt(item.Speed, 10) : 0,
                },
                handling: {
                  value: item.Handling ? parseInt(item.Handling, 10) : 0,
                },
                hullTrauma: {
                  max: item.HullTrauma ? parseInt(item.HullTrauma, 10) : 0,
                },
                systemStrain: {
                  max: item.SystemStrain ? parseInt(item.SystemStrain, 10) : 0,
                },
                shields: {
                  fore: item.DefFore ? parseInt(item.DefFore, 10) : 0,
                  port: item.DefPort ? parseInt(item.DefPort, 10) : 0,
                  starboard: item.DefStarboard ? parseInt(item.DefStarboard, 10) : 0,
                  aft: item.DefAft ? parseInt(item.DefAft, 10) : 0,
                },
                armour: {
                  value: item.Armor ? parseInt(item.Armor, 10) : 0,
                },
                sensorRange: {
                  value: item.SensorRangeValue?.includes("sr") ? item.SensorRangeValue.replace("sr", "") : "None",
                },
                crew: {},
                passengerCapacity: {
                  value: item.Passengers ? parseInt(item.Passengers, 10) : 0,
                },
                encumbrance: {
                  max: item.EncumbranceCapacity ? parseInt(item.EncumbranceCapacity, 10) : 0,
                },
                cost: {
                  value: item.Price ? parseInt(item.Price, 10) : 0,
                },
                rarity: {
                  value: item.Rarity ? parseInt(item.Rarity, 10) : 0,
                },
                customizationHardPoints: {
                  value: item.HP ? parseInt(item.HP, 10) : 0,
                },
                hyperdrive: {
                  value: item.HyperdrivePrimary ? parseInt(item.HyperdrivePrimary, 10) : 1,
                },
                consumables: {
                  value: 1,
                  duration: "months",
                },
              },
              itemmodifier: [],
              itemattachment: [],
              metadata: {
                tags: [
                  "vehicle",
                ],
              },
            };

            data.system.biography += ImportHelpers.getSources(item?.Sources ?? item?.Source);

            if (item.VehicleWeapons?.VehicleWeapon) {
              if (!Array.isArray(item.VehicleWeapons.VehicleWeapon)) {
                item.VehicleWeapons.VehicleWeapon = [item.VehicleWeapons.VehicleWeapon];
              }
              await ImportHelpers.asyncForEach(item.VehicleWeapons.VehicleWeapon, async (weapon) => {
                const weaponEntity = await ImportHelpers.findCompendiumEntityByImportId("Item", weapon.Key, undefined, "shipweapon");
                if (weaponEntity) {
                  const weaponData = JSON.parse(JSON.stringify(weaponEntity));
                  delete weaponData._id;

                  if (!Array.isArray(weaponData.system.itemmodifier)) {
                    weaponData.system.itemmodifier = [];
                  }
                  const count = weapon.Count ? parseInt(weapon.Count, 10) : 1;
                  if (!weaponData.system?.firingarc) weaponData.system.firingarc = {};
                  ["Fore", "Aft", "Port", "Starboard", "Dorsal", "Ventral"].forEach((location) => {
                    weaponData.system.firingarc[location.toLowerCase()] = weapon?.FiringArcs?.[location] === "true" ? true : false;
                  });

                  if (weapon?.Qualities) {
                    const mods = await ImportHelpers.processMods(weapon);
                    if (mods.qualities) {
                      weaponData.system.itemmodifier = weaponData.system.itemmodifier.concat(mods.qualities.itemmodifier);
                    }
                  }

                  data.items.push(weaponData);
                } else {
                  CONFIG.logger.warn(`Unable to find weapon : ${weapon.Key}`);
                }
              });
            }

            // populate tags
            try {
              if (Array.isArray(item.Categories.Category)) {
                for (const tag of item.Categories.Category) {
                  data.system.metadata.tags.push(tag.toLowerCase());
                }
              } else {
                data.system.metadata.tags.push(item.Categories.Category.toLowerCase());
              }
            } catch (err) {
              CONFIG.logger.debug(`No categories found for item ${item.Key}`);
            }
            if (item?.Type) {
              // the "type" can be useful as a tag as well
              data.system.metadata.tags.push(item.Type.toLowerCase());
            }

            let imgPath = await ImportHelpers.getImageFilename(zip, "Vehicle", "", data.flags.starwarsffg.ffgimportid);
            if (imgPath) {
              data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
            }

            await ImportHelpers.addImportItemToCompendium("Actor", data, pack);

            currentCount += 1;

            $(".vehicles .import-progress-bar")
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
