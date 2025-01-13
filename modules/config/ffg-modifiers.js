import {weapon_stats} from "./ffg-weapons.js";
import {armor_stats} from "./ffg-armor.js";
import {vehicle_stats} from "./ffg-vehicles.js";
import {character_characteristics, character_stats} from "./ffg-characters.js";
import {skills} from "./ffg-skills.js";

export const general_modifiers = {
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
  "Stat": {
    "value": "Stat",
    "label": "SWFFG.ModTypeStat",
  },
};

export const weapon_modifiers = {
  "Result Modifiers": {
    "value": "Result Modifiers",
    "label": "SWFFG.ModTypeResultModifiers",
  },
  "Dice Modifiers": {
    "value": "Dice Modifiers",
    "label": "SWFFG.ModTypeDiceModifiers",
  },
  "Roll Modifiers": {
    "value": "Roll Modifiers",
    "label": "SWFFG.ModTypeRollModifiers",
  },
  "Weapon Stat": {
    "value": "Weapon Stat",
    "label": "SWFFG.ModTypeStatWeapon",
  },
};

export const vehicle_modifiers = {
  "Stat": {
    "value": "Stat",
    "label": "SWFFG.ModTypeStat",
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

export const itemmodifier_modifiertypes = {
  "Result Modifiers": {
    "value": "Result Modifiers",
    "label": "SWFFG.ModTypeResultModifiers",
  },
  "Dice Modifiers": {
    "value": "Dice Modifiers",
    "label": "SWFFG.ModTypeDiceModifiers",
  },
  "Roll Modifiers": {
    "value": "Roll Modifiers",
    "label": "SWFFG.ModTypeRollModifiers",
  },
  "Weapon Stat": {
    "value": "Weapon Stat",
    "label": "SWFFG.ModTypeStatWeapon",
  }, //-> Damage, Crit, Encum, HP, Rarity, Price, Range,
  "Armor Stat": {
    "value": "Armor Stat",
    "label": "SWFFG.ModTypeStatArmor",
  }, //-> Def, Soak, Encum, HP, Rarity, Price
  "Vehicle Stat": {
    "value": "Vehicle Stat",
    "label": "SWFFG.ModTypeStatVehicle",
  },
  "Stat": {
    "value": "Stat",
    "label": "SWFFG.ModTypeStat",
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

export const modTypeToModMap = {
  "Weapon Stat": weapon_stats,
  "Armor Stat": armor_stats,
  "Vehicle Stat": vehicle_stats,
  "Stat": character_stats,
  "Result Modifiers": itemmodifier_resultmodifiers,
  "Dice Modifiers": itemmodifier_dicemodifiers,
  "Roll Modifiers": itemmodifier_rollmodifiers,
  // TODO: decide if these should be kept in the map or redone
  "Characteristic": character_characteristics,
  "Career Skill": skills,
  "Force Boost": skills,
  "Skill Add Advantage": skills,
  "Skill Add Dark": skills,
  "Skill Add Despair": skills,
  "Skill Add Failure": skills,
  "Skill Add Light": skills,
  "Skill Add Success": skills,
  "Skill Add Threat": skills,
  "Skill Add Triumph": skills,
  "Skill Add Upgrade": skills,
  "Skill Boost": skills,
  "Skill Rank": skills,
  "Skill Remove Setback": skills,
  "Skill Setback": skills,
};

export const itemTypeToModTypeMap = {
  "weapon": weapon_modifiers,
  "armor": armor_stats,
  "armour": armor_stats,
  "vehicle": vehicle_stats,
  "all": general_modifiers,
}
