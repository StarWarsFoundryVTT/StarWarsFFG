export const FFG = {};

FFG.characteristics = {
  "Brawn": {
    value: "Brawn",
    label: "SWFFG.CharacteristicBrawn",
    abrev: "SWFFG.CharacteristicBrawnAbbreviation",
  },
  "Agility": {
    value: "Agility",
    label: "SWFFG.CharacteristicAgility",
    abrev: "SWFFG.CharacteristicAgilityAbbreviation",
  },
  "Intellect": {
    value: "Intellect",
    label: "SWFFG.CharacteristicIntellect",
    abrev: "SWFFG.CharacteristicIntellectAbbreviation",
  },
  "Cunning": {
    value: "Cunning",
    label: "SWFFG.CharacteristicCunning",
    abrev: "SWFFG.CharacteristicCunningAbbreviation",
  },
  "Willpower": {
    value: "Willpower",
    label: "SWFFG.CharacteristicWillpower",
    abrev: "SWFFG.CharacteristicWillpowerAbbreviation",
  },
  "Presence": {
    value: "Presence",
    label: "SWFFG.CharacteristicPresence",
    abrev: "SWFFG.CharacteristicPresenceAbbreviation",
  },
};

FFG.character_stats = {
  "wounds": {
    value: "Wounds",
    label: "SWFFG.Wounds",
  },
  "strain": {
    value: "Strain",
    label: "SWFFG.Strain",
  },
  "soak": {
    value: "Soak",
    label: "SWFFG.Soak",
  },
  "defence": {
    value: "Defence",
    label: "SWFFG.Defense",
  },
  "encumbrance": {
    value: "Encumbrance",
    label: "SWFFG.Encumbrance",
  },
  "forcePool": {
    value: "ForcePool",
    label: "SWFFG.ForcePool",
  },
  "credits": {
    value: "Credits",
    label: "SWFFG.DescriptionCredits",
  },
};

FFG.skills = {
  "Astrogation": { value: "Astrogation", label: "SWFFG.SkillsNameAstrogation" },
  "Athletics ": { value: "Athletics", label: "SWFFG.SkillsNameAthletics" },
  "Brawl": { value: "Brawl", label: "SWFFG.SkillsNameBrawl" },
  "Charm": { value: "Charm", label: "SWFFG.SkillsNameCharm" },
  "Coercion": { value: "Coercion", label: "SWFFG.SkillsNameCoercion" },
  "Computers": { value: "Computers", label: "SWFFG.SkillsNameComputers" },
  "Cool": { value: "Cool", label: "SWFFG.SkillsNameCool" },
  "Coordination": { value: "Coordination", label: "SWFFG.SkillsNameCoordination" },
  "Deception": { value: "Deception", label: "SWFFG.SkillsNameDeception" },
  "Discipline": { value: "Discipline", label: "SWFFG.SkillsNameDiscipline" },
  "Gunnery": { value: "Gunnery", label: "SWFFG.SkillsNameGunnery" },
  "Knowledge: Core Worlds": { value: "Knowledge: Core Worlds", label: "SWFFG.SkillsNameKnowledgeCoreWorlds" },
  "Knowledge: Education": { value: "Knowledge: Education", label: "SWFFG.SkillsNameKnowledgeEducation" },
  "Knowledge: Lore": { value: "Knowledge: Lore", label: "SWFFG.SkillsNameKnowledgeLore" },
  "Knowledge: Outer Rim": { value: "Knowledge: Outer Rim", label: "SWFFG.SkillsNameKnowledgeOuterRim" },
  "Knowledge: Underworld": { value: "Knowledge: Underworld", label: "SWFFG.SkillsNameKnowledgeUnderworld" },
  "Knowledge: Warfare": { value: "Knowledge: Warfare", label: "SWFFG.SkillsNameKnowledgeWarfare" },
  "Knowledge: Xenology": { value: "Knowledge: Xenology", label: "SWFFG.SkillsNameKnowledgeXenology" },
  "Leadership": { value: "Leadership", label: "SWFFG.SkillsNameLeadership" },
  "Lightsaber": { value: "Lightsaber", label: "SWFFG.SkillsNameLightsaber" },
  "Mechanics": { value: "Mechanics", label: "SWFFG.SkillsNameMechanics" },
  "Medicine": { value: "Medicine", label: "SWFFG.SkillsNameMedicine" },
  "Melee": { value: "Melee", label: "SWFFG.SkillsNameMelee" },
  "Negotiation": { value: "Negotiation", label: "SWFFG.SkillsNameNegotiation" },
  "Perception": { value: "Perception", label: "SWFFG.SkillsNamePerception" },
  "Piloting: Planetary": { value: "Piloting: Planetary", label: "SWFFG.SkillsNamePilotingPlanetary" },
  "Piloting: Space": { value: "Piloting: Space", label: "SWFFG.SkillsNamePilotingSpace" },
  "Ranged: Heavy": { value: "Ranged: Heavy", label: "SWFFG.SkillsNameRangedHeavy" },
  "Ranged: Light": { value: "Ranged: Light", label: "SWFFG.SkillsNameRangedLight" },
  "Resilience": { value: "Resilience", label: "SWFFG.SkillsNameResilience" },
  "Skulduggery": { value: "Skulduggery", label: "SWFFG.SkillsNameSkulduggery" },
  "Stealth": { value: "Stealth", label: "SWFFG.SkillsNameStealth" },
  "Streetwise": { value: "Streetwise", label: "SWFFG.SkillsNameStreetwise" },
  "Survival": { value: "Survival", label: "SWFFG.Survival" },
  "Vigilance": { value: "Vigilance", label: "SWFFG.SkillsNameVigilance" },
};

