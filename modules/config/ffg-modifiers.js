import {weapon_stats} from "./ffg-weapons.js";
import {armor_stats} from "./ffg-armor.js";
import {vehicle_stats} from "./ffg-vehicles.js";
import {character_characteristics, character_stats} from "./ffg-characters.js";
import {skills} from "./ffg-skills.js";

export const vehicle_modifiers = {
  "Vehicle Stat": {
    "value": "Vehicle Stat",
    "label": "SWFFG.ModTypeStatVehicle",
  },
};

export const modifier_types = {
  "All": {
    "value": "all",
    "label": "SWFFG.ModTypeAll",
  },
  "Armor": {
    "value": "armour",
    "label": "SWFFG.ItemsArmor",
  },
  "Vehicle": {
    "value": "vehicle",
    "label": "SWFFG.ItemsVehicles",
  },
  "Weapon": {
    "value": "weapon",
    "label": "SWFFG.ItemsWeapons",
  },
};

export const itemmodifier_rollmodifiers = {
  "Add Boost": {
    "value": "Add Boost",
    "label": "SWFFG.ModTypeAddBoost",
  },
  "Add Setback": {
    "value": "Add Setback",
    "label": "SWFFG.ModTypeAddSetback",
  },
  "Remove Setback": {
    "value": "Remove Setback",
    "label": "SWFFG.ModTypeRemSetback",
  },
};

export const itemmodifier_dicemodifiers = {
  "Add Difficulty": {
    "value": "Add Difficulty",
    "label": "SWFFG.ModTypeAddDifficulty",
  },
  "Upgrade Difficulty": {
    "value": "Upgrade Difficulty",
    "label": "SWFFG.ModTypeUpgradeDifficulty",
  },
  "Downgrade Difficulty": {
    "value": "Downgrade Difficulty",
    "label": "SWFFG.ModTypeDowngradeDifficulty",
  },
  "Upgrade Ability": {
    "value": "Upgrade Ability",
    "label": "SWFFG.ModTypeUpgradeAbility",
  },
  "Downgrade Ability": {
    "value": "Downgrade Ability",
    "label": "SWFFG.ModTypeDowngradeAbility",
  },
};

export const itemmodifier_resultmodifiers = {
  "Add Advantage": {
    "value": "Add Advantage",
    "label": "SWFFG.ModTypeAddAdvantage",
  },
  "Add Success": {
    "value": "Add Success",
    "label": "SWFFG.ModTypeAddSuccess",
  },
  "Add Threat": {
    "value": "Add Threat",
    "label": "SWFFG.ModTypeAddThreat",
  },
  "Add Failure": {
    "value": "Add Failure",
    "label": "SWFFG.ModTypeAddFailure",
  },
  "Add Light": {
    "value": "Add Light",
    "label": "SWFFG.ModTypeAddLight",
  },
  "Add Dark": {
    "value": "Add Dark",
    "label": "SWFFG.ModTypeAddDark",
  },
  "Add Triumph": {
    "value": "Add Triumph",
    "label": "SWFFG.ModTypeAddTriumph",
  },
  "Add Despair": {
    "value": "Add Despair",
    "label": "SWFFG.ModTypeAddDespair",
  },
};


/**
 * Used for the "modifier type" selector for modifiers
 */
