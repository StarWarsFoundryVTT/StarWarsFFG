/**
 * Extend the base Combat entity.
 * @extends {Combat}
 */
export class CombatFFG extends Combat {

  /**
  * Roll initiative for one or multiple Combatants within the Combat entity
  * @param {Array|string} ids        A Combatant id or Array of ids for which to roll
  * @param {string|null} formula     A non-default initiative formula to roll. Otherwise the system default is used.
  * @param {Object} messageOptions   Additional options with which to customize created Chat Messages
  * @return {Promise.<Combat>}       A promise which resolves to the updated Combat entity once updates are complete.
  /** @override */
  rollInitiative(ids, formula=null, messageOptions={}) {
    console.log("This happened");
    super.rollInitiative(ids, formula=null, messageOptions={})
  }

}
