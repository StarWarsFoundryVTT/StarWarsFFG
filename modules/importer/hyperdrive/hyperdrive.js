import {ItemFFG} from "../../items/item-ffg.js";

export async function ignoreMe() {
  const importData = {
	"Background": {
		"Text": "story goes here",
		"Culture": {
			"Name": "Middle-class Struggles",
			"Description": "",
			"Source": "Edge of the Empire Core Rulebook"
		},
		"Force": {
			"Key": "ONEFORCE",
			"Name": "One with the Force",
			"Description": "",
			"Source": "Force and Destiny Core Rulebook"
		},
		"Adventure": {
			"Key": "SOTBUSH",
			"Name": "Bush Pilot",
			"Description": "",
			"Source": "Stay on Target"
		},
		"Indexes": {
			"Culture": 3,
			"Force": 2,
			"Adventure": 12
		}
	},
	"Obligations": [
		{
			"Name": "Betrayal",
			"Descpription": "",
			"Toggle": true,
			"Obligation": "",
			"Starting": "",
			"Text": "dsfsdfsd",
			"XP5": true,
			"XP10": false,
			"C1": false,
			"C2": false,
			"Total": 5,
			"Key": "BET",
			"Description": "",
			"Source": [
				{
					"_Page": "39",
					"__text": "Edge of the Empire Core Rulebook"
				},
				{
					"_Page": "17",
					"__text": "Fly Casual"
				}
			]
		}
	],
	"Duties": [
		{
			"Name": "",
			"Descpription": "",
			"Toggle": false,
			"Duty": "",
			"Starting": "",
			"Text": "",
			"XP5": false,
			"XP10": false,
			"C1": false,
			"C2": false,
			"Total": 0
		}
	],
	"Morality": {
		"Toggle": false,
		"XPC": false,
		"XP10": false,
		"C2": false,
		"StartLight": false,
		"StartDark": false,
		"Score": 50,
		"StrengthWeakness": [
			{
				"Strength": {
					"Text": "",
					"Key": null
				},
				"Weakness": {
					"Text": "",
					"Key": null
				}
			}
		]
	},
	"Species": {
		"Key": "BARDOTTAN",
		"Name": "Bardottan",
		"Description": "",
		"imageUrl": "https://i.imgur.com/7xnjjNn.png",
		"thumbnailUrl": "https://i.imgur.com/rSk8z3z.png",
		"Source": {
			"_Page": "99",
			"__text": "Nexus of Power"
		},
		"StartingChars": {
			"Brawn": "2",
			"Agility": "2",
			"Intellect": "2",
			"Cunning": "1",
			"Willpower": "3",
			"Presence": "2"
		},
		"StartingAttrs": {
			"WoundThreshold": "9",
			"StrainThreshold": "10",
			"Experience": "105"
		},
		"SkillModifiers": {
			"Key": "LORE",
			"RankStart": "1",
			"RankLimit": "2"
		},
		"Species": "BARDOTTAN",
		"SubSpecies": ""
	},
	"Career": {
		"Key": "EXPLORER",
		"Name": "Explorer",
		"Description": "",
		"Source": {
			"_Page": "67",
			"__text": "Edge of the Empire Core Rulebook"
		},
		"CareerSkills": [
			"Astrogation",
			"Cool",
			"Lore",
			"Outer Rim",
			"Perception",
			"Piloting (Space)",
			"Survival",
			"Xenology"
		],
		"Specializations": [
			"ARCHEOLOGIST",
			"BGMHUNTER",
			"DRIVER",
			"FRINGER",
			"SCOUT",
			"TRADER"
		],
		"Attributes": "",
		"FreeRanks": "4",
		"Specs": [
			"ARCHEOLOGIST",
			"BGMHUNTER",
			"DRIVER",
			"FRINGER",
			"SCOUT",
			"TRADER"
		]
	},
	"Specializations": [
		{
			"Key": "TRADER",
			"Name": "Trader",
			"Description": "",
			"Source": {
				"_Page": "73",
				"__text": "Edge of the Empire Core Rulebook"
			},
			"CareerSkills": [
				"Deception",
				"Core Worlds",
				"Underworld",
				"Negotiation"
			],
			"TalentRows": [
				{
					"Cost": "5",
					"Talents": [
						"KNOWSOM",
						"CONV",
						"WHEEL",
						"SMOOTHTALK"
					],
					"Directions": [
						{
							"Down": "true"
						},
						{},
						{},
						{}
					]
				},
				{
					"Index": "1",
					"Cost": "10",
					"Talents": [
						"WHEEL",
						"GRIT",
						"SPARECL",
						"TOUGH"
					],
					"Directions": [
						{
							"Right": "true",
							"Up": "true",
							"Down": "true"
						},
						{
							"Left": "true",
							"Right": "true"
						},
						{
							"Left": "true",
							"Right": "true"
						},
						{
							"Left": "true"
						}
					]
				},
				{
					"Index": "2",
					"Cost": "15",
					"Talents": [
						"KNOWSOM",
						"NOBFOOL",
						"SMOOTHTALK",
						"NOBFOOL"
					],
					"Directions": [
						{
							"Right": "true",
							"Up": "true",
							"Down": "true"
						},
						{
							"Left": "true",
							"Right": "true"
						},
						{
							"Left": "true",
							"Right": "true"
						},
						{
							"Left": "true"
						}
					]
				},
				{
					"Index": "3",
					"Cost": "20",
					"Talents": [
						"WHEEL",
						"STNERV",
						"BLA",
						"BLA"
					],
					"Directions": [
						{
							"Right": "true",
							"Up": "true",
							"Down": "true"
						},
						{
							"Left": "true",
							"Right": "true"
						},
						{
							"Left": "true",
							"Right": "true"
						},
						{
							"Left": "true",
							"Down": "true"
						}
					]
				},
				{
					"Index": "4",
					"Cost": "25",
					"Talents": [
						"KNOWSOM",
						"NATNEG",
						"DEDI",
						"MASMERC"
					],
					"Directions": [
						{
							"Right": "true",
							"Up": "true"
						},
						{
							"Left": "true",
							"Right": "true"
						},
						{
							"Left": "true",
							"Right": "true"
						},
						{
							"Left": "true",
							"Up": "true"
						}
					]
				}
			],
			"AddlCareerSkills": {
				"Type": ""
			},
			"BoughtTalents": [
				[
					false,
					false,
					false,
					false
				],
				[
					false,
					false,
					false,
					false
				],
				[
					false,
					false,
					false,
					false
				],
				[
					false,
					false,
					false,
					false
				],
				[
					false,
					false,
					false,
					false
				]
			]
		}
	],
	"SignatureAbilities": [],
	"CareerSkills": [
		"Astrogation",
		"Cool",
		"Lore",
		"Outer Rim",
		"Perception",
		"Piloting (Space)",
		"Survival",
		"Xenology"
	],
	"CareerRanks": [
		"Outer Rim",
		"Cool",
		"Lore",
		"Piloting (Space)"
	],
	"SpecSkills": [
		"Deception",
		"Core Worlds",
		"Underworld",
		"Negotiation"
	],
	"SpecRanks": [
		"Underworld",
		"Deception"
	],
	"ExtraCareerSkills": [],
	"SelectedCareerSkills": {},
	"Characteristics": {
		"Brawn": 2,
		"Agility": 2,
		"Intellect": 4,
		"Cunning": 1,
		"Willpower": 3,
		"Presence": 2
	},
	"Skills": [
		{
			"Key": "ASTRO",
			"skill": "Astrogation",
			"characteristic": "Intellect",
			"type": "General"
		},
		{
			"Key": "ATHL",
			"skill": "Athletics",
			"characteristic": "Brawn",
			"type": "General"
		},
		{
			"Key": "BRAWL",
			"skill": "Brawl",
			"characteristic": "Brawn",
			"type": "Combat"
		},
		{
			"Key": "CHARM",
			"skill": "Charm",
			"characteristic": "Presence",
			"type": "General"
		},
		{
			"Key": "COERC",
			"skill": "Coercion",
			"characteristic": "Willpower",
			"type": "General"
		},
		{
			"Key": "COMP",
			"skill": "Computers",
			"characteristic": "Intellect",
			"type": "General"
		},
		{
			"Key": "COOL",
			"skill": "Cool",
			"characteristic": "Presence",
			"type": "General"
		},
		{
			"Key": "COORD",
			"skill": "Coordination",
			"characteristic": "Agility",
			"type": "General"
		},
		{
			"Key": "CORE",
			"skill": "Core Worlds",
			"characteristic": "Intellect",
			"type": "Knowledge"
		},
		{
			"Key": "DECEP",
			"skill": "Deception",
			"characteristic": "Cunning",
			"type": "General"
		},
		{
			"Key": "DISC",
			"skill": "Discipline",
			"characteristic": "Willpower",
			"type": "General"
		},
		{
			"Key": "EDU",
			"skill": "Education",
			"characteristic": "Intellect",
			"type": "Knowledge"
		},
		{
			"Key": "GUNN",
			"skill": "Gunnery",
			"characteristic": "Agility",
			"type": "Combat"
		},
		{
			"Key": "LEAD",
			"skill": "Leadership",
			"characteristic": "Presence",
			"type": "General"
		},
		{
			"Key": "LTSABER",
			"skill": "Lightsaber",
			"characteristic": "Brawn",
			"type": "Combat"
		},
		{
			"Key": "LORE",
			"skill": "Lore",
			"characteristic": "Intellect",
			"type": "Knowledge"
		},
		{
			"Key": "MECH",
			"skill": "Mechanics",
			"characteristic": "Intellect",
			"type": "General"
		},
		{
			"Key": "MED",
			"skill": "Medicine",
			"characteristic": "Intellect",
			"type": "General"
		},
		{
			"Key": "MELEE",
			"skill": "Melee",
			"characteristic": "Brawn",
			"type": "Combat"
		},
		{
			"Key": "NEG",
			"skill": "Negotiation",
			"characteristic": "Presence",
			"type": "General"
		},
		{
			"Key": "OUT",
			"skill": "Outer Rim",
			"characteristic": "Intellect",
			"type": "Knowledge"
		},
		{
			"Key": "PERC",
			"skill": "Perception",
			"characteristic": "Cunning",
			"type": "General"
		},
		{
			"Key": "PILOTPL",
			"skill": "Piloting (Planetary)",
			"characteristic": "Agility",
			"type": "General"
		},
		{
			"Key": "PILOTSP",
			"skill": "Piloting (Space)",
			"characteristic": "Agility",
			"type": "General"
		},
		{
			"Key": "RANGHVY",
			"skill": "Ranged (Heavy)",
			"characteristic": "Agility",
			"type": "Combat"
		},
		{
			"Key": "RANGLT",
			"skill": "Ranged (Light)",
			"characteristic": "Agility",
			"type": "Combat"
		},
		{
			"Key": "RESIL",
			"skill": "Resilience",
			"characteristic": "Brawn",
			"type": "General"
		},
		{
			"Key": "SKUL",
			"skill": "Skulduggery",
			"characteristic": "Cunning",
			"type": "General"
		},
		{
			"Key": "STEAL",
			"skill": "Stealth",
			"characteristic": "Agility",
			"type": "General"
		},
		{
			"Key": "SW",
			"skill": "Streetwise",
			"characteristic": "Cunning",
			"type": "General"
		},
		{
			"Key": "SURV",
			"skill": "Survival",
			"characteristic": "Cunning",
			"type": "General"
		},
		{
			"Key": "UND",
			"skill": "Underworld",
			"characteristic": "Intellect",
			"type": "Knowledge"
		},
		{
			"Key": "VIGIL",
			"skill": "Vigilance",
			"characteristic": "Willpower",
			"type": "General"
		},
		{
			"Key": "WARF",
			"skill": "Warfare",
			"characteristic": "Intellect",
			"type": "Knowledge"
		},
		{
			"Key": "XEN",
			"skill": "Xenology",
			"characteristic": "Intellect",
			"type": "Knowledge"
		}
	],
	"ForcePowers": {},
	"MentorBonuses": {},
	"Motivations": [
		{
			"Motivation": {
				"Key": "REWARD",
				"Name": "Reward",
				"Description": "",
				"Source": "Fly Casual",
				"SpecificMotivations": {
					"Key": [
						"REWARDSM1",
						"REWARDSM2",
						"REWARDSM3",
						"REWARDSM4",
						"REWARDSM5",
						"REWARDSM6",
						"REWARDSM7",
						"REWARDSM8",
						"REWARDSM9",
						"REWARDSM10"
					]
				}
			},
			"SpecificMotivation": {
				"Key": "REWARDSM2",
				"Name": "Power",
				"Description": "",
				"Source": "Fly Casual",
				"Motivation": "Reward"
			},
			"Text": "dfgfgfdfd"
		}
	],
	"Weapons": [
		{
			"Key": "BLASTHOLD",
			"Name": "Holdout Blaster",
			"Description": "",
			"Type": "Energy Weapon",
			"Categories": [
				"Ranged (Light)",
				"Ranged"
			],
			"Encumbrance": "1",
			"HP": "1",
			"Price": 850,
			"Rarity": "4",
			"SkillKey": "RANGLT",
			"Damage": 6,
			"Crit": "4",
			"RangeValue": "wrShort",
			"Qualities": [
				{
					"Key": "STUNSETTING"
				},
				{
					"Count": "1",
					"MiscDesc": "GM may spend [TH][TH] to damage weapon by one step.",
					"FromAttachment": "1"
				}
			],
			"Range": "Short",
			"Quantity": 1,
			"inventoryID": "BLASTHOLD_1738974841480",
			"Attachments": [
				{
					"Key": "OVERACTMOD",
					"Name": "Overcharged Actuating Module",
					"Description": "",
					"Source": {
						"-Page": "55",
						"#text": "Special Modifications"
					},
					"Type": "Weapon",
					"CategoryLimit": [
						"Ranged"
					],
					"Price": "650",
					"Rarity": "7",
					"HP": "1",
					"BaseMods": [
						{
							"Key": "DAMADD",
							"Count": "1"
						},
						{
							"Count": "1",
							"MiscDesc": "GM may spend [TH][TH] to damage weapon by one step."
						}
					],
					"AddedMods": [
						{
							"Key": "DAMADD",
							"Count": "1"
						}
					]
				}
			],
			"HPUsed": 1,
			"TalentMods": {}
		},
		{
			"Key": "UNARMED",
			"Name": "Unarmed",
			"DamageAdd": 0,
			"Crit": 5,
			"SkillKey": "BRAWL",
			"Range": "Engaged",
			"Qualities": [
				{
					"Key": "KNOCKDOWN"
				},
				{
					"Key": "STUNSETTING"
				}
			],
			"TalentMods": {
				"UnarmedQualities": [
					{
						"Key": "KNOCKDOWN"
					},
					{
						"Key": "STUNSETTING"
					}
				]
			}
		}
	],
	"Armor": [],
	"Gear": [],
	"Vehicles": [],
	"Mentor": {
		"Training": "",
		"CW": "",
		"Purge": "",
		"ForceTradition": "",
		"Personality": "",
		"Complication": ""
	},
	"Holocron": [],
	"XP": 40,
	"Credits": -350,
	"WoundThreshold": 0,
	"StrainThreshold": 0,
	"Soak": 2,
	"Defense": {
		"Ranged": 0,
		"Melee": 0
	},
	"EncumbranceThreshold": 0,
	"Name": "",
	"UsedStartingXP": 70,
	"ForceRating": 0,
	"Modifiers": {
		"Skills": {},
		"Chars": {},
		"Dice": {},
		"Stats": {},
		"Weapons": []
	},
	"Strain": 13,
	"Wounds": 11,
	"BoughtPowers": [],
	"BoughtTalents": [],
	"UsedQualities": [
		{
			"Key": "STUNSETTING",
			"Name": "Stun Setting Quality",
			"Description": "",
			"Type": "Weapon",
			"ModDesc": "Stun Setting",
			"QualDesc": "Stun Setting",
			"IsBoolean": "true",
			"IsQuality": "true"
		},
		{
			"Key": "DAMADD",
			"Name": "Additional Damage Mod",
			"Description": "",
			"Type": "Weapon",
			"ModDesc": "Damage +1",
			"QualDesc": "Damage +{0}"
		},
		{
			"Key": "KNOCKDOWN",
			"Name": "Knockdown Quality",
			"Description": "",
			"Type": "Weapon",
			"ModDesc": "Knockdown",
			"QualDesc": "Knockdown",
			"IsBoolean": "true",
			"IsQuality": "true",
			"IsActiveQuality": "true"
		}
	]
};
  let weapons = await parseWeapons(importData);
  console.log(weapons)
  for (const weapon of weapons) {
    Item.create(weapon);
  }
}