export const allModifiersTypes = {
  "Stat All": {
    "value": "Stat All",
    "label": "SWFFG.ModTypeStatAll",
  },
  "Stat": {
    "value": "Stat",
    "label": "SWFFG.ModTypeStat",
  },
  "Characteristic": {
    "value": "Characteristic",
    "label": "SWFFG.ModTypeCharacteristic",
  },
  "Career Skill": {
    "value": "Career Skill",
    "label": "SWFFG.ModTypeCareerSkill",
  },
  "Force Boost": {
    "value": "Force Boost",
    "label": "SWFFG.ModTypeSkillForceBoost",
  },
  "Skill Add Advantage": {
    "value": "Skill Add Advantage",
    "label": "SWFFG.ModTypeSkillAddAdvantage",
  },
  "Skill Add Dark": {
    "value": "Skill Add Dark",
    "label": "SWFFG.ModTypeSkillAddDark",
  },
  "Skill Add Despair": {
    "value": "Skill Add Despair",
    "label": "SWFFG.ModTypeSkillAddDespair",
  },
  "Skill Add Failure": {
    "value": "Skill Add Failure",
    "label": "SWFFG.ModTypeSkillAddFailure",
  },
  "Skill Add Light": {
    "value": "Skill Add Light",
    "label": "SWFFG.ModTypeSkillAddLight",
  },
  "Skill Add Success": {
    "value": "Skill Add Success",
    "label": "SWFFG.ModTypeSkillAddSuccess",
  },
  "Skill Add Threat": {
    "value": "Skill Add Threat",
    "label": "SWFFG.ModTypeSkillAddThreat",
  },
  "Skill Add Triumph": {
    "value": "Skill Add Triumph",
    "label": "SWFFG.ModTypeSkillAddTriumph",
  },
  "Skill Add Upgrade": {
    "value": "Skill Add Upgrade",
    "label": "SWFFG.ModTypeSkillAddUpgrade",
  },
  "Skill Boost": {
    "value": "Skill Boost",
    "label": "SWFFG.ModTypeSkillBoost",
  },
  "Skill Rank": {
    "value": "Skill Rank",
    "label": "SWFFG.ModTypeSkillRank",
  },
  "Skill Remove Setback": {
    "value": "Skill Remove Setback",
    "label": "SWFFG.ModTypeSkillRemoveSetback",
  },
  "Skill Setback": {
    "value": "Skill Setback",
    "label": "SWFFG.ModTypeSkillSetback",
  },
  "Weapon Stat": {
    "value": "Weapon Stat",
    "label": "SWFFG.ModTypeStatWeapon",
  },
  "Armor Stat": {
    "value": "Armor Stat",
    "label": "SWFFG.ModTypeStatArmor",
  },
  "Vehicle Stat": {
    "value": "Vehicle Stat",
    "label": "SWFFG.ModTypeStatVehicle",
  },
}

/**
 * Used for the "modifier" selector of modifiers
 */
export const allModifiersMap = {
  "Weapon Stat": foundry.utils.duplicate(weapon_stats),
  "Armor Stat": foundry.utils.duplicate(armor_stats),
  "Vehicle Stat": foundry.utils.duplicate(vehicle_stats),
  "Stat All": Object.assign(foundry.utils.duplicate(character_stats), foundry.utils.duplicate(vehicle_stats), foundry.utils.duplicate(armor_stats), foundry.utils.duplicate(weapon_stats)),
  "Stat": character_stats,
  "Result Modifiers": foundry.utils.duplicate(itemmodifier_resultmodifiers),
  "Dice Modifiers": foundry.utils.duplicate(itemmodifier_dicemodifiers),
  "Roll Modifiers": foundry.utils.duplicate(itemmodifier_rollmodifiers),
  "Characteristic": foundry.utils.duplicate(character_characteristics),
  "Career Skill": foundry.utils.duplicate(skills),
  "Force Boost": foundry.utils.duplicate(skills),
  "Skill Add Advantage": foundry.utils.duplicate(skills),
  "Skill Add Dark": foundry.utils.duplicate(skills),
  "Skill Add Despair": foundry.utils.duplicate(skills),
  "Skill Add Failure": foundry.utils.duplicate(skills),
  "Skill Add Light": foundry.utils.duplicate(skills),
  "Skill Add Success": foundry.utils.duplicate(skills),
  "Skill Add Threat": foundry.utils.duplicate(skills),
  "Skill Add Triumph": foundry.utils.duplicate(skills),
  "Skill Add Upgrade": foundry.utils.duplicate(skills),
  "Skill Boost": foundry.utils.duplicate(skills),
  "Skill Rank": foundry.utils.duplicate(skills),
  "Skill Remove Setback": foundry.utils.duplicate(skills),
  "Skill Setback": foundry.utils.duplicate(skills),
}
