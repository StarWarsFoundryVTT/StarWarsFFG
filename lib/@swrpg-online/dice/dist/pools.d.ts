import { DicePool } from "./types";
/**
 * Options for applying talent or equipment modifiers to a dice pool
 */
export type PoolModifiers = {
    automaticSuccesses?: number;
    automaticFailures?: number;
    automaticAdvantages?: number;
    automaticThreats?: number;
    automaticTriumphs?: number;
    automaticDespairs?: number;
    upgradeAbility?: number;
    upgradeDifficulty?: number;
    downgradeProficiency?: number;
    downgradeChallenge?: number;
};
/**
 * Creates a basic skill check dice pool
 * @param ability Number of ability (green) dice
 * @param proficiency Number of proficiency (yellow) dice
 * @param modifiers Optional modifiers from talents, equipment, etc.
 * @returns DicePool configured for a basic skill check
 */
export declare const createSkillCheck: (ability: number, proficiency: number, modifiers?: PoolModifiers) => DicePool;
/**
 * Creates a combat check dice pool with optional boost die
 * @param ability Number of ability (green) dice
 * @param proficiency Number of proficiency (yellow) dice
 * @param boost Number of boost (blue) dice
 * @param modifiers Optional modifiers from talents, equipment, etc.
 * @returns DicePool configured for a combat check
 */
export declare const createCombatCheck: (ability: number, proficiency: number, boost?: number, modifiers?: PoolModifiers) => DicePool;
/**
 * Creates an opposed check dice pool
 * @param ability Number of ability (green) dice
 * @param proficiency Number of proficiency (yellow) dice
 * @param difficulty Number of difficulty (purple) dice
 * @param challenge Number of challenge (red) dice
 * @param modifiers Optional modifiers from talents, equipment, etc.
 * @returns DicePool configured for an opposed check
 */
export declare const createOpposedCheck: (ability: number, proficiency: number, difficulty: number, challenge?: number, modifiers?: PoolModifiers) => DicePool;
/**
 * Creates a difficulty check dice pool
 * @param difficulty Number of difficulty (purple) dice
 * @param challenge Number of challenge (red) dice
 * @param modifiers Optional modifiers from talents, equipment, etc.
 * @returns DicePool configured for a pure difficulty check
 */
export declare const createDifficultyPool: (difficulty: number, challenge?: number, modifiers?: PoolModifiers) => DicePool;
/**
 * Applies talent modifiers to an existing dice pool
 * Common use case for talents that add automatic advantages, successes, or upgrade dice
 * @param pool The base dice pool
 * @param modifiers The modifiers to apply
 * @returns A new dice pool with modifiers applied
 */
export declare const applyTalentModifiers: (pool: DicePool, modifiers: PoolModifiers) => DicePool;
