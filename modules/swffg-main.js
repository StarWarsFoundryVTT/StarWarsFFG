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
import { DicePoolFFG } from "./dice-pool-ffg.js";
import { GroupManagerLayer } from "./groupmanager-ffg.js";
import { GroupManager } from "./groupmanager-ffg.js";
import PopoutEditor from "./popout-editor.js";

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
    addons: {
      PopoutEditor
    }
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

  // Define custom Entity classes. This will override the default Actor
  // to instead use our extended version.
  CONFIG.Actor.entityClass = ActorFFG;
  CONFIG.Item.entityClass = ItemFFG;
  CONFIG.Combat.entityClass = CombatFFG;

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

    console.log(`Total is: ${total}`);

    let roll = new Roll(origFormula, rollData).roll();
    roll._result = total;
    roll._total = total;

    return roll;
  };

  // TURN ON OR OFF HOOK DEBUGGING
  CONFIG.debug.hooks = false;

  // Give global access to FFG config.
  CONFIG.FFG = FFG;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  // Register initiative rule
  game.settings.register("starwarsffg", "initiativeRule", {
    name: "Initiative Type",
    hint: "Choose between Vigilance or Cool for Initiative rolls.",
    scope: "world",
    config: true,
    default: "v",
    type: String,
    choices: {
      v: "Use Vigilance",
      c: "Use Cool",
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

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("ffg", ActorSheetFFG, { makeDefault: true });
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

  Handlebars.registerHelper("renderDiceTags", function(string) {
    return PopoutEditor.renderDiceImages(string);
  });
});

/* -------------------------------------------- */
/*  Set up control buttons                      */
/* -------------------------------------------- */

Hooks.on("getSceneControlButtons", (controls) => {
  if (game.user.isGM) {
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
  }
});

Hooks.once("canvasInit", (canvas) => {
  canvas.groupmanager = canvas.stage.addChildAt(new GroupManagerLayer(canvas), 8);

  // Check for required modules and throw error notice if missing.
  if (!game.requirements_installed) {
    ui.notifications.error("ERROR: You must install and activate the 'Special-Dice-Roller' module in order for this system to function correctly.");
    console.error("ERROR: You must install and activate the 'Special-Dice-Roller' module in order for this system to function correctly.");
  }
});
