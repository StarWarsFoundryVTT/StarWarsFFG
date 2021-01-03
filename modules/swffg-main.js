/**
 * A systems implementation of the Star Wars RPG by Fantasy Flight Games.
 * Author: Esrin
 * Software License: GNU GPLv3
 */

// Import Modules
import { FFG } from "./swffg-config.js";
import { ActorFFG } from "./actors/actor-ffg.js";
import { CombatFFG } from "./combat-ffg.js";
import { ItemFFG } from "./items/item-ffg.js";
import { ItemSheetFFG } from "./items/item-sheet-ffg.js";
import { ItemSheetFFGV2 } from "./items/item-sheet-ffg-v2.js";
import { ActorSheetFFG } from "./actors/actor-sheet-ffg.js";
import { ActorSheetFFGV2 } from "./actors/actor-sheet-ffg-v2.js";
import { AdversarySheetFFG } from "./actors/adversary-sheet-ffg.js";
import { AdversarySheetFFGV2 } from "./actors/adversary-sheet-ffg-v2.js";
import { DicePoolFFG, RollFFG } from "./dice-pool-ffg.js";
import { GroupManagerLayer } from "./groupmanager-ffg.js";
import { GroupManager } from "./groupmanager-ffg.js";
import PopoutEditor from "./popout-editor.js";
import DataImporter from "./importer/data-importer.js";
import SWAImporter from "./importer/swa-importer.js";
import CharacterImporter from "./importer/character-importer.js";
import DiceHelpers from "./helpers/dice-helpers.js";
import Helpers from "./helpers/common.js";
import TemplateHelpers from "./helpers/partial-templates.js";
import SkillListImporter from "./importer/skills-list-importer.js";
import DestinyTracker from "./ffg-destiny-tracker.js";
import { defaultSkillArrayString } from "./config/ffg-skillslist.js";

