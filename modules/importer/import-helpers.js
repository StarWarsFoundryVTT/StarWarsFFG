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
          console.debug(err);
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
   * Find an entity by the import key.
   * @param  {string} type - Entity type to search for
   * @param  {string} id - Entity Id 
   * @returns {object} - Entity Object Data
   */
  static async findCompendiumEntityByImportId(type, id) {
    let packs = await game.packs.keys();
    let index = 0;

    for (let packId of packs) {
      if(!CONFIG.temporary[packId]) {
        console.debug(`Starwars FFG - Caching pack content ${packId}`);
        CONFIG.temporary[packId] = {};
        const pack = await game.packs.get(packId);
        const content = await pack.getContent();  
        for (var i = 0; i< content.length; i++) {
          CONFIG.temporary[packId][content[i].data.flags.importid] = content[i];
        }
      } else {
        console.debug(`Starwars FFG - Using cached content for ${packId}`);
      }

      return CONFIG.temporary[packId][id];
    }

    return undefined;
  }
}