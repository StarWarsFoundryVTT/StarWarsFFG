/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { ActorFFG } from "./actors/actor-ffg.js";
import { GearSheetFFG } from "./sheets/gear-sheet-ffg.js";
import { WeaponSheetFFG } from "./sheets/weapon-sheet-ffg.js";
import { ArmourSheetFFG } from "./sheets/armour-sheet-ffg.js";
import { TalentSheetFFG } from "./sheets/talent-sheet-ffg.js";
import { ActorSheetFFG } from "./sheets/actor-sheet-ffg.js";
import { MinionSheetFFG } from "./sheets/minion-sheet-ffg.js";
import { DicePoolFFG } from "./dice-pool-ffg.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log(`Initializing SWFFG System`);

  // Place our classes in their own namespace for later reference.
   game.ffg = {
     ActorFFG
   };


  // Define custom Entity classes. This will override the default Actor
  // to instead use our extended version.
  CONFIG.Actor.entityClass = ActorFFG;


	/**
	 * Set an initiative formula for the system
	 * @type {String}
	 */
	CONFIG.Combat.initiative = {
	  formula: "1d20",
    decimals: 2
  };

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("ffg", ActorSheetFFG, {
    types: ["character"],
    makeDefault: true
  });
  Actors.registerSheet("ffg", MinionSheetFFG, {
    types: ["minion"],
    makeDefault: true
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("ffg", GearSheetFFG, {
    types: ["gear"],
    makeDefault: true
  });
  Items.registerSheet("ffg", WeaponSheetFFG, {
    types: ["weapon"],
    makeDefault: true
  });
  Items.registerSheet("ffg", ArmourSheetFFG, {
    types: ["armour"],
    makeDefault: true
  });
  Items.registerSheet("ffg", TalentSheetFFG, {
    types: ["talent"],
    makeDefault: true
  });

  // Add utilities to the global scope, this can be useful for macro makers
  window.DicePoolFFG = DicePoolFFG;

  // Register Handlebars utilities
  Handlebars.registerHelper("json", JSON.stringify);

  // Allows {if X = Y} type syntax in html using handlebars
  Handlebars.registerHelper('iff', function (a, operator, b, opts) {
    var bool = false;
    switch (operator) {
      case '==':
        bool = a == b;
        break;
      case '>':
        bool = a > b;
        break;
      case '<':
        bool = a < b;
        break;
      case '!=':
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
});
