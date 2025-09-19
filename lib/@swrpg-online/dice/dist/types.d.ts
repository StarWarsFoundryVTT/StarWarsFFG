export type DicePool = {
    boostDice?: number;
    abilityDice?: number;
    proficiencyDice?: number;
    setBackDice?: number;
    difficultyDice?: number;
    challengeDice?: number;
    forceDice?: number;
    automaticSuccesses?: number;
    automaticFailures?: number;
    automaticAdvantages?: number;
    automaticThreats?: number;
    automaticTriumphs?: number;
    automaticDespairs?: number;
    automaticLightSide?: number;
    automaticDarkSide?: number;
    upgradeAbility?: number;
    upgradeDifficulty?: number;
    downgradeProficiency?: number;
    downgradeChallenge?: number;
};
export type DiceResult = {
    successes: number;
    failures: number;
    advantages: number;
    threats: number;
    triumphs: number;
    despair: number;
    lightSide: number;
    darkSide: number;
    hints?: string[];
};
export type DieType = "boost" | "ability" | "proficiency" | "setback" | "difficulty" | "challenge" | "force";
export type DetailedDieResult = {
    type: DieType;
    roll: number;
    result: DiceResult;
};
export type RollResult = {
    results: DetailedDieResult[];
    summary: DiceResult;
};
export declare const SYMBOLS: {
    readonly SUCCESS: "SUCCESS";
    readonly FAILURE: "FAILURE";
    readonly ADVANTAGE: "ADVANTAGE";
    readonly THREAT: "THREAT";
    readonly TRIUMPH: "TRIUMPH";
    readonly DESPAIR: "DESPAIR";
    readonly LIGHT: "LIGHT";
    readonly DARK: "DARK";
};
export type Symbol = keyof typeof SYMBOLS;
export type DieFaceSymbols = {
    successes?: number;
    failures?: number;
    advantages?: number;
    threats?: number;
    triumphs?: number;
    despairs?: number;
    lightSide?: number;
    darkSide?: number;
};
export type BoostDieFace = 1 | 2 | 3 | 4 | 5 | 6;
export type SetbackDieFace = 1 | 2 | 3 | 4 | 5 | 6;
export type AbilityDieFace = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type DifficultyDieFace = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type ProficiencyDieFace = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type ChallengeDieFace = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type ForceDieFace = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type RollOptions = {
    hints?: boolean;
    /**
     * Maximum number of dice allowed per die type.
     * Default: 100
     */
    maxDicePerType?: number;
    /**
     * Maximum total number of dice allowed in a single roll.
     * Default: 500
     */
    maxTotalDice?: number;
    /**
     * Whether to throw an error when dice limits are exceeded.
     * If false, dice counts will be silently capped to the maximum.
     * Default: false
     */
    throwOnLimitExceeded?: boolean;
};