// Import Dice Types
import { AbilityDie, BoostDie, ChallengeDie, DifficultyDie, ForceDie, ProficiencyDie, SetbackDie } from "./dice-pool-ffg.js";
import ImportHelpers from "./importer/import-helpers.js";
import { createFFGMacro } from "./helpers/macros.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function () {
  console.log(`Initializing SWFFG System`);

  // Place our classes in their own namespace for later reference.
  game.ffg = {
    ActorFFG,
    ItemFFG,
    CombatFFG,
    RollFFG,
    DiceHelpers,
    addons: {
      PopoutEditor,
    },
    diceterms: [AbilityDie, BoostDie, ChallengeDie, DifficultyDie, ForceDie, ProficiencyDie, SetbackDie],
  };

  // Define custom log prefix and logger
  CONFIG.module = "Starwars FFG";
  CONFIG.logger = Helpers.logger;

  // Define custom Entity classes. This will override the default Actor
  // to instead use our extended version.
  CONFIG.Actor.entityClass = ActorFFG;
  CONFIG.Item.entityClass = ItemFFG;
  CONFIG.Combat.entityClass = CombatFFG;

  // Define custom Roll class
  CONFIG.Dice.rolls.push(CONFIG.Dice.rolls[0]);
  CONFIG.Dice.rolls[0] = RollFFG;

  // Define DiceTerms
  CONFIG.Dice.terms["a"] = AbilityDie;
  CONFIG.Dice.terms["b"] = BoostDie;
  CONFIG.Dice.terms["c"] = ChallengeDie;
  CONFIG.Dice.terms["d"] = DifficultyDie;
  CONFIG.Dice.terms["f"] = ForceDie;
  CONFIG.Dice.terms["p"] = ProficiencyDie;
  CONFIG.Dice.terms["s"] = SetbackDie;

  // Give global access to FFG config.
  CONFIG.FFG = FFG;

  // TURN ON OR OFF HOOK DEBUGGING
  CONFIG.debug.hooks = false;

  // Override the default Token _drawBar function to allow for FFG style wound and strain values.
  Token.prototype._drawBar = function (number, bar, data) {
    let val = Number(data.value);
    // FFG style behaviour for wounds and strain.
    if (data.attribute === "stats.wounds" || data.attribute === "stats.strain") {
      val = Number(data.max - data.value);
    }

    const pct = Math.clamped(val, 0, data.max) / data.max;
    let h = Math.max(canvas.dimensions.size / 12, 8);
    if (this.data.height >= 2) h *= 1.6; // Enlarge the bar for large tokens
    // Draw the bar
    let color = number === 0 ? [1 - pct / 2, pct, 0] : [0.5 * pct, 0.7 * pct, 0.5 + pct / 2];
    bar
      .clear()
      .beginFill(0x000000, 0.5)
      .lineStyle(2, 0x000000, 0.9)
      .drawRoundedRect(0, 0, this.w, h, 3)
      .beginFill(PIXI.utils.rgb2hex(color), 0.8)
      .lineStyle(1, 0x000000, 0.8)
      .drawRoundedRect(1, 1, pct * (this.w - 2), h - 2, 2);
    // Set position
    let posY = number === 0 ? this.h - h : 0;
    bar.position.set(0, posY);
  };

  // Load character templates so that dynamic skills lists work correctly
  loadTemplates(["systems/starwarsffg/templates/actors/ffg-character-sheet.html", "systems/starwarsffg/templates/actors/ffg-minion-sheet.html"]);

  game.settings.register("starwarsffg", "systemMigrationVersion", {
    name: "Current Version",
    scope: "world",
    default: null,
    config: false,
    type: String,
  });

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  // Register initiative rule
  game.settings.register("starwarsffg", "initiativeRule", {
    name: game.i18n.localize("SWFFG.InitiativeMode"),
    hint: game.i18n.localize("SWFFG.InitiativeModeHint"),
    scope: "world",
    config: true,
    default: "v",
    type: String,
    choices: {
      v: game.i18n.localize("SWFFG.SkillsNameVigilance"),
      c: game.i18n.localize("SWFFG.SkillsNameCool"),
    },
    onChange: (rule) => _setffgInitiative(rule),
  });
  _setffgInitiative(game.settings.get("starwarsffg", "initiativeRule"));

  function _setffgInitiative(initMethod) {
    let formula;
    switch (initMethod) {
      case "v":
        formula = "Vigilance";
        break;

      case "c":
        formula = "Cool";
        break;
    }

    CONFIG.Combat.initiative = {
      formula: formula,
      decimals: 2,
    };
    if (canvas) {
      if (canvas?.groupmanager?.window) {
        canvas.groupmanager.window.render(true);
      }
    }
  }

  // Register dice theme setting
  game.settings.register("starwarsffg", "dicetheme", {
    name: game.i18n.localize("SWFFG.SettingsDiceTheme"),
    hint: game.i18n.localize("SWFFG.SettingsDiceThemeHint"),
    scope: "world",
    config: true,
    default: "starwars",
    type: String,
    onChange: (rule) => window.location.reload(),
    choices: {
      starwars: "starwars",
      genesys: "genesys",
    },
  });

  async function gameSkillsList() {
    game.settings.registerMenu("starwarsffg", "addskilltheme", {
      name: game.i18n.localize("SWFFG.SettingsSkillListImporter"),
      label: game.i18n.localize("SWFFG.SettingsSkillListImporterLabel"),
      hint: game.i18n.localize("SWFFG.SettingsSkillListImporterHint"),
      icon: "fas fa-file-import",
      type: SkillListImporter,
      restricted: true,
    });

    game.settings.register("starwarsffg", "addskilltheme", {
      name: "Item Importer",
      scope: "world",
      default: {},
      config: false,
      default: {},
      type: Object,
    });

    game.settings.register("starwarsffg", "arraySkillList", {
      name: "Skill List",
      scope: "world",
      default: defaultSkillArrayString,
      config: false,
      type: String,
    });

    let skillList = JSON.parse(game.settings.get("starwarsffg", "arraySkillList"));
    try {
      CONFIG.FFG.alternateskilllists = skillList;

      let skillChoices = {};

      skillList.forEach((list) => {
        skillChoices[list.id] = list.id;
      });

      game.settings.register("starwarsffg", "skilltheme", {
        name: game.i18n.localize("SWFFG.SettingsSkillTheme"),
        hint: game.i18n.localize("SWFFG.SettingsSkillThemeHint"),
        scope: "world",
        config: true,
        default: "starwars",
        type: String,
        onChange: (rule) => {
          window.location.reload();
        },
        choices: skillChoices,
      });

      if (game.settings.get("starwarsffg", "skilltheme") !== "starwars") {
        const altSkills = CONFIG.FFG.alternateskilllists.find((list) => list.id === game.settings.get("starwarsffg", "skilltheme")).skills;

        let skills = {};
        Object.keys(altSkills).forEach((skillKey) => {
          if (altSkills?.[skillKey]?.value) {
            skills[skillKey] = { ...altSkills[skillKey] };
          } else {
            skills[skillKey] = { value: skillKey, ...altSkills[skillKey] };
          }
        });

        const sorted = Object.keys(skills).sort(function (a, b) {
          const x = game.i18n.localize(skills[a].abrev);
          const y = game.i18n.localize(skills[b].abrev);

          return x < y ? -1 : x > y ? 1 : 0;
        });

        let ordered = {};
        sorted.forEach((skill) => {
          ordered[skill] = skills[skill];
        });

        CONFIG.FFG.skills = ordered;
      }
    } catch (err) {}

    Hooks.on("createActor", (actor) => {
      let skilllist = game.settings.get("starwarsffg", "skilltheme");

      if (CONFIG.FFG?.alternateskilllists?.length) {
        try {
          let skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === skilllist)));
          CONFIG.logger.log(`Applying skill theme ${skilllist} to actor`);

          Object.keys(actor.data.data.skills).forEach((skill) => {
            if (!skills.skills[skill] && !skills?.skills[skill]?.nontheme) {
              skills.skills[`-=${skill}`] = null;
            }
          });

          actor.update({
            data: {
              skills: skills.skills,
            },
          });
        } catch (err) {
          CONFIG.logger.warn(err);
        }
      }
    });
  }

  gameSkillsList();

  game.settings.register("starwarsffg", "enableSoakCalc", {
    name: game.i18n.localize("SWFFG.EnableSoakCalc"),
    hint: game.i18n.localize("SWFFG.EnableSoakCalcHint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: (rule) => window.location.reload(),
  });

  // Register grouping talents so people can let them be ordered by purchase history
  game.settings.register("starwarsffg", "talentSorting", {
    name: "Sort Talents",
    hint: "Enable grouping Talents by activation",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: (rule) => window.location.reload(),
  });

  // Register skill sorting by localised value setting
  game.settings.register("starwarsffg", "skillSorting", {
    name: game.i18n.localize("SWFFG.SettingsSkillSorting"),
    hint: game.i18n.localize("SWFFG.SettingsSkillSortingHint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: (rule) => window.location.reload(),
  });

  // Register setting for group manager Player Character List display mode
  game.settings.register("starwarsffg", "pcListMode", {
    name: game.i18n.localize("SWFFG.SettingsPCListMode"),
    hint: game.i18n.localize("SWFFG.SettingsPCListModeHint"),
    scope: "world",
    config: true,
    default: "active",
    type: String,
    choices: {
      active: game.i18n.localize("SWFFG.SettingsPCListModeActive"),
      owned: game.i18n.localize("SWFFG.SettingsPCListModeOwned"),
    },
    onChange: (rule) => {
      const groupmanager = canvas?.groupmanager?.window;
      if (groupmanager) {
        groupmanager.render();
      }
    },
  });

  // Register placeholder settings to store Destiny Pool values for the group manager.
  game.settings.register("starwarsffg", "dPoolLight", {
    name: "Destiny Pool Light",
    scope: "world",
    default: 0,
    config: false,
    type: Number,
    onChange: (rule) => {
      const groupmanager = canvas?.groupmanager?.window;
      if (groupmanager) {
        groupmanager.render();
      }
      let destinyLight = game.settings.get("starwarsffg", "dPoolLight");
      document.getElementById("destinyLight").setAttribute("data-value", destinyLight);
      document.getElementById("destinyLight").innerHTML = destinyLight + `<span>${game.i18n.localize("SWFFG.Lightside")}</span>`;
    },
  });
  game.settings.register("starwarsffg", "dPoolDark", {
    name: "Destiny Pool Dark",
    scope: "world",
    default: 0,
    config: false,
    type: Number,
    onChange: (rule) => {
      const groupmanager = canvas?.groupmanager?.window;
      if (groupmanager) {
        groupmanager.render();
      }
      let destinyDark = game.settings.get("starwarsffg", "dPoolDark");
      document.getElementById("destinyDark").setAttribute("data-value", destinyDark);
      document.getElementById("destinyDark").innerHTML = destinyDark + `<span>${game.i18n.localize("SWFFG.Darkside")}</span>`;
    },
  });

  // Importer Control Menu
  game.settings.registerMenu("starwarsffg", "odImporter", {
    name: game.i18n.localize("SWFFG.SettingsOggDudeImporter"),
    hint: game.i18n.localize("SWFFG.SettingsOggDudeImporterHint"),
    label: game.i18n.localize("SWFFG.SettingsOggDudeImporterLabel"),
    icon: "fas fa-file-import",
    type: DataImporter,
    restricted: true,
  });

  game.settings.register("starwarsffg", "odImporter", {
    name: "Item Importer",
    scope: "world",
    default: {},
    config: false,
    default: {},
    type: Object,
  });

  game.settings.registerMenu("starwarsffg", "swaImporter", {
    name: game.i18n.localize("SWFFG.SettingsSWAdversariesImporter"),
    hint: game.i18n.localize("SWFFG.SettingsSWAdversariesImporterHint"),
    label: game.i18n.localize("SWFFG.SettingsSWAdversariesImporterLabel"),
    icon: "fas fa-file-import",
    type: SWAImporter,
    restricted: true,
  });

  game.settings.register("starwarsffg", "swaImporter", {
    name: "Adversaries Importer",
    scope: "world",
    default: {},
    config: false,
    default: {},
    type: Object,
  });

  game.settings.register("starwarsffg", "enableDebug", {
    name: game.i18n.localize("SWFFG.EnableDebug"),
    hint: game.i18n.localize("SWFFG.EnableDebugHint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: (rule) => window.location.reload(),
  });

  // Set up dice with dynamic dice theme
  const dicetheme = game.settings.get("starwarsffg", "dicetheme");
  CONFIG.FFG.theme = dicetheme;

  CONFIG.FFG.PROFICIENCY_ICON = `systems/starwarsffg/images/dice/${dicetheme}/yellow.png`;
  CONFIG.FFG.ABILITY_ICON = `systems/starwarsffg/images/dice/${dicetheme}/green.png`;
  CONFIG.FFG.CHALLENGE_ICON = `systems/starwarsffg/images/dice/${dicetheme}/red.png`;
  CONFIG.FFG.DIFFICULTY_ICON = `systems/starwarsffg/images/dice/${dicetheme}/purple.png`;
  CONFIG.FFG.BOOST_ICON = `systems/starwarsffg/images/dice/${dicetheme}/blue.png`;
  CONFIG.FFG.SETBACK_ICON = `systems/starwarsffg/images/dice/${dicetheme}/black.png`;
  CONFIG.FFG.REMOVESETBACK_ICON = `systems/starwarsffg/images/dice/${dicetheme}/black-minus.png`;
  CONFIG.FFG.FORCE_ICON = `systems/starwarsffg/images/dice/${dicetheme}/whiteHex.png`;

  CONFIG.FFG.ABILITY_RESULTS = {
    1: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/green.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    2: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/greens.png'/>`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    3: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/greens.png'/>`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    4: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/greenss.png'/>`, success: 2, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    5: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/greena.png'/>`, success: 0, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    6: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/greena.png'/>`, success: 0, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    7: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/greensa.png'/>`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    8: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/greenaa.png'/>`, success: 0, failure: 0, advantage: 2, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  };

  CONFIG.FFG.BOOST_RESULTS = {
    1: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/blue.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    2: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/blue.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    3: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/blues.png'/>`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    4: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/bluesa.png'/>`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    5: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/blueaa.png'/>`, success: 0, failure: 0, advantage: 2, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    6: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/bluea.png'/>`, success: 0, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  };

  CONFIG.FFG.CHALLENGE_RESULTS = {
    1: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/red.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    2: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/redf.png'/>`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    3: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/redf.png'/>`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    4: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/redff.png'/>`, success: 0, failure: 2, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    5: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/redff.png'/>`, success: 0, failure: 2, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    6: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/redt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    7: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/redt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    8: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/redft.png'/>`, success: 0, failure: 1, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    9: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/redft.png'/>`, success: 0, failure: 1, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    10: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/redtt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 2, triumph: 0, despair: 0, light: 0, dark: 0 },
    11: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/redtt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 2, triumph: 0, despair: 0, light: 0, dark: 0 },
    12: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/redd.png'/>`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 1, light: 0, dark: 0 },
  };

  CONFIG.FFG.DIFFICULTY_RESULTS = {
    1: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/purple.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    2: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/purplef.png'/>`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    3: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/purpleff.png'/>`, success: 0, failure: 2, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    4: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/purplet.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    5: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/purplet.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    6: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/purplet.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    7: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/purplett.png'/>`, success: 0, failure: 0, advantage: 0, threat: 2, triumph: 0, despair: 0, light: 0, dark: 0 },
    8: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/purpleft.png'/>`, success: 0, failure: 1, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  };

  CONFIG.FFG.FORCE_RESULTS = {
    1: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/whiten.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
    2: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/whiten.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
    3: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/whiten.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
    4: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/whiten.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
    5: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/whiten.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
    6: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/whiten.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
    7: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/whitenn.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 2 },
    8: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/whitel.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 1, dark: 0 },
    9: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/whitel.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 1, dark: 0 },
    10: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/whitell.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 2, dark: 0 },
    11: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/whitell.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 2, dark: 0 },
    12: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/whitell.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 2, dark: 0 },
  };

  CONFIG.FFG.PROFICIENCY_RESULTS = {
    1: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellow.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    2: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellows.png'/>`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    3: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellows.png'/>`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    4: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellowss.png'/>`, success: 2, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    5: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellowss.png'/>`, success: 2, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    6: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellowa.png'/>`, success: 0, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    7: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellowsa.png'/>`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    8: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellowsa.png'/>`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    9: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellowsa.png'/>`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    10: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellowaa.png'/>`, success: 0, failure: 0, advantage: 2, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    11: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellowaa.png'/>`, success: 0, failure: 0, advantage: 2, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    12: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellowr.png'/>`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 1, despair: 0, light: 0, dark: 0 },
  };

  CONFIG.FFG.SETBACK_RESULTS = {
    1: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/black.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    2: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/black.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    3: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/blackf.png'/>`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    4: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/blackf.png'/>`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
    5: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/blackt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
    6: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/blackt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  };

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("ffg", ActorSheetFFG, { makeDefault: true, label: "Actor Sheet v1" });
  Actors.registerSheet("ffg", ActorSheetFFGV2, { label: "Actor Sheet v2" });
  Actors.registerSheet("ffg", AdversarySheetFFG, { types: ["character"], label: "Adversary Sheet v1" });
  Actors.registerSheet("ffg", AdversarySheetFFGV2, { types: ["character"], label: "Adversary Sheet v2" });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("ffg", ItemSheetFFG, { makeDefault: true, label: "Item Sheet v1" });
  Items.registerSheet("ffg", ItemSheetFFGV2, { label: "Item Sheet v2" });

  // Add utilities to the global scope, this can be useful for macro makers
  window.DicePoolFFG = DicePoolFFG;

  // Register Handlebars utilities
  Handlebars.registerHelper("json", JSON.stringify);

  // Allows {if X = Y} type syntax in html using handlebars
  Handlebars.registerHelper("iff", function (a, operator, b, opts) {
    var bool = false;
    switch (operator) {
      case "==":
        bool = a == b;
        break;
      case ">":
        bool = a > b;
        break;
      case "<":
        bool = a < b;
        break;
      case "!=":
        bool = a != b;
        break;
      case "contains":
        if (a && b) {
          bool = a.includes(b);
        } else {
          bool = false;
        }
        break;
      default:
        throw "Unknown operator " + operator;
    }

    if (bool) {
      return opts.fn(this);
    } else {
      return opts.inverse(this);
    }
  });

  Handlebars.registerHelper("renderMultiple", function (count, obj) {
    let items = [];
    for (let i = 0; i < count; i += 1) {
      items.push(obj);
    }

    return new Handlebars.SafeString(items.join(""));
  });

  Handlebars.registerHelper("calculateSpecializationTalentCost", function (idString) {
    const id = parseInt(idString.replace("talent", ""), 10);

    const cost = (Math.trunc(id / 4) + 1) * 5;

    return cost;
  });

  Handlebars.registerHelper("calculateSignatureAbilityCost", function (idString) {
    const id = parseInt(idString.replace("upgrade", ""), 10);

    const cost = (Math.trunc(id / 4) + 2) * 5;

    return cost;
  });

  Handlebars.registerHelper("math", function (lvalue, operator, rvalue, options) {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);

    return {
      "+": lvalue + rvalue,
      "-": lvalue - rvalue,
      "*": lvalue * rvalue,
      "/": lvalue / rvalue,
      "%": lvalue % rvalue,
    }[operator];
  });

  Handlebars.registerHelper("contains", function (obj1, property, value, opts) {
    let bool = false;
    if (Array.isArray(obj1)) {
      bool = obj1.some((e) => e[property] === value);
    } else if (typeof obj1 === "object") {
      bool = Object.keys(obj1).some(function (k) {
        return obj1[k][property] === value;
      });
    } else if (typeof obj1 === "string") {
      return obj1.includes(property);
    }

    if (bool) {
      return opts.fn(this);
    } else {
      return opts.inverse(this);
    }
  });

  Handlebars.registerHelper("ffgDiceSymbols", function (text) {
    return PopoutEditor.renderDiceImages(text);
  });

  Handlebars.registerHelper("object", function ({ hash }) {
    return hash;
  });
  Handlebars.registerHelper("array", function () {
    return Array.from(arguments).slice(0, arguments.length - 1);
  });

  TemplateHelpers.preload();
});

