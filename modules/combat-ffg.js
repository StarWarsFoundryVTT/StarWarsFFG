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
  */
  async rollInitiative(ids, formula=null, messageOptions={}) {

    // Structure input data
    ids = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant._id;

    // Iterate over Combatants, performing an initiative roll for each
    const [updates, messages] = ids.reduce((results, id, i) => {
      let [updates, messages] = results;

      // Get Combatant data
      const c = this.getCombatant(id);
      if ( !c ) return results;

      // Roll initiative
      const cf = formula || this._getInitiativeFormula(c);
      const rollData = c.actor ? c.actor.getRollData() : {};
      const roll = new Roll(cf, rollData).roll();
      updates.push({_id: id, initiative: roll.total});

      // Determine the roll mode
      let rollMode = messageOptions.rollMode || game.settings.get("core", "rollMode");
      if (( c.token.hidden || c.hidden ) && (rollMode === "roll") ) rollMode = "gmroll";

      // Construct chat message data
      let messageData = mergeObject({
        speaker: {
          scene: canvas.scene._id,
          actor: c.actor ? c.actor._id : null,
          token: c.token._id,
          alias: c.token.name
        },
        flavor: `${c.token.name} rolls for Initiative! This is my custom formula!`
      }, messageOptions);
      const chatData = roll.toMessage(messageData, {rollMode, create:false});
      if ( i > 0 ) chatData.sound = null;   // Only play 1 sound for the whole set
      messages.push(chatData);

      // Return the Roll and the chat data
      return results;
    }, [[], []]);
    if ( !updates.length ) return this;

    // Update multiple combatants
    await this.updateEmbeddedEntity("Combatant", updates);

    // Ensure the turn order remains with the same combatant
    await this.update({turn: this.turns.findIndex(t => t._id === currentId)});

    // Create multiple chat messages
    await CONFIG.ChatMessage.entityClass.create(messages);

    // Return the updated Combat
    return this;
  }

}
