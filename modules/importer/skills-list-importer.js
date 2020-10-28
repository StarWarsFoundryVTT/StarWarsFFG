import Helpers from "../helpers/common.js";

export default class SkillListImporter extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "swffg-skilllist-importer",
      classes: ["starwarsffg", "data-import"],
      title: "Skill List Importer",
      width: 385,
      height: 220,
      template: "systems/starwarsffg/templates/importer/skill-list-importer.html",
    });
  }

  /**
   * Return a reference to the target attribute
   * @type {String}
   */
  get attribute() {
    return this.options.name;
  }

  /** @override */
  async getData() {
    $(".import-progress").addClass("import-hidden");

    if (!CONFIG?.temporary) {
      CONFIG.temporary = {};
    }

    return {
      cssClass: "data-importer-window",
    };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".reset-button").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const defaultSkillArrayString = JSON.stringify([
        {
          "id": "starwars",
          "skills": {
            "Brawl": {
              "rank": 0,
              "characteristic": "Brawn",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
            },
            "Gunnery": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
            },
            "Lightsaber": {
              "rank": 0,
              "characteristic": "Brawn",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
            },
            "Melee": {
              "rank": 0,
              "characteristic": "Brawn",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
            },
            "Ranged: Light": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
            },
            "Ranged: Heavy": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
            },
            "Astrogation": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Athletics": {
              "rank": 0,
              "characteristic": "Brawn",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Charm": {
              "rank": 0,
              "characteristic": "Presence",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Coercion": {
              "rank": 0,
              "characteristic": "Willpower",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Computers": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Cool": {
              "rank": 0,
              "characteristic": "Presence",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Coordination": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Deception": {
              "rank": 0,
              "characteristic": "Cunning",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Discipline": {
              "rank": 0,
              "characteristic": "Willpower",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Leadership": {
              "rank": 0,
              "characteristic": "Presence",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Mechanics": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Medicine": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Negotiation": {
              "rank": 0,
              "characteristic": "Presence",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Perception": {
              "rank": 0,
              "characteristic": "Cunning",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Piloting: Planetary": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Piloting: Space": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Resilience": {
              "rank": 0,
              "characteristic": "Brawn",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Skulduggery": {
              "rank": 0,
              "characteristic": "Cunning",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Stealth": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Streetwise": {
              "rank": 0,
              "characteristic": "Cunning",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Survival": {
              "rank": 0,
              "characteristic": "Cunning",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Vigilance": {
              "rank": 0,
              "characteristic": "Willpower",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
            },
            "Knowledge: Core Worlds": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "Knowledge",
              "max": 6,
            },
            "Knowledge: Education": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "Knowledge",
              "max": 6,
            },
            "Knowledge: Lore": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "Knowledge",
              "max": 6,
            },
            "Knowledge: Outer Rim": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "Knowledge",
              "max": 6,
            },
            "Knowledge: Underworld": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "Knowledge",
              "max": 6,
            },
            "Knowledge: Warfare": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "Knowledge",
              "max": 6,
            },
            "Knowledge: Xenology": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "Knowledge",
              "max": 6,
            },
          },
        },
        {
          "id": "genesys",
          "skills": {
            "Brawl": {
              "rank": 0,
              "characteristic": "Brawn",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
              "label": "SWFFG.SkillsNameBrawl",
              "abrev": "SWFFG.SkillsNameBrawlAbbreviation",
            },
            "Gunnery": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
              "label": "SWFFG.SkillsNameGunnery",
              "abrev": "SWFFG.SkillsNameGunneryAbbreviation",
            },
            "Melee": {
              "rank": 0,
              "characteristic": "Brawn",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
              "label": "SWFFG.SkillsNameMelee",
              "abrev": "SWFFG.SkillsNameMeleeAbbreviation",
            },
            "Melee-Heavy": {
              "rank": 0,
              "characteristic": "Brawn",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
              "label": "SWFFG.SkillsNameMeleeHeavy",
              "abrev": "SWFFG.SkillsNameMeleeHeavyAbbreviation",
            },
            "Melee-Light": {
              "rank": 0,
              "characteristic": "Brawn",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
              "label": "SWFFG.SkillsNameMeleeLight",
              "abrev": "SWFFG.SkillsNameMeleeLightAbbreviation",
            },
            "Ranged": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
              "label": "SWFFG.SkillsNameRanged",
              "abrev": "SWFFG.SkillsNameRangedAbbreviation",
            },
            "Ranged-Light": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
              "label": "SWFFG.SkillsNameRangedLight",
              "abrev": "SWFFG.SkillsNameRangedLightAbbreviation",
            },
            "Ranged-Heavy": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "Combat",
              "max": 6,
              "label": "SWFFG.SkillsNameRangedHeavy",
              "abrev": "SWFFG.SkillsNameRangedHeavyAbbreviation",
            },
            "Alchemy": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameAlchemy",
              "abrev": "SWFFG.SkillsNameAlchemy",
            },
            "Astrocartography": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameAstrocartography",
              "abrev": "SWFFG.SkillsNameAstrocartography",
            },
            "Athletics": {
              "rank": 0,
              "characteristic": "Brawn",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameAthletics",
              "abrev": "SWFFG.SkillsNameAthletics",
            },
            "Charm": {
              "rank": 0,
              "characteristic": "Presence",
              "groupskill": false,
              "careerskill": false,
              "type": "Social",
              "max": 6,
              "label": "SWFFG.SkillsNameCharm",
              "abrev": "SWFFG.SkillsNameCharm",
            },
            "Coercion": {
              "rank": 0,
              "characteristic": "Willpower",
              "groupskill": false,
              "careerskill": false,
              "type": "Social",
              "max": 6,
              "label": "SWFFG.SkillsNameCoercion",
              "abrev": "SWFFG.SkillsNameCoercion",
            },
            "Computers": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameComputers",
              "abrev": "SWFFG.SkillsNameComputers",
            },
            "Cool": {
              "rank": 0,
              "characteristic": "Presence",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameCool",
              "abrev": "SWFFG.SkillsNameCool",
            },
            "Coordination": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameCoordination",
              "abrev": "SWFFG.SkillsNameCoordination",
            },
            "Deception": {
              "rank": 0,
              "characteristic": "Cunning",
              "groupskill": false,
              "careerskill": false,
              "type": "Social",
              "max": 6,
              "label": "SWFFG.SkillsNameDeception",
              "abrev": "SWFFG.SkillsNameDeception",
            },
            "Discipline": {
              "rank": 0,
              "characteristic": "Willpower",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameDiscipline",
              "abrev": "SWFFG.SkillsNameDiscipline",
            },
            "Driving": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameDriving",
              "abrev": "SWFFG.SkillsNameDriving",
            },
            "Leadership": {
              "rank": 0,
              "characteristic": "Presence",
              "groupskill": false,
              "careerskill": false,
              "type": "Social",
              "max": 6,
              "label": "SWFFG.SkillsNameLeadership",
              "abrev": "SWFFG.SkillsNameLeadership",
            },
            "Mechanics": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameMechanics",
              "abrev": "SWFFG.SkillsNameMechanics",
            },
            "Medicine": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameMedicine",
              "abrev": "SWFFG.SkillsNameMedicine",
            },
            "Negotiation": {
              "rank": 0,
              "characteristic": "Presence",
              "groupskill": false,
              "careerskill": false,
              "type": "Social",
              "max": 6,
              "label": "SWFFG.SkillsNameNegotiation",
              "abrev": "SWFFG.SkillsNameNegotiation",
            },
            "Operating": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameOperating",
              "abrev": "SWFFG.SkillsNameOperating",
            },
            "Perception": {
              "rank": 0,
              "characteristic": "Cunning",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNamePerception",
              "abrev": "SWFFG.SkillsNamePerception",
            },
            "Piloting": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNamePiloting",
              "abrev": "SWFFG.SkillsNamePiloting",
            },
            "Resilience": {
              "rank": 0,
              "characteristic": "Brawn",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameResilience",
              "abrev": "SWFFG.SkillsNameResilience",
            },
            "Riding": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameRiding",
              "abrev": "SWFFG.SkillsNameRiding",
            },
            "Skulduggery": {
              "rank": 0,
              "characteristic": "Cunning",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameSkulduggery",
              "abrev": "SWFFG.SkillsNameSkulduggery",
            },
            "Stealth": {
              "rank": 0,
              "characteristic": "Agility",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameStealth",
              "abrev": "SWFFG.SkillsNameStealth",
            },
            "Streetwise": {
              "rank": 0,
              "characteristic": "Cunning",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameStreetwise",
              "abrev": "SWFFG.SkillsNameStreetwise",
            },
            "Survival": {
              "rank": 0,
              "characteristic": "Cunning",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameSurvival",
              "abrev": "SWFFG.SkillsNameSurvival",
            },
            "Vigilance": {
              "rank": 0,
              "characteristic": "Willpower",
              "groupskill": false,
              "careerskill": false,
              "type": "General",
              "max": 6,
              "label": "SWFFG.SkillsNameVigilance",
              "abrev": "SWFFG.SkillsNameVigilance",
            },
            "Knowledge": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "Knowledge",
              "max": 6,
              "label": "SWFFG.SkillsNameKnowledge",
              "abrev": "SWFFG.SkillsNameKnowledge",
            },
            "Arcana": {
              "rank": 0,
              "characteristic": "Intellect",
              "groupskill": false,
              "careerskill": false,
              "type": "Magic",
              "max": 6,
              "label": "SWFFG.SkillsNameArcana",
              "abrev": "SWFFG.SkillsNameArcana",
            },
            "Divine": {
              "rank": 0,
              "characteristic": "Willpower",
              "groupskill": false,
              "careerskill": false,
              "type": "Magic",
              "max": 6,
              "label": "SWFFG.SkillsNameDivine",
              "abrev": "SWFFG.SkillsNameDivine",
            },
            "Primal": {
              "rank": 0,
              "characteristic": "Cunning",
              "groupskill": false,
              "careerskill": false,
              "type": "Magic",
              "max": 6,
              "label": "SWFFG.SkillsNamePrimal",
              "abrev": "SWFFG.SkillsNamePrimal",
            },
          },
        },
      ]);

      game.settings.set("starwarsffg", "arraySkillList", defaultSkillArrayString);
      game.settings.set("starwarsffg", "skilltheme", "starwars");

      window.location.reload();

      this.close();
    });

    html.find(".dialog-button").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const form = html[0];
      if (!form.data.files.length) return ui.notifications.error("You did not upload a data file!");
      const text = await readTextFromFile(form.data.files[0]);

      let currentSkillList = await JSON.parse(game.settings.get("starwarsffg", "arraySkillList"));

      const newSkillList = JSON.parse(text);

      Object.keys(newSkillList.skills).forEach((skill) => {
        if (!newSkillList.skills[skill].custom && !newSkillList.skills[skill].label.includes("SWFFG.")) {
          newSkillList.skills[skill].custom = true;
        }
      });

      currentSkillList.push(newSkillList);
      const newMasterSkillListData = JSON.stringify(currentSkillList);

      game.settings.set("starwarsffg", "arraySkillList", newMasterSkillListData);

      window.location.reload();

      this.close();
    });
  }
}
