import { itemstatus } from "./config/ffg-itemstatus.js";
import { personal_ranges, configureVehicleRange, sensor_ranges } from "./config/ffg-ranges.js";
import {
  vehicle_modifiers,
  modifier_types,
  allModifiersMap,
  allModifiersTypes,
} from "./config/ffg-modifiers.js";
import { pool_results, configureDice } from "./config/ffg-dice.js";
import { vehicle_stats, vehicle_firingarcs } from "./config/ffg-vehicles.js";
import {character_characteristics, character_stats, rival_stats} from "./config/ffg-characters.js";
import { skills, skills_knowledge_stripped, skills_combat } from "./config/ffg-skills.js";
import { sheet_defaults } from "./config/ffg-sheetdefaults.js";
import { weapon_stats } from "./config/ffg-weapons.js";
import { armor_stats } from "./config/ffg-armor.js";
import { talent_activations } from "./config/ffg-talents.js";
import { difficulty } from "./config/ffg-difficulty.js";

export const FFG = {};

FFG.activations = talent_activations;
FFG.character_stats = character_stats;
FFG.rival_stats = rival_stats;
FFG.characteristics = character_characteristics;
FFG.combat_skills = skills_combat;
FFG.diceresults = pool_results;
FFG.difficulty = difficulty;
FFG.fire_arcs = vehicle_firingarcs;
FFG.itemstatus = itemstatus;
FFG.ranges = personal_ranges;
FFG.sensor_ranges = sensor_ranges;
FFG.sheets = sheet_defaults;
FFG.skills = skills;
FFG.skills_knowledgestripped = skills_knowledge_stripped;
FFG.vehicle_mod_types = vehicle_modifiers;
FFG.configureVehicleRange = configureVehicleRange;
FFG.vehicle_stats = vehicle_stats;
FFG.weapon_stats = weapon_stats;
FFG.itemmodifier_types = modifier_types;
FFG.armor_stats = armor_stats;
FFG.allowableModifierTypes = allModifiersTypes;
FFG.allowableModifierChoices = allModifiersMap;
FFG.configureDice = configureDice;