async function parseWeapons(importData) {
  const weapons = [];

  for (const weapon of importData.Weapons) {
    // parse mods on the weapon
    console.log(`now processing ${weapon.Name}...`)
    const qualities = [];
    if (Object.keys(weapon).includes("Qualities")) {
      console.log("parsing Qualities")
      for (const curMod of weapon.Qualities) {
        let a = curMod;
      }
    }

    console.log("qualities:")
    console.log(qualities)

    const attachments = [];
    // parse attachments on the weapon
    if (Object.keys(weapon).includes("Attachments")) {
      console.log("parsing attachments")
      for (const curAttachment of weapon.Attachments) {
        // assumed to be installed and active
        const baseMods = [];
        // TODO: process mods on attachment
        attachments.push({
          name: curAttachment.Name,
          type: "itemattachment",
          img: "/systems/starwarsffg/images/mod-weapon.png",
          id: foundry.utils.randomID(),
          _id: foundry.utils.randomID(),
          system: {
            description: curAttachment.Description,
            metadata: {
              tags: ["hyperdrive-generator", "itemattachment", curAttachment.Type],
              sources: [`${curAttachment.Source['#text']} pg.${curAttachment.Source['-Page']}`],
            },
            price: {
              value: parseInt(curAttachment.Price),
              type: "Number",
              label: "Price",
              adjusted: 0,
            },
            rarity: {
              value: parseInt(curAttachment.Rarity),
              type: "Number",
              label: "Rarity",
              adjusted: 0,
              isrestricted: false,
            },
            hardpoints: {
              value: parseInt(curAttachment.HP),
              type: "Number",
              label: "Hard Points",
              abrev: "HP",
              adjusted: 0,
            },
            itemmodifier: [],
            adjusteditemmodifier: [],
            itemattachment: [],
            type: curAttachment.Type,
            enrichedDescription: await TextEditor.enrichHTML(curAttachment.Description),
            attributes: {},
            // items below here are included but not actually used
            quantity: {
              value: 1,
              type: "Number",
              label: "Quantity",
              abrev: "Qty"
            },
            encumbrance: {
              value: 0,
              type: "Number",
              label: "Encumbrance",
              abrev: "Encum",
              adjusted: 0
            },
          },
        })
      }
    }

    console.log("attachments:")
    console.log(attachments)

    let tags = ["hyperdrive-generator", "weapon", weapon.Type];
    if (Object.keys(weapon).includes("Categories")) {
      for (const category of weapon.Categories) {
        tags.push(category);
      }
    }
    // TODO: all "adjusted" values may be incorrect
    // TODO: qualities
    // TODO: attachments
    // TODO: quantity
    const weaponId = foundry.utils.randomID();
    weapons.push({
      name: weapon.Name,
      type: "weapon",
      img: "icons/svg/item-bag.svg",
      _id: foundry.utils.randomID(),
      id: foundry.utils.randomID(),
      system: {
        attributes: {},
        metadata: {
          tags: tags,
          sources: ["hyperdrive generator"],
        },
        description: weapon.Description,
        damage: {
          value: parseInt(weapon.Damage),
          type: "Number",
          label: "Damage",
          abrev: "Dam",
          adjusted: weapon.Damage,
        },
        encumbrance: {
          value: parseInt(weapon.Encumbrance),
          type: "Number",
          label: "Encumbrance",
          abrev: "Encum",
          adjusted: weapon.Encumbrance,
        },
        hardpoints: {
          value: parseInt(weapon.HP),
          type: "Number",
          label: "Hard Points",
          abrev: "HP",
          adjusted: weapon.HP,
        },
        price: {
          value: parseInt(weapon.Price),
          type: "Number",
          label: "Price",
          adjusted: 0,
        },
        rarity: {
          value: parseInt(weapon.Rarity),
          type: "Number",
          label: "Rarity",
          adjusted: 0,
          isrestricted: false,
        },
        skill: {
          value: {}[weapon.SkillKey], // TODO: build mapping
          type: "String",
          label: "Skill",
        },
        crit: {
          value: parseInt(weapon.Crit),
          type: "Number",
          label: "Critical Rating",
          abrev: "Crit",
          adjusted: weapon.Crit,
        },
        range: {
          value: weapon.Range,
          type: "String",
          label: "Range",
          adjusted: weapon.Range,
        },
        quantity: {
          value: weapon.Quantity,
          type: "Number",
          label: "Quantity",
          abrev: "Qty",
        },
        itemattachment: attachments,
        itemmodifier: qualities,
        adjusteditemmodifer: [],
        special: {
          value: "",
          type: "String",
          label: "Special",
        },
        status: "None",
        characteristic: {
          value: "",
        },
      },
    });
  }
  return weapons;
}

