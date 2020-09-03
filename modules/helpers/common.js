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

  /**
   * Uploads a file to Foundry without the UI Notification
   * @param  {string} source
   * @param  {string} path
   * @param  {blog} file
   * @param  {object} options
   */
  static async UploadFile(source, path, file, options) {
    const fd = new FormData();
    fd.set("source", source);
    fd.set("target", path);
    fd.set("upload", file);
    Object.entries(options).forEach((o) => fd.set(...o));

    const request = await fetch(FilePicker.uploadURL, { method: "POST", body: fd });
    if (request.status === 413) {
      return ui.notifications.error(game.i18n.localize("FILES.ErrorTooLarge"));
    } else if (request.status !== 200) {
      return ui.notifications.error(game.i18n.localize("FILES.ErrorSomethingWrong"));
    }
  }
}
