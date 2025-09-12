# @swrpg-online/monte-carlo

![npm version](https://img.shields.io/npm/v/@swrpg-online/monte-carlo)
![build](https://github.com/swrpg-online/monte-carlo/actions/workflows/release.yaml/badge.svg)
[![codecov](https://codecov.io/gh/swrpg-online/monte-carlo/graph/badge.svg?token=smDjxPWvG9)](https://codecov.io/gh/swrpg-online/monte-carlo)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

A utility library for Star Wars RPG by [Fantasy Flight Games](https://www.fantasyflightgames.com/en/starwarsrpg/) and [Edge Studio](https://www.edge-studio.net/categories-games/starwarsrpg/). Provides statistical analysis for the [narrative dice system](https://star-wars-rpg-ffg.fandom.com/wiki/Narrative_Dice).

## Installation

```bash
npm install @swrpg-online/monte-carlo
```

## Features

### Monte Carlo Simulation

The `MonteCarlo` class provides statistical analysis of dice pools through simulation. It helps to understand the probabilities and distributions of different outcomes.

```typescript
import { MonteCarlo, DicePool } from "@swrpg-online/monte-carlo";

// Create a dice pool
const pool: DicePool = {
  abilityDice: 2, // 2 green (Ability) dice
  proficiencyDice: 1, // 1 yellow (Proficiency) die
};

// Create a Monte Carlo simulation with 10000 iterations (default)
// Optional: disable automatic simulation with runSimulate=false
const simulation = new MonteCarlo(pool, 10000, false);
const results = simulation.simulate();

console.log("Success Probability:", results.successProbability);
console.log("Average Successes:", results.averages.success);
console.log(
  "Standard Deviation of Successes:",
  results.standardDeviations.success,
);
```

### Results Include

- **Averages**: Mean values for success, advantage, triumph, failure, threat, and despair
- **Medians**: Median values for all symbols
- **Standard Deviations**: Standard deviation for all symbols
- **Probabilities**:
  - Success probability (net successes > 0)
  - Critical success probability (at least one triumph)
  - Critical failure probability (at least one despair)
  - Net positive probability (both net successes and net advantages > 0)
- **Distribution Analysis**:
  - Skewness (distribution asymmetry)
  - Kurtosis (distribution "tailedness")
  - Outliers (values > 2 standard deviations from mean)
  - Modes (most common values)
  - Percentiles (25th, 50th, 75th, 90th)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the package
npm run build
```

## Use Cases

### Basic Combat Check

```typescript
import { DicePool } from "@swrpg-online/dice";
import { MonteCarlo } from "@swrpg-online/monte-carlo";

// Combat check with 2 green (Ability) and 1 yellow (Proficiency)
const combatPool: DicePool = {
  abilityDice: 2,
  proficiencyDice: 2,
  difficultyDice: 2,
  challengeDice: 1,
};

const combatSim = new MonteCarlo(combatPool);
const combatResults = combatSim.simulate();

console.log("Combat Check Results:", JSON.stringify(combatResults, null, 2));
```

```JSON
{
  "averages": {
    "successes": 1.4205,
    "advantages": 2.5969,
    "triumphs": 0.1717,
    "failures": 0.3253,
    "threats": 2.1799,
    "despair": 0.0827,
    "lightSide": 0.0,
    "darkSide": 0.0
  },
  "medians": {
    "successs": 1,
    "advantages": 3,
    "triumphs": 0,
    "failures": 0,
    "threats": 2,
    "despair": 0,
    "lightSide": 0,
    "darkSide": 0
  },
  "standardDeviations": {
    "successes": 1.4573536804770009,
    "advantages": 1.4342978735255518,
    "triumphs": 0.396256369033995,
    "failures": 0.7638585667516965,
    "threats": 1.1950464384281536,
    "despair": 0.2754282302161655,
    "lightSide": 0.0,
    "darkSide": 0.0
  },
  "successProbability": 0.6273,
  "criticalSuccessProbability": 0.1643,
  "criticalFailureProbability": 0.0827,
  "netPositiveProbability": 0.219,
  "histogram": {
    "netSuccesses": { /* distribution data */ },
    "netAdvantages": { /* distribution data */ },
    "triumphs": { /* distribution data */ },
    "despairs": { /* distribution data */ },
    "lightSide": { /* distribution data */ },
    "darkSide": { /* distribution data */ }
  },
  "analysis": {
    "netSuccesses": {
      "skewness": 0.12,
      "kurtosis": -0.20,
      "outliers": [-2, 4],
      "modes": [1],
      "percentiles": {
        "25": 0,
        "50": 1,
        "75": 2,
        "90": 3
      }
    },
    "netAdvantages": { /* similar structure */ },
    "triumphs": { /* similar structure */ },
    "despairs": { /* similar structure */ },
    "lightSide": { /* similar structure */ },
    "darkSide": { /* similar structure */ }
  }
}
```

### Statistical Analysis Features

The Monte Carlo simulation provides detailed statistical information:

1. **Basic Probabilities**

   - Success rate (net positive successes)
   - Triumph and Despair chances
   - Net positive results (both success and advantage)

2. **Detailed Statistics**
   - Mean values for all symbols
   - Median values for all symbols
   - Standard deviations
   - Distribution analysis (skewness, kurtosis, outliers)
   - Mode detection
   - Percentile calculations

### How to Interpret Results

When analyzing your dice pool using the Monte Carlo simulation, here's how to interpret each result:

#### Probability Metrics

- **successProbability**: Represents the chance of achieving a net success (successes minus failures > 0). For example, a value of 0.65 means you have a 65% chance of succeeding at the task. In SWRPG terms, this is your chance of meeting or exceeding the difficulty of the check.

- **criticalSuccessProbability**: The chance of rolling at least one triumph (⊺). In SWRPG, triumphs can trigger powerful narrative effects or special abilities regardless of success/failure. A value of 0.167 means you have about a 1-in-6 chance of scoring a triumph.

- **criticalFailureProbability**: The chance of rolling at least one despair (⊝). Similar to triumphs, despairs can trigger significant negative narrative events. A probability of 0.083 indicates about a 1-in-12 chance of a despair occurring.

- **netPositiveProbability**: The likelihood of achieving both net successes and net advantages. This is particularly useful for social encounters or situations where both succeeding and gaining advantage are important. A value of 0.432 means you have a 43.2% chance of both succeeding and gaining advantage.

#### Statistical Measures

- **averages**: The expected number of each symbol you'll get on average:

  - A successes average of 1.5 means you typically get 1-2 successes
  - An advantages average of 0.8 means you usually get about 1 advantage
  - Triumphs/Despair averages are typically low (e.g., 0.083 = 1 triumph per 12 rolls)
  - Light/Dark side averages are typically 0 unless using Force dice

- **medians**: The middle value when all results are sorted. Useful for understanding the "typical" roll:

  - If different from the average, indicates skewed results
  - More resistant to extreme rolls than averages
  - Helps understand what a "normal" roll looks like

- **standardDeviations**: Measures how much variation exists from the average:
  - Lower values (e.g., 0.5) indicate consistent results
  - Higher values (e.g., 1.5) indicate more volatile/swingy rolls
  - About 68% of rolls fall within ±1 standard deviation of the average
  - About 95% of rolls fall within ±2 standard deviations

#### Histogram Data

The `histogram` field provides a detailed frequency distribution for key outcomes:

```typescript
"histogram": {
  "netSuccesses": { // Distribution of (Successes - Failures)
    "0": 37445,     // 37445 rolls resulted in 0 net Successes
    "1": 26516,     // 26516 rolls resulted in 1 net Success
    "2": 8298,      //  8298 rolls resulted in 2 net Successes
    "-1": 20853,    // 20853 rolls resulted in -1 net Success (1 net Failure)
    "-2": 6888       //  6888 rolls resulted in -2 net Successes (2 net Failures)
  },
  "netAdvantages": { // Distribution of (Advantages - Threats)
    "0": 39009,     // 39009 rolls resulted in 0 net Advantages
    "1": 22149,     // 22149 rolls resulted in 1 net Advantage
    "2": 8463,      //  8463 rolls resulted in 2 net Advantages
    "-1": 22030,    // 22030 rolls resulted in -1 net Advantage (1 net Threat)
    "-2": 8349       //  8349 rolls resulted in -2 net Advantages (2 net Threats)
  },
  "triumphs": {      // Distribution of Triumph counts
    "0": 83570,     // 83570 rolls had 0 Triumphs
    "1": 15430,     // 15430 rolls had 1 Triumph
    "2": 1000       //  1000 rolls had 2 Triumphs
  },
  "despairs": {      // Distribution of Despair counts (similar structure) },
  "lightSide": {     // Distribution of Light Side point counts (Force Dice) },
  "darkSide": {      // Distribution of Dark Side point counts (Force Dice) }
}
```

- **Keys**: Represent the specific outcome value (e.g., the net number of successes/advantages, or the count of triumphs/despairs).
  - For `netSuccesses`, negative keys indicate **net Failures** (e.g., `-1` means 1 net Failure).
  - For `netAdvantages`, negative keys indicate **net Threats** (e.g., `-2` means 2 net Threats).
- **Values**: Represent the number of simulation iterations (rolls) that resulted in that specific outcome.

This data allows for a detailed view of the likelihood of every possible outcome, going beyond the summary statistics. It's the basis for calculating the `analysis` metrics like skewness, kurtosis, and percentiles.

#### Distribution Analysis

- **skewness**: Measures distribution asymmetry:

  - Positive: More extreme positive results than negative
  - Negative: More extreme negative results than positive
  - Near 0: Roughly symmetric distribution

- **kurtosis**: Measures distribution "tailedness":

  - Positive: More extreme results than a normal distribution
  - Negative: Fewer extreme results than a normal distribution
  - Near 0: Similar to a normal distribution

- **outliers**: Values more than 2 standard deviations from the mean:

  - Useful for identifying unusual or extreme results
  - Helps understand the range of possible outcomes
  - Important for risk assessment

- **modes**: Most common values in the distribution:

  - Single mode: One clear "most common" result
  - Multiple modes: Several equally common results
  - Helps identify typical outcomes

- **percentiles**: Value thresholds for different percentiles:
  - 25th: "Worst quarter" threshold
  - 50th: Median result
  - 75th: "Best quarter" threshold
  - 90th: "Exceptional" threshold

For example, if you have:

```typescript
{
  averages: { successes: 2.0, advantages: 1.5 },
  standardDeviations: { successes: 1.2, advantages: 1.1 },
  analysis: {
    netSuccesses: {
      skewness: 0.12,
      kurtosis: -0.20,
      outliers: [-2, 4],
      modes: [1],
      percentiles: {
        "25": 0,
        "50": 1,
        "75": 2,
        "90": 3
      }
    }
  }
}
```

This means:

- You typically get 2 successes, but about 68% of rolls will give you 0.8 to 3.2 successes
- You usually get 1-2 advantages, with 68% of rolls giving you 0.4 to 2.6 advantages
- The distribution is slightly right-skewed (0.12) and has lighter tails than normal (-0.20)
- Unusual results include -2 and 4 successes
- The most common result is 1 success
- 25% of rolls give 0 or fewer successes
- 50% of rolls give 1 or fewer successes
- 75% of rolls give 2 or fewer successes
- 90% of rolls give 3 or fewer successes

### Performance Considerations

- Default 10,000 iterations provide a good balance of accuracy and speed
- Increase iterations for more precise probability calculations:

  ```typescript
  const preciseSim = new MonteCarlo(pool, 100000);
  ```

- Memory-efficient implementation:

  - Uses running statistics to avoid storing all roll results
  - Sparse histogram storage for distribution analysis
  - Cached calculations for frequently accessed statistics
  - Direct array access for histogram updates
  - Optimized for large datasets and long-running simulations
  - Selector-based caching for improved performance

- Performance optimizations:
  - Single-pass calculations for all statistics
  - Efficient histogram-based calculations
  - Running statistics for improved accuracy
  - Minimized memory allocations
  - Optimized for large iteration counts
  - Prefixed cache keys for better organization
  - Selector-based caching for reuse

### Available Statistics

The `simulate()` method returns a `MonteCarloResult` with the following information:

```typescript
interface MonteCarloResult {
  // Mean values for each symbol (calculated using running statistics)
  averages: {
    successes: number;
    advantages: number;
    triumphs: number;
    failures: number;
    threats: number;
    despair: number;
    lightSide: number;
    darkSide: number;
  };

  // Median values for each symbol (calculated from histogram)
  medians: {
    successes: number;
    advantages: number;
    triumphs: number;
    failures: number;
    threats: number;
    despair: number;
    lightSide: number;
    darkSide: number;
  };

  // Standard deviations for each symbol (calculated using running statistics)
  standardDeviations: {
    successes: number;
    advantages: number;
    triumphs: number;
    failures: number;
    threats: number;
    despair: number;
    lightSide: number;
    darkSide: number;
  };

  // Probability of net successes > 0 (calculated during simulation)
  successProbability: number;

  // Probability of at least one triumph (calculated during simulation)
  criticalSuccessProbability: number;

  // Probability of at least one despair (calculated during simulation)
  criticalFailureProbability: number;

  // Probability of both net successes and net advantages > 0 (calculated during simulation)
  netPositiveProbability: number;

  // Histogram data for distribution analysis (sparse storage)
  histogram: HistogramData;

  // Detailed analysis of distributions (calculated from histogram)
  analysis: {
    netSuccesses: DistributionAnalysis;
    netAdvantages: DistributionAnalysis;
    triumphs: DistributionAnalysis;
    despairs: DistributionAnalysis;
    lightSide: DistributionAnalysis;
    darkSide: DistributionAnalysis;
  };
}
```

### Error Handling

The `MonteCarlo` class includes built-in validation:

- Validates that the dice pool contains at least one die
- Ensures all die counts are non-negative integers
- Validates iteration count (minimum 100, maximum 1,000,000)
- Handles unknown selector types in statistical calculations
- Manages cache misses with valid selectors
- Handles empty histograms and incomplete data

```typescript
try {
  const simulation = new MonteCarlo(pool);
  const results = simulation.simulate();
} catch (error) {
  if (error instanceof MonteCarloError) {
    console.error("Simulation error:", error.message);
  }
}
```

## License

MIT
