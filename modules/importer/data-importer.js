/**
 * A specialized form used to pop out the editor.
 * @extends {FormApplication}
 */
export default class DataImporter extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "data-importer",
      classes: ["starwarsffg", "data-import"],
      title: "Data Importer",
      template: "systems/starwarsffg/templates/importer/data-importer.html"
    });
  }

  /**
   * Return a reference to the target attribute
   * @type {String}
   */
  get attribute() {
	  return this.options.name;
  }

  /** @override */
  async getData() {
    let data = await FilePicker.browse("data", "", {bucket:null, extensions: [".zip", ".ZIP"], wildcard: false});
    const files = data.files.map(file => {
      return decodeURIComponent(file);
    })

    return {
      data,
      files,
      cssClass : "data-importer-window"
    };
  
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".dialog-button").on("click",this._dialogButton.bind(this));
  }

  async _dialogButton(event) {
    event.preventDefault();
    event.stopPropagation();
    const a = event.currentTarget;
    const action = a.dataset.button;

    // if clicking load file reset default
    $("input[type='checkbox'][name='imports']").attr("disabled", true);

    // load the requested file
    if(action === "load") {
      try {
        const selectedFile = $("#import-file").val();
        const zip = await fetch(`/${selectedFile}`) 
        .then(function (response) {                       
            if (response.status === 200 || response.status === 0) {
                return Promise.resolve(response.blob());
            } else {
                return Promise.reject(new Error(response.statusText));
            }
        })
        .then(JSZip.loadAsync);                           

        this._enableImportSelection(zip.files, "Talents");
        // this._enableImportSelection(zip.files, "Gear");
        // this._enableImportSelection(zip.files, "Weapons");
        // this._enableImportSelection(zip.files, "Armor");
   
      } catch (err) {
        console.log(err);
      }
    }

    if(action === "import") {
      console.log('Starwars FFG - Importing Data Files');
      $(".import-progress").toggleClass("import-hidden");

      let totalCount = 0
      let currentCount = 0;
      const importFiles = $("input:checkbox[name=imports]:checked").map(function(){return { file : $(this).val(), label : $(this).data("name"), type : $(this).data("type"), itemtype : $(this).data("itemtype") } }).get()

      const selectedFile = $("#import-file").val();
      const zip = await fetch(`/${selectedFile}`) 
      .then(function (response) {                       
          if (response.status === 200 || response.status === 0) {
              return Promise.resolve(response.blob());
          } else {
              return Promise.reject(new Error(response.statusText));
          }
      })
      .then(JSZip.loadAsync); 

      await this.asyncForEach(importFiles, async file => {
        
        let pack = game.packs.find(p => p.collection === `oggdude.${file.label}`);

        if(!pack) {
          pack = await Compendium.create({ entity : file.type, label: `oggdude.${file.label}`});
        }

        const data = await zip.file(file.file).async("text");

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data,"text/xml");

        // Handle import or talents
        const talents = xmlDoc.getElementsByTagName("Talent");
        totalCount += talents.length;
        for(let i = 0; i < talents.length; i+=1) {
          const talent = talents[i];
          const importkey = talent.getElementsByTagName("Key")[0]?.textContent;
          const name = talent.getElementsByTagName("Name")[0]?.textContent;
          const description = talent.getElementsByTagName("Description")[0]?.textContent;
          const ranked = talent.getElementsByTagName("Ranked")[0]?.textContent;

          let activation = "Passive";
          
          switch (talent.getElementsByTagName("Activation")[0]?.textContent) {
            case "Maneuver":
              activation = "Active (Maneuver)";
              break;
            case "Action":
              activation = "Active (Action)";
              break;
            case "Incidental":
              activation = "Active (Incidental)";
              break;
            case "OOT Incidental":
              activation = "Active (Incidental, Out of Turn)";
              break;
            default: 
              activation = "Passive";
          }

          const forcetalent = talent.getElementsByTagName("ForceTalent")[0]?.textContent ? true : false;

          const item = {
            importkey,
            name,
            type: file.itemtype,
            data : {
              description,
              ranks: {
                ranked
              },
              activation : {
                value : activation
              },
              isForceTalent : forcetalent
            }
          }

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find(e => e.name === item.name);

          if(!entry) {
            console.debug(`Starwars FFG - Importing ${file.itemtype} ${file.type} - ${item.name}`);
            if(file.type === "Item") {
              compendiumItem = new Item(item);  
            }

            pack.importEntity(newCompendiumItem);
          } 
          currentCount +=1 ;
          
          $(".import-progress-bar").width(`${Math.trunc((currentCount / totalCount) * 100)}%`).html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
        }

      });

      this.close();
    }



    /** Future functionality to allow users to select files to import */

    // const dataFiles = Object.values(zip.files).filter(file => {
    //   return !file.dir && file.name.split('.').pop() === 'xml';
    // })

    // const allProgress = (proms, progress_cb) => {
    //   let d = 0;
    //   progress_cb(0);
    //   for (const p of proms) {
    //     p.then(()=> {    
    //       d ++;
    //       progress_cb( (d * 100) / proms.length );
    //     });
    //   }
    //   return Promise.all(proms);
    // }

    // const promises = [];
    // const filesData = dataFiles.map(file => {
    //   promises.push(zip.file(file.name).async("text"));
    // })

    // const data = await allProgress(promises, (p) => {
    //   console.log(`% Done = ${p.toFixed(2)}`);
    // });

    
  }

  _enableImportSelection(files, name) {
    Object.values(files).findIndex(file => {
      if(file.name.includes(`/${name}.xml`)) {
        $(`#import${name}`).removeAttr("disabled").val(file.name);
        return true;
      }
      return false;
    }) > -1;
  }

  asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index += 1) {
      await callback(array[index], index, array);
    }
  };

}