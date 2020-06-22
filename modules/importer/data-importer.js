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
        this._enableImportSelection(zip.files, "Gear");
        this._enableImportSelection(zip.files, "Weapons");
        this._enableImportSelection(zip.files, "Armor");
   
      } catch (err) {
        console.log(err);
      }
    }

    if(action === "import") {
      console.debug('Starwars FFG - Importing Data Files');
      
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

      const promises = [];

      await this.asyncForEach(importFiles, async file => {
        const data = await zip.file(file.file).async("text");

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data,"text/xml");

        promises.push(this._handleGear(xmlDoc));
        promises.push(this._handleWeapons(xmlDoc));
        promises.push(this._handleArmor(xmlDoc));
        promises.push(this._handleTalents(xmlDoc));
        promises.push(this._handleForcePowers(xmlDoc, zip));

        // this._handleGear(xmlDoc);
        // this._handleWeapons(xmlDoc);
        // await this._handleArmor(xmlDoc);
        // await this._handleTalents(xmlDoc);
        // await this._handleForcePowers(xmlDoc, zip);
      });

      await Promise.all(promises);

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
        try {
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
            name,
            type: "talent",
            data : {
              importkey,
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
          } else {
            console.debug(`Starwars FFG - Update Talent - Item`);
            let updateData = this.buildUpdateData(item);
            updateData["_id"] = entry._id
            pack.updateEntity(updateData);
          }
          currentCount +=1 ;
          
          $(".talents .import-progress-bar").width(`${Math.trunc((currentCount / totalCount) * 100)}%`).html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
        } catch (err) {
          console.error(`Starwars FFG - Error importing record : ${err.message}`);
          console.debug(err);
        }

      }
    }
    
  }

  async _handleForcePowers(xmlDoc, zip) {
    const forceabilities = xmlDoc.getElementsByTagName("ForceAbility");
    if(forceabilities.length > 0) {
      $(".import-progress.force").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack('Item', `oggdude.ForcePowers`);

      const fa = JXON.xmlToJs(xmlDoc)
      // now we need to loop through the files in the Force Powers folder

      const forcePowersFiles = Object.values(zip.files).filter(file => {
        return !file.dir && file.name.split('.').pop() === 'xml' && file.name.includes("/Force Powers/");
      })

      let totalCount = forcePowersFiles.length;
      let currentCount = 0;

      await this.asyncForEach(forcePowersFiles, async (file) => {
        try {
          const data = await zip.file(file.name).async("text");
          const domparser = new DOMParser();
          const xmlDoc1 = domparser.parseFromString(data,"text/xml");
          const fp = JXON.xmlToJs(xmlDoc1);
  
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
            try {
              const row = fp.ForcePower.AbilityRows.AbilityRow[i];
              row.Abilities.Key.forEach((keyName, index) => {
                let rowAbility = { }
    
                let rowAbilityData = fa.ForceAbilities.ForceAbility.find(a => {
                  return a.Key === keyName;
                })
    
                rowAbility.name = rowAbilityData.Name;
                rowAbility.description = rowAbilityData.Description;
                rowAbility.cost = row.Costs.Cost[index];
                rowAbility.visible = true;
    
                if(row.Directions.Direction[index].Up) {
                  rowAbility["links-top-1"] = true;
                }
                
                switch(row.AbilitySpan.Span[index]) {
                  case "1" :
                    rowAbility.size = "single";
                    break;
                  case "2" :
                    rowAbility.size = "double";
                    if(index < 3 && row.Directions.Direction[index+1].Up) {
                      rowAbility["links-top-2"] = true;
                    }
                    break;
                  case "3" :
                    rowAbility.size = "triple";
                    if(index < 2 && row.Directions.Direction[index+1].Up) {
                      rowAbility["links-top-2"] = true;
                    }
                    if(index < 2 && row.Directions.Direction[index+2].Up) {
                      rowAbility["links-top-3"] = true;
                    }
                    break;
                  case "4": 
                    rowAbility.size = "full";
                    if(index < 1 && row.Directions.Direction[index+1].Up) {
                      rowAbility["links-top-2"] = true;
                    }
                    if(index < 1 && row.Directions.Direction[index+2].Up) {
                      rowAbility["links-top-3"] = true;
                    }
                    if(index < 1 && row.Directions.Direction[index+3].Up) {
                      rowAbility["links-top-4"] = true;
                    }
                    break
                  default:
                    rowAbility.size = "single";
                    rowAbility.visible = false;
                }
                
                if(row.Directions.Direction[index].Right) {
                  rowAbility["links-right"] = true;
                }
    
                const talentKey = `upgrade${((i - 1) * 4) + index}`;
                power.data.upgrades[talentKey] = rowAbility;
              });
            } catch (err) {
              console.error(`Starwars FFG - Error importing record : ${err.message}`);
              console.debug(err);
            }
          }
  
          if(fp.ForcePower.AbilityRows.AbilityRow.length < 5) {
            for(let i = fp.ForcePower.AbilityRows.AbilityRow.length; i < 5; i+=1) {
  
              for(let index = 0; index < 4; index+=1) {
                const talentKey = `upgrade${((i - 1) * 4) + index}`;
  
                let rowAbility = { visible : false }
    
                power.data.upgrades[talentKey] = rowAbility;
              }
            }
          }
  
          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find(e => e.name === power.name);
    
          if(!entry) {
            console.debug(`Starwars FFG - Importing Force Power - Item`);
            compendiumItem = new Item(power);  
            pack.importEntity(compendiumItem);
          } else {
            console.debug(`Starwars FFG - Updating Force Power - Item`);
            let updateData = this.buildUpdateData(power);
            updateData["_id"] = entry._id
            pack.updateEntity(updateData);
          }
          currentCount +=1 ;
          
          $(".force .import-progress-bar").width(`${Math.trunc((currentCount / totalCount) * 100)}%`).html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
        } catch (err) {
          console.error(`Starwars FFG - Error importing record : ${err.message}`);
          console.debug(err);
        }
      });
    }
  }

  async _handleGear(xmlDoc) {
    const gear = xmlDoc.getElementsByTagName("Gear");
   
    if(gear.length > 0) { 
      let totalCount = gear.length;
      let currentCount = 0;

      $(".import-progress.gear").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack('Item', `oggdude.Gear`);

      for(let i = 0; i < gear.length; i+=1) {
        try {
          const item = gear[i];

          const importkey = item.getElementsByTagName("Key")[0]?.textContent;
          const name = item.getElementsByTagName("Name")[0]?.textContent;
          const description = item.getElementsByTagName("Description")[0]?.textContent;
          const price = item.getElementsByTagName("Price")[0]?.textContent;
          const rarity = item.getElementsByTagName("Rarity")[0]?.textContent;
          const encumbrance = item.getElementsByTagName("Encumbrance")[0]?.textContent;
          const type = item.getElementsByTagName("Type")[0]?.textContent;

          const newItem = {
            name,
            type: "gear",
            data: {
              importkey,
              description,
              encumbrance: {
                value : encumbrance
              },
              price : {
                value : price
              },
              rarity: {
                value: rarity
              }
            }
          }

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find(e => e.name === newItem.name);

          if(!entry) {
            console.debug(`Starwars FFG - Importing Gear - Item`);
            compendiumItem = new Item(newItem);  
            pack.importEntity(compendiumItem);
          } else {
            console.debug(`Starwars FFG - Updating Gear - Item`);
            let updateData = this.buildUpdateData(newItem);
            updateData["_id"] = entry._id
            pack.updateEntity(updateData);
          }
          currentCount +=1 ;

          $(".gear .import-progress-bar").width(`${Math.trunc((currentCount / totalCount) * 100)}%`).html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
        } catch (err) {
          console.error(`Starwars FFG - Error importing record : ${err.message}`);
          console.debug(err);
        }
      }
    }
  }

  async _handleWeapons(xmlDoc) {
    const weapons = xmlDoc.getElementsByTagName("Weapon");
   
    if(weapons.length > 0) { 
      let totalCount = weapons.length;
      let currentCount = 0;

      $(".import-progress.weapons").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack('Item', `oggdude.Weapons`);

      for(let i = 0; i < weapons.length; i+=1) {
        try {

          if(i === 26) {
            throw new Error("Testing");
          }

          const weapon = weapons[i];

          const importkey = weapon.getElementsByTagName("Key")[0]?.textContent;
          const name = weapon.getElementsByTagName("Name")[0]?.textContent;
          const description = weapon.getElementsByTagName("Description")[0]?.textContent;
          const price = weapon.getElementsByTagName("Price")[0]?.textContent;
          const rarity = weapon.getElementsByTagName("Rarity")[0]?.textContent;
          const encumbrance = weapon.getElementsByTagName("Encumbrance")[0]?.textContent;
          const damage = weapon.getElementsByTagName("Damage")[0]?.textContent;
          const crit = weapon.getElementsByTagName("Crit")[0]?.textContent;

          const skillkey = weapon.getElementsByTagName("SkillKey")[0]?.textContent;
          const range = weapon.getElementsByTagName("Range")[0]?.textContent;
          const hardpoints = weapon.getElementsByTagName("HP")[0]?.textContent;

          let skill = "";

          switch(skillkey) {
            case "RANGLT":
              skill = "Ranged: Light";
              break;
            case "RANGHVY":
              skill = "Ranged: Heavy";
              break;
            case "GUNN":
              skill = "Gunnery";
              break;
            case "BRAWL":
              skill = "Brawl";
              break;
            case "MELEE":
              skill = "Melee";
              break;
            case "LTSABER":
              skill = "Lightsaber";
              break;
            default:
          }
          
          const fp = JXON.xmlToJs(weapon);

          const qualities = [];

          if(fp?.Qualities?.Quality && fp.Qualities.Quality.length > 0) {
            fp.Qualities.Quality.forEach(quality => {
              qualities.push(`${quality.Key} ${quality.Count ? quality.Count : ""}`)
            });
          }

          let newItem = {
            name,
            type: "weapon",
            data: {
              importkey,
              description,
              encumbrance : {
                value : encumbrance
              },
              price : {
                value: price
              },
              rarity : {
                value : rarity
              },
              damage : {
                value: damage
              },
              crit : {
                value : crit
              },
              special : {
                value : qualities.join(",")
              },
              skill : {
                value : skill
              },
              range : {
                value : range
              },
              hardpoints : {
                value : hardpoints
              }
            }
          }

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find(e => e.name === newItem.name);

          if(!entry) {
            console.debug(`Starwars FFG - Importing Weapon - Item`);
            compendiumItem = new Item(newItem);  
            pack.importEntity(compendiumItem);
          } else {
            console.debug(`Starwars FFG - Updating Weapon - Item`);
            let updateData = this.buildUpdateData(newItem);
            updateData["_id"] = entry._id
            pack.updateEntity(updateData);
          }
          currentCount +=1 ;

          $(".weapons .import-progress-bar").width(`${Math.trunc((currentCount / totalCount) * 100)}%`).html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
        } catch (err) {
          console.error(`Starwars FFG - Error importing record : ${err.message}`);
          console.debug(err);
        }
      }
    }
  }

  async _handleArmor(xmlDoc) {
    const armors = xmlDoc.getElementsByTagName("Armor");
   
    if(armors.length > 0) { 
      let totalCount = armors.length;
      let currentCount = 0;

      $(".import-progress.armor").toggleClass("import-hidden");
      let pack = await this._getCompendiumPack('Item', `oggdude.Armor`);

      for(let i = 0; i < armors.length; i+=1) {
        try {
          const armor = armors[i];

          const importkey = armor.getElementsByTagName("Key")[0]?.textContent;
          const name = armor.getElementsByTagName("Name")[0]?.textContent;
          const description = armor.getElementsByTagName("Description")[0]?.textContent;
          const price = armor.getElementsByTagName("Price")[0]?.textContent;
          const rarity = armor.getElementsByTagName("Rarity")[0]?.textContent;
          const encumbrance = armor.getElementsByTagName("Encumbrance")[0]?.textContent;

          const defense = armor.getElementsByTagName("Defense")[0]?.textContent;
          const soak = armor.getElementsByTagName("Soak")[0]?.textContent;
          const hardpoints = armor.getElementsByTagName("HP")[0]?.textContent;

          let newItem = {
            name,
            type : "armour",
            data : {
              importkey,
              description,
              encumbrance : {
                value : encumbrance
              },
              price : {
                value: price
              },
              rarity : {
                value : rarity
              },
              defence : {
                value : defense
              },
              soak : {
                value : soak
              },
              hardpoints : {
                value : hardpoints
              }
            }
          }

          let compendiumItem;
          await pack.getIndex();
          let entry = pack.index.find(e => e.name === newItem.name);

          if(!entry) {
            console.debug(`Starwars FFG - Importing Armor - Item`);
            compendiumItem = new Item(newItem);  
            pack.importEntity(compendiumItem);
          } else {
            console.debug(`Starwars FFG - Updating Armor - Item`);
            let updateData = this.buildUpdateData(newItem);
            updateData["_id"] = entry._id
            pack.updateEntity(updateData);
          }
          currentCount +=1 ;

          $(".armor .import-progress-bar").width(`${Math.trunc((currentCount / totalCount) * 100)}%`).html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
        } catch (err) {
          console.error(`Starwars FFG - Error importing record : ${err.message}`);
          console.debug(err);
        }

      }
    }
  }

  async _getCompendiumPack(type, name) {
    let pack = game.packs.find(p => {
      return p.metadata.label === name
    });
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


  buildUpdateData = (newItem) => {
    let updateData = {};
    for(let key in newItem.data) {
      const recursiveObject = (itemkey, obj) => {
        for(let objkey in obj) {
          if(typeof obj[objkey] === "object") {
            recursiveObject(`${itemkey}.${objkey}`, obj[objkey]);
          } else {
            if(obj[objkey]) {
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
}