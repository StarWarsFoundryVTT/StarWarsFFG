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

  static async getSpecializationTalent(itemId, packName) {
    let item = game.items.get(itemId);

    if (item) {
      return item;
    } else {
      const pack = await game.packs.get(packName);
      await pack.getIndex();
      const entry = await pack.index.find((e) => e._id === itemId);
      if (entry) {
        return await pack.getEntity(entry._id);
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

  /**
   * Returns the difference between object 1 and 2
   * @param  {object} obj1
   * @param  {object} obj2
   * @returns {object}
   */
  static diff(obj1, obj2) {
    var result = {};
    for (const key in obj1) {
      if (obj2[key] != obj1[key]) result[key] = obj2[key];
      if (typeof obj2[key] == "array" && typeof obj1[key] == "array") result[key] = this.diff(obj1[key], obj2[key]);
      if (typeof obj2[key] == "object" && typeof obj1[key] == "object") result[key] = this.diff(obj1[key], obj2[key]);
    }
    return result;
  }
}
