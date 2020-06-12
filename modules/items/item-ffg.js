import PopoutEditor from "../popout-editor.js";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class ItemFFG extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Get the Item's data
    const itemData = this.data;
    const actorData = this.actor ? this.actor.data : {};
    const data = itemData.data;

    data.renderedDesc = PopoutEditor.renderDiceImages(data.description);
    itemData.safe_desc = data.description.replace(/(<([^>]+)>)/gi, "");
    
    // perform localisation of dynamic values
    switch (this.type) {
      case "weapon":
        const rangeId = `SWFFG.WeaponRange${this._capitalize(data.range.value)}`;
        data.range.label = rangeId;
        break;
      case "shipweapon":
        const vehiclerangeId = `SWFFG.VehicleRange${this._capitalize(data.range.value)}`;
        data.range.label = vehiclerangeId;
        const firingarcId = `SWFFG.VehicleFiringArc${this._capitalize(data.firingarc.value)}`;
        data.firingarc.label = firingarcId;
        break;
      case "talent":
        const cleanedActivationName = data.activation.value.replace(/[\W_]+/g, "");
        const activationId = `SWFFG.TalentActivations${this._capitalize(cleanedActivationName)}`;
        data.activation.label = activationId;
        break;
      default:
    }

    if(this.type === "forcepower") {
      this._prepareForcePowers();
    }
  }
  /**
   * Capitalize string
   * @param  {String} s   String value to capitalize
   */
  _capitalize(s) {
    if (typeof s !== "string") return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }


  /**
   * Prepare Force Power Item Data
   */
  _prepareForcePowers() {
    const itemData = this.data;

    const upgrades = itemData.data.upgrades;

    let rowcount = 0;

    const upgradeControls = Object.keys(upgrades).filter(item => {
      return item.includes("upgrade");
    })

    let upgradeList = [];

    for (let upgrade of upgradeControls) { 

      if(upgrade.includes("upgrade")) {
        if(upgrades[upgrade].islearned) {
          const item = upgrades[upgrade];
          item.rank = 1;

          let index = upgradeList.findIndex(obj => {
            return obj.name === item.name;
          });

          if (index < 0) {
            upgradeList.push(item);
          } else {
            upgradeList[index].rank += 1;
          }
          
        }
        
        if(upgrades[upgrade].visible) {
          if(!upgrades[upgrade].size || upgrades[upgrade].size === "single" ) {
            upgrades[upgrade].size = "single";
            upgrades[upgrade].canSplit = false;
            rowcount += 1;
          } else if(upgrades[upgrade].size === "double") {
            rowcount += 2;
            upgrades[upgrade].canSplit = true;
          } else if(upgrades[upgrade].size === "triple") {
            rowcount += 3;
            upgrades[upgrade].canSplit = true;
          } else {
            rowcount += 4;
            upgrades[upgrade].canSplit = true;
          }
        }
   
        upgrades[upgrade].canCombine = false;
   
        if(typeof upgrades[upgrade].visible === "undefined") {
          upgrades[upgrade].visible = true;
        }

        upgrades[upgrade].canLinkTop = true;
        upgrades[upgrade].canLinkBottom = true;
        upgrades[upgrade].canLinkLeft = true;
        upgrades[upgrade].canLinkRight = true;
        
        if(rowcount === 0) {
          upgrades[upgrade].canLinkLeft = false;
        }

        if(rowcount === 4) {
          upgrades[upgrade].canLinkRight = false;
        }

        const controlNumber = parseInt(upgrade.replace("upgrade", ""), 10);
     
        if(controlNumber >= (upgradeControls.length - 4)) {
          upgrades[upgrade].canLinkBottom = false;
        }

        if(rowcount < 4) {
          upgrades[upgrade].canCombine = true;
        } else {
          rowcount = 0;
        }

      }
    }

    upgradeList.sort((a, b) => {
      return a.name - b.name;
    });

    itemData.powerUpgrades = upgradeList;
  }
}
