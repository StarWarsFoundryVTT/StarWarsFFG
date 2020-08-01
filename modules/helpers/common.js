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
      let packs = Array.from(await game.packs.keys());
      for (let i = 0; i < packs.length; i += 1) {
        let packId = packs[i];
        const pack = await game.packs.get(packId);
        if (pack.entity === "Item" && !pack.locked) {
          await pack.getIndex();
          const entry = await pack.index.find((e) => e._id === itemId);

          if (entry) {
            return await pack.getEntity(entry._id);
          }
        }
      }
    }
  }
}
