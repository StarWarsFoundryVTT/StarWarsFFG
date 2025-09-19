"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roll = exports.DEFAULT_MAX_TOTAL_DICE = exports.DEFAULT_MAX_DICE_PER_TYPE = void 0;
const hints_1 = require("./hints");
const diceFaces_1 = require("./diceFaces");
// Default dice limits for performance and security
exports.DEFAULT_MAX_DICE_PER_TYPE = 100;
exports.DEFAULT_MAX_TOTAL_DICE = 500;
const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;
const boostDieResult = (roll) => {
    const face = diceFaces_1.BOOST_DIE_FACES[roll];
    return {
        successes: face.successes || 0,
        failures: face.failures || 0,
        advantages: face.advantages || 0,
        threats: face.threats || 0,
        triumphs: face.triumphs || 0,
        despair: face.despairs || 0,
        lightSide: face.lightSide || 0,
        darkSide: face.darkSide || 0,
    };
};
const setBackDieResult = (roll) => {
    const face = diceFaces_1.SETBACK_DIE_FACES[roll];
    return {
        successes: face.successes || 0,
        failures: face.failures || 0,
        advantages: face.advantages || 0,
        threats: face.threats || 0,
        triumphs: face.triumphs || 0,
        despair: face.despairs || 0,
        lightSide: face.lightSide || 0,
        darkSide: face.darkSide || 0,
    };
};
const abilityDieResult = (roll) => {
    const face = diceFaces_1.ABILITY_DIE_FACES[roll];
    return {
        successes: face.successes || 0,
        failures: face.failures || 0,
        advantages: face.advantages || 0,
        threats: face.threats || 0,
        triumphs: face.triumphs || 0,
        despair: face.despairs || 0,
        lightSide: face.lightSide || 0,
        darkSide: face.darkSide || 0,
    };
};
const difficultyDieResult = (roll) => {
    const face = diceFaces_1.DIFFICULTY_DIE_FACES[roll];
    return {
        successes: face.successes || 0,
        failures: face.failures || 0,
        advantages: face.advantages || 0,
        threats: face.threats || 0,
        triumphs: face.triumphs || 0,
        despair: face.despairs || 0,
        lightSide: face.lightSide || 0,
        darkSide: face.darkSide || 0,
    };
};
const proficiencyDieResult = (roll) => {
    const face = diceFaces_1.PROFICIENCY_DIE_FACES[roll];
    return {
        successes: face.successes || 0,
        failures: face.failures || 0,
        advantages: face.advantages || 0,
        threats: face.threats || 0,
        triumphs: face.triumphs || 0,
        despair: face.despairs || 0,
        lightSide: face.lightSide || 0,
        darkSide: face.darkSide || 0,
    };
};
const challengeDieResult = (roll) => {
    const face = diceFaces_1.CHALLENGE_DIE_FACES[roll];
    return {
        successes: face.successes || 0,
        failures: face.failures || 0,
        advantages: face.advantages || 0,
        threats: face.threats || 0,
        triumphs: face.triumphs || 0,
        despair: face.despairs || 0,
        lightSide: face.lightSide || 0,
        darkSide: face.darkSide || 0,
    };
};
const forceDieResult = (roll) => {
    const face = diceFaces_1.FORCE_DIE_FACES[roll];
    return {
        successes: face.successes || 0,
        failures: face.failures || 0,
        advantages: face.advantages || 0,
        threats: face.threats || 0,
        triumphs: face.triumphs || 0,
        despair: face.despairs || 0,
        lightSide: face.lightSide || 0,
        darkSide: face.darkSide || 0,
    };
};
/**
 * Applies dice upgrades and downgrades to a pool.
 * Upgrades are applied first, then downgrades.
 *
 * @param pool - The dice pool to modify
 * @returns A new dice pool with upgrades/downgrades applied
 */
