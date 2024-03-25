export default class Helpers {
  static logger = {
    log: (...args) => {
      console.log(`${CONFIG.module} | `, ...args);
    },
    debug: (...args) => {
      if (game.settings.get("genesysk2", "enableDebug")) {
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
      if ( !pack.indexed ) await pack.getIndex();
      const entry = await pack.getIndex({fields: ["name", "type"]});
      if (entry) {
        const entryId = entry.filter((i) => i._id === itemId);
        return await pack.getDocument(entryId[0]._id);
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
    if (typeof ForgeVTT !== "undefined" && ForgeVTT?.usingTheForge) {
      return Helpers.ForgeUploadFile("forgevtt", path, file, options);
    }

    let fd = new FormData();
    fd.set("source", source);
    fd.set("target", path);
    fd.set("upload", file);
    Object.entries(options).forEach((o) => fd.set(...o));

    const request = await fetch(FilePicker.uploadURL, { method: "POST", body: fd });
    if (request.status === 413) {
      return ui.notifications.error(game.i18n.localize("FILES.ErrorTooLarge"));
    }

    const response = await request.json().catch((err) => {
      return {};
    });
    if (response.error) {
      ui.notifications.error(response.error);
      return false;
    } else if (!response.path) {
      return ui.notifications.error(game.i18n.localize("FILES.ErrorSomethingWrong"));
    }
  }

  static async ForgeUploadFile(source, path, file, options) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", `${path}/${file.name}`);

    const response = await ForgeAPI.call("assets/upload", fd);
    if (!response || response.error) {
      ui.notifications.error(response ? response.error : "An unknown error occured accessing The Forge API");
      return false;
    } else {
      return { path: response.url };
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

  /**
   * Returns the MIME type for a media file
   * @param  {string} header - Hex header for file.
   */
  static getMimeType(header) {
    let type = "";
    switch (header) {
      case "89504e47":
        type = "image/png";
        break;
      case "47494638":
        type = "image/gif";
        break;
      case "ffd8ffe0":
      case "ffd8ffe1":
      case "ffd8ffe2":
      case "ffd8ffe3":
      case "ffd8ffe8":
        type = "image/jpeg";
        break;
      default:
        type = "unknown"; // Or you can use the blob.type as fallback
    }

    return type;
  }
}
