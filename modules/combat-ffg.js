import { DicePoolFFG, RollFFG } from "./dice-pool-ffg.js";

/**
 * Extend the base Combat entity.
 * @extends {Combat}
 */
export class CombatFFG extends Combat {
  /** @override */
  _getInitiativeRoll(combatant, formula) {
    const cData = combatant.actor.data.data;

    if (combatant.actor.data.type === "vehicle") {
      return new RollFFG("0");
    }

    if (formula === "Vigilance") {
      formula = _getInitiativeFormula(cData.skills.Vigilance.rank, cData.characteristics.Willpower.value);
    } else if (formula === "Cool") {
      formula = _getInitiativeFormula(cData.skills.Cool.rank, cData.characteristics.Presence.value);
    }

    const rollData = combatant.actor ? combatant.actor.getRollData() : {};
    console.log(formula);
    let roll = new RollFFG(formula, rollData).roll();

    const total = roll.ffg.success + roll.ffg.advantage * 0.01;
    roll._result = total;
    roll._total = total;

    return roll;
  }

  _getInitiativeFormula(skill, ability) {
    const dicePool = new DicePoolFFG({
      ability: ability,
    });
    dicePool.upgrade(skill);
    return dicePool.renderDiceExpression();
  }
}
