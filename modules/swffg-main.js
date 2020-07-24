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
import { ActorSheetFFG } from "./actors/actor-sheet-ffg.js";
import { AdversarySheetFFG } from "./actors/adversary-sheet-ffg.js";
import { DicePoolFFG, RollFFG } from "./dice-pool-ffg.js";
import { GroupManagerLayer } from "./groupmanager-ffg.js";
import { GroupManager } from "./groupmanager-ffg.js";
import PopoutEditor from "./popout-editor.js";
import DataImporter from "./importer/data-importer.js";
import DiceHelpers from "./helpers/dice-helpers.js";
import Helpers from "./helpers/common.js";
import TemplateHelpers from "./helpers/partial-templates.js";

// Import Dice Types
import { AbilityDie, BoostDie, ChallengeDie, DifficultyDie, ForceDie, ProficiencyDie, SetbackDie } from "./dice-pool-ffg.js";

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
    addons: {
      PopoutEditor,
    },
    diceterms: [AbilityDie, BoostDie, ChallengeDie, DifficultyDie, ForceDie, ProficiencyDie, SetbackDie],
  };

  // Check required module is active and store result to game.requirements_installed
  const moduletest = game.data.modules.reduce(function (arr, mod, index) {
    return { ...arr, [mod.id]: mod };
  }, {});
  game.requirements_installed = moduletest["special-dice-roller"].active;

  game.ffg.StarWars = game.specialDiceRoller.starWars.parsers[0];
  game.ffg.DestinyPool = {
    "Light": 0,
    "Dark": 0,
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
  CONFIG.Dice.rolls["RollFFG"] = RollFFG;

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

  // A very hacky temporary workaround to override how initiative functions and provide the results of a FFG roll to the initiative tracker.
  // Currently overriding the prototype due to a bug with overriding the core Combat entity which resets to default after page refresh.
  /** @override */
  Combat.prototype._getInitiativeRoll = function (combatant, formula) {
    const cData = combatant.actor.data.data;
    const origFormula = formula;

    if (combatant.actor.data.type === "vehicle") {
      return new Roll("0");
    }

    if (formula === "Vigilance") {
      formula = _getInitiativeFormula(cData.skills.Vigilance.rank, cData.characteristics.Willpower.value, 0);
    } else if (formula === "Cool") {
      formula = _getInitiativeFormula(cData.skills.Cool.rank, cData.characteristics.Presence.value, 0);
    }

    const rollData = combatant.actor ? combatant.actor.getRollData() : {};
    const letters = formula.split("");
    const rolls = [];
    const getSuc = new RegExp("Successes: ([0-9]+)", "g");
    const getAdv = new RegExp("Advantages: ([0-9]+)", "g");

    for (const letter of letters) {
      rolls.push(game.ffg.StarWars.letterToRolls(letter, 1));
    }

    let newformula = combineAll(rolls, game.ffg.StarWars.rollValuesMonoid);

    let rolling = game.specialDiceRoller.starWars.roll(newformula);

    let results = game.specialDiceRoller.starWars.formatRolls(rolling);

    let success = 0;
    let advantage = 0;

    success = getSuc.exec(results);
    if (success) {
      success = success[1];
    }
    advantage = getAdv.exec(results);
    if (advantage) {
      advantage = advantage[1];
    }

    let total = +success + advantage * 0.01;

    CONFIG.logger.log(`Total is: ${total}`);

    let roll = new Roll(`0d6 ${origFormula}`, rollData).roll();
    roll._result = total;
    roll._total = total;

    return roll;
  };

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
      if (canvas.groupmanager.window) {
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

  game.settings.register("starwarsffg", "enableSoakCalc", {
    name: game.i18n.localize("SWFFG.EnableSoakCalc"),
    hint: game.i18n.localize("SWFFG.EnableSoakCalcHint"),
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
      const groupmanager = canvas.groupmanager.window;
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
      const groupmanager = canvas.groupmanager.window;
      if (groupmanager) {
        groupmanager.render();
      }
    },
  });
  game.settings.register("starwarsffg", "dPoolDark", {
    name: "Destiny Pool Dark",
    scope: "world",
    default: 0,
    config: false,
    type: Number,
    onChange: (rule) => {
      const groupmanager = canvas.groupmanager.window;
      if (groupmanager) {
        groupmanager.render();
      }
    },
  });

  // Importer Control Menu
  game.settings.registerMenu("starwarsffg", "odImporter", {
    name: "Data Import",
    label: "OggDude Dataset Importer",
    hint: "Import data from an OggDude Dataset into Foundry",
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

  game.settings.register("starwarsffg", "enableDebug", {
    name: game.i18n.localize("SWFFG.EnableDebug"),
    hint: game.i18n.localize("SWFFG.EnableDebugHint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: (rule) => window.location.reload(),
  });

  function combineAll(values, monoid) {
    return values.reduce((prev, curr) => monoid.combine(prev, curr), monoid.identity);
  }

  function _getInitiativeFormula(skill, ability, difficulty) {
    const dicePool = new DicePoolFFG({
      ability: ability,
      difficulty: difficulty,
    });
    dicePool.upgrade(skill);
    return dicePool.renderDiceExpression();
  }

  // Set up dice results with dynamic dice theme
  const dicetheme = game.settings.get("starwarsffg", "dicetheme");

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
    12: { label: `<img src='systems/starwarsffg/images/dice/${dicetheme}/yellowr.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 1, despair: 0, light: 0, dark: 0 },
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
  Actors.registerSheet("ffg", ActorSheetFFG, { makeDefault: true });
  Actors.registerSheet("ffg", AdversarySheetFFG, { types: ["character"] });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("ffg", ItemSheetFFG, { makeDefault: true });

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

  Handlebars.registerHelper("renderDiceTags", function (string) {
    return PopoutEditor.renderDiceImages(string);
  });

  Handlebars.registerHelper("calculateSpecializationTalentCost", function (idString) {
    const id = parseInt(idString.replace("talent", ""), 10);

    const cost = (Math.trunc(id / 4) + 1) * 5;

    return cost;
  });

  TemplateHelpers.preload();
});

/* -------------------------------------------- */
/*  Set up control buttons                      */
/* -------------------------------------------- */

Hooks.on("getSceneControlButtons", (controls) => {
  controls.push({
    name: "groupmanager",
    title: "Group Manager",
    icon: "fas fa-users",
    layer: "GroupManagerLayer",
    tools: [
      {
        name: "groupsheet",
        title: "Open Group Sheet",
        icon: "fas fa-users",
        onClick: () => {
          canvas.groupmanager.window = new GroupManager().render(true);
        },
        button: true,
      },
    ],
  });
});

Hooks.once("canvasInit", (canvas) => {
  canvas.groupmanager = canvas.stage.addChildAt(new GroupManagerLayer(canvas), 8);

  // Check for required modules and throw error notice if missing.
  if (!game.requirements_installed) {
    ui.notifications.error("ERROR: You must install and activate the 'Special-Dice-Roller' module in order for this system to function correctly.");
    console.error("ERROR: You must install and activate the 'Special-Dice-Roller' module in order for this system to function correctly.");
  }
});

Hooks.on("renderJournalSheet", (journal, obj, data) => {
  let content = $(obj).find(".editor-content").html();

  $(obj).find(".editor-content").html(PopoutEditor.renderDiceImages(content));
});

Hooks.on("renderSidebarTab", (app, html, data) => {
  html.find(".roll-type-select label").click(async (event) => {
    const dicePool = new DicePoolFFG();

    await DiceHelpers.displayRollDialog(game.user, dicePool, game.i18n.localize("SWFFG.RollingDefaultTitle"), "");
  });
});

// Handle migration duties
Hooks.once("ready", () => {
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
});

Hooks.once('diceSoNiceReady', (dice3d) => {
  let dicetheme = game.settings.get("starwarsffg", "dicetheme");
  if(!dicetheme || dicetheme == "starwars"){
    dice3d.addSystem({id:"swffg",name:"Star Wars FFG"},true);

    //swffg dice 
    dice3d.addDicePreset({
      type:"da",
      labels:['','s',"s","s\ns",'a','s',"s\na",'a\na'],
      font:"SWRPG-Symbol-Regular",
      colorset:"green",
      system:"swffg"
    },"d8");

    dice3d.addDicePreset({
      type:"dd",
      labels:['','f',"f\nf",'t','t',"t", "t\nt", 'f\nt'],
      font:"SWRPG-Symbol-Regular",
      colorset:"purple",
      system:"swffg"
    },"d8");

    dice3d.addDicePreset({
      type:"dp",
      labels:["","s","s","s\ns","s\ns","a","s\na","s\na","s\na","a\na","a\na","x"],
      font:"SWRPG-Symbol-Regular",
      colorset:"yellow",
      system:"swffg"
    },"d12");

    dice3d.addDicePreset({
      type:"dc",
      labels:["","f","f","f\nf","f\nf","t","t","f\nt","f\nt","t\nt","t\nt","y"],
      font:"SWRPG-Symbol-Regular",
      colorset:"red",
      system:"swffg"
    },"d12");

    dice3d.addDicePreset({
      type:"df",
      labels:['\nz','\nz','\nz','\nz','\nz','\nz','z\nz','\nZ','\nZ','Z\nZ','Z\nZ','Z\nZ'],
      font:"SWRPG-Symbol-Regular",
      colorset:"white",
      system:"swffg"
    },"d12");

    dice3d.addDicePreset({
      type:"db",
      labels:['','',"s","s  \n  a","a  \n  a",'a'],
      font:"SWRPG-Symbol-Regular",
      colorset:"blue",
      system:"swffg"
    },"d6");

    dice3d.addDicePreset({
      type:"ds",
      labels:['','','f','f','t','t'],
      font:"SWRPG-Symbol-Regular",
      colorset:"black",
      system:"swffg"
    },"d6"); 
  } else { //genesys
    dice3d.addSystem({id:"genesys",name:"Genesys"},true);

    dice3d.addDicePreset({
      type:"da",
      labels:['','s',"s","s\ns",'a','s',"s\na",'a\na'],
      font:"Genesys",
      colorset:"green",
      system:"genesys"
    },"d8");

    dice3d.addDicePreset({
      type:"dd",
      labels:['','f',"f\nf",'h','h',"h", "h\nh", 'f\nh'],
      font:"Genesys",
      colorset:"purple",
      system:"genesys"
    },"d8");

    dice3d.addDicePreset({
      type:"dp",
      labels:["","s","s","s\ns","s\ns","a","s\na","s\na","s\na","a\na","a\na","t"],
      font:"Genesys",
      colorset:"yellow",
      system:"genesys"
    },"d12");

    dice3d.addDicePreset({
      type:"dc",
      labels:["","f","f","f\nf","f\nf","h","h","f\nh","f\nh","h\nh","h\nh","d"],
      font:"Genesys",
      colorset:"red",
      system:"genesys"
    },"d12");

    dice3d.addDicePreset({
      type:"df",
      labels:['\nz','\nz','\nz','\nz','\nz','\nz','z\nz','\nZ','\nZ','Z\nZ','Z\nZ','Z\nZ'],
      font:"SWRPG-Symbol-Regular",
      colorset:"white",
      system:"genesys"
    },"d12");

    dice3d.addDicePreset({
      type:"db",
      labels:['','',"s","s  \n  a","a  \n  a",'a'],
      font:"Genesys",
      colorset:"blue",
      system:"genesys"
    },"d6");

    dice3d.addDicePreset({
      type:"ds",
      labels:['','','f','f','h','h'],
      font:"Genesys",
      colorset:"black",
      system:"genesys"
    },"d6"); 
  }


  //sw dice colors
  dice3d.addColorset({
    name: 'yellow',
    description: 'SWFFG Yellow',
    category: 'Colors',
    foreground: "#000000",
    background: "#e1aa12",
    outline: 'none',
    texture: 'none'
  });

  dice3d.addColorset({
    name: 'blue',
    description: 'SWFFG Blue',
    category: 'Colors',
    foreground: "#000000",
    background: "#5789aa",
    outline: 'none',
    texture: 'none'
  });

  dice3d.addColorset({
    name: 'red',
    description: 'SWFFG Red',
    category: 'Colors',
    foreground: "#ffffff",
    background: "#7c151e",
    outline: 'none',
    texture: 'none'
  });

  dice3d.addColorset({
    name: 'green',
    description: 'SWFFG Green',
    category: 'Colors',
    foreground: "#000000",
    background: "#127e12",
    outline: 'none',
    texture: 'none'
  });

  dice3d.addColorset({
    name: 'purple',
    description: 'SWFFG purple',
    category: 'Colors',
    foreground: "#ffffff",
    background: "#6d1287",
    outline: 'none',
    texture: 'none'
  });
});