const applyDiceModifications = (pool) => {
    const modifiedPool = { ...pool };
    // Apply upgrades first (per game rules)
    if (pool.upgradeAbility && pool.upgradeAbility > 0) {
        let upgradesToApply = pool.upgradeAbility;
        const currentAbility = modifiedPool.abilityDice || 0;
        // Upgrade existing ability dice to proficiency
        const upgradedDice = Math.min(currentAbility, upgradesToApply);
        modifiedPool.abilityDice = currentAbility - upgradedDice;
        modifiedPool.proficiencyDice =
            (modifiedPool.proficiencyDice || 0) + upgradedDice;
        upgradesToApply -= upgradedDice;
        // Add remaining upgrades as new proficiency dice
        if (upgradesToApply > 0) {
            modifiedPool.proficiencyDice =
                (modifiedPool.proficiencyDice || 0) + upgradesToApply;
        }
    }
    if (pool.upgradeDifficulty && pool.upgradeDifficulty > 0) {
        let upgradesToApply = pool.upgradeDifficulty;
        const currentDifficulty = modifiedPool.difficultyDice || 0;
        // Upgrade existing difficulty dice to challenge
        const upgradedDice = Math.min(currentDifficulty, upgradesToApply);
        modifiedPool.difficultyDice = currentDifficulty - upgradedDice;
        modifiedPool.challengeDice =
            (modifiedPool.challengeDice || 0) + upgradedDice;
        upgradesToApply -= upgradedDice;
        // Add remaining upgrades as new challenge dice
        if (upgradesToApply > 0) {
            modifiedPool.challengeDice =
                (modifiedPool.challengeDice || 0) + upgradesToApply;
        }
    }
    // Apply downgrades after upgrades
    if (pool.downgradeProficiency && pool.downgradeProficiency > 0) {
        const currentProficiency = modifiedPool.proficiencyDice || 0;
        const downgradesToApply = Math.min(currentProficiency, pool.downgradeProficiency);
        // Downgrade proficiency dice to ability dice
        modifiedPool.proficiencyDice = currentProficiency - downgradesToApply;
        modifiedPool.abilityDice =
            (modifiedPool.abilityDice || 0) + downgradesToApply;
        // Excess downgrades are ignored (per requirements)
    }
    if (pool.downgradeChallenge && pool.downgradeChallenge > 0) {
        const currentChallenge = modifiedPool.challengeDice || 0;
        const downgradesToApply = Math.min(currentChallenge, pool.downgradeChallenge);
        // Downgrade challenge dice to difficulty dice
        modifiedPool.challengeDice = currentChallenge - downgradesToApply;
        modifiedPool.difficultyDice =
            (modifiedPool.difficultyDice || 0) + downgradesToApply;
        // Excess downgrades are ignored (per requirements)
    }
    return modifiedPool;
};
const sumResults = (results, automaticSymbols, options) => {
    const sums = results.reduce((acc, curr) => ({
        successes: acc.successes + curr.successes,
        failures: acc.failures + curr.failures,
        advantages: acc.advantages + curr.advantages,
        threats: acc.threats + curr.threats,
        triumphs: acc.triumphs + curr.triumphs,
        despair: acc.despair + curr.despair,
        lightSide: acc.lightSide + (curr.lightSide || 0),
        darkSide: acc.darkSide + (curr.darkSide || 0),
    }), {
        successes: (automaticSymbols === null || automaticSymbols === void 0 ? void 0 : automaticSymbols.successes) || 0,
        failures: (automaticSymbols === null || automaticSymbols === void 0 ? void 0 : automaticSymbols.failures) || 0,
        advantages: (automaticSymbols === null || automaticSymbols === void 0 ? void 0 : automaticSymbols.advantages) || 0,
        threats: (automaticSymbols === null || automaticSymbols === void 0 ? void 0 : automaticSymbols.threats) || 0,
        triumphs: (automaticSymbols === null || automaticSymbols === void 0 ? void 0 : automaticSymbols.triumphs) || 0,
        despair: (automaticSymbols === null || automaticSymbols === void 0 ? void 0 : automaticSymbols.despairs) || 0,
        lightSide: (automaticSymbols === null || automaticSymbols === void 0 ? void 0 : automaticSymbols.lightSide) || 0,
        darkSide: (automaticSymbols === null || automaticSymbols === void 0 ? void 0 : automaticSymbols.darkSide) || 0,
    });
    let netSuccesses = 0;
    let netFailures = 0;
    if (sums.successes === sums.failures) {
        netSuccesses = 0;
        netFailures = 0;
    }
    else if (sums.successes > sums.failures) {
        netSuccesses = sums.successes - sums.failures;
    }
    else {
        netFailures = sums.failures - sums.successes;
    }
    // Advantages and threats cancel each other out
    let netAdvantages = 0;
    let netThreats = 0;
    if (sums.advantages === sums.threats) {
        netAdvantages = 0;
        netThreats = 0;
    }
    else if (sums.advantages > sums.threats) {
        netAdvantages = sums.advantages - sums.threats;
    }
    else {
        netThreats = sums.threats - sums.advantages;
    }
    const result = {
        successes: netSuccesses,
        failures: netFailures,
        advantages: netAdvantages,
        threats: netThreats,
        triumphs: sums.triumphs,
        despair: sums.despair,
        lightSide: sums.lightSide,
        darkSide: sums.darkSide,
    };
    return result;
};
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
const roll = (pool, options) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    // Apply dice modifications (upgrades/downgrades)
    const modifiedPool = applyDiceModifications(pool);
    const boostCount = (_a = modifiedPool.boostDice) !== null && _a !== void 0 ? _a : 0;
    const abilityCount = (_b = modifiedPool.abilityDice) !== null && _b !== void 0 ? _b : 0;
    const proficiencyCount = (_c = modifiedPool.proficiencyDice) !== null && _c !== void 0 ? _c : 0;
    const setBackCount = (_d = modifiedPool.setBackDice) !== null && _d !== void 0 ? _d : 0;
    const difficultyCount = (_e = modifiedPool.difficultyDice) !== null && _e !== void 0 ? _e : 0;
    const challengeCount = (_f = modifiedPool.challengeDice) !== null && _f !== void 0 ? _f : 0;
    const forceCount = (_g = modifiedPool.forceDice) !== null && _g !== void 0 ? _g : 0;
    // Get limits from options or use defaults
    const maxDicePerType = (_h = options === null || options === void 0 ? void 0 : options.maxDicePerType) !== null && _h !== void 0 ? _h : exports.DEFAULT_MAX_DICE_PER_TYPE;
    const maxTotalDice = (_j = options === null || options === void 0 ? void 0 : options.maxTotalDice) !== null && _j !== void 0 ? _j : exports.DEFAULT_MAX_TOTAL_DICE;
    // Ensure all dice counts are non-negative and apply per-type limits
    const sanitizedPool = {
        boostDice: Math.max(0, Math.min(boostCount, maxDicePerType)),
        abilityDice: Math.max(0, Math.min(abilityCount, maxDicePerType)),
        proficiencyDice: Math.max(0, Math.min(proficiencyCount, maxDicePerType)),
        setBackDice: Math.max(0, Math.min(setBackCount, maxDicePerType)),
        difficultyDice: Math.max(0, Math.min(difficultyCount, maxDicePerType)),
        challengeDice: Math.max(0, Math.min(challengeCount, maxDicePerType)),
        forceDice: Math.max(0, Math.min(forceCount, maxDicePerType)),
    };
    // Check if any dice counts exceeded the per-type limit
    const exceedsPerTypeLimit = boostCount > maxDicePerType ||
        abilityCount > maxDicePerType ||
        proficiencyCount > maxDicePerType ||
        setBackCount > maxDicePerType ||
        difficultyCount > maxDicePerType ||
        challengeCount > maxDicePerType ||
        forceCount > maxDicePerType;
    // Calculate total dice count
    const totalDice = sanitizedPool.boostDice +
        sanitizedPool.abilityDice +
        sanitizedPool.proficiencyDice +
        sanitizedPool.setBackDice +
        sanitizedPool.difficultyDice +
        sanitizedPool.challengeDice +
        sanitizedPool.forceDice;
    // Check total dice limit
    if (totalDice > maxTotalDice) {
        throw new Error(`Total dice count (${totalDice}) exceeds maximum allowed (${maxTotalDice}). ` +
            `Please reduce the number of dice in your pool.`);
    }
    // Warn if per-type limits were exceeded (but continue with capped values)
    if (exceedsPerTypeLimit && (options === null || options === void 0 ? void 0 : options.throwOnLimitExceeded)) {
        const exceeded = [];
        if (boostCount > maxDicePerType)
            exceeded.push(`boost: ${boostCount}`);
        if (abilityCount > maxDicePerType)
            exceeded.push(`ability: ${abilityCount}`);
        if (proficiencyCount > maxDicePerType)
            exceeded.push(`proficiency: ${proficiencyCount}`);
        if (setBackCount > maxDicePerType)
            exceeded.push(`setback: ${setBackCount}`);
        if (difficultyCount > maxDicePerType)
            exceeded.push(`difficulty: ${difficultyCount}`);
        if (challengeCount > maxDicePerType)
            exceeded.push(`challenge: ${challengeCount}`);
        if (forceCount > maxDicePerType)
            exceeded.push(`force: ${forceCount}`);
        throw new Error(`Dice counts exceed per-type limit (${maxDicePerType}): ${exceeded.join(", ")}. ` +
            `Dice counts have been capped to the maximum.`);
    }
    const detailedResults = [];
    // Roll boost dice
    for (let i = 0; i < sanitizedPool.boostDice; i++) {
        const roll = rollDie(6);
        detailedResults.push({
            type: "boost",
            roll,
            result: boostDieResult(roll),
        });
    }
    // Roll ability dice
    for (let i = 0; i < sanitizedPool.abilityDice; i++) {
        const roll = rollDie(8);
        detailedResults.push({
            type: "ability",
            roll,
            result: abilityDieResult(roll),
        });
    }
    // Roll proficiency dice
    for (let i = 0; i < sanitizedPool.proficiencyDice; i++) {
        const roll = rollDie(12);
        detailedResults.push({
            type: "proficiency",
            roll,
            result: proficiencyDieResult(roll),
        });
    }
    // Roll setback dice
    for (let i = 0; i < sanitizedPool.setBackDice; i++) {
        const roll = rollDie(6);
        detailedResults.push({
            type: "setback",
            roll,
            result: setBackDieResult(roll),
        });
    }
    // Roll difficulty dice
    for (let i = 0; i < sanitizedPool.difficultyDice; i++) {
        const roll = rollDie(8);
        detailedResults.push({
            type: "difficulty",
            roll,
            result: difficultyDieResult(roll),
        });
    }
    // Roll challenge dice
    for (let i = 0; i < sanitizedPool.challengeDice; i++) {
        const roll = rollDie(12);
        detailedResults.push({
            type: "challenge",
            roll,
            result: challengeDieResult(roll),
        });
    }
    // Roll force dice
    for (let i = 0; i < sanitizedPool.forceDice; i++) {
        const roll = rollDie(12);
        detailedResults.push({
            type: "force",
            roll,
            result: forceDieResult(roll),
        });
    }
    const automaticSymbols = {
        successes: pool.automaticSuccesses,
        failures: pool.automaticFailures,
        advantages: pool.automaticAdvantages,
        threats: pool.automaticThreats,
        triumphs: pool.automaticTriumphs,
        despairs: pool.automaticDespairs,
        lightSide: pool.automaticLightSide,
        darkSide: pool.automaticDarkSide,
    };
    const summary = sumResults(detailedResults.map((r) => r.result), automaticSymbols, options);
    if (options === null || options === void 0 ? void 0 : options.hints) {
        const applicableHints = hints_1.hints.filter((hint) => {
            const { cost } = hint;
            // For OR conditions: at least one option must be fully satisfied
            // Each entry in cost represents an alternative way to pay for the hint
            return Object.entries(cost).some(([symbol, required]) => {
                const summaryKey = (symbol.toLowerCase() + "s");
                const value = summary[summaryKey];
                if (typeof value !== "number")
                    return false;
                // Check if we have enough of this symbol type to afford the hint
                return required !== undefined && required > 0 && value >= required;
            });
        });
        summary.hints = applicableHints.map((hint) => `${(0, hints_1.hintCostDisplayText)(hint)} - ${hint.description}`);
    }
    return {
        results: detailedResults,
        summary: summary,
    };
};
exports.roll = roll;