Hooks.on("renderJournalSheet", (journal, obj, data) => {
  let content = $(obj).find(".editor-content").html();

  $(obj).find(".editor-content").html(PopoutEditor.renderDiceImages(content));
});

Hooks.on("renderSidebarTab", (app, html, data) => {
  html.find(".chat-control-icon").click(async (event) => {
    const dicePool = new DicePoolFFG();

    let user = {
      data: game.user.data,
    };

    await DiceHelpers.displayRollDialog(user, dicePool, game.i18n.localize("SWFFG.RollingDefaultTitle"), "");
  });
});

Hooks.on("renderActorDirectory", (app, html, data) => {
  // add character import button
  const div = $(`<div class="og-character-import"></div>`);
  const divider = $("<hr><h4>OggDude Import</h4>");
  const characterImportButton = $('<button class="og-character">Character</button>');
  div.append(divider, characterImportButton);

  html.find(".directory-footer").append(div);

  html.find(".og-character").click(async (event) => {
    event.preventDefault();
    new CharacterImporter().render(true);
  });
});

// Update chat messages with dice images
Hooks.on("renderChatMessage", (app, html, messageData) => {
  const content = html.find(".message-content");
  content[0].innerHTML = PopoutEditor.renderDiceImages(content[0].innerHTML);

  html.on("click", ".ffg-pool-to-player", () => {
    const poolData = messageData.message.flags.ffg;

    const dicePool = new DicePoolFFG(poolData.dicePool);

    DiceHelpers.displayRollDialog(poolData.roll.data, dicePool, poolData.description, poolData.roll.skillName, poolData.roll.item, poolData.roll.flavor, poolData.roll.sound);
  });
});

