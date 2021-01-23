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
            data.data = {
              biography: item.Description,
              stats: {
                silhouette: {
                  value: parseInt(item.Silhouette, 10),
                },
                speed: {
                  max: parseInt(item.Speed, 10),
                },
                handling: {
                  value: parseInt(item.Handling, 10),
                },
                hullTrauma: {
                  max: parseInt(item.HullTrauma, 10),
                },
                systemStrain: {
                  max: parseInt(item.SystemStrain, 10),
                },
                shields: {
                  fore: parseInt(item.DefFore, 10),
                  port: parseInt(item.DefPort, 10),
                  starboard: parseInt(item.DefStarboard, 10),
                  aft: parseInt(item.DefAft, 10),
                },
                armour: {
                  value: parseInt(item.Armor, 10),
                },
                sensorRange: {
                  value: item.SensorRangeValue?.includes("sr") ? item.SensorRangeValue.replace("sr", "") : "None",
                },
                crew: {},
                passengerCapacity: {
                  value: parseInt(item.Passengers, 10),
                },
                encumbrance: {
                  max: parseInt(item.EncumbranceCapacity, 10),
                },
                cost: {
                  value: parseInt(item.Price, 10),
                },
                rarity: {
                  value: parseInt(item.Rarity, 10),
                },
                customizationHardPoints: {
                  value: parseInt(item.HP, 10),
                },
                hyperdrive: {
                  value: parseInt(item.HyperdrivePrimary, 10),
                },
                consumables: {
                  value: 1,
                  duration: "months",
                },
              },
            };

            data.data.biography += ImportHelpers.getSources(item?.Sources ?? item?.Source);

            if (item.VehicleWeapons?.VehicleWeapon) {
              if (!Array.isArray(item.VehicleWeapons.VehicleWeapon)) {
                item.VehicleWeapons.VehicleWeapon = [item.VehicleWeapons.VehicleWeapon];
              }
              await ImportHelpers.asyncForEach(item.VehicleWeapons.VehicleWeapon, async (weapon) => {
                const weaponEntity = await ImportHelpers.findCompendiumEntityByImportId("Item", weapon.Key);
                if (weaponEntity) {
                  const weaponData = JSON.parse(JSON.stringify(weaponEntity));
                  const count = weapon.Count ? parseInt(weapon.Count, 10) : 1;
                  if (!weaponData.data?.firingarc) weaponData.data.firingarc = {};
                  ["Fore", "Aft", "Port", "Starboard", "Dorsal", "Ventral"].forEach((location) => {
                    weaponData.data.firingarc[location.toLowerCase()] = weapon?.FiringArcs?.[location] === "true" ? true : false;
                  });

                  if (weapon?.Qualities) {
                    const mods = await ImportHelpers.processMods(weapon);
                    if (mods.qualities) {
                      weaponData.data.itemmodifier = weaponData.data.itemmodifier.concat(mods.qualities.itemmodifier);
                    }
                  }

                  data.items.push(weaponData);
                } else {
                  CONFIG.logger.warn(`Unable to find weaon : ${weapon.Key}`);
                }
              });
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
