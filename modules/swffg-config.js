export const FFG = {};

FFG.characteristics = {
  "Brawn": "Brawn",
  "Agility": "Agility",
  "Intellect": "Intellect",
  "Cunning": "Cunning",
  "Willpower": "Willpower",
  "Presence": "Presence",
};

FFG.character_stats = {
  "wounds": "Wounds",
  "strain": "Strain",
  "soak": "Soak",
  "defence": "Defence",
  "encumbrance": "Encumbrance",
  "forcePool": "Force Pool",
  "credits": "Credits",
};

FFG.skills = {
  "Brawl": "Brawl",
  "Gunnery": "Gunnery",
  "Lightsaber": "Lightsaber",
  "Melee": "Melee",
  "Ranged: Light": "Ranged: Light",
  "Ranged: Heavy": "Ranged: Heavy",
  "Astrogation": "Astrogation",
  "Athletics ": "Athletics",
  "Charm": "Charm",
  "Coercion": "Coercion",
  "Computers": "Computers",
  "Cool": "Cool",
  "Coordination": "Coordination",
  "Deception": "Deception",
  "Discipline": "Discipline",
  "Leadership": "Leadership",
  "Mechanics": "Mechanics",
  "Medicine": "Medicine",
  "Negotiation": "Negotiation",
  "Perception": "Perception",
  "Piloting: Planetary": "Piloting: Planetary",
  "Piloting: Space": "Piloting: Space",
  "Resilience": "Resilience",
  "Skulduggery": "Skulduggery",
  "Stealth": "Stealth",
  "Streetwise": "Streetwise",
  "Survival": "Survival",
  "Vigilance": "Vigilance",
  "Knowledge: Core Worlds": "Knowledge: Core Worlds",
  "Knowledge: Education": "Knowledge: Education",
  "Knowledge: Lore": "Knowledge: Lore",
  "Knowledge: Outer Rim": "Knowledge: Outer Rim",
  "Knowledge: Underworld": "Knowledge: Underworld",
  "Knowledge: Warfare": "Knowledge: Warfare",
  "Knowledge: Xenology": "Knowledge: Xenology",
};

FFG.skills.knowledgestripped = {
  "Knowledge: Core Worlds": "Core Worlds",
  "Knowledge: Education": "Education",
  "Knowledge: Lore": "Lore",
  "Knowledge: Outer Rim": "Outer Rim",
  "Knowledge: Underworld": "Underworld",
  "Knowledge: Warfare": "Warfare",
  "Knowledge: Xenology": "Xenology",
};

FFG.ranges = {
  "Engaged":  {
    value : "Engaged",
    label : "SWFFG:WeaponRangeEngaged"
  },
  "Short": {
    value : "Short",
    label : "SWFFG:WeaponRangeShort"
  },
  "Medium": {
    value : "Medium",
    label : "SWFFG:WeaponRangeMedium"
  },
  "Long": {
    value : "Long",
    label : "SWFFG:WeaponRangeLong"
  },
  "Extreme": {
    value : "Extreme",
    label : "SWFFG:WeaponRangeExtreme"
  }
};

FFG.vehicle_ranges = {
  "Close":  {
    value : "Close",
    label : "SWFFG:VehicleRangeClose"
  },
  "Short": {
    value : "Short",
    label : "SWFFG:VehicleRangeShort"
  },
  "Medium": {
    value : "Medium",
    label : "SWFFG:VehicleRangeMedium"
  },
  "Long": {
    value : "Long",
    label : "SWFFG:VehicleRangeLong"
  },
  "Extreme": {
    value : "Extreme",
    label : "SWFFG:VehicleRangeExtreme"
  }
};

FFG.sensor_ranges = {
  "None":  {
    value : "None",
    label : "SWFFG:VehicleRangeNone"
  },
  "Close":  {
    value : "Close",
    label : "SWFFG:VehicleRangeClose"
  },
  "Short": {
    value : "Short",
    label : "SWFFG:VehicleRangeShort"
  },
  "Medium": {
    value : "Medium",
    label : "SWFFG:VehicleRangeMedium"
  },
  "Long": {
    value : "Long",
    label : "SWFFG:VehicleRangeLong"
  },
  "Extreme": {
    value : "Extreme",
    label : "SWFFG:VehicleRangeExtreme"
  }
}

FFG.fire_arcs = {
  "Forward": {
    value : "Forward",
    label : "SWFFG:VehicleFiringArcForward"
  },
  "Aft": {
    value : "Aft",
    label : "SWFFG:VehicleFiringArcAft"
  },
  "Port": {
    value : "Port",
    label : "SWFFG:VehicleFiringArcPort"
  },
  "Starboard": {
    value : "Starboard",
    label : "SWFFG:VehicleFiringArcStarboard"
  },
  "All": {
    value : "All",
    label : "SWFFG:VehicleFiringArcAll"
  }
};

FFG.combat_skills = {
  "Brawl": {
    value : "Brawl",
    label : "SWFFG.SkillsNameBrawl"
  },
  "Gunnery": {
    value : "Gunnery",
    label : "SWFFG.SkillsNameGunnery"
  },
  "Lightsaber": {
    value : "Lightsaber",
    label : "SWFFG.SkillsNameLightsaber"
  },
  "Melee": {
    value : "Melee",
    label : "SWFFG.SkillsNameMelee"
  },
  "Ranged: Light": {
    value : "Ranged: Light",
    label : "SWFFG.SkillsNameRangedLight"
  },
  "Ranged: Heavy":{
    value : "Ranged: Heavy",
    label : "SWFFG.SkillsNameRangedHeavy"
  }
};

FFG.combat_skills_abrev = {
  "Brawl": "SWFFG.SkillsNameBrawlAbbreviation",
  "Gunnery": "SWFFG.SkillsNameGunneryAbbreviation",
  "Lightsaber": "SWFFG.SkillsNameLightsaberAbbreviation",
  "Melee": "SWFFG.SkillsNameMeleeAbbreviation",
  "Ranged: Light": "SWFFG.SkillsNameRangedLightAbbreviation",
  "Ranged: Heavy": "SWFFG.SkillsNameRangedHeavyAbbreviation"
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