// Handle migration duties
Hooks.once("ready", async () => {
  game.settings.register("starwarsffg", "allowUsersAddRollAudio", {
    name: game.i18n.localize("SWFFG.EnableRollAudio"),
    hint: game.i18n.localize("SWFFG.EnableRollAudioHint"),
    scope: "world",
    default: false,
    config: true,
    type: Boolean,
  });

  const playlists = {};
  playlists["None"] = "";
  game.playlists.entries.forEach((playlist, index) => {
    playlists[playlist.id] = `${index}-${playlist.data.name}`;
  });

  game.settings.register("starwarsffg", "allowUsersAddRollAudioPlaylist", {
    name: game.i18n.localize("SWFFG.EnableRollAudioPlaylist"),
    hint: game.i18n.localize("SWFFG.EnableRollAudioPlaylistHint"),
    scope: "world",
    default: "None",
    config: true,
    type: String,
    choices: playlists,
  });

  const currentVersion = game.settings.get("starwarsffg", "systemMigrationVersion");

  if ((currentVersion === "null" || parseFloat(currentVersion) < parseFloat(game.system.data.version)) && game.user.isGM) {
    CONFIG.logger.log(`Migrating to from ${currentVersion} to ${game.system.data.version}`);

    // Calculating wound and strain .value from .real_value is no longer necessary due to the Token._drawBar() override in swffg-main.js
    // This is a temporary migration check to transfer existing actors .real_value back into the correct .value location.
    game.actors.forEach((actor) => {
      if (actor.data.type === "character" || actor.data.type === "minion") {
        if (actor.data.data.stats.wounds.real_value != null) {
          actor.data.data.stats.wounds.value = actor.data.data.stats.wounds.real_value;
          game.actors.get(actor._id).update({ ["data.stats.wounds.real_value"]: null });
          CONFIG.logger.log("Migrated stats.wounds.value from stats.wounds.real_value");
          CONFIG.logger.log(actor.data.data.stats.wounds);
        }
        if (actor.data.data.stats.strain.real_value != null) {
          actor.data.data.stats.strain.value = actor.data.data.stats.strain.real_value;
          game.actors.get(actor._id).update({ ["data.stats.strain.real_value"]: null });
          CONFIG.logger.log("Migrated stats.strain.value from stats.strain.real_value");
          CONFIG.logger.log(actor.data.data.stats.strain);
        }
      }
    });

    if (currentVersion === "null" || parseFloat(currentVersion) < 1.1) {
      // Migrate alternate skill lists from file if found
      try {
        let skillList = [];

        let data = await FilePicker.browse("data", `worlds/${game.world.id}`, { bucket: null, extensions: [".json", ".JSON"], wildcard: false });
        if (data.files.includes(`worlds/${game.world.id}/skills.json`)) {
          // if the skills.json file is found AND the skillsList in setting is the default skill list then read the data from the file.
          // This will make sure that the data from the JSON file overwrites the data in the setting.
          if ((await game.settings.get("starwarsffg", "arraySkillList")) === defaultSkillArrayString) {
            const fileData = await fetch(`/worlds/${game.world.id}/skills.json`).then((response) => response.json());
            await game.settings.set("starwarsffg", "arraySkillList", JSON.stringify(fileData));
            skillList = fileData;
          }
        } else {
          skillList = JSON.parse(game.settings.get("starwarsffg", "arraySkillList"));
        }

        CONFIG.FFG.alternateskilllists = skillList;
        if (game.settings.get("starwarsffg", "skilltheme") !== "starwars") {
          const altSkills = CONFIG.FFG.alternateskilllists.find((list) => list.id === game.settings.get("starwarsffg", "skilltheme")).skills;

          let skills = {};
          Object.keys(altSkills).forEach((skillKey) => {
            if (altSkills?.[skillKey]?.value) {
              skills[skillKey] = { ...altSkills[skillKey] };
            } else {
              skills[skillKey] = { value: skillKey, ...altSkills[skillKey] };
            }
          });

          const sorted = Object.keys(skills).sort(function (a, b) {
            const x = game.i18n.localize(skills[a].abrev);
            const y = game.i18n.localize(skills[b].abrev);

            return x < y ? -1 : x > y ? 1 : 0;
          });

          let ordered = {};
          sorted.forEach((skill) => {
            ordered[skill] = skills[skill];
          });

          CONFIG.FFG.skills = ordered;
        }
      } catch (err) {
        CONFIG.logger.error(err);
      }
    }

    if (currentVersion === "null" || parseFloat(currentVersion) < 1.3) {
      ui.notifications.info(`Migrating Starwars FFG System for version ${game.system.data.version}. Please be patient and do not close your game or shut down your server.`, { permanent: true });

      const pro = [];

      game.packs.entries.forEach((pack) => {
        pro.push(
          new Promise(async (resolve, reject) => {
            const content = await pack.getContent();
            CONFIG.logger.log(`Migrating ${pack.metadata.label} - ${content.length} Entries`);

            const isLocked = pack.locked;

            if (isLocked) {
              await pack.configure({ locked: false });
            }

            for (var i = 0; i < content.length; i++) {
              if (!content[i]?.data?.flags?.ffgimportid && content[i]?.data?.flags?.importid) {
                CONFIG.logger.debug(`Migrating (${content[i].data._id}) ${content[i].data.name}`);
                content[i].update({
                  flags: {
                    ffgimportid: content[i].data.flags.importid,
                  },
                });
              }
              resolve();
            }

            if (isLocked) {
              await pack.configure({ locked: true });
            }
          })
        );
      });

      Promise.all(pro)
        .then(() => {
          ui.notifications.info(`Starwars FFG System Migration to version ${game.system.data.version} completed!`, { permanent: true });
          game.settings.set("starwarsffg", "systemMigrationVersion", game.system.data.version);
        })
        .catch((err) => {
          CONFIG.logger.error(`Error during system migration`, err);
        });
    }
  }

  // enable functional testing
  if (game.user.isGM && window.location.href.includes("localhost") && game?.data?.system?.data?.test) {
    const command = `
      const testing = import('/systems/starwarsffg/tests/ffg-tests.js').then((mod) => {
      const tester = new mod.default();
      tester.render(true);
    });
    `;

    const macro = {
      name: "Functional Testing",
      type: "script",
      command: command,
    };

    const macroExists = game.macros.entities.find((m) => m.name === macro.name);
    if (!macroExists) {
      Macro.create(macro);
    }
  }

  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createFFGMacro(data, slot));

  Hooks.on("closeItemSheetFFG", (item) => {
    Hooks.call(`closeAssociatedTalent_${item.object.data._id}`, item);
  });

  // Display Destiny Pool
  let destinyPool = { light: game.settings.get("starwarsffg", "dPoolLight"), dark: game.settings.get("starwarsffg", "dPoolDark") };

  // future functionality to allow multiple menu items to be passed to destiny pool
  // const defaultDestinyMenu = [
  //   {
  //     name: game.i18n.localize("SWFFG.GroupManager"),
  //     icon: '<i class="fas fa-users"></i>',
  //     callback: () => {
  //       new GroupManager().render(true);
  //     }
  //   }
  // ]
  // const dTracker = new DestinyTracker({ menu: defaultDestinyMenu});

  const dTracker = new DestinyTracker();
  dTracker.render(true);
});

