"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roll = exports.DEFAULT_MAX_TOTAL_DICE = exports.DEFAULT_MAX_DICE_PER_TYPE = void 0;
const hints_1 = require("./hints");
// Default dice limits for performance and security
exports.DEFAULT_MAX_DICE_PER_TYPE = 100;
exports.DEFAULT_MAX_TOTAL_DICE = 500;
const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;
const boostDieResult = (roll) => {
    switch (roll) {
        case 3:
            return {
                successes: 1,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 4:
            return {
                successes: 1,
                failures: 0,
                advantages: 1,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 5:
            return {
                successes: 0,
                failures: 0,
                advantages: 2,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 6:
            return {
                successes: 0,
                failures: 0,
                advantages: 1,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        default:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
    }
};
const setBackDieResult = (roll) => {
    switch (roll) {
        case 3:
        case 4:
            return {
                successes: 0,
                failures: 1,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 5:
        case 6:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 1,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        default:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
    }
};
const abilityDieResult = (roll) => {
    switch (roll) {
        case 2:
        case 3:
            return {
                successes: 1,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 4:
            return {
                successes: 2,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 5:
        case 6:
            return {
                successes: 0,
                failures: 0,
                advantages: 1,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 7:
            return {
                successes: 1,
                failures: 0,
                advantages: 1,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 8:
            return {
                successes: 0,
                failures: 0,
                advantages: 2,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        default:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
    }
};
const difficultyDieResult = (roll) => {
    switch (roll) {
        case 2:
            return {
                successes: 0,
                failures: 1,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 3:
            return {
                successes: 0,
                failures: 2,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 4:
        case 5:
        case 6:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 1,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 7:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 2,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 8:
            return {
                successes: 0,
                failures: 1,
                advantages: 0,
                threats: 1,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        default:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
    }
};
const proficiencyDieResult = (roll) => {
    switch (roll) {
        case 2:
        case 3:
            return {
                successes: 1,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 4:
        case 5:
            return {
                successes: 2,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 6:
            return {
                successes: 0,
                failures: 0,
                advantages: 1,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 7:
        case 8:
        case 9:
            return {
                successes: 1,
                failures: 0,
                advantages: 1,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 10:
        case 11:
            return {
                successes: 0,
                failures: 0,
                advantages: 2,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 12:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 1,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        default:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
    }
};
const challengeDieResult = (roll) => {
    switch (roll) {
        case 2:
        case 3:
            return {
                successes: 0,
                failures: 1,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 4:
        case 5:
            return {
                successes: 0,
                failures: 2,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 6:
        case 7:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 1,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 8:
        case 9:
            return {
                successes: 0,
                failures: 1,
                advantages: 0,
                threats: 1,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 10:
        case 11:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 2,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
        case 12:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 1,
                lightSide: 0,
                darkSide: 0,
            };
        default:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
    }
};
const forceDieResult = (roll) => {
    switch (roll) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 1,
                darkSide: 0,
            };
        case 6:
        case 7:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 2,
                darkSide: 0,
            };
        case 8:
        case 9:
        case 10:
        case 11:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 1,
            };
        case 12:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 2,
            };
        default:
            return {
                successes: 0,
                failures: 0,
                advantages: 0,
                threats: 0,
                triumphs: 0,
                despair: 0,
                lightSide: 0,
                darkSide: 0,
            };
    }
};
const sumResults = (results, options) => {
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
        successes: 0,
        failures: 0,
        advantages: 0,
        threats: 0,
        triumphs: 0,
        despair: 0,
        lightSide: 0,
        darkSide: 0,
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
    const result = {
        successes: netSuccesses,
        failures: netFailures,
        advantages: sums.advantages,
        threats: sums.threats,
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
    const boostCount = (_a = pool.boostDice) !== null && _a !== void 0 ? _a : 0;
    const abilityCount = (_b = pool.abilityDice) !== null && _b !== void 0 ? _b : 0;
    const proficiencyCount = (_c = pool.proficiencyDice) !== null && _c !== void 0 ? _c : 0;
    const setBackCount = (_d = pool.setBackDice) !== null && _d !== void 0 ? _d : 0;
    const difficultyCount = (_e = pool.difficultyDice) !== null && _e !== void 0 ? _e : 0;
    const challengeCount = (_f = pool.challengeDice) !== null && _f !== void 0 ? _f : 0;
    const forceCount = (_g = pool.forceDice) !== null && _g !== void 0 ? _g : 0;
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
    const summary = sumResults(detailedResults.map((r) => r.result));
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
