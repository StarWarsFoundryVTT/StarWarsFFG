/**
 * Establish each FFG dice type here as extensions of DiceTerm.
 * @extends {DiceTerm}
 */

export { AbilityDie } from "./dice/dietype/AbilityDie.js";
export { BoostDie } from "./dice/dietype/BoostDie.js";
export { ChallengeDie } from "./dice/dietype/ChallengeDie.js";
export { DifficultyDie } from "./dice/dietype/DifficultyDie.js";
export { ForceDie } from "./dice/dietype/ForceDie.js";
export { ProficiencyDie } from "./dice/dietype/ProficiencyDie.js";
export { SetbackDie } from "./dice/dietype/SetbackDie.js";
export { RiskDie } from './dice/dietype/RiskDie.js';
export { PepsDie } from './dice/dietype/PepsDie.js'
 
/**
 * New extension of the core DicePool class for evaluating rolls with the FFG DiceTerms
 */
export { RollFFG } from "./dice/roll.js";

/**
 * Dice pool utility specializing in the FFG special dice
 */
export { DicePoolFFG } from "./dice/pool.js";
