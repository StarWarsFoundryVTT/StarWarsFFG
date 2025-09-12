import { DicePool } from "./types";
/**
 * Creates a basic skill check dice pool
 * @param ability Number of ability (green) dice
 * @param proficiency Number of proficiency (yellow) dice
 * @returns DicePool configured for a basic skill check
 */
export declare const createSkillCheck: (ability: number, proficiency: number) => DicePool;
/**
 * Creates a combat check dice pool with optional boost die
 * @param ability Number of ability (green) dice
 * @param proficiency Number of proficiency (yellow) dice
 * @param boost Number of boost (blue) dice
 * @returns DicePool configured for a combat check
 */
export declare const createCombatCheck: (ability: number, proficiency: number, boost?: number) => DicePool;
/**
 * Creates an opposed check dice pool
 * @param ability Number of ability (green) dice
 * @param proficiency Number of proficiency (yellow) dice
 * @param difficulty Number of difficulty (purple) dice
 * @param challenge Number of challenge (red) dice
 * @returns DicePool configured for an opposed check
 */
export declare const createOpposedCheck: (ability: number, proficiency: number, difficulty: number, challenge?: number) => DicePool;
/**
 * Creates a difficulty check dice pool
 * @param difficulty Number of difficulty (purple) dice
 * @param challenge Number of challenge (red) dice
 * @returns DicePool configured for a pure difficulty check
 */
export declare const createDifficultyPool: (difficulty: number, challenge?: number) => DicePool;
