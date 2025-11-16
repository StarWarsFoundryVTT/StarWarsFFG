// node_modules/@swrpg-online/dice/dist/bundle.esm.js
var e = { SUCCESS: "SUCCESS", FAILURE: "FAILURE", ADVANTAGE: "ADVANTAGE", THREAT: "THREAT", TRIUMPH: "TRIUMPH", DESPAIR: "DESPAIR", LIGHT: "LIGHT", DARK: "DARK" };
var t = [{ description: "Recover one strain (may be applied more than once).", cost: { [e.ADVANTAGE]: 1, [e.TRIUMPH]: 1 } }, { description: "Add a boost die to the next allied active character's check.", cost: { [e.ADVANTAGE]: 1, [e.TRIUMPH]: 1 } }, { description: "Notice a single important point in the ongoing conflict, such as the location of a blast door's control panel or a weak point on an attack speeder.", cost: { [e.ADVANTAGE]: 1, [e.TRIUMPH]: 1 } }, { description: "Inflict a Critical Injury with a successful attack that deals damage past soak (Advantage cost may vary).", cost: { [e.ADVANTAGE]: 1, [e.TRIUMPH]: 1 } }, { description: "Activate a weapon quality (Advantage cost may vary).", cost: { [e.ADVANTAGE]: 1, [e.TRIUMPH]: 1 } }, { description: "Perform an immediate free maneuver that does not exceed the two maneuver per turn limit.", cost: { [e.ADVANTAGE]: 2, [e.TRIUMPH]: 1 } }, { description: "Add a setback die to the targeted character's next check.", cost: { [e.ADVANTAGE]: 2, [e.TRIUMPH]: 1 } }, { description: "Add a boost die to any allied character's next check, including that of the active character.", cost: { [e.ADVANTAGE]: 2, [e.TRIUMPH]: 1 } }, { description: "Negate the targeted enemy's defensive bonuses (such as the defense gained from cover, equipment, or performing the Guarded Stance maneuver) util the end of the current round.", cost: { [e.ADVANTAGE]: 3, [e.TRIUMPH]: 1 } }, { description: "Ignore penalizing environmental effects such as inclement weather, zero gravity, or similar circumstances until the end of the active character's next turn.", cost: { [e.ADVANTAGE]: 3, [e.TRIUMPH]: 1 } }, { description: "When dealing damage to a target, have the attack disable the opponent or one piece of gear rather than dealing wounds or strain. This could include hobbling them temporarily with a shot to the leg, or disabling their comlink. This should be agreed upon by the player and the GM, and the effects are up to the GM (although Table 6-10: Critical Injury Result is a god resource to consult for possible effects). The effects should be temporary and not too excessive.", cost: { [e.ADVANTAGE]: 3, [e.TRIUMPH]: 1 } }, { description: "Gain + 1 melee or ranged defense until the end of the active character's next turn.", cost: { [e.ADVANTAGE]: 3, [e.TRIUMPH]: 1 } }, { description: "Force the target to drop a melee or ranged weapon they are wielding.", cost: { [e.ADVANTAGE]: 3, [e.TRIUMPH]: 1 } }, { description: "Upgrade the difficulty of the targeted character's next check.", cost: { [e.TRIUMPH]: 1 } }, { description: "Do something vital, such as shooting the controls to the nearby blast doors to seal them shut.", cost: { [e.TRIUMPH]: 1 } }, { description: "Upgrade any allied character's next check, including that of the current active character.", cost: { [e.TRIUMPH]: 1 } }, { description: "When dealing damage to a target, have the attack destroy a piece of equipment the target is using, such as blowing up his blaster or destroying a personal shield generator.", cost: { [e.TRIUMPH]: 2 } }, { description: "The active character suffers 1 strain.", cost: { [e.THREAT]: 1, [e.DESPAIR]: 1 } }, { description: "The active character loses the benefits of a prior maneuver (such as from taking cover or assuming a Guarded Stance) until they perform the maneuver again.", cost: { [e.THREAT]: 1, [e.DESPAIR]: 1 } }, { description: "An opponent may immediately perform one free maneuver in response to the active character's check.", cost: { [e.THREAT]: 2, [e.DESPAIR]: 1 } }, { description: "Add a boost die to the targeted character's next check.", cost: { [e.THREAT]: 1, [e.DESPAIR]: 1 } }, { description: "The active character or an allied character suffers a setback die on their next action.", cost: { [e.THREAT]: 2, [e.DESPAIR]: 1 } }, { description: "The active character falls prone.", cost: { [e.THREAT]: 3, [e.DESPAIR]: 1 } }, { description: "The active character grants the enemy a significant advantage in the ongoing encounter, such as accidentally blasting the controls to a bridge the active character was planning to use for their escape.", cost: { [e.THREAT]: 3, [e.DESPAIR]: 1 } }, { description: "The character's ranged weapon imediately runs out of ammunition and may not be used for the remainder of the encounter.", cost: { [e.DESPAIR]: 1 } }, { description: "Upgrade the difficulty of an allied character's next check, including that of the current active character.", cost: { [e.DESPAIR]: 1 } }, { description: "The tool or melee weapon the character is using becomes damaged.", cost: { [e.DESPAIR]: 1 } }];
var a = { 1: {}, 2: {}, 3: { successes: 1 }, 4: { successes: 1, advantages: 1 }, 5: { advantages: 2 }, 6: { advantages: 1 } };
var s = { 1: {}, 2: {}, 3: { failures: 1 }, 4: { failures: 1 }, 5: { threats: 1 }, 6: { threats: 1 } };
var i = { 1: {}, 2: { successes: 1 }, 3: { successes: 1 }, 4: { successes: 2 }, 5: { advantages: 1 }, 6: { advantages: 1 }, 7: { successes: 1, advantages: 1 }, 8: { advantages: 2 } };
var r = { 1: {}, 2: { failures: 1 }, 3: { failures: 2 }, 4: { threats: 1 }, 5: { threats: 1 }, 6: { threats: 1 }, 7: { threats: 2 }, 8: { failures: 1, threats: 1 } };
var c = { 1: {}, 2: { successes: 1 }, 3: { successes: 1 }, 4: { successes: 2 }, 5: { successes: 2 }, 6: { advantages: 1 }, 7: { successes: 1, advantages: 1 }, 8: { successes: 1, advantages: 1 }, 9: { successes: 1, advantages: 1 }, 10: { advantages: 2 }, 11: { successes: 1, advantages: 1 }, 12: { triumphs: 1 } };
var n = { 1: {}, 2: { failures: 1 }, 3: { failures: 1 }, 4: { failures: 2 }, 5: { failures: 2 }, 6: { threats: 1 }, 7: { threats: 1 }, 8: { failures: 1, threats: 1 }, 9: { failures: 1, threats: 1 }, 10: { threats: 2 }, 11: { threats: 2 }, 12: { despairs: 1 } };
var o = { 1: { darkSide: 1 }, 2: { darkSide: 1 }, 3: { darkSide: 1 }, 4: { darkSide: 1 }, 5: { darkSide: 1 }, 6: { darkSide: 1 }, 7: { darkSide: 2 }, 8: { lightSide: 1 }, 9: { lightSide: 1 }, 10: { lightSide: 2 }, 11: { lightSide: 2 }, 12: { lightSide: 2 } };
var l = (e2) => Math.floor(Math.random() * e2) + 1;
var u = (e2) => {
  const t2 = a[e2];
  return { successes: t2.successes || 0, failures: t2.failures || 0, advantages: t2.advantages || 0, threats: t2.threats || 0, triumphs: t2.triumphs || 0, despair: t2.despairs || 0, lightSide: t2.lightSide || 0, darkSide: t2.darkSide || 0 };
};
var h = (e2) => {
  const t2 = s[e2];
  return { successes: t2.successes || 0, failures: t2.failures || 0, advantages: t2.advantages || 0, threats: t2.threats || 0, triumphs: t2.triumphs || 0, despair: t2.despairs || 0, lightSide: t2.lightSide || 0, darkSide: t2.darkSide || 0 };
};
var p = (e2) => {
  const t2 = i[e2];
  return { successes: t2.successes || 0, failures: t2.failures || 0, advantages: t2.advantages || 0, threats: t2.threats || 0, triumphs: t2.triumphs || 0, despair: t2.despairs || 0, lightSide: t2.lightSide || 0, darkSide: t2.darkSide || 0 };
};
var g = (e2) => {
  const t2 = r[e2];
  return { successes: t2.successes || 0, failures: t2.failures || 0, advantages: t2.advantages || 0, threats: t2.threats || 0, triumphs: t2.triumphs || 0, despair: t2.despairs || 0, lightSide: t2.lightSide || 0, darkSide: t2.darkSide || 0 };
};
var f = (e2) => {
  const t2 = c[e2];
  return { successes: t2.successes || 0, failures: t2.failures || 0, advantages: t2.advantages || 0, threats: t2.threats || 0, triumphs: t2.triumphs || 0, despair: t2.despairs || 0, lightSide: t2.lightSide || 0, darkSide: t2.darkSide || 0 };
};
var m = (e2) => {
  const t2 = n[e2];
  return { successes: t2.successes || 0, failures: t2.failures || 0, advantages: t2.advantages || 0, threats: t2.threats || 0, triumphs: t2.triumphs || 0, despair: t2.despairs || 0, lightSide: t2.lightSide || 0, darkSide: t2.darkSide || 0 };
};
var v = (e2) => {
  const t2 = o[e2];
  return { successes: t2.successes || 0, failures: t2.failures || 0, advantages: t2.advantages || 0, threats: t2.threats || 0, triumphs: t2.triumphs || 0, despair: t2.despairs || 0, lightSide: t2.lightSide || 0, darkSide: t2.darkSide || 0 };
};
var y = (e2, a2) => {
  var s2, i2, r2, c2, n2, o2, d, y2, A;
  const D = ((e3) => {
    const t2 = { ...e3 };
    if (e3.upgradeAbility && e3.upgradeAbility > 0) {
      let a3 = e3.upgradeAbility;
      const s3 = t2.abilityDice || 0, i3 = Math.min(s3, a3);
      t2.abilityDice = s3 - i3, t2.proficiencyDice = (t2.proficiencyDice || 0) + i3, a3 -= i3, a3 > 0 && (t2.proficiencyDice = (t2.proficiencyDice || 0) + a3);
    }
    if (e3.upgradeDifficulty && e3.upgradeDifficulty > 0) {
      let a3 = e3.upgradeDifficulty;
      const s3 = t2.difficultyDice || 0, i3 = Math.min(s3, a3);
      t2.difficultyDice = s3 - i3, t2.challengeDice = (t2.challengeDice || 0) + i3, a3 -= i3, a3 > 0 && (t2.challengeDice = (t2.challengeDice || 0) + a3);
    }
    if (e3.downgradeProficiency && e3.downgradeProficiency > 0) {
      const a3 = t2.proficiencyDice || 0, s3 = Math.min(a3, e3.downgradeProficiency);
      t2.proficiencyDice = a3 - s3, t2.abilityDice = (t2.abilityDice || 0) + s3;
    }
    if (e3.downgradeChallenge && e3.downgradeChallenge > 0) {
      const a3 = t2.challengeDice || 0, s3 = Math.min(a3, e3.downgradeChallenge);
      t2.challengeDice = a3 - s3, t2.difficultyDice = (t2.difficultyDice || 0) + s3;
    }
    return t2;
  })(e2), S = null !== (s2 = D.boostDice) && void 0 !== s2 ? s2 : 0, T = null !== (i2 = D.abilityDice) && void 0 !== i2 ? i2 : 0, b = null !== (r2 = D.proficiencyDice) && void 0 !== r2 ? r2 : 0, k = null !== (c2 = D.setBackDice) && void 0 !== c2 ? c2 : 0, M = null !== (n2 = D.difficultyDice) && void 0 !== n2 ? n2 : 0, R = null !== (o2 = D.challengeDice) && void 0 !== o2 ? o2 : 0, E = null !== (d = D.forceDice) && void 0 !== d ? d : 0, P = null !== (y2 = null == a2 ? void 0 : a2.maxDicePerType) && void 0 !== y2 ? y2 : 100, I = null !== (A = null == a2 ? void 0 : a2.maxTotalDice) && void 0 !== A ? A : 500, x = Math.max(0, Math.min(S, P)), w = Math.max(0, Math.min(T, P)), H = Math.max(0, Math.min(b, P)), U = Math.max(0, Math.min(k, P)), G = Math.max(0, Math.min(M, P)), N = Math.max(0, Math.min(R, P)), $ = Math.max(0, Math.min(E, P)), C = S > P || T > P || b > P || k > P || M > P || R > P || E > P, V = x + w + H + U + G + N + $;
  if (V > I) throw new Error(`Total dice count (${V}) exceeds maximum allowed (${I}). Please reduce the number of dice in your pool.`);
  if (C && (null == a2 ? void 0 : a2.throwOnLimitExceeded)) {
    const e3 = [];
    throw S > P && e3.push(`boost: ${S}`), T > P && e3.push(`ability: ${T}`), b > P && e3.push(`proficiency: ${b}`), k > P && e3.push(`setback: ${k}`), M > P && e3.push(`difficulty: ${M}`), R > P && e3.push(`challenge: ${R}`), E > P && e3.push(`force: ${E}`), new Error(`Dice counts exceed per-type limit (${P}): ${e3.join(", ")}. Dice counts have been capped to the maximum.`);
  }
  const L = [];
  for (let e3 = 0; e3 < x; e3++) {
    const e4 = l(6);
    L.push({ type: "boost", roll: e4, result: u(e4) });
  }
  for (let e3 = 0; e3 < w; e3++) {
    const e4 = l(8);
    L.push({ type: "ability", roll: e4, result: p(e4) });
  }
  for (let e3 = 0; e3 < H; e3++) {
    const e4 = l(12);
    L.push({ type: "proficiency", roll: e4, result: f(e4) });
  }
  for (let e3 = 0; e3 < U; e3++) {
    const e4 = l(6);
    L.push({ type: "setback", roll: e4, result: h(e4) });
  }
  for (let e3 = 0; e3 < G; e3++) {
    const e4 = l(8);
    L.push({ type: "difficulty", roll: e4, result: g(e4) });
  }
  for (let e3 = 0; e3 < N; e3++) {
    const e4 = l(12);
    L.push({ type: "challenge", roll: e4, result: m(e4) });
  }
  for (let e3 = 0; e3 < $; e3++) {
    const e4 = l(12);
    L.push({ type: "force", roll: e4, result: v(e4) });
  }
  const j = { successes: e2.automaticSuccesses, failures: e2.automaticFailures, advantages: e2.automaticAdvantages, threats: e2.automaticThreats, triumphs: e2.automaticTriumphs, despairs: e2.automaticDespairs, lightSide: e2.automaticLightSide, darkSide: e2.automaticDarkSide }, F = ((e3, t2) => {
    const a3 = e3.reduce((e4, t3) => ({ successes: e4.successes + t3.successes + t3.triumphs, failures: e4.failures + t3.failures + t3.despair, advantages: e4.advantages + t3.advantages, threats: e4.threats + t3.threats, triumphs: e4.triumphs + t3.triumphs, despair: e4.despair + t3.despair, lightSide: e4.lightSide + (t3.lightSide || 0), darkSide: e4.darkSide + (t3.darkSide || 0) }), { successes: ((null == t2 ? void 0 : t2.successes) || 0) + ((null == t2 ? void 0 : t2.triumphs) || 0), failures: ((null == t2 ? void 0 : t2.failures) || 0) + ((null == t2 ? void 0 : t2.despairs) || 0), advantages: (null == t2 ? void 0 : t2.advantages) || 0, threats: (null == t2 ? void 0 : t2.threats) || 0, triumphs: (null == t2 ? void 0 : t2.triumphs) || 0, despair: (null == t2 ? void 0 : t2.despairs) || 0, lightSide: (null == t2 ? void 0 : t2.lightSide) || 0, darkSide: (null == t2 ? void 0 : t2.darkSide) || 0 });
    let s3 = 0, i3 = 0;
    a3.successes === a3.failures ? (s3 = 0, i3 = 0) : a3.successes > a3.failures ? s3 = a3.successes - a3.failures : i3 = a3.failures - a3.successes;
    let r3 = 0, c3 = 0;
    return a3.advantages === a3.threats ? (r3 = 0, c3 = 0) : a3.advantages > a3.threats ? r3 = a3.advantages - a3.threats : c3 = a3.threats - a3.advantages, { successes: s3, failures: i3, advantages: r3, threats: c3, triumphs: a3.triumphs, despair: a3.despair, lightSide: a3.lightSide, darkSide: a3.darkSide };
  })(L.map((e3) => e3.result), j);
  if (null == a2 ? void 0 : a2.hints) {
    const e3 = t.filter((e4) => {
      const { cost: t2 } = e4;
      return Object.entries(t2).some(([e5, t3]) => {
        const a3 = e5.toLowerCase() + "s", s3 = F[a3];
        return "number" == typeof s3 && (void 0 !== t3 && t3 > 0 && s3 >= t3);
      });
    });
    F.hints = e3.map((e4) => `${(function(e5) {
      if (!e5.cost || 0 === Object.keys(e5.cost).length) return "No cost";
      const t2 = Object.entries(e5.cost).filter(([e6, t3]) => t3 && t3 > 0).map(([e6, t3]) => `${t3} ${e6.charAt(0).toUpperCase() + e6.toLowerCase().slice(1)}${t3 > 1 ? "s" : ""}`);
      return t2.length > 1 ? t2.join(" OR ") : t2.length > 0 ? t2[0] : "No cost";
    })(e4)} - ${e4.description}`);
  }
  return { results: L, summary: F };
};

