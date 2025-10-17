import { DicePool, RollResult, RollOptions } from "./types";
export declare const DEFAULT_MAX_DICE_PER_TYPE = 100;
export declare const DEFAULT_MAX_TOTAL_DICE = 500;
/**
 * Rolls a dice pool and returns the results.
 *
 * @param pool - The dice pool to roll
 * @param options - Optional roll configuration including dice limits
 * @returns The roll results with detailed die information and summary
 * @throws {Error} If dice counts exceed configured limits
 *
 * Default limits:
 * - Max dice per type: 100 (configurable via options.maxDicePerType)
 * - Max total dice: 500 (configurable via options.maxTotalDice)
 */
export declare const roll: (pool: DicePool, options?: RollOptions) => RollResult;
