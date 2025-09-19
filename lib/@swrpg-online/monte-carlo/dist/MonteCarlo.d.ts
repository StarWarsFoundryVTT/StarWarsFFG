import { DicePool } from "@swrpg-online/dice";
import { DiceResult } from "@swrpg-online/dice/dist/types";
export { DicePool };
export interface ModifierConfig {
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
}
export interface SimulationConfig {
    dicePool: DicePool;
    iterations?: number;
    modifiers?: ModifierConfig;
    playerModifiers?: ModifierConfig;
    oppositionModifiers?: ModifierConfig;
}
export interface ModifierAnalysis {
    automaticSymbolContribution: {
        successes: number;
        failures: number;
        advantages: number;
        threats: number;
        triumphs: number;
        despairs: number;
        lightSide: number;
        darkSide: number;
    };
    rolledSymbolContribution: {
        successes: number;
        failures: number;
        advantages: number;
        threats: number;
        triumphs: number;
        despairs: number;
        lightSide: number;
        darkSide: number;
    };
    upgradeImpact: {
        abilityUpgrades: number;
        difficultyUpgrades: number;
        proficiencyDowngrades: number;
        challengeDowngrades: number;
    };
}
export declare class MonteCarloError extends Error {
    constructor(message: string);
}
export interface HistogramData {
    netSuccesses: {
        [key: number]: number;
    };
    netAdvantages: {
        [key: number]: number;
    };
    triumphs: {
        [key: number]: number;
    };
    despairs: {
        [key: number]: number;
    };
    lightSide: {
        [key: number]: number;
    };
    darkSide: {
        [key: number]: number;
    };
}
export interface DistributionAnalysis {
    skewness: number;
    kurtosis: number;
    outliers: number[];
    modes: number[];
    percentiles: {
        [key: number]: number;
    };
}
export interface MonteCarloResult {
    averages: DiceResult;
    medians: DiceResult;
    standardDeviations: DiceResult;
    successProbability: number;
    criticalSuccessProbability: number;
    criticalFailureProbability: number;
    netPositiveProbability: number;
    histogram: HistogramData;
    analysis: {
        netSuccesses: DistributionAnalysis;
        netAdvantages: DistributionAnalysis;
        triumphs: DistributionAnalysis;
        despairs: DistributionAnalysis;
        lightSide: DistributionAnalysis;
        darkSide: DistributionAnalysis;
    };
    modifierAnalysis?: ModifierAnalysis;
}
export declare class MonteCarlo {
    private readonly dicePool;
    private readonly iterations;
    private readonly modifiers?;
    private readonly config?;
    private histogram;
    private static readonly MIN_ITERATIONS;
    private static readonly MAX_ITERATIONS;
    private statsCache;
    private modifierStats;
    private runningStats;
    private results;
    constructor(dicePoolOrConfig: DicePool | SimulationConfig, iterations?: number, runSimulate?: boolean);
    private isSimulationConfig;
    private mergeModifiers;
    private applyModifiers;
    private validateDicePool;
    private validateIterations;
    private calculateHistogramStats;
    private calculateSkewness;
    private calculateKurtosis;
    private findOutliers;
    private analyzeDistribution;
    private average;
    private standardDeviation;
    private resetRunningStats;
    private resetModifierStats;
    private trackModifierContribution;
    private updateHistogram;
    simulate(): MonteCarloResult;
    private resetHistogram;
    private calculateMedianFromHistogram;
    private findModes;
    private calculatePercentiles;
}
