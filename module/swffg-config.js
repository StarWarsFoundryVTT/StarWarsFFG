/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { SimpleItemSheet } from "./item-sheet.js";
import { ActorSheetFFG } from "./actor-sheet-ffg.js";
import { ActorSheetFFGVehicle } from "./ffg-actor-sheet-vehicle.js";
import { DicePoolFFG } from "./dice-pool-ffg.js"

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log(`Initializing Simple Worldbuilding System`);

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
  Actors.registerSheet("swffg", ActorSheetFFG, { makeDefault: true });
  Actors.registerSheet("swffg", ActorSheetFFGVehicle, { makeDefault: false });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("swffg", SimpleItemSheet, {makeDefault: true});

  // Add utilities to the global scope, this can be useful for macro makers
  window.DicePoolFFG = DicePoolFFG;

  // Register Handlebars utilities
  Handlebars.registerHelper("json", JSON.stringify);
});
