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

    console.debug(`Starwars FFG - Preparing Item Data ${this.type}`);

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

        if(this.isOwned && this.actor) {
          if(data.skill.value === "Melee" || data.skill.value === "Brawl") {
            let damageAdd = 0;
            for(let attr in data.attributes) {
              if (data.attributes[attr].mod === "damage" && data.attributes[attr].modtype === "Weapon Stat") {
                damageAdd += parseInt(data.attributes[attr].value, 10);
              }
            }

            data.damage.value = parseInt(actorData.data.characteristics.Brawn.value, 10) + damageAdd;
          }
        }

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
        
        // A talent update occured, update specializations

        // first lets look at the talents trees list
        if(data.trees.length > 0) {
          console.debug("Starwars FFG - Using Talent Tree property for update");

          data.trees.forEach(spec => {
            const specializations = game.data.items.filter(item => {
              return item.id === spec;
            })

            specializations.forEach(item => {
              console.debug(`Starwars FFG - Updating Specialization`)
              for (let talentData in item.data.talents) {
                this._updateSpecializationTalentReference(item.data.talents[talentData], itemData);
              }
            })
          });
        } 
        // if there are no values in trees, this may be a legacy item.
        else {
          console.debug("Starwars FFG - Legacy item, updating all specializations");
          game.data.items.forEach(item => {
            if(item.type === "specialization") {
              for (let talentData in item.data.talents) {
                if(item.data.talents[talentData].itemId === this.data._id) {
                  if(!data.trees.includes(item._id)) {
                    data.trees.push(item._id);
                  }
                  this._updateSpecializationTalentReference(item.data.talents[talentData], itemData);
                }
              }
            }
          })
        }
        break;
      default:
    }

    if (this.type === "forcepower") {
      this._prepareForcePowers();
    }

    if (this.type === "specialization") {
      this._prepareSpecializations();
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

  _prepareTalentTrees(collection, itemType, listProperty, hasGlobalList) {
    const itemData = this.data;
    const talents = itemData.data[collection];
    let rowcount = 0;
    const controls = Object.keys(talents).filter((item) => {
      return item.includes(itemType);
    });

    let itemList = [];

    for (let upgrade of controls) {
      if (upgrade.includes(itemType)) {
        if (talents[upgrade].islearned) {
          const item = talents[upgrade];

          if(item.isRanked || listProperty === "powerUpgrades") {
            item.rank = 1;
          } else {
            item.rank = "N/A";
          }

          let index = itemList.findIndex((obj) => {
            return obj.name === item.name;
          });

          if (index < 0 || (!item.isRanked && listProperty !== "powerUpgrades")) {
            itemList.push(item);
          } else {
            itemList[index].rank += 1;
          }
        }

        if (talents[upgrade].visible) {
          if (!talents[upgrade].size || talents[upgrade].size === "single") {
            talents[upgrade].size = "single";
            talents[upgrade].canSplit = false;
            rowcount += 1;
          } else if (talents[upgrade].size === "double") {
            rowcount += 2;
            talents[upgrade].canSplit = true;
          } else if (talents[upgrade].size === "triple") {
            rowcount += 3;
            talents[upgrade].canSplit = true;
          } else {
            rowcount += 4;
            talents[upgrade].canSplit = true;
          }
        }

        talents[upgrade].canCombine = false;

        if (typeof talents[upgrade].visible === "undefined") {
          talents[upgrade].visible = true;
        }

        talents[upgrade].canLinkTop = true;
        talents[upgrade].canLinkRight = true;

        if (rowcount === 4) {
          talents[upgrade].canLinkRight = false;
        }

        const controlNumber = parseInt(upgrade.replace(itemType, ""), 10);

        if (rowcount < 4) {
          talents[upgrade].canCombine = true;
        } else {
          rowcount = 0;
        }
      }
    }

    itemList.sort((a, b) => {
      return a.name - b.name;
    });

    itemData[listProperty] = itemList;
  }

  async _prepareSpecializations() {
    // We need to update the specialization talents information with the linked item.
    const specializationTalents = this.data.data.talents;
    for (let talent in specializationTalents) {
      let gameItem;
      if(specializationTalents[talent].pack && specializationTalents[talent].pack.length > 0) {
        try {
          const pack = game.packs.get(specializationTalents[talent].pack);
          pack.getIndex();
          const entry = pack.index.find(e => e.id === specializationTalents[talent].itemId);
          gameItem = pack.getEntity(entry.id)
        } catch {
          console.debug('Starwars FFG - Pack Item, deferring load.')
        }
      } else {
        gameItem = game.data.items.find(item => {
          return item._id === specializationTalents[talent].itemId;
        });
      }
     

      if(gameItem && !this.isOwned) {
        this._updateSpecializationTalentReference(specializationTalents[talent], gameItem);
      }
    }

    this._prepareTalentTrees("talents", "talent", "talentList");
  }

  /**
   * Prepare Force Power Item Data
   */
  _prepareForcePowers() {
    this._prepareTalentTrees("upgrades", "upgrade", "powerUpgrades");
  }

  _updateSpecializationTalentReference(specializationTalentItem, talentItem) {
    console.debug(`Starwars FFG - Updating Specializations Talent`);
    specializationTalentItem.name = talentItem.name;
    specializationTalentItem.description = talentItem.data.description;
    specializationTalentItem.activation = talentItem.data.activation.value;
    specializationTalentItem.activationLabel = talentItem.data.activation.label;
    specializationTalentItem.isRanked = talentItem.data.ranks.ranked;
    specializationTalentItem.isForceTalent = talentItem.data.isForceTalent;
  }
}
