/**
 * TypeDataModels for Star Wars FFG Actors and Items.
 *
 * Dynamic nested records such as skills, attributes, talent trees, and imported
 * modifiers intentionally use ObjectField/AnyField. Their keys are user-defined
 * or originate in external datasets, so pruning them would destroy valid data.
 */

const LEGACY_DEFAULTS = {
  "Actor": {
    "character": {
      "biography": "",
      "species": {
        "value": "",
        "type": "String"
      },
      "career": {
        "value": "",
        "type": "String"
      },
      "specialisation": {
        "value": "",
        "list": [],
        "type": "String"
      },
      "stats": {
        "wounds": {
          "value": 0,
          "min": 0,
          "max": 0,
          "adjusted": 0
        },
        "strain": {
          "value": 0,
          "min": 0,
          "max": 0,
          "adjusted": 0
        },
        "soak": {
          "value": 0,
          "adjusted": 0
        },
        "defence": {
          "ranged": 0,
          "melee": 0,
          "adjusted": 0
        },
        "encumbrance": {
          "value": 0,
          "max": 0,
          "adjusted": 0
        },
        "forcePool": {
          "value": 0,
          "max": 0,
          "adjusted": 0
        },
        "credits": {
          "value": 0,
          "type": "Number",
          "label": "Credits",
          "adjusted": 0
        }
      },
      "characteristics": {
        "Brawn": {
          "value": 0,
          "label": "Brawn",
          "abrev": "Br"
        },
        "Agility": {
          "value": 0,
          "label": "Agility",
          "abrev": "Ag"
        },
        "Intellect": {
          "value": 0,
          "label": "Intellect",
          "abrev": "Int"
        },
        "Cunning": {
          "value": 0,
          "label": "Cunning",
          "abrev": "Cun"
        },
        "Willpower": {
          "value": 0,
          "label": "Willpower",
          "abrev": "Will"
        },
        "Presence": {
          "value": 0,
          "label": "Presence",
          "abrev": "Pr"
        }
      },
      "skills": {
        "Brawl": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Gunnery": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Lightsaber": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Melee": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Ranged: Light": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Ranged: Heavy": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Astrogation": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Athletics": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Charm": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Coercion": {
          "rank": 0,
          "characteristic": "Willpower",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Computers": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Cool": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Coordination": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Deception": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Discipline": {
          "rank": 0,
          "characteristic": "Willpower",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Leadership": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Mechanics": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Medicine": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Negotiation": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Perception": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Piloting: Planetary": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Piloting: Space": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Resilience": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Skulduggery": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Stealth": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Streetwise": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Survival": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Vigilance": {
          "rank": 0,
          "characteristic": "Willpower",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Knowledge: Core Worlds": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Education": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Lore": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Outer Rim": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Underworld": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Warfare": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Xenology": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        }
      },
      "attributes": {},
      "general": {
        "features": "<p></p>"
      },
      "metadata": {
        "tags": [],
        "sources": []
      },
      "encumbrance": {
        "value": 0,
        "type": "Number",
        "label": "Encumbrance",
        "abrev": "Encum",
        "adjusted": 0
      },
      "obligation": {
        "value": 0,
        "type": "Number",
        "label": "Obligation"
      },
      "duty": {
        "value": 0,
        "type": "Number",
        "label": "Duty"
      },
      "morality": {
        "value": 0,
        "type": "Number",
        "label": "Morality"
      },
      "conflict": {
        "value": 0,
        "type": "Number",
        "label": "Conflict"
      },
      "experience": {
        "total": 0,
        "available": 0
      }
    },
    "minion": {
      "biography": "",
      "stats": {
        "wounds": {
          "value": 0,
          "min": 0,
          "max": 0,
          "adjusted": 0
        },
        "strain": {
          "value": 0,
          "min": 0,
          "max": 0,
          "adjusted": 0
        },
        "soak": {
          "value": 0,
          "adjusted": 0
        },
        "defence": {
          "ranged": 0,
          "melee": 0,
          "adjusted": 0
        },
        "encumbrance": {
          "value": 0,
          "max": 0,
          "adjusted": 0
        },
        "forcePool": {
          "value": 0,
          "max": 0,
          "adjusted": 0
        },
        "credits": {
          "value": 0,
          "type": "Number",
          "label": "Credits",
          "adjusted": 0
        }
      },
      "characteristics": {
        "Brawn": {
          "value": 0,
          "label": "Brawn",
          "abrev": "Br"
        },
        "Agility": {
          "value": 0,
          "label": "Agility",
          "abrev": "Ag"
        },
        "Intellect": {
          "value": 0,
          "label": "Intellect",
          "abrev": "Int"
        },
        "Cunning": {
          "value": 0,
          "label": "Cunning",
          "abrev": "Cun"
        },
        "Willpower": {
          "value": 0,
          "label": "Willpower",
          "abrev": "Will"
        },
        "Presence": {
          "value": 0,
          "label": "Presence",
          "abrev": "Pr"
        }
      },
      "skills": {
        "Brawl": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Gunnery": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Lightsaber": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Melee": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Ranged: Light": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Ranged: Heavy": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Astrogation": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Athletics": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Charm": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Coercion": {
          "rank": 0,
          "characteristic": "Willpower",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Computers": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Cool": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Coordination": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Deception": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Discipline": {
          "rank": 0,
          "characteristic": "Willpower",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Leadership": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Mechanics": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Medicine": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Negotiation": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Perception": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Piloting: Planetary": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Piloting: Space": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Resilience": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Skulduggery": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Stealth": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Streetwise": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Survival": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Vigilance": {
          "rank": 0,
          "characteristic": "Willpower",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Knowledge: Core Worlds": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Education": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Lore": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Outer Rim": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Underworld": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Warfare": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Xenology": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        }
      },
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "quantity": {
        "value": 1,
        "max": 1,
        "type": "Number",
        "label": "Quantity",
        "abrev": "Qty"
      },
      "unit_wounds": {
        "value": 0,
        "type": "Number",
        "label": "Unit Wounds"
      }
    },
    "vehicle": {
      "biography": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "stats": {
        "silhouette": {
          "value": 1,
          "type": "Number",
          "label": "Silhouette"
        },
        "speed": {
          "value": 0,
          "max": 0,
          "type": "Number",
          "label": "Speed"
        },
        "handling": {
          "value": 0,
          "type": "Number",
          "label": "Handling"
        },
        "hullTrauma": {
          "value": 0,
          "min": 0,
          "max": 10,
          "label": "Hull Trauma"
        },
        "systemStrain": {
          "value": 0,
          "min": 0,
          "max": 10,
          "label": "System Strain"
        },
        "shields": {
          "fore": 0,
          "port": 0,
          "starboard": 0,
          "aft": 0,
          "label": "Shields"
        },
        "armour": {
          "value": 0,
          "type": "Number",
          "label": "Armour",
          "adjusted": 0
        },
        "sensorRange": {
          "value": "Short",
          "type": "String"
        },
        "crew": {},
        "passengerCapacity": {
          "value": 0,
          "type": "Number",
          "label": "Passenger Capacity"
        },
        "encumbrance": {
          "value": 0,
          "min": 0,
          "max": 10,
          "adjusted": 0
        },
        "cost": {
          "value": 0,
          "type": "Number",
          "label": "Cost",
          "adjusted": 0
        },
        "rarity": {
          "value": 0,
          "isrestricted": false,
          "type": "Number",
          "label": "Rarity",
          "adjusted": 0
        },
        "customizationHardPoints": {
          "value": 0,
          "type": "Number",
          "label": "Hard Points",
          "adjusted": 0
        },
        "hyperdrive": {
          "value": 1,
          "type": "Number",
          "label": "SWFFG.Hyperdrive"
        },
        "consumables": {
          "value": 1,
          "duration": "months",
          "type": "Number",
          "label": "SWFFG.Consumables"
        },
        "navicomputer": {
          "value": false,
          "type": "Boolean",
          "label": "SWFFG.VehicleNavicomputer"
        }
      },
      "spaceShip": false,
      "silhouetteImage": "systems/starwarsffg/images/shipdefence.png"
    },
    "homestead": {
      "biography": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "cost": {
        "value": 0,
        "type": "Number",
        "label": "Cost",
        "adjusted": 0
      },
      "consumables": {
        "value": 1,
        "duration": "months",
        "type": "Number",
        "label": "SWFFG.Consumables"
      }
    },
    "rival": {
      "biography": "",
      "species": {
        "value": "",
        "type": "String"
      },
      "characteristics": {
        "Brawn": {
          "value": 0,
          "label": "Brawn",
          "abrev": "Br"
        },
        "Agility": {
          "value": 0,
          "label": "Agility",
          "abrev": "Ag"
        },
        "Intellect": {
          "value": 0,
          "label": "Intellect",
          "abrev": "Int"
        },
        "Cunning": {
          "value": 0,
          "label": "Cunning",
          "abrev": "Cun"
        },
        "Willpower": {
          "value": 0,
          "label": "Willpower",
          "abrev": "Will"
        },
        "Presence": {
          "value": 0,
          "label": "Presence",
          "abrev": "Pr"
        }
      },
      "skills": {
        "Brawl": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Gunnery": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Lightsaber": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Melee": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Ranged: Light": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Ranged: Heavy": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Astrogation": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Athletics": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Charm": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Coercion": {
          "rank": 0,
          "characteristic": "Willpower",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Computers": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Cool": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Coordination": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Deception": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Discipline": {
          "rank": 0,
          "characteristic": "Willpower",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Leadership": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Mechanics": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Medicine": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Negotiation": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Perception": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Piloting: Planetary": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Piloting: Space": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Resilience": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Skulduggery": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Stealth": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Streetwise": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Survival": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Vigilance": {
          "rank": 0,
          "characteristic": "Willpower",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Knowledge: Core Worlds": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Education": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Lore": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Outer Rim": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Underworld": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Warfare": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Xenology": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        }
      },
      "attributes": {},
      "general": {
        "features": "<p></p>"
      },
      "metadata": {
        "tags": [],
        "sources": []
      },
      "stats": {
        "wounds": {
          "value": 0,
          "min": 0,
          "max": 0,
          "adjusted": 0
        },
        "soak": {
          "value": 0,
          "adjusted": 0
        },
        "defence": {
          "ranged": 0,
          "melee": 0,
          "adjusted": 0
        },
        "encumbrance": {
          "value": 0,
          "max": 0,
          "adjusted": 0
        },
        "forcePool": {
          "value": 0,
          "max": 0,
          "adjusted": 0
        },
        "credits": {
          "value": 0,
          "type": "Number",
          "label": "Credits",
          "adjusted": 0
        }
      }
    },
    "nemesis": {
      "biography": "",
      "species": {
        "value": "",
        "type": "String"
      },
      "stats": {
        "wounds": {
          "value": 0,
          "min": 0,
          "max": 0,
          "adjusted": 0
        },
        "strain": {
          "value": 0,
          "min": 0,
          "max": 0,
          "adjusted": 0
        },
        "soak": {
          "value": 0,
          "adjusted": 0
        },
        "defence": {
          "ranged": 0,
          "melee": 0,
          "adjusted": 0
        },
        "encumbrance": {
          "value": 0,
          "max": 0,
          "adjusted": 0
        },
        "forcePool": {
          "value": 0,
          "max": 0,
          "adjusted": 0
        },
        "credits": {
          "value": 0,
          "type": "Number",
          "label": "Credits",
          "adjusted": 0
        }
      },
      "characteristics": {
        "Brawn": {
          "value": 0,
          "label": "Brawn",
          "abrev": "Br"
        },
        "Agility": {
          "value": 0,
          "label": "Agility",
          "abrev": "Ag"
        },
        "Intellect": {
          "value": 0,
          "label": "Intellect",
          "abrev": "Int"
        },
        "Cunning": {
          "value": 0,
          "label": "Cunning",
          "abrev": "Cun"
        },
        "Willpower": {
          "value": 0,
          "label": "Willpower",
          "abrev": "Will"
        },
        "Presence": {
          "value": 0,
          "label": "Presence",
          "abrev": "Pr"
        }
      },
      "skills": {
        "Brawl": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Gunnery": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Lightsaber": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Melee": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Ranged: Light": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Ranged: Heavy": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "Combat",
          "max": 6
        },
        "Astrogation": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Athletics": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Charm": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Coercion": {
          "rank": 0,
          "characteristic": "Willpower",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Computers": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Cool": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Coordination": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Deception": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Discipline": {
          "rank": 0,
          "characteristic": "Willpower",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Leadership": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Mechanics": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Medicine": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Negotiation": {
          "rank": 0,
          "characteristic": "Presence",
          "groupskill": false,
          "careerskill": false,
          "type": "Social",
          "max": 6
        },
        "Perception": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Piloting: Planetary": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Piloting: Space": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Resilience": {
          "rank": 0,
          "characteristic": "Brawn",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Skulduggery": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Stealth": {
          "rank": 0,
          "characteristic": "Agility",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Streetwise": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Survival": {
          "rank": 0,
          "characteristic": "Cunning",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Vigilance": {
          "rank": 0,
          "characteristic": "Willpower",
          "groupskill": false,
          "careerskill": false,
          "type": "General",
          "max": 6
        },
        "Knowledge: Core Worlds": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Education": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Lore": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Outer Rim": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Underworld": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Warfare": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        },
        "Knowledge: Xenology": {
          "rank": 0,
          "characteristic": "Intellect",
          "groupskill": false,
          "careerskill": false,
          "type": "Knowledge",
          "max": 6
        }
      },
      "attributes": {},
      "general": {
        "features": "<p></p>"
      },
      "metadata": {
        "tags": [],
        "sources": []
      }
    }
  },
  "Item": {
    "ability": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      }
    },
    "armour": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "quantity": {
        "value": 1,
        "type": "Number",
        "label": "Quantity",
        "abrev": "Qty"
      },
      "encumbrance": {
        "value": 0,
        "type": "Number",
        "label": "Encumbrance",
        "abrev": "Encum",
        "adjusted": 0
      },
      "price": {
        "value": 0,
        "type": "Number",
        "label": "Price",
        "adjusted": 0
      },
      "rarity": {
        "value": 0,
        "type": "Number",
        "label": "Rarity",
        "adjusted": 0
      },
      "hardpoints": {
        "value": 0,
        "type": "Number",
        "label": "Hard Points",
        "abrev": "HP",
        "adjusted": 0
      },
      "equippable": {
        "value": true,
        "type": "Boolean",
        "equipped": false
      },
      "itemattachment": [],
      "itemmodifier": [],
      "adjusteditemmodifer": [],
      "defence": {
        "value": 0,
        "type": "Number",
        "label": "Defence",
        "abrev": "Def",
        "adjusted": 0
      },
      "soak": {
        "value": 0,
        "type": "Number",
        "label": "Soak",
        "adjusted": 0
      }
    },
    "career": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "specializations": {},
      "signatureabilities": {},
      "careerSkills": {
        "careerSkill0": "(none)",
        "careerSkill1": "(none)",
        "careerSkill2": "(none)",
        "careerSkill3": "(none)",
        "careerSkill4": "(none)",
        "careerSkill5": "(none)",
        "careerSkill6": "(none)",
        "careerSkill7": "(none)"
      }
    },
    "criticaldamage": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "min": 0,
      "max": 0,
      "severity": 1
    },
    "criticalinjury": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "min": 0,
      "max": 0,
      "severity": 1
    },
    "forcepower": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "upgrades": {
        "upgrade0": {},
        "upgrade1": {},
        "upgrade2": {},
        "upgrade3": {},
        "upgrade4": {},
        "upgrade5": {},
        "upgrade6": {},
        "upgrade7": {},
        "upgrade8": {},
        "upgrade9": {},
        "upgrade10": {},
        "upgrade11": {},
        "upgrade12": {},
        "upgrade13": {},
        "upgrade14": {},
        "upgrade15": {}
      },
      "required_force_rating": 0,
      "base_cost": 0
    },
    "gear": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "quantity": {
        "value": 1,
        "type": "Number",
        "label": "Quantity",
        "abrev": "Qty"
      },
      "encumbrance": {
        "value": 0,
        "type": "Number",
        "label": "Encumbrance",
        "abrev": "Encum",
        "adjusted": 0
      },
      "price": {
        "value": 0,
        "type": "Number",
        "label": "Price",
        "adjusted": 0
      },
      "rarity": {
        "value": 0,
        "type": "Number",
        "label": "Rarity",
        "adjusted": 0
      },
      "itemattachment": [],
      "itemmodifier": [],
      "adjusteditemmodifer": []
    },
    "itemattachment": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "quantity": {
        "value": 1,
        "type": "Number",
        "label": "Quantity",
        "abrev": "Qty"
      },
      "encumbrance": {
        "value": 0,
        "type": "Number",
        "label": "Encumbrance",
        "abrev": "Encum",
        "adjusted": 0
      },
      "price": {
        "value": 0,
        "type": "Number",
        "label": "Price",
        "adjusted": 0
      },
      "rarity": {
        "value": 0,
        "type": "Number",
        "label": "Rarity",
        "adjusted": 0
      },
      "hardpoints": {
        "value": 0,
        "type": "Number",
        "label": "Hard Points",
        "abrev": "HP",
        "adjusted": 0
      },
      "itemmodifier": [],
      "adjusteditemmodifer": [],
      "itemattachment": [],
      "type": "all"
    },
    "itemmodifier": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "itemmodifier": [],
      "adjusteditemmodifer": [],
      "type": "all",
      "rank": 0
    },
    "talent": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "activation": {
        "value": "Passive",
        "type": "String",
        "label": "Activation"
      },
      "ranks": {
        "ranked": false,
        "current": 1,
        "min": 0
      },
      "isForceTalent": false,
      "isConflictTalent": false,
      "tier": 1,
      "trees": [],
      "longDesc": ""
    },
    "shipattachment": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "quantity": {
        "value": 1,
        "type": "Number",
        "label": "Quantity",
        "abrev": "Qty"
      },
      "encumbrance": {
        "value": 0,
        "type": "Number",
        "label": "Encumbrance",
        "abrev": "Encum",
        "adjusted": 0
      },
      "price": {
        "value": 0,
        "type": "Number",
        "label": "Price",
        "adjusted": 0
      },
      "rarity": {
        "value": 0,
        "type": "Number",
        "label": "Rarity",
        "adjusted": 0
      },
      "hardpoints": {
        "value": 0,
        "type": "Number",
        "label": "Hard Points",
        "abrev": "HP",
        "adjusted": 0
      },
      "equippable": {
        "value": true,
        "type": "Boolean",
        "equipped": false
      },
      "itemattachment": [],
      "itemmodifier": [],
      "adjusteditemmodifer": [],
      "label": "Ship Attachment"
    },
    "shipweapon": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "quantity": {
        "value": 1,
        "type": "Number",
        "label": "Quantity",
        "abrev": "Qty"
      },
      "encumbrance": {
        "value": 0,
        "type": "Number",
        "label": "Encumbrance",
        "abrev": "Encum",
        "adjusted": 0
      },
      "price": {
        "value": 0,
        "type": "Number",
        "label": "Price",
        "adjusted": 0
      },
      "rarity": {
        "value": 0,
        "type": "Number",
        "label": "Rarity",
        "adjusted": 0
      },
      "hardpoints": {
        "value": 0,
        "type": "Number",
        "label": "Hard Points",
        "abrev": "HP",
        "adjusted": 0
      },
      "equippable": {
        "value": true,
        "type": "Boolean",
        "equipped": false
      },
      "itemattachment": [],
      "itemmodifier": [],
      "adjusteditemmodifer": [],
      "label": "Ship Weapon",
      "firingarc": {
        "fore": false,
        "aft": false,
        "port": false,
        "starboard": false,
        "dorsal": false,
        "ventral": false
      },
      "damage": {
        "value": 0,
        "type": "Number",
        "label": "Damage",
        "abrev": "Dam",
        "adjusted": 0
      },
      "crit": {
        "value": 0,
        "type": "Number",
        "label": "Critical Rating",
        "abrev": "Crit",
        "adjusted": 0
      },
      "range": {
        "value": "Short",
        "type": "String",
        "label": "Range",
        "adjusted": "Short"
      },
      "special": {
        "value": "",
        "type": "String",
        "label": "Special"
      }
    },
    "homesteadupgrade": {
      "metadata": {
        "tags": [],
        "sources": []
      }
    },
    "signatureability": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "upgrades": {
        "upgrade0": {},
        "upgrade1": {},
        "upgrade2": {},
        "upgrade3": {},
        "upgrade4": {},
        "upgrade5": {},
        "upgrade6": {},
        "upgrade7": {}
      },
      "base_cost": 0,
      "uplink_nodes": {
        "uplink0": false,
        "uplink1": false,
        "uplink2": false,
        "uplink3": false
      }
    },
    "specialization": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "talents": {
        "talent0": {},
        "talent1": {},
        "talent2": {},
        "talent3": {},
        "talent4": {},
        "talent5": {},
        "talent6": {},
        "talent7": {},
        "talent8": {},
        "talent9": {},
        "talent10": {},
        "talent11": {},
        "talent12": {},
        "talent13": {},
        "talent14": {},
        "talent15": {},
        "talent16": {},
        "talent17": {},
        "talent18": {},
        "talent19": {}
      },
      "careerSkills": {
        "careerSkill0": "(none)",
        "careerSkill1": "(none)",
        "careerSkill2": "(none)",
        "careerSkill3": "(none)",
        "careerSkill4": "(none)"
      },
      "universal": false
    },
    "species": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "talents": {},
      "abilities": {},
      "species": {},
      "startingXP": 0
    },
    "weapon": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "quantity": {
        "value": 1,
        "type": "Number",
        "label": "Quantity",
        "abrev": "Qty"
      },
      "encumbrance": {
        "value": 0,
        "type": "Number",
        "label": "Encumbrance",
        "abrev": "Encum",
        "adjusted": 0
      },
      "price": {
        "value": 0,
        "type": "Number",
        "label": "Price",
        "adjusted": 0
      },
      "rarity": {
        "value": 0,
        "type": "Number",
        "label": "Rarity",
        "adjusted": 0
      },
      "hardpoints": {
        "value": 0,
        "type": "Number",
        "label": "Hard Points",
        "abrev": "HP",
        "adjusted": 0
      },
      "equippable": {
        "value": true,
        "type": "Boolean",
        "equipped": false
      },
      "itemattachment": [],
      "itemmodifier": [],
      "adjusteditemmodifer": [],
      "skill": {
        "value": "Ranged: Light",
        "type": "String",
        "label": "Skill"
      },
      "damage": {
        "value": 0,
        "type": "Number",
        "label": "Damage",
        "abrev": "Dam",
        "adjusted": 0
      },
      "crit": {
        "value": 0,
        "type": "Number",
        "label": "Critical Rating",
        "abrev": "Crit",
        "adjusted": 0
      },
      "range": {
        "value": "Short",
        "type": "String",
        "label": "Range",
        "adjusted": "Short"
      },
      "special": {
        "value": "",
        "type": "String",
        "label": "Special"
      },
      "ammo": {
        "max": 0,
        "value": 0
      }
    },
    "background": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "quantity": {
        "value": 1,
        "type": "Number",
        "label": "Quantity",
        "abrev": "Qty"
      },
      "encumbrance": {
        "value": 0,
        "type": "Number",
        "label": "Encumbrance",
        "abrev": "Encum",
        "adjusted": 0
      },
      "price": {
        "value": 0,
        "type": "Number",
        "label": "Price",
        "adjusted": 0
      },
      "rarity": {
        "value": 0,
        "type": "Number",
        "label": "Rarity",
        "adjusted": 0
      },
      "type": "culture"
    },
    "obligation": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "quantity": {
        "value": 1,
        "type": "Number",
        "label": "Quantity",
        "abrev": "Qty"
      },
      "encumbrance": {
        "value": 0,
        "type": "Number",
        "label": "Encumbrance",
        "abrev": "Encum",
        "adjusted": 0
      },
      "price": {
        "value": 0,
        "type": "Number",
        "label": "Price",
        "adjusted": 0
      },
      "rarity": {
        "value": 0,
        "type": "Number",
        "label": "Rarity",
        "adjusted": 0
      },
      "type": "duty",
      "magnitude": 0,
      "subtype": ""
    },
    "motivation": {
      "description": "",
      "attributes": {},
      "metadata": {
        "tags": [],
        "sources": []
      },
      "quantity": {
        "value": 1,
        "type": "Number",
        "label": "Quantity",
        "abrev": "Qty"
      },
      "encumbrance": {
        "value": 0,
        "type": "Number",
        "label": "Encumbrance",
        "abrev": "Encum",
        "adjusted": 0
      },
      "price": {
        "value": 0,
        "type": "Number",
        "label": "Price",
        "adjusted": 0
      },
      "rarity": {
        "value": 0,
        "type": "Number",
        "label": "Rarity",
        "adjusted": 0
      },
      "type": "ambition"
    }
  }
};

