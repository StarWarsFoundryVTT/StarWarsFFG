"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  MonteCarlo: () => MonteCarlo,
  MonteCarloError: () => MonteCarloError
});
module.exports = __toCommonJS(index_exports);

// node_modules/@swrpg-online/dice/dist/bundle.esm.js
var e = "ADVANTAGE";
var s = "THREAT";
var t = "TRIUMPH";
var a = "DESPAIR";
var r = [{ description: "Recover one strain (may be applied more than once).", cost: { [e]: 1, [t]: 1 } }, { description: "Add a boost die to the next allied active character's check.", cost: { [e]: 1, [t]: 1 } }, { description: "Notice a single important point in the ongoing conflict, such as the location of a blast door's control panel or a weak point on an attack speeder.", cost: { [e]: 1, [t]: 1 } }, { description: "Inflict a Critical Injury with a successful attack that deals damage past soak (Advantage cost may vary).", cost: { [e]: 1, [t]: 1 } }, { description: "Activate a weapon quality (Advantage cost may vary).", cost: { [e]: 1, [t]: 1 } }, { description: "Perform an immediate free maneuver that does not exceed the two maneuver per turn limit.", cost: { [e]: 2, [t]: 1 } }, { description: "Add a setback die to the targeted character's next check.", cost: { [e]: 2, [t]: 1 } }, { description: "Add a boost die to any allied character's next check, including that of the active character.", cost: { [e]: 2, [t]: 1 } }, { description: "Negate the targeted enemy's defensive bonuses (such as the defense gained from cover, equipment, or performing the Guarded Stance maneuver) util the end of the current round.", cost: { [e]: 3, [t]: 1 } }, { description: "Ignore penalizing environmental effects such as inclement weather, zero gravity, or similar circumstances until the end of the active character's next turn.", cost: { [e]: 3, [t]: 1 } }, { description: "When dealing damage to a target, have the attack disable the opponent or one piece of gear rather than dealing wounds or strain. This could include hobbling them temporarily with a shot to the leg, or disabling their comlink. This should be agreed upon by the player and the GM, and the effects are up to the GM (although Table 6-10: Critical Injury Result is a god resource to consult for possible effects). The effects should be temporary and not too excessive.", cost: { [e]: 3, [t]: 1 } }, { description: "Gain + 1 melee or ranged defense until the end of the active character's next turn.", cost: { [e]: 3, [t]: 1 } }, { description: "Force the target to drop a melee or ranged weapon they are wielding.", cost: { [e]: 3, [t]: 1 } }, { description: "Upgrade the difficulty of the targeted character's next check.", cost: { [t]: 1 } }, { description: "Do something vital, such as shooting the controls to the nearby blast doors to seal them shut.", cost: { [t]: 1 } }, { description: "Upgrade any allied character's next check, including that of the current active character.", cost: { [t]: 1 } }, { description: "When dealing damage to a target, have the attack destroy a piece of equipment the target is using, such as blowing up his blaster or destroying a personal shield generator.", cost: { [t]: 2 } }, { description: "The active character suffers 1 strain.", cost: { [s]: 1, [a]: 1 } }, { description: "The active character loses the benefits of a prior maneuver (such as from taking cover or assuming a Guarded Stance) until they perform the maneuver again.", cost: { [s]: 1, [a]: 1 } }, { description: "An opponent may immediately perform one free maneuver in response to the active character's check.", cost: { [s]: 2, [a]: 1 } }, { description: "Add a boost die to the targeted character's next check.", cost: { [s]: 1, [a]: 1 } }, { description: "The active character or an allied character suffers a setback die on their next action.", cost: { [s]: 2, [a]: 1 } }, { description: "The active character falls prone.", cost: { [s]: 3, [a]: 1 } }, { description: "The active character grants the enemy a significant advantage in the ongoing encounter, such as accidentally blasting the controls to a bridge the active character was planning to use for their escape.", cost: { [s]: 3, [a]: 1 } }, { description: "The character's ranged weapon imediately runs out of ammunition and may not be used for the remainder of the encounter.", cost: { [a]: 1 } }, { description: "Upgrade the difficulty of an allied character's next check, including that of the current active character.", cost: { [a]: 1 } }, { description: "The tool or melee weapon the character is using becomes damaged.", cost: { [a]: 1 } }];
var i = (e2) => Math.floor(Math.random() * e2) + 1;
var c = (e2) => {
  switch (e2) {
    case 3:
      return { successes: 1, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 4:
      return { successes: 1, failures: 0, advantages: 1, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 5:
      return { successes: 0, failures: 0, advantages: 2, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 6:
      return { successes: 0, failures: 0, advantages: 1, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    default:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
  }
};
var d = (e2) => {
  switch (e2) {
    case 3:
    case 4:
      return { successes: 0, failures: 1, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 5:
    case 6:
      return { successes: 0, failures: 0, advantages: 0, threats: 1, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    default:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
  }
};
var n = (e2) => {
  switch (e2) {
    case 2:
    case 3:
      return { successes: 1, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 4:
      return { successes: 2, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 5:
    case 6:
      return { successes: 0, failures: 0, advantages: 1, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 7:
      return { successes: 1, failures: 0, advantages: 1, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 8:
      return { successes: 0, failures: 0, advantages: 2, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    default:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
  }
};
var h = (e2) => {
  switch (e2) {
    case 2:
      return { successes: 0, failures: 1, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 3:
      return { successes: 0, failures: 2, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 4:
    case 5:
    case 6:
      return { successes: 0, failures: 0, advantages: 0, threats: 1, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 7:
      return { successes: 0, failures: 0, advantages: 0, threats: 2, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 8:
      return { successes: 0, failures: 1, advantages: 0, threats: 1, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    default:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
  }
};
var u = (e2) => {
  switch (e2) {
    case 2:
    case 3:
      return { successes: 1, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 4:
    case 5:
      return { successes: 2, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 6:
      return { successes: 0, failures: 0, advantages: 1, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 7:
    case 8:
    case 9:
      return { successes: 1, failures: 0, advantages: 1, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 10:
    case 11:
      return { successes: 0, failures: 0, advantages: 2, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 12:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 1, despair: 0, lightSide: 0, darkSide: 0 };
    default:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
  }
};
var o = (e2) => {
  switch (e2) {
    case 2:
    case 3:
      return { successes: 0, failures: 1, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 4:
    case 5:
      return { successes: 0, failures: 2, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 6:
    case 7:
      return { successes: 0, failures: 0, advantages: 0, threats: 1, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 8:
    case 9:
      return { successes: 0, failures: 1, advantages: 0, threats: 1, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 10:
    case 11:
      return { successes: 0, failures: 0, advantages: 0, threats: 2, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
    case 12:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 1, lightSide: 0, darkSide: 0 };
    default:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
  }
};
var l = (e2) => {
  switch (e2) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 1, darkSide: 0 };
    case 6:
    case 7:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 2, darkSide: 0 };
    case 8:
    case 9:
    case 10:
    case 11:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 1 };
    case 12:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 2 };
    default:
      return { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 };
  }
};
var p = (e2, s2) => {
  var t2, a2, p2, g, f, m, v, S, k;
  const y = null !== (t2 = e2.boostDice) && void 0 !== t2 ? t2 : 0, b = null !== (a2 = e2.abilityDice) && void 0 !== a2 ? a2 : 0, x = null !== (p2 = e2.proficiencyDice) && void 0 !== p2 ? p2 : 0, M = null !== (g = e2.setBackDice) && void 0 !== g ? g : 0, w = null !== (f = e2.difficultyDice) && void 0 !== f ? f : 0, D = null !== (m = e2.challengeDice) && void 0 !== m ? m : 0, T = null !== (v = e2.forceDice) && void 0 !== v ? v : 0, $ = null !== (S = null == s2 ? void 0 : s2.maxDicePerType) && void 0 !== S ? S : 100, A = null !== (k = null == s2 ? void 0 : s2.maxTotalDice) && void 0 !== k ? k : 500, j = Math.max(0, Math.min(y, $)), E = Math.max(0, Math.min(b, $)), G = Math.max(0, Math.min(x, $)), I = Math.max(0, Math.min(M, $)), R = Math.max(0, Math.min(w, $)), C = Math.max(0, Math.min(D, $)), N = Math.max(0, Math.min(T, $)), O = y > $ || b > $ || x > $ || M > $ || w > $ || D > $ || T > $, P = j + E + G + I + R + C + N;
  if (P > A) throw new Error(`Total dice count (${P}) exceeds maximum allowed (${A}). Please reduce the number of dice in your pool.`);
  if (O && (null == s2 ? void 0 : s2.throwOnLimitExceeded)) {
    const e3 = [];
    throw y > $ && e3.push(`boost: ${y}`), b > $ && e3.push(`ability: ${b}`), x > $ && e3.push(`proficiency: ${x}`), M > $ && e3.push(`setback: ${M}`), w > $ && e3.push(`difficulty: ${w}`), D > $ && e3.push(`challenge: ${D}`), T > $ && e3.push(`force: ${T}`), new Error(`Dice counts exceed per-type limit (${$}): ${e3.join(", ")}. Dice counts have been capped to the maximum.`);
  }
  const U = [];
  for (let e3 = 0; e3 < j; e3++) {
    const e4 = i(6);
    U.push({ type: "boost", roll: e4, result: c(e4) });
  }
  for (let e3 = 0; e3 < E; e3++) {
    const e4 = i(8);
    U.push({ type: "ability", roll: e4, result: n(e4) });
  }
  for (let e3 = 0; e3 < G; e3++) {
    const e4 = i(12);
    U.push({ type: "proficiency", roll: e4, result: u(e4) });
  }
  for (let e3 = 0; e3 < I; e3++) {
    const e4 = i(6);
    U.push({ type: "setback", roll: e4, result: d(e4) });
  }
  for (let e3 = 0; e3 < R; e3++) {
    const e4 = i(8);
    U.push({ type: "difficulty", roll: e4, result: h(e4) });
  }
  for (let e3 = 0; e3 < C; e3++) {
    const e4 = i(12);
    U.push({ type: "challenge", roll: e4, result: o(e4) });
  }
  for (let e3 = 0; e3 < N; e3++) {
    const e4 = i(12);
    U.push({ type: "force", roll: e4, result: l(e4) });
  }
  const q = ((e3) => {
    const s3 = e3.reduce((e4, s4) => ({ successes: e4.successes + s4.successes, failures: e4.failures + s4.failures, advantages: e4.advantages + s4.advantages, threats: e4.threats + s4.threats, triumphs: e4.triumphs + s4.triumphs, despair: e4.despair + s4.despair, lightSide: e4.lightSide + (s4.lightSide || 0), darkSide: e4.darkSide + (s4.darkSide || 0) }), { successes: 0, failures: 0, advantages: 0, threats: 0, triumphs: 0, despair: 0, lightSide: 0, darkSide: 0 });
    let t3 = 0, a3 = 0;
    return s3.successes === s3.failures ? (t3 = 0, a3 = 0) : s3.successes > s3.failures ? t3 = s3.successes - s3.failures : a3 = s3.failures - s3.successes, { successes: t3, failures: a3, advantages: s3.advantages, threats: s3.threats, triumphs: s3.triumphs, despair: s3.despair, lightSide: s3.lightSide, darkSide: s3.darkSide };
  })(U.map((e3) => e3.result));
  if (null == s2 ? void 0 : s2.hints) {
    const e3 = r.filter((e4) => {
      const { cost: s3 } = e4;
      return Object.entries(s3).some(([e5, s4]) => {
        const t3 = e5.toLowerCase() + "s", a3 = q[t3];
        return "number" == typeof a3 && (void 0 !== s4 && s4 > 0 && a3 >= s4);
      });
    });
    q.hints = e3.map((e4) => `${(function(e5) {
      if (!e5.cost || 0 === Object.keys(e5.cost).length) return "No cost";
      const s3 = Object.entries(e5.cost).filter(([e6, s4]) => s4 && s4 > 0).map(([e6, s4]) => `${s4} ${e6.charAt(0).toUpperCase() + e6.toLowerCase().slice(1)}${s4 > 1 ? "s" : ""}`);
      return s3.length > 1 ? s3.join(" OR ") : s3.length > 0 ? s3[0] : "No cost";
    })(e4)} - ${e4.description}`);
  }
  return { results: U, summary: q };
};

// src/MonteCarlo.ts
var MonteCarloError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MonteCarloError";
  }
};
var _MonteCarlo = class _MonteCarlo {
  constructor(dicePool, iterations = 1e4, runSimulate = true) {
    this.histogram = {
      netSuccesses: {},
      netAdvantages: {},
      triumphs: {},
      despairs: {},
      lightSide: {},
      darkSide: {}
    };
    this.statsCache = /* @__PURE__ */ new Map();
    this.runningStats = {
      successCount: 0,
      criticalSuccessCount: 0,
      criticalFailureCount: 0,
      netPositiveCount: 0,
      sumSuccesses: 0,
      sumAdvantages: 0,
      sumTriumphs: 0,
      sumFailures: 0,
      sumThreats: 0,
      sumDespair: 0,
      sumLightSide: 0,
      sumDarkSide: 0,
      sumSquaredSuccesses: 0,
      sumSquaredAdvantages: 0,
      sumSquaredThreats: 0,
      sumSquaredFailures: 0,
      sumSquaredDespair: 0,
      sumSquaredLightSide: 0,
      sumSquaredDarkSide: 0,
      sumSquaredTriumphs: 0
    };
    this.results = [];
    this.validateDicePool(dicePool);
    this.validateIterations(iterations);
    this.dicePool = dicePool;
    this.iterations = iterations;
    this.resetRunningStats();
    if (runSimulate) {
      this.simulate();
    }
  }
  validateDicePool(dicePool) {
    if (!dicePool || typeof dicePool !== "object") {
      throw new MonteCarloError(
        "Invalid dice pool: must be a valid DicePool object"
      );
    }
    const diceTypes = [
      "abilityDice",
      "proficiencyDice",
      "boostDice",
      "setBackDice",
      "difficultyDice",
      "challengeDice",
      "forceDice"
    ];
    const hasAnyDice = diceTypes.some(
      (type) => dicePool[type] && dicePool[type] > 0
    );
    if (!hasAnyDice) {
      throw new MonteCarloError(
        "Invalid dice pool: must contain at least one die"
      );
    }
    diceTypes.forEach((type) => {
      const count = dicePool[type];
      if (count !== void 0 && (count < 0 || !Number.isInteger(count))) {
        throw new MonteCarloError(
          `Invalid ${type}: must be a non-negative integer`
        );
      }
    });
  }
  validateIterations(iterations) {
    if (!Number.isInteger(iterations)) {
      throw new MonteCarloError("Iterations must be an integer");
    }
    if (iterations < _MonteCarlo.MIN_ITERATIONS) {
      throw new MonteCarloError(
        `Iterations must be at least ${_MonteCarlo.MIN_ITERATIONS}`
      );
    }
    if (iterations > _MonteCarlo.MAX_ITERATIONS) {
      throw new MonteCarloError(
        `Iterations must not exceed ${_MonteCarlo.MAX_ITERATIONS}`
      );
    }
  }
  calculateHistogramStats(histogram, totalCount) {
    let sum = 0;
    let sumSquares = 0;
    let count = 0;
    for (const [value, freq] of Object.entries(histogram)) {
      const val = parseInt(value);
      sum += val * freq;
      sumSquares += val * val * freq;
      count += freq;
    }
    const mean = sum / count;
    const variance = sumSquares / count - mean * mean;
    const stdDev = Math.sqrt(Math.max(0, variance));
    return { mean, stdDev, sum, sumSquares };
  }
  calculateSkewness(histogram, stats) {
    if (stats.stdDev === 0) return 0;
    let sumCubedDeviations = 0;
    let totalCount = 0;
    for (const [value, freq] of Object.entries(histogram)) {
      const deviation = (parseInt(value) - stats.mean) / stats.stdDev;
      sumCubedDeviations += Math.pow(deviation, 3) * freq;
      totalCount += freq;
    }
    return sumCubedDeviations / totalCount;
  }
  calculateKurtosis(histogram, stats) {
    if (stats.stdDev === 0) return 0;
    let sumFourthPowerDeviations = 0;
    let totalCount = 0;
    for (const [value, freq] of Object.entries(histogram)) {
      const deviation = (parseInt(value) - stats.mean) / stats.stdDev;
      sumFourthPowerDeviations += Math.pow(deviation, 4) * freq;
      totalCount += freq;
    }
    return sumFourthPowerDeviations / totalCount - 3;
  }
  findOutliers(histogram, stats) {
    if (stats.stdDev === 0) return [];
    const threshold = 2;
    return Object.entries(histogram).filter(
      ([value]) => Math.abs(parseInt(value) - stats.mean) > threshold * stats.stdDev
    ).map(([value]) => parseInt(value));
  }
  analyzeDistribution(histogram, totalCount) {
    const stats = this.calculateHistogramStats(histogram, totalCount);
    return {
      skewness: this.calculateSkewness(histogram, stats),
      kurtosis: this.calculateKurtosis(histogram, stats),
      outliers: this.findOutliers(histogram, stats),
      modes: this.findModes(histogram),
      percentiles: this.calculatePercentiles(histogram, totalCount)
    };
  }
  average(selector) {
    const selectorName = typeof selector === "function" ? selector.name || "custom" : selector.name;
    const cacheKey = `avg_${selectorName}`;
    if (this.statsCache.has(cacheKey)) {
      return this.statsCache.get(cacheKey);
    }
    let sum = 0;
    if (typeof selector === "function") {
      sum = this.results.reduce((acc, roll) => {
        const value = selector(roll);
        if (typeof value !== "number" || isNaN(value)) {
          throw new MonteCarloError(`Invalid selector result: ${value}`);
        }
        return acc + value;
      }, 0);
    } else {
      switch (selector.name) {
        case "successes":
          sum = this.runningStats.sumSuccesses;
          break;
        case "advantages":
          sum = this.runningStats.sumAdvantages;
          break;
        case "triumphs":
          sum = this.runningStats.sumTriumphs;
          break;
        case "failures":
          sum = this.runningStats.sumFailures;
          break;
        case "threats":
          sum = this.runningStats.sumThreats;
          break;
        case "despair":
          sum = this.runningStats.sumDespair;
          break;
        case "lightSide":
          sum = this.runningStats.sumLightSide;
          break;
        case "darkSide":
          sum = this.runningStats.sumDarkSide;
          break;
        default:
          throw new MonteCarloError(`Unknown selector: ${selector.name}`);
      }
    }
    const avg = sum / this.iterations;
    this.statsCache.set(cacheKey, avg);
    return avg;
  }
  standardDeviation(selector) {
    const selectorName = typeof selector === "function" ? selector.name || "custom" : selector.name;
    const cacheKey = `std_${selectorName}`;
    if (this.statsCache.has(cacheKey)) {
      return this.statsCache.get(cacheKey);
    }
    const avg = this.average(selector);
    let squareSum = 0;
    if (typeof selector === "function") {
      squareSum = this.results.reduce((acc, roll) => {
        const value = selector(roll);
        if (typeof value !== "number" || isNaN(value)) {
          throw new MonteCarloError(`Invalid selector result: ${value}`);
        }
        return acc + value * value;
      }, 0);
    } else {
      switch (selector.name) {
        case "successes":
          squareSum = this.runningStats.sumSquaredSuccesses;
          break;
        case "advantages":
          squareSum = this.runningStats.sumSquaredAdvantages;
          break;
        case "threats":
          squareSum = this.runningStats.sumSquaredThreats;
          break;
        case "triumphs":
          squareSum = this.runningStats.sumSquaredTriumphs;
          break;
        case "failures":
          squareSum = this.runningStats.sumSquaredFailures;
          break;
        case "despair":
          squareSum = this.runningStats.sumSquaredDespair;
          break;
        case "lightSide":
          squareSum = this.runningStats.sumSquaredLightSide;
          break;
        case "darkSide":
          squareSum = this.runningStats.sumSquaredDarkSide;
          break;
        default:
          throw new MonteCarloError(`Unknown selector: ${selector.name}`);
      }
    }
    const stdDev = Math.sqrt(Math.abs(squareSum / this.iterations - avg * avg));
    this.statsCache.set(cacheKey, stdDev);
    return stdDev;
  }
  resetRunningStats() {
    this.runningStats = {
      successCount: 0,
      criticalSuccessCount: 0,
      criticalFailureCount: 0,
      netPositiveCount: 0,
      sumSuccesses: 0,
      sumAdvantages: 0,
      sumTriumphs: 0,
      sumFailures: 0,
      sumThreats: 0,
      sumDespair: 0,
      sumLightSide: 0,
      sumDarkSide: 0,
      sumSquaredSuccesses: 0,
      sumSquaredAdvantages: 0,
      sumSquaredThreats: 0,
      sumSquaredFailures: 0,
      sumSquaredDespair: 0,
      sumSquaredLightSide: 0,
      sumSquaredDarkSide: 0,
      sumSquaredTriumphs: 0
    };
  }
  updateHistogram(result) {
    const netSuccesses = result.successes - result.failures;
    this.histogram.netSuccesses[netSuccesses] = (this.histogram.netSuccesses[netSuccesses] || 0) + 1;
    const netAdvantages = result.advantages - result.threats;
    this.histogram.netAdvantages[netAdvantages] = (this.histogram.netAdvantages[netAdvantages] || 0) + 1;
    this.histogram.triumphs[result.triumphs] = (this.histogram.triumphs[result.triumphs] || 0) + 1;
    this.histogram.despairs[result.despair] = (this.histogram.despairs[result.despair] || 0) + 1;
    this.histogram.lightSide[result.lightSide] = (this.histogram.lightSide[result.lightSide] || 0) + 1;
    this.histogram.darkSide[result.darkSide] = (this.histogram.darkSide[result.darkSide] || 0) + 1;
    this.runningStats.sumSuccesses += result.successes;
    this.runningStats.sumAdvantages += result.advantages;
    this.runningStats.sumTriumphs += result.triumphs;
    this.runningStats.sumFailures += result.failures;
    this.runningStats.sumThreats += result.threats;
    this.runningStats.sumDespair += result.despair;
    this.runningStats.sumLightSide += result.lightSide;
    this.runningStats.sumDarkSide += result.darkSide;
    this.runningStats.sumSquaredSuccesses += result.successes * result.successes;
    this.runningStats.sumSquaredAdvantages += result.advantages * result.advantages;
    this.runningStats.sumSquaredThreats += result.threats * result.threats;
    this.runningStats.sumSquaredFailures += result.failures * result.failures;
    this.runningStats.sumSquaredDespair += result.despair * result.despair;
    this.runningStats.sumSquaredLightSide += result.lightSide * result.lightSide;
    this.runningStats.sumSquaredDarkSide += result.darkSide * result.darkSide;
    this.runningStats.sumSquaredTriumphs += result.triumphs * result.triumphs;
    if (netSuccesses > 0) {
      this.runningStats.successCount++;
      if (netAdvantages > 0) {
        this.runningStats.netPositiveCount++;
      }
    }
    if (result.triumphs > 0) this.runningStats.criticalSuccessCount++;
    if (result.despair > 0) this.runningStats.criticalFailureCount++;
  }
  simulate() {
    try {
      this.resetHistogram();
      this.resetRunningStats();
      this.statsCache.clear();
      this.results = [];
      for (let i2 = 0; i2 < this.iterations; i2++) {
        const rollResult = p(this.dicePool);
        this.results.push(rollResult.summary);
        this.updateHistogram(rollResult.summary);
      }
      const successProbability = this.runningStats.successCount / this.iterations;
      const criticalSuccessProbability = this.runningStats.criticalSuccessCount / this.iterations;
      const criticalFailureProbability = this.runningStats.criticalFailureCount / this.iterations;
      const netPositiveProbability = this.runningStats.netPositiveCount / this.iterations;
      const averages = {
        successes: this.runningStats.sumSuccesses / this.iterations,
        advantages: this.runningStats.sumAdvantages / this.iterations,
        triumphs: this.runningStats.sumTriumphs / this.iterations,
        failures: this.runningStats.sumFailures / this.iterations,
        threats: this.runningStats.sumThreats / this.iterations,
        despair: this.runningStats.sumDespair / this.iterations,
        lightSide: this.runningStats.sumLightSide / this.iterations,
        darkSide: this.runningStats.sumDarkSide / this.iterations
      };
      const standardDeviations = {
        successes: Math.sqrt(
          this.runningStats.sumSquaredSuccesses / this.iterations - averages.successes * averages.successes
        ),
        advantages: Math.sqrt(
          this.runningStats.sumSquaredAdvantages / this.iterations - averages.advantages * averages.advantages
        ),
        triumphs: Math.sqrt(
          this.runningStats.sumSquaredTriumphs / this.iterations - averages.triumphs * averages.triumphs
        ),
        failures: Math.sqrt(
          this.runningStats.sumSquaredFailures / this.iterations - averages.failures * averages.failures
        ),
        threats: Math.sqrt(
          this.runningStats.sumSquaredThreats / this.iterations - averages.threats * averages.threats
        ),
        despair: Math.sqrt(
          this.runningStats.sumSquaredDespair / this.iterations - averages.despair * averages.despair
        ),
        lightSide: Math.sqrt(
          this.runningStats.sumSquaredLightSide / this.iterations - averages.lightSide * averages.lightSide
        ),
        darkSide: Math.sqrt(
          this.runningStats.sumSquaredDarkSide / this.iterations - averages.darkSide * averages.darkSide
        )
      };
      const medians = {
        successes: this.calculateMedianFromHistogram(
          this.histogram.netSuccesses
        ),
        advantages: this.calculateMedianFromHistogram(
          this.histogram.netAdvantages
        ),
        triumphs: this.calculateMedianFromHistogram(this.histogram.triumphs),
        failures: this.calculateMedianFromHistogram(this.histogram.despairs),
        threats: this.calculateMedianFromHistogram(
          this.histogram.netAdvantages
        ),
        despair: this.calculateMedianFromHistogram(this.histogram.despairs),
        lightSide: this.calculateMedianFromHistogram(this.histogram.lightSide),
        darkSide: this.calculateMedianFromHistogram(this.histogram.darkSide)
      };
      const analysis = {
        netSuccesses: this.analyzeDistribution(
          this.histogram.netSuccesses,
          this.iterations
        ),
        netAdvantages: this.analyzeDistribution(
          this.histogram.netAdvantages,
          this.iterations
        ),
        triumphs: this.analyzeDistribution(
          this.histogram.triumphs,
          this.iterations
        ),
        despairs: this.analyzeDistribution(
          this.histogram.despairs,
          this.iterations
        ),
        lightSide: this.analyzeDistribution(
          this.histogram.lightSide,
          this.iterations
        ),
        darkSide: this.analyzeDistribution(
          this.histogram.darkSide,
          this.iterations
        )
      };
      return {
        averages,
        medians,
        standardDeviations,
        successProbability,
        criticalSuccessProbability,
        criticalFailureProbability,
        netPositiveProbability,
        histogram: this.histogram,
        analysis
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new MonteCarloError(`Simulation failed: ${error.message}`);
      }
      throw new MonteCarloError("Simulation failed with unknown error");
    }
  }
  resetHistogram() {
    this.histogram = {
      netSuccesses: {},
      netAdvantages: {},
      triumphs: {},
      despairs: {},
      lightSide: {},
      darkSide: {}
    };
  }
  calculateMedianFromHistogram(histogram) {
    const entries = Object.entries(histogram).map(([value, count]) => ({ value: parseInt(value), count })).sort((a2, b) => a2.value - b.value);
    if (entries.length === 0) {
      return 0;
    }
    let runningCount = 0;
    const targetCount = this.iterations / 2;
    for (const { value, count } of entries) {
      runningCount += count;
      if (runningCount >= targetCount) {
        return value;
      }
    }
    return entries[entries.length - 1].value;
  }
  findModes(histogram) {
    const entries = Object.entries(histogram);
    if (entries.length === 0) return [];
    const maxCount = Math.max(...entries.map(([, count]) => count));
    return entries.filter(([, count]) => count === maxCount).map(([value]) => parseInt(value));
  }
  calculatePercentiles(histogram, totalCount) {
    const sortedEntries = Object.entries(histogram).map(([value, count]) => ({ value: parseInt(value), count })).sort((a2, b) => a2.value - b.value);
    if (sortedEntries.length === 0) {
      return {};
    }
    const percentiles = {};
    let runningCount = 0;
    const targetPercentiles = [25, 50, 75, 90];
    let currentTargetIndex = 0;
    for (const { value, count } of sortedEntries) {
      runningCount += count;
      const currentPercentile = runningCount / totalCount * 100;
      while (currentTargetIndex < targetPercentiles.length && currentPercentile >= targetPercentiles[currentTargetIndex]) {
        percentiles[targetPercentiles[currentTargetIndex]] = value;
        currentTargetIndex++;
      }
    }
    const maxValue = sortedEntries[sortedEntries.length - 1].value;
    while (currentTargetIndex < targetPercentiles.length) {
      percentiles[targetPercentiles[currentTargetIndex]] = maxValue;
      currentTargetIndex++;
    }
    return percentiles;
  }
};
_MonteCarlo.MIN_ITERATIONS = 100;
_MonteCarlo.MAX_ITERATIONS = 1e6;
var MonteCarlo = _MonteCarlo;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MonteCarlo,
  MonteCarloError
});
//# sourceMappingURL=index.js.map
