export default class Helpers {
  static logger = {
    log: (...args) => {
      console.log(`${CONFIG.module} | `, ...args);
    },
    debug: (...args) => {
      if (game.settings.get("starwarsffg", "enableDebug")) {
        console.debug(`${CONFIG.module} | `, ...args);
      }
    },
    warn: (...args) => {
      console.warn(`${CONFIG.module} | `, ...args);
    },
    error: (...args) => {
      console.error(`${CONFIG.module} | `, ...args, new Error().stack);
    },
  };

  static async getSpecializationTalent(itemId) {
    let item = game.items.get(itemId);

    if (item) {
      return item;
    } else {
      Helpers.logger.debug(`Specialization Talent not found in item, checking compendiums`);
      let packs = await game.packs.keys();
      for (let packId of packs) {
        const pack = await game.packs.get(packId);
        if (pack.entity === "Item" && !pack.locked) {
          await pack.getIndex();
          const entry = await pack.index.find((e) => e._id === itemId);
          return await pack.getEntity(entry._id);
        }
      }
    }
  }
}
