class ImportHelpers {
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
      const serverPath = `worlds/${game.world.id}/packs/images/${pack.metadata.name}`

      const filename = path.replace(/^.*[\\\/]/, '')
      await Helpers.verifyPath("data", serverPath);
      const img = await zip.file(path).async("uint8array");
      const i = new File([img], filename);
      await FilePicker.upload("data", `${serverPath}/${path.replace(filename, "")}`, i, { bucket: null });
      return `${serverPath}/${path.replace(filename, "")}`;
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
}