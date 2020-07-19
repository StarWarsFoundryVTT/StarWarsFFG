/**
 * Extend the base Combat entity.
 * @extends {Combat}
 */
export class CombatFFG extends Combat {
  /** @override */
  _getInitiativeRoll(combatant, formula) {
    const cData = combatant.actor.data.data;
    const origFormula = formula;

    if (combatant.actor.data.type === "vehicle") {
      return new Roll("0");
    }

    if (formula === "Vigilance") {
      formula = _getInitiativeFormula(cData.skills.Vigilance.rank, cData.characteristics.Willpower.value, 0);
    } else if (formula === "Cool") {
      formula = _getInitiativeFormula(cData.skills.Cool.rank, cData.characteristics.Presence.value, 0);
    }

    const rollData = combatant.actor ? combatant.actor.getRollData() : {};
    const letters = formula.split("");
    const rolls = [];
    const getSuc = new RegExp("Successes: ([0-9]+)", "g");
    const getAdv = new RegExp("Advantages: ([0-9]+)", "g");

    for (const letter of letters) {
      rolls.push(game.ffg.StarWars.letterToRolls(letter, 1));
    }

    let newformula = combineAll(rolls, game.ffg.StarWars.rollValuesMonoid);

    let rolling = game.specialDiceRoller.starWars.roll(newformula);

    let results = game.specialDiceRoller.starWars.formatRolls(rolling);

    let success = 0;
    let advantage = 0;

    success = getSuc.exec(results);
    if (success) {
      success = success[1];
    }
    advantage = getAdv.exec(results);
    if (advantage) {
      advantage = advantage[1];
    }

    let total = +success + advantage * 0.01;

    CONFIG.logger.log(`Total is: ${total}`);

    let roll = new Roll(`0d6 ${origFormula}`, rollData).roll();
    roll._result = total;
    roll._total = total;

    return roll;
  }
}

function combineAll(values, monoid) {
  return values.reduce((prev, curr) => monoid.combine(prev, curr), monoid.identity);
}

function _getInitiativeFormula(skill, ability, difficulty) {
  const dicePool = new DicePoolFFG({
    ability: ability,
    difficulty: difficulty,
  });
  dicePool.upgrade(skill);
  return dicePool.renderDiceExpression();
}
