export default class ImportHelpers {
  /**
   * Verifies server path exists, and if it doesn't creates it.
   * 
   * @param  {string} startingSource - Source
   * @param  {string} path - Server path to verify
   * @returns {boolean} - true if verfied, false if unable to create/verify
   */
  static async verifyPath(startingSource, path) {
    try {
      const paths = path.split("/");
      let currentSource = paths[0];

      for(let i = 0; i < paths.length; i+=1) {
        try {
          if(currentSource !== paths[i]) {
            currentSource = `${currentSource}/${paths[i]}`; 
          }
          await FilePicker.createDirectory(startingSource, `${currentSource}`, {bucket:null});
          
        } catch (err) {
          CONFIG.logger.debug(`Error verifying path ${startingSource}, ${path}`, err);
        }
      }
    } catch (err) {
      return false;
    }

    return true;
  }

  /**
   * Imports binary file, by extracting from zip file and uploading to path.
   * 
   * @param  {string} path - Path to image within zip file
   * @param  {object} zip - Zip file
   * @param  {object} pack - Compendium Pack
   * @returns {string} - Path to file within VTT
   */
  static async importImage(path, zip, pack) {
    if(path) {
      const serverPath = `worlds/${game.world.id}/images/packs/${pack.metadata.name}`
      const filename = path.replace(/^.*[\\\/]/, '')
      await ImportHelpers.verifyPath("data", serverPath);
      const img = await zip.file(path).async("uint8array");
      const i = new File([img], filename);
      await FilePicker.upload("data", `${serverPath}`, i, { bucket: null });
      return `${serverPath}/${filename}`;
    }
  }

  /**
   * Returns the name of a file within the zip file based on a built string.
   * 
   * @param  {object} zip - Zip file
   * @param  {string} type - Object Type
   * @param  {string} itemtype - Item Type
   * @param  {string} key - Item Key
   * @returns {string} - Path to file within Zip File
   */
  static async getImageFilename(zip, type, itemtype, key) {
    const imgFileName = `${type}Images/${itemtype}${key}`

    return Object.values(zip.files).find(file => {
      if(file.name.includes(imgFileName)) {
        return file.name
      }
      return undefined;
    });
  }

  /**
   * Converts and object into an update object for entity update function
   * @param  {object} newItem - Object data
   * @returns {object} - Entity Update Object
   */
  static buildUpdateData = (newItem) => {
    CONFIG.logger.debug(`Starting BuildUpdateData for item - ${newItem.name}`);
    let updateData = {};
    if(newItem.img) {
      updateData.img = newItem.img;
    }

    for(let key in newItem.data) {
      const recursiveObject = (itemkey, obj) => {
        for(let objkey in obj) {
          if(typeof obj[objkey] === "object") {
            recursiveObject(`${itemkey}.${objkey}`, obj[objkey]);
          } else {
            if(typeof obj[objkey] !== undefined) {
              const datakey = `data.${itemkey}.${objkey}`;
              updateData[datakey] = obj[objkey];
            }
          }
        }
      }

      if(typeof newItem.data[key] === "object") {
        recursiveObject(key, newItem.data[key]);
      } else {
        const datakey = `data.${key}`;
        updateData[datakey] = `${newItem.data[key]}`
      }
    }
    CONFIG.logger.debug(`Completed BuildUpdateData for item - ${newItem.name}`);
    return updateData
  }

    
  /**
   * Find an entity by the import key.
   * @param  {string} type - Entity type to search for
   * @param  {string} id - Entity Id 
   * @returns {object} - Entity Object Data
   */
  static findEntityByImportId(type, id) {
    return game.data[type].find(item => {
      return item.flags.importid === id;
    });
  }

  /**
   * Find a compendium entity by type an id
   * @param  {string} type - Entity type to search for
   * @param  {string} id - Entity Id 
   * @returns {object} - Entity Object Data
   */
  static async findCompendiumEntityById(type, id) {
    let packs = await game.packs.keys();

    let entity;

    for (let packId of packs) {
      const pack = await game.packs.get(packId);
      if(pack.entity === type) {
        await pack.getIndex();
        entity = await pack.index.find(e => e._id === id);
        if(entity) {
          return await pack.getEntity(entity._id);
        }
      }
    }
    
  }

  /**
   * Find an entity by the import key.
   * @param  {string} type - Entity type to search for
   * @param  {string} id - Entity Id 
   * @returns {object} - Entity Object Data
   */
  static async findCompendiumEntityByImportId(type, id) {
    let packs = await game.packs.keys();
    
    for (let packId of packs) {
      if(!CONFIG.temporary[packId]) {
        const pack = await game.packs.get(packId);
        if(pack.entity === type && !pack.locked) {
          CONFIG.logger.debug(`Caching pack content ${packId}`);
          CONFIG.temporary[packId] = {};
          
          const content = await pack.getContent();  
          for (var i = 0; i< content.length; i++) {
            CONFIG.temporary[packId][content[i].data.flags.importid] = content[i];
          }
        }
      } else {
        CONFIG.logger.debug(`Using cached content for ${packId}`);
      }
      if(CONFIG.temporary?.[packId]?.[id]) {
        return CONFIG.temporary[packId][id];
      }      
    }

    return undefined;
  }

  static stringToXml = (s) => {
    let data = s.replace(/^\uFEFF/, "");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, "text/xml");

    return xmlDoc;
  };
}