FFG.skills_knowledgestripped = {
  "Knowledge: Core Worlds": "SWFFG.SkillsNameKnowledgeCoreWorldsStripped",
  "Knowledge: Education": "SWFFG.SkillsNameKnowledgeEducationStripped",
  "Knowledge: Lore": "SWFFG.SkillsNameKnowledgeLoreStripped",
  "Knowledge: Outer Rim": "SWFFG.SkillsNameKnowledgeOuterRimStripped",
  "Knowledge: Underworld": "SWFFG.SkillsNameKnowledgeUnderworldStripped",
  "Knowledge: Warfare": "SWFFG.SkillsNameKnowledgeWarfareStripped",
  "Knowledge: Xenology": "SWFFG.SkillsNameKnowledgeXenologyStripped",
};

FFG.ranges = {
  "Engaged": {
    value: "Engaged",
    label: "SWFFG:WeaponRangeEngaged",
  },
  "Short": {
    value: "Short",
    label: "SWFFG:WeaponRangeShort",
  },
  "Medium": {
    value: "Medium",
    label: "SWFFG:WeaponRangeMedium",
  },
  "Long": {
    value: "Long",
    label: "SWFFG:WeaponRangeLong",
  },
  "Extreme": {
    value: "Extreme",
    label: "SWFFG:WeaponRangeExtreme",
  },
};

FFG.vehicle_ranges = {
  "Close": {
    value: "Close",
    label: "SWFFG:VehicleRangeClose",
  },
  "Short": {
    value: "Short",
    label: "SWFFG:VehicleRangeShort",
  },
  "Medium": {
    value: "Medium",
    label: "SWFFG:VehicleRangeMedium",
  },
  "Long": {
    value: "Long",
    label: "SWFFG:VehicleRangeLong",
  },
  "Extreme": {
    value: "Extreme",
    label: "SWFFG:VehicleRangeExtreme",
  },
};

FFG.sensor_ranges = {
  "None": {
    value: "None",
    label: "SWFFG:VehicleRangeNone",
  },
  "Close": {
    value: "Close",
    label: "SWFFG:VehicleRangeClose",
  },
  "Short": {
    value: "Short",
    label: "SWFFG:VehicleRangeShort",
  },
  "Medium": {
    value: "Medium",
    label: "SWFFG:VehicleRangeMedium",
  },
  "Long": {
    value: "Long",
    label: "SWFFG:VehicleRangeLong",
  },
  "Extreme": {
    value: "Extreme",
    label: "SWFFG:VehicleRangeExtreme",
  },
};

FFG.fire_arcs = {
  "Forward": {
    value: "Forward",
    label: "SWFFG:VehicleFiringArcForward",
  },
  "Aft": {
    value: "Aft",
    label: "SWFFG:VehicleFiringArcAft",
  },
  "Port": {
    value: "Port",
    label: "SWFFG:VehicleFiringArcPort",
  },
  "Starboard": {
    value: "Starboard",
    label: "SWFFG:VehicleFiringArcStarboard",
  },
  "Dorsal": {
    value: "Dorsal",
    label: "SWFFG:VehicleFiringArcDorsal",
  },
  "Ventral": {
    value: "Ventral",
    label: "SWFFG:VehicleFiringArcVentral",
  },
  "All": {
    value: "All",
    label: "SWFFG:VehicleFiringArcAll",
  },
};

FFG.combat_skills = {
  "Brawl": {
    value: "Brawl",
    label: "SWFFG.SkillsNameBrawl",
  },
  "Gunnery": {
    value: "Gunnery",
    label: "SWFFG.SkillsNameGunnery",
  },
  "Lightsaber": {
    value: "Lightsaber",
    label: "SWFFG.SkillsNameLightsaber",
  },
  "Melee": {
    value: "Melee",
    label: "SWFFG.SkillsNameMelee",
  },
  "Ranged: Light": {
    value: "Ranged: Light",
    label: "SWFFG.SkillsNameRangedLight",
  },
  "Ranged: Heavy": {
    value: "Ranged: Heavy",
    label: "SWFFG.SkillsNameRangedHeavy",
  },
};

FFG.combat_skills_abrev = {
  "Brawl": "SWFFG.SkillsNameBrawlAbbreviation",
  "Gunnery": "SWFFG.SkillsNameGunneryAbbreviation",
  "Lightsaber": "SWFFG.SkillsNameLightsaberAbbreviation",
  "Melee": "SWFFG.SkillsNameMeleeAbbreviation",
  "Ranged: Light": "SWFFG.SkillsNameRangedLightAbbreviation",
  "Ranged: Heavy": "SWFFG.SkillsNameRangedHeavyAbbreviation",
};

FFG.activations = {
  "Passive": "Passive",
  "Active (Incidental)": "Active (Incidental)",
  "Active (Incidental, Out of Turn)": "Active (Incidental, Out of Turn)",
  "Active (Action)": "Active (Action)",
  "Active (Maneuver)": "Active (Maneuver)",
};

FFG.mod_types = ["Characteristic", "Skill Rank", "Skill Boost", "Stat"];

FFG.species = {};

FFG.careers = {};

FFG.specialisations = {};
