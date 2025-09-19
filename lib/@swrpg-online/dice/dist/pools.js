"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTalentModifiers = exports.createDifficultyPool = exports.createOpposedCheck = exports.createCombatCheck = exports.createSkillCheck = void 0;
/**
 * Creates a basic skill check dice pool
 * @param ability Number of ability (green) dice
 * @param proficiency Number of proficiency (yellow) dice
 * @param modifiers Optional modifiers from talents, equipment, etc.
 * @returns DicePool configured for a basic skill check
 */
const createSkillCheck = (ability, proficiency, modifiers) => ({
    abilityDice: Math.max(0, ability),
    proficiencyDice: Math.max(0, proficiency),
    ...modifiers,
});
exports.createSkillCheck = createSkillCheck;
/**
 * Creates a combat check dice pool with optional boost die
 * @param ability Number of ability (green) dice
 * @param proficiency Number of proficiency (yellow) dice
 * @param boost Number of boost (blue) dice
 * @param modifiers Optional modifiers from talents, equipment, etc.
 * @returns DicePool configured for a combat check
 */
const createCombatCheck = (ability, proficiency, boost = 0, modifiers) => ({
    abilityDice: Math.max(0, ability),
    proficiencyDice: Math.max(0, proficiency),
    boostDice: Math.max(0, boost),
    ...modifiers,
});
exports.createCombatCheck = createCombatCheck;
/**
 * Creates an opposed check dice pool
 * @param ability Number of ability (green) dice
 * @param proficiency Number of proficiency (yellow) dice
 * @param difficulty Number of difficulty (purple) dice
 * @param challenge Number of challenge (red) dice
 * @param modifiers Optional modifiers from talents, equipment, etc.
 * @returns DicePool configured for an opposed check
 */
const createOpposedCheck = (ability, proficiency, difficulty, challenge = 0, modifiers) => ({
    abilityDice: Math.max(0, ability),
    proficiencyDice: Math.max(0, proficiency),
    difficultyDice: Math.max(0, difficulty),
    challengeDice: Math.max(0, challenge),
    ...modifiers,
});
exports.createOpposedCheck = createOpposedCheck;
/**
 * Creates a difficulty check dice pool
 * @param difficulty Number of difficulty (purple) dice
 * @param challenge Number of challenge (red) dice
 * @param modifiers Optional modifiers from talents, equipment, etc.
 * @returns DicePool configured for a pure difficulty check
 */
const createDifficultyPool = (difficulty, challenge = 0, modifiers) => ({
    difficultyDice: Math.max(0, difficulty),
    challengeDice: Math.max(0, challenge),
    ...modifiers,
});
exports.createDifficultyPool = createDifficultyPool;
/**
 * Applies talent modifiers to an existing dice pool
 * Common use case for talents that add automatic advantages, successes, or upgrade dice
 * @param pool The base dice pool
 * @param modifiers The modifiers to apply
 * @returns A new dice pool with modifiers applied
 */
const applyTalentModifiers = (pool, modifiers) => ({
    ...pool,
    automaticSuccesses: (pool.automaticSuccesses || 0) + (modifiers.automaticSuccesses || 0),
    automaticFailures: (pool.automaticFailures || 0) + (modifiers.automaticFailures || 0),
    automaticAdvantages: (pool.automaticAdvantages || 0) + (modifiers.automaticAdvantages || 0),
    automaticThreats: (pool.automaticThreats || 0) + (modifiers.automaticThreats || 0),
    automaticTriumphs: (pool.automaticTriumphs || 0) + (modifiers.automaticTriumphs || 0),
    automaticDespairs: (pool.automaticDespairs || 0) + (modifiers.automaticDespairs || 0),
    upgradeAbility: (pool.upgradeAbility || 0) + (modifiers.upgradeAbility || 0),
    upgradeDifficulty: (pool.upgradeDifficulty || 0) + (modifiers.upgradeDifficulty || 0),
    downgradeProficiency: (pool.downgradeProficiency || 0) + (modifiers.downgradeProficiency || 0),
    downgradeChallenge: (pool.downgradeChallenge || 0) + (modifiers.downgradeChallenge || 0),
});
exports.applyTalentModifiers = applyTalentModifiers;
