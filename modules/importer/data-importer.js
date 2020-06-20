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

    $(".import-progress").addClass("import-hidden");

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
        this._enableImportSelection(zip.files, "Force Abilities");
        // this._enableImportSelection(zip.files, "Gear");
        // this._enableImportSelection(zip.files, "Weapons");
        // this._enableImportSelection(zip.files, "Armor");
   
      } catch (err) {
        console.log(err);
      }
    }

    if(action === "import") {
      console.log('Starwars FFG - Importing Data Files');
      
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
        const data = await zip.file(file.file).async("text");

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data,"text/xml");

        await this._handleTalents(xmlDoc);
        await this._handleForcePowers(xmlDoc, zip);
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

  async _handleTalents(xmlDoc) {
    
    const talents = xmlDoc.getElementsByTagName("Talent");
    if(talents.length > 0) {
      let totalCount = talents.length;
      let currentCount = 0;

      $(".import-progress.talents").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack('Item', `oggdude.Talents`);

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
          type: "talent",
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
          console.debug(`Starwars FFG - Importing Talent - Item`);
          compendiumItem = new Item(item);  
          pack.importEntity(compendiumItem);
        } 
        currentCount +=1 ;
        
        $(".talents .import-progress-bar").width(`${Math.trunc((currentCount / totalCount) * 100)}%`).html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
      }
    }
    
  }

  async _handleForcePowers(xmlDoc, zip) {
    
    const forceabilities = xmlDoc.getElementsByTagName("ForceAbility");

    if(forceabilities.length > 0) {
      
      
      $(".import-progress.force").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack('Item', `oggdude.ForcePowers`);

      const fa = JXON.xmlToJs(xmlDoc)
      console.log(fa);

      // now we need to loop through the files in the Force Powers folder

      const forcePowersFiles = Object.values(zip.files).filter(file => {
        return !file.dir && file.name.split('.').pop() === 'xml' && file.name.includes("/Force Powers/");
      })

      let totalCount = forcePowersFiles.length;
      let currentCount = 0;

      await this.asyncForEach(forcePowersFiles, async (file) => {
        const data = await zip.file(file.name).async("text");
        const domparser = new DOMParser();
        const xmlDoc1 = domparser.parseFromString(data,"text/xml");
        const fp = JXON.xmlToJs(xmlDoc1);

        console.log(fp);
        // setup the base information

        let power = {
          name : fp.ForcePower.Name,
          type : "forcepower",
          data : {
            upgrades : {

            }
          }
        }

        // get the basic power informatio
        const importKey = fp.ForcePower.AbilityRows.AbilityRow[0].Abilities.Key[0];

        let forceAbility = fa.ForceAbilities.ForceAbility.find(ability => {
          return ability.Key === importKey
        })

        power.data.description = forceAbility.Description;

        // next we will parse the rows

        for(let i = 1; i < fp.ForcePower.AbilityRows.AbilityRow.length; i+=1) {
          const row = fp.ForcePower.AbilityRows.AbilityRow[i];
          row.Abilities.Key.forEach((keyName, index) => {
            let rowAbility = { }

            let rowAbilityData = fa.ForceAbilities.ForceAbility.find(a => {
              return a.Key === keyName;
            })

            rowAbility.name = rowAbilityData.Name;
            rowAbility.description = rowAbilityData.Description;
            rowAbility.cost = row.Costs.Cost[index];

            switch(row.AbilitySpan.Span[index]) {
              case "1" :
                rowAbility.size = "single";
                break;
              case "2" :
                rowAbility.size = "double";
                break;
              case "3" :
                rowAbility.size = "triple";
                break;
              default:
                rowAbility.size = "full";
            }
            if(row.Directions.Direction[index].Up) {
              rowAbility["links-top-1"] = true;
            }
            if(row.Directions.Direction[index].Right) {
              rowAbility["links-right"] = true;
            }

            const talentKey = `upgrade${((i - 1) * 4) + index}`;
            power.data.upgrades[talentKey] = rowAbility;
          });
        }

        let compendiumItem;
        await pack.getIndex();
        let entry = pack.index.find(e => e.name === power.name);
  
        if(!entry) {
          console.debug(`Starwars FFG - Importing Force Power - Item`);
          compendiumItem = new Item(power);  

          console.log(compendiumItem);

          pack.importEntity(compendiumItem);
        } else {
          console.debug(`Starwars FFG - Updating Force Power - Item`);
        }
        currentCount +=1 ;
        
        $(".force .import-progress-bar").width(`${Math.trunc((currentCount / totalCount) * 100)}%`).html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
      });
    }
  }

  async _getCompendiumPack(type, name) {
    let pack = game.packs.find(p => p.collection === name);
    if(!pack) {
      pack = await Compendium.create({ entity : type, label: name});
    }

    return pack;
  }

  _enableImportSelection(files, name) {
    Object.values(files).findIndex(file => {
      if(file.name.includes(`/${name}.xml`)) {
        $(`#import${name.replace(" ", "")}`).removeAttr("disabled").val(file.name);
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