const COMPATIBILITY_FIELDS = {
  "Actor": {
    "homestead": [
      "stats"
    ],
    "vehicle": [
      "itemattachment",
      "itemmodifier"
    ]
  },
  "Item": {
    "armour": [
      "adjusteditemmodifier",
      "doNotSubmit",
      "enrichedDescription",
      "hasLongDesc",
      "renderedDesc"
    ],
    "career": [
      "doNotSubmit",
      "enrichedDescription",
      "hasLongDesc",
      "renderedDesc"
    ],
    "gear": [
      "doNotSubmit",
      "enrichedDescription",
      "hasLongDesc",
      "renderedDesc"
    ],
    "itemmodifier": [
      "active",
      "rank_current"
    ],
    "shipweapon": [
      "adjusteditemmodifier",
      "characteristic",
      "renderedDesc",
      "skill"
    ],
    "specialization": [
      "careerskills",
      "collection",
      "doNotSubmit",
      "enrichedDescription",
      "hasLongDesc",
      "isEditing",
      "isReadOnly",
      "renderedDesc"
    ],
    "species": [
      "doNotSubmit",
      "enrichedDescription",
      "hasLongDesc",
      "renderedDesc"
    ],
    "talent": [
      "doNotSubmit",
      "enrichedDescription",
      "enrichedLongDesc",
      "hasLongDesc",
      "renderedDesc"
    ],
    "weapon": [
      "adjusteditemmodifier",
      "characteristic",
      "doNotSubmit",
      "enrichedDescription",
      "enrichedSpecial",
      "hasLongDesc",
      "renderedDesc",
      "status"
    ]
  }
};

