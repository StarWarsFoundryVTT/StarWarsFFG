"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hints = void 0;
exports.hintCostDisplayText = hintCostDisplayText;
const types_1 = require("./types");
// 1 advantage or 1 triumph
const recoverOneStrain = "Recover one strain (may be applied more than once).";
const addBoostDieToActiveAlly = "Add a boost die to the next allied active character's check.";
const noticeImportantPoint = "Notice a single important point in the ongoing conflict, such as the location of a blast door's control panel or a weak point on an attack speeder.";
const inflictCriticalInjury = "Inflict a Critical Injury with a successful attack that deals damage past soak (Advantage cost may vary).";
const activateWeaponQuality = "Activate a weapon quality (Advantage cost may vary).";
// 2 advantage or 1 triumph
const performManeuver = "Perform an immediate free maneuver that does not exceed the two maneuver per turn limit.";
const addSetbackDie = "Add a setback die to the targeted character's next check.";
const addBoostDieToAnyAlly = "Add a boost die to any allied character's next check, including that of the active character.";
// 3 advantage or 1 triumph
const negateEnemy = "Negate the targeted enemy's defensive bonuses (such as the defense gained from cover, equipment, or performing the Guarded Stance maneuver) util the end of the current round.";
const ignoreEnvironment = "Ignore penalizing environmental effects such as inclement weather, zero gravity, or similar circumstances until the end of the active character's next turn.";
const disableOpponent = "When dealing damage to a target, have the attack disable the opponent or one piece of gear rather than dealing wounds or strain. This could include hobbling them temporarily with a shot to the leg, or disabling their comlink. This should be agreed upon by the player and the GM, and the effects are up to the GM (although Table 6-10: Critical Injury Result is a god resource to consult for possible effects). The effects should be temporary and not too excessive.";
const gainDefense = "Gain + 1 melee or ranged defense until the end of the active character's next turn.";
const dropWeapon = "Force the target to drop a melee or ranged weapon they are wielding.";
// 1 triumph
const upgradeDifficultyTargetedCharacter = "Upgrade the difficulty of the targeted character's next check.";
const doSomethingVital = "Do something vital, such as shooting the controls to the nearby blast doors to seal them shut.";
const upgradeAnyAllyCheck = "Upgrade any allied character's next check, including that of the current active character.";
// 2 triumph
const destroyEquipment = "When dealing damage to a target, have the attack destroy a piece of equipment the target is using, such as blowing up his blaster or destroying a personal shield generator.";
// 1 threat or 1 despair
const sufferStrain = "The active character suffers 1 strain.";
const loseManeuverBenefit = "The active character loses the benefits of a prior maneuver (such as from taking cover or assuming a Guarded Stance) until they perform the maneuver again.";
// 2 threat or 1 despair
const freeManeuver = "An opponent may immediately perform one free maneuver in response to the active character's check.";
const addBoostDieToTargetedCharacter = "Add a boost die to the targeted character's next check.";
const sufferSetback = "The active character or an allied character suffers a setback die on their next action.";
// 3 threat or 1 despair
const fallProne = "The active character falls prone.";
const gainSignificantAdvantage = "The active character grants the enemy a significant advantage in the ongoing encounter, such as accidentally blasting the controls to a bridge the active character was planning to use for their escape.";
// 1 despair
const outOfAmmo = "The character's ranged weapon imediately runs out of ammunition and may not be used for the remainder of the encounter.";
const upgradeDifficultyAlliedCharacter = "Upgrade the difficulty of an allied character's next check, including that of the current active character.";
const damagedItem = "The tool or melee weapon the character is using becomes damaged.";
exports.hints = [
    // 1 advantage or 1 triumph
    {
        description: recoverOneStrain,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 1,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    {
        description: addBoostDieToActiveAlly,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 1,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    {
        description: noticeImportantPoint,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 1,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    {
        description: inflictCriticalInjury,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 1,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    {
        description: activateWeaponQuality,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 1,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    // 2 advantage or 1 triumph
    {
        description: performManeuver,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 2,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    {
        description: addSetbackDie,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 2,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    {
        description: addBoostDieToAnyAlly,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 2,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    // 3 advantage or 1 triumph
    {
        description: negateEnemy,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 3,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    {
        description: ignoreEnvironment,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 3,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    {
        description: disableOpponent,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 3,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    {
        description: gainDefense,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 3,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    {
        description: dropWeapon,
        cost: {
            [types_1.SYMBOLS.ADVANTAGE]: 3,
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    // 1 triumph
    {
        description: upgradeDifficultyTargetedCharacter,
        cost: {
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    {
        description: doSomethingVital,
        cost: {
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    {
        description: upgradeAnyAllyCheck,
        cost: {
            [types_1.SYMBOLS.TRIUMPH]: 1,
        },
    },
    // 2 triumph
    {
        description: destroyEquipment,
        cost: {
            [types_1.SYMBOLS.TRIUMPH]: 2,
        },
    },
    // 1 threat or 1 despair
    {
        description: sufferStrain,
        cost: {
            [types_1.SYMBOLS.THREAT]: 1,
            [types_1.SYMBOLS.DESPAIR]: 1,
        },
    },
    {
        description: loseManeuverBenefit,
        cost: {
            [types_1.SYMBOLS.THREAT]: 1,
            [types_1.SYMBOLS.DESPAIR]: 1,
        },
    },
    // 2 threat or 1 despair
    {
        description: freeManeuver,
        cost: {
            [types_1.SYMBOLS.THREAT]: 2,
            [types_1.SYMBOLS.DESPAIR]: 1,
        },
    },
    {
        description: addBoostDieToTargetedCharacter,
        cost: {
            [types_1.SYMBOLS.THREAT]: 1,
            [types_1.SYMBOLS.DESPAIR]: 1,
        },
    },
    {
        description: sufferSetback,
        cost: {
            [types_1.SYMBOLS.THREAT]: 2,
            [types_1.SYMBOLS.DESPAIR]: 1,
        },
    },
    // 3 threat or 1 despair
    {
        description: fallProne,
        cost: {
            [types_1.SYMBOLS.THREAT]: 3,
            [types_1.SYMBOLS.DESPAIR]: 1,
        },
    },
    {
        description: gainSignificantAdvantage,
        cost: {
            [types_1.SYMBOLS.THREAT]: 3,
            [types_1.SYMBOLS.DESPAIR]: 1,
        },
    },
    // 1 despair
    {
        description: outOfAmmo,
        cost: {
            [types_1.SYMBOLS.DESPAIR]: 1,
        },
    },
    {
        description: upgradeDifficultyAlliedCharacter,
        cost: {
            [types_1.SYMBOLS.DESPAIR]: 1,
        },
    },
    {
        description: damagedItem,
        cost: {
            [types_1.SYMBOLS.DESPAIR]: 1,
        },
    },
];
function hintCostDisplayText(hint) {
    if (!hint.cost || Object.keys(hint.cost).length === 0) {
        return "No cost";
    }
    const parts = Object.entries(hint.cost)
        .filter(([_, count]) => count && count > 0)
        .map(([symbol, count]) => {
        const symbolName = symbol.charAt(0).toUpperCase() + symbol.toLowerCase().slice(1);
        const plural = count > 1 ? "s" : "";
        return `${count} ${symbolName}${plural}`;
    });
    // Use "OR" in uppercase for clarity when multiple options exist
    if (parts.length > 1) {
        return parts.join(" OR ");
    }
    return parts.length > 0 ? parts[0] : "No cost";
}
