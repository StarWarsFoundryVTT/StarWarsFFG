#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = exports.formatResult = void 0;
exports.parseDiceNotation = parseDiceNotation;
const dice_1 = require("./dice");
// import * as path from 'path';
function parseDiceNotation(input) {
    const pool = {
        boostDice: 0,
        abilityDice: 0,
        proficiencyDice: 0,
        setBackDice: 0,
        difficultyDice: 0,
        challengeDice: 0,
        forceDice: 0,
    };
    const warnings = [];
    const parts = input
        .toLowerCase()
        .trim()
        .split(" ")
        .filter((p) => p.length > 0);
    for (const part of parts) {
        // Check for modifiers (start with + or -)
        // Only treat as modifier if it has a known modifier suffix
        if (part.startsWith("+") || (part.startsWith("-") && part.length > 2)) {
            const isPositive = part.startsWith("+");
            const modPart = part.slice(1);
            const count = parseInt(modPart);
            if (isNaN(count)) {
                // If it starts with + but has no number, skip as invalid modifier
                if (part.startsWith("+")) {
                    warnings.push(`Invalid modifier notation: "${part}" - number not found`);
                    continue;
                }
                // Otherwise treat as regular dice notation (for negative numbers)
            }
            else {
                const modifier = modPart.slice(String(count).length).toLowerCase();
                // Check if this is actually a modifier (has a known suffix)
                const knownModifiers = [
                    "s",
                    "success",
                    "f",
                    "failure",
                    "a",
                    "advantage",
                    "t",
                    "threat",
                    "tr",
                    "triumph",
                    "d",
                    "despair",
                    "ls",
                    "lightside",
                    "ds",
                    "darkside",
                    "ua",
                    "upgradeability",
                    "ud",
                    "upgradedifficulty",
                    "dp",
                    "downgradeproficiency",
                    "dc",
                    "downgradechallenge",
                ];
                if (knownModifiers.includes(modifier)) {
                    const value = isPositive ? count : -count;
                    switch (modifier) {
                        // Automatic symbols
                        case "s":
                        case "success":
                            pool.automaticSuccesses = (pool.automaticSuccesses || 0) + value;
                            break;
                        case "f":
                        case "failure":
                            pool.automaticFailures = (pool.automaticFailures || 0) + value;
                            break;
                        case "a":
                        case "advantage":
                            pool.automaticAdvantages =
                                (pool.automaticAdvantages || 0) + value;
                            break;
                        case "t":
                        case "threat":
                            pool.automaticThreats = (pool.automaticThreats || 0) + value;
                            break;
                        case "tr":
                        case "triumph":
                            pool.automaticTriumphs = (pool.automaticTriumphs || 0) + value;
                            break;
                        case "d":
                        case "despair":
                            pool.automaticDespairs = (pool.automaticDespairs || 0) + value;
                            break;
                        case "ls":
                        case "lightside":
                            pool.automaticLightSide = (pool.automaticLightSide || 0) + value;
                            break;
                        case "ds":
                        case "darkside":
                            pool.automaticDarkSide = (pool.automaticDarkSide || 0) + value;
                            break;
                        // Upgrades and downgrades
                        case "ua":
                        case "upgradeability":
                            pool.upgradeAbility = (pool.upgradeAbility || 0) + value;
                            break;
                        case "ud":
                        case "upgradedifficulty":
                            pool.upgradeDifficulty = (pool.upgradeDifficulty || 0) + value;
                            break;
                        case "dp":
                        case "downgradeproficiency":
                            pool.downgradeProficiency =
                                (pool.downgradeProficiency || 0) + value;
                            break;
                        case "dc":
                        case "downgradechallenge":
                            pool.downgradeChallenge = (pool.downgradeChallenge || 0) + value;
                            break;
                    }
                    continue;
                }
                else if (part.startsWith("+")) {
                    // If it starts with + but has unknown suffix, warn and skip
                    warnings.push(`Invalid modifier type: "${modifier}" in "${part}"`);
                    continue;
                }
                // If it starts with - and has no known modifier suffix, treat as negative dice count
            }
        }
        const count = parseInt(part);
        // Check if parseInt returned NaN
        if (isNaN(count)) {
            warnings.push(`Invalid dice notation: "${part}" - number not found`);
            continue;
        }
        // Check for non-integer values
        if (part.includes(".") || part.includes(",")) {
            warnings.push(`Invalid dice notation: "${part}" - dice count must be a whole number`);
            continue;
        }
        const color = part.slice(String(count).length).toLowerCase();
        // Skip if no color specified
        if (!color) {
            warnings.push(`Invalid dice notation: "${part}" - no dice color specified`);
            continue;
        }
        let recognized = true;
        switch (color) {
            // y/pro = Yellow / Proficiency
            case "y":
                pool.proficiencyDice = count;
                break;
            case "pro":
                pool.proficiencyDice = count;
                break;
            // g/a = Green / Ability
            case "g":
                pool.abilityDice = count;
                break;
            case "a":
                pool.abilityDice = count;
                break;
            // b/boo = Blue / Boost
            case "b":
                pool.boostDice = count;
                break;
            case "boo":
                pool.boostDice = count;
                break;
            // r/c = Red / Challenge
            case "r":
                pool.challengeDice = count;
                break;
            case "c":
                pool.challengeDice = count;
                break;
            // p/diff = Purple / Difficulty
            case "p":
                pool.difficultyDice = count;
                break;
            case "diff":
                pool.difficultyDice = count;
                break;
            // blk/k/sb/s = Black / Setback
            case "blk":
                pool.setBackDice = count;
                break;
            case "k":
                pool.setBackDice = count;
                break;
            case "sb":
                pool.setBackDice = count;
                break;
            case "s":
                pool.setBackDice = count;
                break;
            // w/f = White / Force
            case "w":
                pool.forceDice = count;
                break;
            case "f":
                pool.forceDice = count;
                break;
            default:
                recognized = false;
                warnings.push(`Invalid dice color: "${color}" in "${part}"`);
        }
    }
    // Print warnings to stderr
    if (warnings.length > 0) {
        warnings.forEach((warning) => console.error(`Warning: ${warning}`));
    }
    return pool;
}
const formatResult = (result) => {
    const effects = [];
    if (result.summary.successes > 0)
        effects.push(`${result.summary.successes} Success(es)`);
    if (result.summary.failures > 0)
        effects.push(`${result.summary.failures} Failure(s)`);
    if (result.summary.advantages > 0)
        effects.push(`${result.summary.advantages} Advantage(s)`);
    if (result.summary.threats > 0)
        effects.push(`${result.summary.threats} Threat(s)`);
    if (result.summary.triumphs > 0)
        effects.push(`${result.summary.triumphs} Triumph(s)`);
    if (result.summary.despair > 0)
        effects.push(`${result.summary.despair} Despair(s)`);
    const resultText = effects.length > 0 ? effects.join(", ") : "No effects";
    if (result.summary.hints && result.summary.hints.length > 0) {
        return `${resultText}\n\nPossible actions:\n${result.summary.hints.map((hint) => " • " + hint).join("\n")}`;
    }
    return resultText;
};
exports.formatResult = formatResult;
const main = () => {
    const args = process.argv.slice(2);
    const hintsIndex = args.indexOf("--hints");
    const showHints = hintsIndex !== -1;
    const diceNotation = hintsIndex !== -1
        ? args.filter((_, index) => index !== hintsIndex).join(" ")
        : args.join(" ");
    if (!diceNotation.trim()) {
        console.log(`Usage: swrpg-dice <dice-notation> <dice-options>
      Example: swrpg-dice 2y 1g 1p 1b 1sb +2s +1a --hints
      
      Dice Options:
        - y/pro = Yellow / Proficiency
        - g/a = Green / Ability
        - b/boo = Blue / Boost
        - r/c = Red / Challenge
        - p/diff = Purple / Difficulty
        - blk/k/sb/s = Black / Setback
        - w/f = White/Force
      
      Modifiers (use + or - prefix):
        Automatic Symbols:
          - +Ns/success = Add N successes
          - +Nf/failure = Add N failures
          - +Na/advantage = Add N advantages
          - +Nt/threat = Add N threats
          - +Ntr/triumph = Add N triumphs
          - +Nd/despair = Add N despairs
        
        Dice Upgrades/Downgrades:
          - +Nua = Upgrade N ability dice to proficiency
          - +Nud = Upgrade N difficulty dice to challenge
          - +Ndp = Downgrade N proficiency dice to ability
          - +Ndc = Downgrade N challenge dice to difficulty
      
      Options:
        --hints  Show possible actions based on roll results`);
        process.exit(1);
    }
    const pool = parseDiceNotation(diceNotation);
    // Check if the pool is empty (all zeros) which might indicate invalid input
    const hasAnyDice = Object.values(pool).some((count) => count > 0);
    if (!hasAnyDice) {
        console.error("\nError: No valid dice found in the notation.");
        console.error("Please check your input and ensure it follows the format: <count><color>");
        console.error("Example: '2y 1g' for 2 yellow and 1 green dice\n");
        process.exit(1);
    }
    const result = (0, dice_1.roll)(pool, { hints: showHints });
    console.log((0, exports.formatResult)(result));
};
exports.main = main;
if (require.main === module) {
    (0, exports.main)();
}
