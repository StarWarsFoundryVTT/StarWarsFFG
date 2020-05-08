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

}