// src/MonteCarlo.ts
var MonteCarloError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MonteCarloError";
  }
};
var _MonteCarlo = class _MonteCarlo {
  constructor(dicePoolOrConfig, iterations = 1e4, runSimulate = true) {
    this.histogram = {
      netSuccesses: {},
      netAdvantages: {},
      triumphs: {},
      despairs: {},
      lightSide: {},
      darkSide: {}
    };
    this.statsCache = /* @__PURE__ */ new Map();
    this.modifierStats = {
      automaticSymbolContribution: {
        successes: 0,
        failures: 0,
        advantages: 0,
        threats: 0,
        triumphs: 0,
        despairs: 0,
        lightSide: 0,
        darkSide: 0
      },
      rolledSymbolContribution: {
        successes: 0,
        failures: 0,
        advantages: 0,
        threats: 0,
        triumphs: 0,
        despairs: 0,
        lightSide: 0,
        darkSide: 0
      },
      upgradeImpact: {
        abilityUpgrades: 0,
        difficultyUpgrades: 0,
        proficiencyDowngrades: 0,
        challengeDowngrades: 0
      }
    };
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
    if (this.isSimulationConfig(dicePoolOrConfig)) {
      this.config = dicePoolOrConfig;
      this.dicePool = dicePoolOrConfig.dicePool;
      this.iterations = dicePoolOrConfig.iterations || iterations;
      this.modifiers = dicePoolOrConfig.modifiers || this.mergeModifiers(
        dicePoolOrConfig.playerModifiers,
        dicePoolOrConfig.oppositionModifiers
      );
    } else {
      this.dicePool = dicePoolOrConfig;
      this.iterations = iterations;
    }
    this.validateDicePool(this.dicePool);
    this.validateIterations(this.iterations);
    this.resetRunningStats();
    if (runSimulate) {
      this.simulate();
    }
  }
  isSimulationConfig(obj) {
    return obj && typeof obj === "object" && "dicePool" in obj;
  }
  mergeModifiers(player, opposition) {
    if (!player && !opposition) return void 0;
    const merged = {};
    if (player) {
      merged.automaticSuccesses = player.automaticSuccesses;
      merged.automaticAdvantages = player.automaticAdvantages;
      merged.automaticTriumphs = player.automaticTriumphs;
      merged.automaticLightSide = player.automaticLightSide;
      merged.upgradeAbility = player.upgradeAbility;
      merged.downgradeProficiency = player.downgradeProficiency;
    }
    if (opposition) {
      merged.automaticFailures = opposition.automaticFailures;
      merged.automaticThreats = opposition.automaticThreats;
      merged.automaticDespairs = opposition.automaticDespairs;
      merged.automaticDarkSide = opposition.automaticDarkSide;
      merged.upgradeDifficulty = opposition.upgradeDifficulty;
      merged.downgradeChallenge = opposition.downgradeChallenge;
    }
    return merged;
  }
  applyModifiers(pool) {
    if (!this.modifiers) return pool;
    const modifiedPool = { ...pool };
    if (this.modifiers.automaticSuccesses)
      modifiedPool.automaticSuccesses = (modifiedPool.automaticSuccesses || 0) + this.modifiers.automaticSuccesses;
    if (this.modifiers.automaticFailures)
      modifiedPool.automaticFailures = (modifiedPool.automaticFailures || 0) + this.modifiers.automaticFailures;
    if (this.modifiers.automaticAdvantages)
      modifiedPool.automaticAdvantages = (modifiedPool.automaticAdvantages || 0) + this.modifiers.automaticAdvantages;
    if (this.modifiers.automaticThreats)
      modifiedPool.automaticThreats = (modifiedPool.automaticThreats || 0) + this.modifiers.automaticThreats;
    if (this.modifiers.automaticTriumphs)
      modifiedPool.automaticTriumphs = (modifiedPool.automaticTriumphs || 0) + this.modifiers.automaticTriumphs;
    if (this.modifiers.automaticDespairs)
      modifiedPool.automaticDespairs = (modifiedPool.automaticDespairs || 0) + this.modifiers.automaticDespairs;
    if (this.modifiers.automaticLightSide)
      modifiedPool.automaticLightSide = (modifiedPool.automaticLightSide || 0) + this.modifiers.automaticLightSide;
    if (this.modifiers.automaticDarkSide)
      modifiedPool.automaticDarkSide = (modifiedPool.automaticDarkSide || 0) + this.modifiers.automaticDarkSide;
    if (this.modifiers.upgradeAbility)
      modifiedPool.upgradeAbility = (modifiedPool.upgradeAbility || 0) + this.modifiers.upgradeAbility;
    if (this.modifiers.upgradeDifficulty)
      modifiedPool.upgradeDifficulty = (modifiedPool.upgradeDifficulty || 0) + this.modifiers.upgradeDifficulty;
    if (this.modifiers.downgradeProficiency)
      modifiedPool.downgradeProficiency = (modifiedPool.downgradeProficiency || 0) + this.modifiers.downgradeProficiency;
    if (this.modifiers.downgradeChallenge)
      modifiedPool.downgradeChallenge = (modifiedPool.downgradeChallenge || 0) + this.modifiers.downgradeChallenge;
    this.modifierStats.upgradeImpact.abilityUpgrades = this.modifiers.upgradeAbility || 0;
    this.modifierStats.upgradeImpact.difficultyUpgrades = this.modifiers.upgradeDifficulty || 0;
    this.modifierStats.upgradeImpact.proficiencyDowngrades = this.modifiers.downgradeProficiency || 0;
    this.modifierStats.upgradeImpact.challengeDowngrades = this.modifiers.downgradeChallenge || 0;
    return modifiedPool;
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
  resetModifierStats() {
    this.modifierStats = {
      automaticSymbolContribution: {
        successes: 0,
        failures: 0,
        advantages: 0,
        threats: 0,
        triumphs: 0,
        despairs: 0,
        lightSide: 0,
        darkSide: 0
      },
      rolledSymbolContribution: {
        successes: 0,
        failures: 0,
        advantages: 0,
        threats: 0,
        triumphs: 0,
        despairs: 0,
        lightSide: 0,
        darkSide: 0
      },
      upgradeImpact: {
        abilityUpgrades: 0,
        difficultyUpgrades: 0,
        proficiencyDowngrades: 0,
        challengeDowngrades: 0
      }
    };
  }
  trackModifierContribution(result) {
    if (!this.modifiers) return;
    const poolModifiers = this.applyModifiers(this.dicePool);
    const autoSuccesses = poolModifiers.automaticSuccesses || 0;
    const autoFailures = poolModifiers.automaticFailures || 0;
    const autoAdvantages = poolModifiers.automaticAdvantages || 0;
    const autoThreats = poolModifiers.automaticThreats || 0;
    const autoTriumphs = poolModifiers.automaticTriumphs || 0;
    const autoDespairs = poolModifiers.automaticDespairs || 0;
    const autoLightSide = poolModifiers.automaticLightSide || 0;
    const autoDarkSide = poolModifiers.automaticDarkSide || 0;
    this.modifierStats.automaticSymbolContribution.successes += autoSuccesses;
    this.modifierStats.automaticSymbolContribution.failures += autoFailures;
    this.modifierStats.automaticSymbolContribution.advantages += autoAdvantages;
    this.modifierStats.automaticSymbolContribution.threats += autoThreats;
    this.modifierStats.automaticSymbolContribution.triumphs += autoTriumphs;
    this.modifierStats.automaticSymbolContribution.despairs += autoDespairs;
    this.modifierStats.automaticSymbolContribution.lightSide += autoLightSide;
    this.modifierStats.automaticSymbolContribution.darkSide += autoDarkSide;
    this.modifierStats.rolledSymbolContribution.successes += Math.max(
      0,
      result.successes - autoSuccesses
    );
    this.modifierStats.rolledSymbolContribution.failures += Math.max(
      0,
      result.failures - autoFailures
    );
    this.modifierStats.rolledSymbolContribution.advantages += Math.max(
      0,
      result.advantages - autoAdvantages
    );
    this.modifierStats.rolledSymbolContribution.threats += Math.max(
      0,
      result.threats - autoThreats
    );
    this.modifierStats.rolledSymbolContribution.triumphs += Math.max(
      0,
      result.triumphs - autoTriumphs
    );
    this.modifierStats.rolledSymbolContribution.despairs += Math.max(
      0,
      result.despair - autoDespairs
    );
    this.modifierStats.rolledSymbolContribution.lightSide += Math.max(
      0,
      result.lightSide - autoLightSide
    );
    this.modifierStats.rolledSymbolContribution.darkSide += Math.max(
      0,
      result.darkSide - autoDarkSide
    );
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
      this.resetModifierStats();
      this.statsCache.clear();
      this.results = [];
      const modifiedPool = this.applyModifiers(this.dicePool);
      for (let i2 = 0; i2 < this.iterations; i2++) {
        const rollResult = y(modifiedPool);
        this.results.push(rollResult.summary);
        this.updateHistogram(rollResult.summary);
        this.trackModifierContribution(rollResult.summary);
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
      const result = {
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
      if (this.modifiers) {
        const iterations = this.iterations;
        result.modifierAnalysis = {
          automaticSymbolContribution: {
            successes: this.modifierStats.automaticSymbolContribution.successes / iterations,
            failures: this.modifierStats.automaticSymbolContribution.failures / iterations,
            advantages: this.modifierStats.automaticSymbolContribution.advantages / iterations,
            threats: this.modifierStats.automaticSymbolContribution.threats / iterations,
            triumphs: this.modifierStats.automaticSymbolContribution.triumphs / iterations,
            despairs: this.modifierStats.automaticSymbolContribution.despairs / iterations,
            lightSide: this.modifierStats.automaticSymbolContribution.lightSide / iterations,
            darkSide: this.modifierStats.automaticSymbolContribution.darkSide / iterations
          },
          rolledSymbolContribution: {
            successes: this.modifierStats.rolledSymbolContribution.successes / iterations,
            failures: this.modifierStats.rolledSymbolContribution.failures / iterations,
            advantages: this.modifierStats.rolledSymbolContribution.advantages / iterations,
            threats: this.modifierStats.rolledSymbolContribution.threats / iterations,
            triumphs: this.modifierStats.rolledSymbolContribution.triumphs / iterations,
            despairs: this.modifierStats.rolledSymbolContribution.despairs / iterations,
            lightSide: this.modifierStats.rolledSymbolContribution.lightSide / iterations,
            darkSide: this.modifierStats.rolledSymbolContribution.darkSide / iterations
          },
          upgradeImpact: this.modifierStats.upgradeImpact
        };
      }
      return result;
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
export {
  MonteCarlo,
  MonteCarloError
};
//# sourceMappingURL=index.esm.js.map