const HTML_FIELDS = new Set(["biography", "description", "longDesc"]);

const DERIVED_FIELDS = {
  Actor: ["effects", "skilltypes"],
};

function clone(value) {
  return foundry.utils.deepClone(value);
}

function fieldFor(name, initial) {
  const fields = foundry.data.fields;
  const options = { required: true, nullable: false, initial: () => clone(initial) };

  if (HTML_FIELDS.has(name)) return new fields.HTMLField({ ...options, blank: true });
  if (Array.isArray(initial)) return new fields.ArrayField(new fields.AnyField({ serializable: true }), options);
  if (initial && typeof initial === "object") return new fields.ObjectField(options);
  if (typeof initial === "boolean") return new fields.BooleanField(options);
  if (typeof initial === "number") return new fields.NumberField(options);
  return new fields.StringField({ ...options, blank: true });
}

function createSystemDataModel(documentName, type, defaults) {
  class FFGSystemDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
      const schema = Object.fromEntries(
        Object.entries(defaults).map(([name, initial]) => [name, fieldFor(name, initial)])
      );
      for (const name of COMPATIBILITY_FIELDS[documentName][type] ?? []) {
        schema[name] ??= new foundry.data.fields.AnyField({
          required: false,
          nullable: true,
          serializable: true,
        });
      }
      for (const name of DERIVED_FIELDS[documentName] ?? []) {
        schema[name] = new foundry.data.fields.ArrayField(
          new foundry.data.fields.AnyField(),
          { required: true, nullable: false, initial: () => [], persisted: false }
        );
      }
      return schema;
    }
  }

  Object.defineProperty(FFGSystemDataModel, "name", {
    value: `${type.replace(/(^|[-_])(\w)/g, (_, __, letter) => letter.toUpperCase())}Data`,
  });
  return FFGSystemDataModel;
}

function buildModels(documentName) {
  return Object.fromEntries(
    Object.entries(LEGACY_DEFAULTS[documentName]).map(([type, values]) => [
      type,
      createSystemDataModel(documentName, type, values),
    ])
  );
}

export const actorDataModels = buildModels("Actor");
export const itemDataModels = buildModels("Item");

/** Return a fresh system-data object for importers which create plain document data. */
export function getSystemDataDefaults(type) {
  const defaults = LEGACY_DEFAULTS.Actor[type] ?? LEGACY_DEFAULTS.Item[type];
  if (!defaults) throw new Error(`Unknown Star Wars FFG document type: ${type}`);
  return clone(defaults);
}