Hooks.once("diceSoNiceReady", (dice3d) => {
  let dicetheme = game.settings.get("starwarsffg", "dicetheme");
  if (!dicetheme || dicetheme == "starwars") {
    dice3d.addSystem({ id: "swffg", name: "Star Wars FFG" }, true);

    //swffg dice
    dice3d.addDicePreset(
      {
        type: "da",
        labels: ["", "s", "s", "s\ns", "a", "s", "s\na", "a\na"],
        font: "SWRPG-Symbol-Regular",
        colorset: "green",
        system: "swffg",
      },
      "d8"
    );

    dice3d.addDicePreset(
      {
        type: "dd",
        labels: ["", "f", "f\nf", "t", "t", "t", "t\nt", "f\nt"],
        font: "SWRPG-Symbol-Regular",
        colorset: "purple",
        system: "swffg",
      },
      "d8"
    );

    dice3d.addDicePreset(
      {
        type: "dp",
        labels: ["", "s", "s", "s\ns", "s\ns", "a", "s\na", "s\na", "s\na", "a\na", "a\na", "x"],
        font: "SWRPG-Symbol-Regular",
        colorset: "yellow",
        system: "swffg",
      },
      "d12"
    );

    dice3d.addDicePreset(
      {
        type: "dc",
        labels: ["", "f", "f", "f\nf", "f\nf", "t", "t", "f\nt", "f\nt", "t\nt", "t\nt", "y"],
        font: "SWRPG-Symbol-Regular",
        colorset: "red",
        system: "swffg",
      },
      "d12"
    );

    dice3d.addDicePreset(
      {
        type: "df",
        labels: ["\nz", "\nz", "\nz", "\nz", "\nz", "\nz", "z\nz", "\nZ", "\nZ", "Z\nZ", "Z\nZ", "Z\nZ"],
        font: "SWRPG-Symbol-Regular",
        colorset: "white-sw",
        system: "swffg",
      },
      "d12"
    );

    dice3d.addDicePreset(
      {
        type: "db",
        labels: ["", "", "s", "s  \n  a", "a  \n  a", "a"],
        font: "SWRPG-Symbol-Regular",
        colorset: "blue",
        system: "swffg",
      },
      "d6"
    );

    dice3d.addDicePreset(
      {
        type: "ds",
        labels: ["", "", "f", "f", "t", "t"],
        font: "SWRPG-Symbol-Regular",
        colorset: "black-sw",
        system: "swffg",
      },
      "d6"
    );
  } else {
    //genesys
    dice3d.addSystem({ id: "genesys", name: "Genesys" }, true);

    dice3d.addDicePreset(
      {
        type: "da",
        labels: ["", "s", "s", "s\ns", "a", "s", "s\na", "a\na"],
        font: "Genesys",
        colorset: "green",
        system: "genesys",
      },
      "d8"
    );

    dice3d.addDicePreset(
      {
        type: "dd",
        labels: ["", "f", "f\nf", "h", "h", "h", "h\nh", "f\nh"],
        font: "Genesys",
        colorset: "purple",
        system: "genesys",
      },
      "d8"
    );

    dice3d.addDicePreset(
      {
        type: "dp",
        labels: ["", "s", "s", "s\ns", "s\ns", "a", "s\na", "s\na", "s\na", "a\na", "a\na", "t"],
        font: "Genesys",
        colorset: "yellow",
        system: "genesys",
      },
      "d12"
    );

    dice3d.addDicePreset(
      {
        type: "dc",
        labels: ["", "f", "f", "f\nf", "f\nf", "h", "h", "f\nh", "f\nh", "h\nh", "h\nh", "d"],
        font: "Genesys",
        colorset: "red",
        system: "genesys",
      },
      "d12"
    );

    dice3d.addDicePreset(
      {
        type: "df",
        labels: ["\nz", "\nz", "\nz", "\nz", "\nz", "\nz", "z\nz", "\nZ", "\nZ", "Z\nZ", "Z\nZ", "Z\nZ"],
        font: "SWRPG-Symbol-Regular",
        colorset: "white-sw",
        system: "genesys",
      },
      "d12"
    );

    dice3d.addDicePreset(
      {
        type: "db",
        labels: ["", "", "s", "s  \n  a", "a  \n  a", "a"],
        font: "Genesys",
        colorset: "blue",
        system: "genesys",
      },
      "d6"
    );

    dice3d.addDicePreset(
      {
        type: "ds",
        labels: ["", "", "f", "f", "h", "h"],
        font: "Genesys",
        colorset: "black-sw",
        system: "genesys",
      },
      "d6"
    );
  }

  //sw dice colors
  dice3d.addColorset({
    name: "yellow",
    description: "SWFFG Yellow",
    category: "Colors",
    foreground: "#000000",
    background: "#e1aa12",
  });

  dice3d.addColorset({
    name: "blue",
    description: "SWFFG Blue",
    category: "Colors",
    foreground: "#000000",
    background: "#5789aa",
  });

  dice3d.addColorset({
    name: "red",
    description: "SWFFG Red",
    category: "Colors",
    foreground: "#ffffff",
    background: "#7c151e",
  });

  dice3d.addColorset({
    name: "green",
    description: "SWFFG Green",
    category: "Colors",
    foreground: "#000000",
    background: "#127e12",
  });

  dice3d.addColorset({
    name: "purple",
    description: "SWFFG purple",
    category: "Colors",
    foreground: "#ffffff",
    background: "#6d1287",
  });

  dice3d.addColorset({
    name: "black-sw",
    description: "SWFFG black",
    category: "Colors",
    foreground: "#ffffff",
    background: "#000000",
  });

  dice3d.addColorset({
    name: "white-sw",
    description: "SWFFG white",
    category: "Colors",
    foreground: "#000000",
    background: "#ffffff",
  });
});
