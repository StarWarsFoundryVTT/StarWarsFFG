"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDifficultyPool = exports.createOpposedCheck = exports.createCombatCheck = exports.createSkillCheck = void 0;
/**
 * Creates a basic skill check dice pool
 * @param ability Number of ability (green) dice
 * @param proficiency Number of proficiency (yellow) dice
 * @returns DicePool configured for a basic skill check
 */
const createSkillCheck = (ability, proficiency) => ({
    abilityDice: Math.max(0, ability),
    proficiencyDice: Math.max(0, proficiency),
});
exports.createSkillCheck = createSkillCheck;
/**
 * Creates a combat check dice pool with optional boost die
 * @param ability Number of ability (green) dice
 * @param proficiency Number of proficiency (yellow) dice
 * @param boost Number of boost (blue) dice
 * @returns DicePool configured for a combat check
 */
const createCombatCheck = (ability, proficiency, boost = 0) => ({
    abilityDice: Math.max(0, ability),
    proficiencyDice: Math.max(0, proficiency),
    boostDice: Math.max(0, boost),
});
exports.createCombatCheck = createCombatCheck;
/**
 * Creates an opposed check dice pool
 * @param ability Number of ability (green) dice
 * @param proficiency Number of proficiency (yellow) dice
 * @param difficulty Number of difficulty (purple) dice
 * @param challenge Number of challenge (red) dice
 * @returns DicePool configured for an opposed check
 */
const createOpposedCheck = (ability, proficiency, difficulty, challenge = 0) => ({
    abilityDice: Math.max(0, ability),
    proficiencyDice: Math.max(0, proficiency),
    difficultyDice: Math.max(0, difficulty),
    challengeDice: Math.max(0, challenge),
});
exports.createOpposedCheck = createOpposedCheck;
/**
 * Creates a difficulty check dice pool
 * @param difficulty Number of difficulty (purple) dice
 * @param challenge Number of challenge (red) dice
 * @returns DicePool configured for a pure difficulty check
 */
const createDifficultyPool = (difficulty, challenge = 0) => ({
    difficultyDice: Math.max(0, difficulty),
    challengeDice: Math.max(0, challenge),
});
exports.createDifficultyPool = createDifficultyPool;
