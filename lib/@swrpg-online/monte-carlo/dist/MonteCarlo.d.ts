import { DicePool } from "@swrpg-online/dice";
import { DiceResult } from "@swrpg-online/dice/dist/types";
export { DicePool };
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
}
export declare class MonteCarlo {
    private readonly dicePool;
    private readonly iterations;
    private histogram;
    private static readonly MIN_ITERATIONS;
    private static readonly MAX_ITERATIONS;
    private statsCache;
    private runningStats;
    private results;
    constructor(dicePool: DicePool, iterations?: number, runSimulate?: boolean);
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
    private updateHistogram;
    simulate(): MonteCarloResult;
    private resetHistogram;
    private calculateMedianFromHistogram;
    private findModes;
    private calculatePercentiles;
}
