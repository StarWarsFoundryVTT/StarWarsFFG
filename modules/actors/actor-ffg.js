/**
 * Extend the base Actor entity.
 * @extends {Actor}
 */
export class ActorFFG extends Actor {

  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags;

    // Make separate methods for each Actor type (character, minion, etc.) to keep
    // things organized.
    if (actorData.type === 'minion') this._prepareMinionData(actorData);
    if (actorData.type === 'character') this._prepareCharacterData(actorData);
  }

  /**
   * Prepare Minion type specific data
   */
  _prepareMinionData(actorData) {
    const data = actorData.data;

    // Set Wounds threshold to unit_wounds * quantity to account for minion group health.
    data.stats.wounds.max = Math.floor(data.unit_wounds.value*data.quantity.value);
    // Check we don't go below 0.
    if (data.stats.wounds.max < 0)
    {
      data.stats.wounds.max = 0;
    }

    // Loop through Skills, and where groupskill = true, set the rank to 1*(quantity-1).
    for (let [key, skill] of Object.entries(data.skills)) {
      // Check to see if this is a group skill, otherwise do nothing.
      if(skill.groupskill) {
        skill.rank = Math.floor(1*(data.quantity.value-1));
        // Check we don't go below 0.
        if (skill.rank < 0) {
          skill.rank = 0;
        }
      }
    }
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    const data = actorData.data;
    const items = actorData.items;
    var soak = 0;
    var armoursoak = 0;
    var othersoak = 0;
    var encum = 0;

    // Calculate soak based on Brawn value, and any Soak modifiers in weapons, armour, gear and talents.
    // Start with Brawn. Also calculate total encumbrance from items.
    soak = data.characteristics.Brawn.value;

    // Loop through all items
    for (let [key, item] of Object.entries(items)) {
      // Calculate encumbrance.
      if(item.type != "talent") {
        encum += item.data.encumbrance.value;
      }
      // For armour type, get all Soak values and add to armoursoak.
      if(item.type == "armour") {
        armoursoak += item.data.soak.value;
      }
      else {
        // For all other types loop through attributes and add any Soak modifiers to othersoak.
        for(let [k, mod] of Object.entries(item.data.attributes)) {
          if(k == "Soak") {
            othersoak += mod.value;
          }
        }
      }
    }

    // Set Encumbrance value on character.
    data.stats.encumbrance.value = encum;

    // Add together all of our soak results.
    soak += armoursoak + othersoak;
    // Finally set Soak value on character.
    data.stats.soak.value = soak;


  }

}
