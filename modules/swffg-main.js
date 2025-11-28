/**
 * A systems implementation of the Star Wars RPG by Fantasy Flight Games.
 * Author: Esrin
 * Software License: GNU GPLv3
 */

// Import Modules
import { FFG } from "./swffg-config.js";
import { ActorFFG } from "./actors/actor-ffg.js";
import { TokenFFG } from "./tokens/token-ffg.js";
import CombatantFFG, {
  CombatFFG,
  CombatTrackerFFG,
  registerHandleCombatantRemoval,
  updateCombatTracker
} from "./combat-ffg.js";
import { ActiveEffectFFG} from "./active-effects/active-effect-ffg.js";
import { ItemFFG } from "./items/item-ffg.js";
import { ItemSheetFFG } from "./items/item-sheet-ffg.js";
import { ItemSheetFFGV2 } from "./items/item-sheet-ffg-v2.js";
import { ActorSheetFFG } from "./actors/actor-sheet-ffg.js";
import { ActorSheetFFGV2 } from "./actors/actor-sheet-ffg-v2.js";
import { AdversarySheetFFG } from "./actors/adversary-sheet-ffg.js";
import { AdversarySheetFFGV2 } from "./actors/adversary-sheet-ffg-v2.js";
import { DicePoolFFG, RollFFG } from "./dice-pool-ffg.js";
import { GroupManager } from "./groupmanager-ffg.js";
import PopoutEditor from "./popout-editor.js";

import DiceHelpers from "./helpers/dice-helpers.js";
import Helpers from "./helpers/common.js";
import TemplateHelpers from "./helpers/partial-templates.js";
import SkillListImporter from "./importer/skills-list-importer.js";
import DestinyTracker from "./ffg-destiny-tracker.js";
import { defaultSkillList } from "./config/ffg-skillslist.js";
import SettingsHelpers from "./settings/settings-helpers.js";
import {register_crew} from "./helpers/crew.js";

// Import Dice Types
import { AbilityDie, BoostDie, ChallengeDie, DifficultyDie, ForceDie, ProficiencyDie, SetbackDie } from "./dice-pool-ffg.js";
import { createFFGMacro, updateMacro } from "./helpers/macros.js";
import EmbeddedItemHelpers from "./helpers/embeddeditem-helpers.js";
import DataImporter from "./importer/data-importer.js";
import PauseFFG from "./apps/pause-ffg.js";
import FlagMigrationHelpers from "./helpers/flag-migration-helpers.js";
import RollBuilderFFG from "./dice/roll-builder.js";
import CrewSettings from "./settings/crew-settings.js";
import {register_dice_enricher, register_oggdude_tag_enricher, register_roll_tag_enricher} from "./helpers/journal.js";
import {drawAdversaryCount, drawMinionCount, registerTokenControls} from "./helpers/token.js";
import {handleUpdate} from "./swffg-migration.js";
import SWAImporter from "./importer/swa-importer.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

async function parseSkillList() {
  try {
    return JSON.parse(await game.settings.get("starwarsffg", "arraySkillList"));
  } catch (e) {
    CONFIG.logger.log("Could not parse custom skill list, returning raw setting");
    return await game.settings.get("starwarsffg", "arraySkillList");
  }
}

Hooks.on("setup", function (){
  // add dice symbol rendering to the text editor for journal pages
  register_roll_tag_enricher();
  register_oggdude_tag_enricher();
  register_dice_enricher();
});

Hooks.once("init", async function () {
  console.log(`Initializing SWFFG System`);
  // Place our classes in their own namespace for later reference.
  game.ffg = {
    ActorFFG,
    TokenFFG,
    ItemFFG,
    CombatFFG,
    CombatantFFG,
    CombatTrackerFFG,
    RollFFG,
    DiceHelpers,
    RollBuilderFFG,
    addons: {
      PopoutEditor,
    },
    diceterms: [AbilityDie, BoostDie, ChallengeDie, DifficultyDie, ForceDie, ProficiencyDie, SetbackDie],
    ActiveEffectFFG,
  };

  // Define custom log prefix and logger
  CONFIG.module = "Starwars FFG";
  CONFIG.logger = Helpers.logger;

  // Define custom Entity classes. This will override the default Actor
  // to instead use our extended version.
  CONFIG.Actor.documentClass = ActorFFG;
  CONFIG.Item.documentClass = ItemFFG;
  CONFIG.ActiveEffect.documentClass = ActiveEffectFFG;

  // we do not want the legacy active effect transfer mode
  // also, reeeeeeeeeeeeeeeee
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Define custom Roll class
  CONFIG.Dice.rolls.push(CONFIG.Dice.rolls[0]);
  CONFIG.Dice.rolls[0] = RollFFG;

  // Define DiceTerms
  CONFIG.Dice.terms["a"] = AbilityDie;
  CONFIG.Dice.terms["b"] = BoostDie;
  CONFIG.Dice.terms["c"] = ChallengeDie;
  CONFIG.Dice.terms["i"] = DifficultyDie;
  CONFIG.Dice.terms["f"] = ForceDie;
  CONFIG.Dice.terms["p"] = ProficiencyDie;
  CONFIG.Dice.terms["s"] = SetbackDie;

  // Give global access to FFG config.
  CONFIG.FFG = FFG;

  // TURN ON OR OFF HOOK DEBUGGING
  CONFIG.debug.hooks = false;

  CONFIG.ui.pause = PauseFFG;


   /**
   * Register statuses to add
   */
  game.settings.register("starwarsffg", "additionalStatuses", {
    name: game.i18n.localize("SWFFG.Settings.AdditionalStatuses.Name"),
    hint: game.i18n.localize("SWFFG.Settings.AdditionalStatuses.Hint"),
    scope: "world",
    config: false,
    default: "[]",
    type: String,
    onChange: (rule) => window.location.reload()
  });

  // register turn marker reconfigurator
  game.settings.register("starwarsffg", "configuredTurnMarker", {
    name: "configuredTurnMarker",
    hint: "configuredTurnMarker",
    scope: "world",
    config: false,
    default: false,
    type: Boolean,
  });

  // Override the default Token _drawBar function to allow for FFG style wound and strain values.
  foundry.canvas.placeables.Token.prototype._drawBar = function (number, bar, data) {
    let val = Number(data.value);
    // FFG style behaviour for wounds and strain.
    let aboveThreshold = 0;
    if (data.attribute === "stats.wounds" || data.attribute === "stats.strain" || data.attribute === "stats.hullTrauma" || data.attribute === "stats.systemStrain") {
      val = Number(data.max - data.value);
      aboveThreshold = Math.max(data.value - data.max, 0);
    }

    // draw the empty bar
    let h = Math.max(canvas.dimensions.size / 12, 8);
    bar.clear()
      .beginFill(0x000000, 0.5)
      .lineStyle(2, 0x000000, 0.9)
      .drawRoundedRect(0, 0, this.w, h, 3);
    let startX = 1;
    let startY = 1;

    const colors = {
      "stats.wounds": {
        ok: game.settings.get("starwarsffg", "ui-token-healthy"),
        damaged: game.settings.get("starwarsffg", "ui-token-wounded"),
        overDamaged: game.settings.get("starwarsffg", "ui-token-overwounded"),
      },
      "stats.hullTrauma": {
        ok: game.settings.get("starwarsffg", "ui-token-healthy"),
        damaged: game.settings.get("starwarsffg", "ui-token-wounded"),
        overDamaged: game.settings.get("starwarsffg", "ui-token-overwounded"),
      },
      "stats.strain": {
        ok: game.settings.get("starwarsffg", "ui-token-stamina-ok"),
        damaged: game.settings.get("starwarsffg", "ui-token-stamina-damaged"),
        overDamaged: game.settings.get("starwarsffg", "ui-token-stamina-over"),
      },
      "stats.systemStrain": {
        ok: game.settings.get("starwarsffg", "ui-token-stamina-ok"),
        damaged: game.settings.get("starwarsffg", "ui-token-stamina-damaged"),
        overDamaged: game.settings.get("starwarsffg", "ui-token-stamina-over"),
      },
    }

    if (["stats.wounds", "stats.hullTrauma", "stats.strain", "stats.systemStrain"].includes(data.attribute)) {
      if (aboveThreshold > 0) {
        // render the above-threshold portion of the bar
        let abovePct = Math.min(aboveThreshold / data.max, 1);
        bar
        .beginFill(colors[data.attribute]["overDamaged"], 0.8)
        .lineStyle(1, 0x000000, 0.8)
        .drawRoundedRect(startX, startY, abovePct * (this.w - 2), h - 2, 2);
        // render the rest as wounds
        startX = abovePct * (this.w - 2) + 1;
        let remainingLength = this.w  - abovePct * (this.w - 2) - 2;
        bar
        .beginFill(colors[data.attribute]["damaged"], 0.8)
        .lineStyle(1, 0x000000, 0.8)
        .drawRoundedRect(startX, startY, remainingLength, h - 2, 2);
      } else {
        // render healthy and then unhealthy portions of the bar
        let woundedPct = Math.min((data.max - data.value) / data.max, 1);
        bar
        .beginFill(colors[data.attribute]["ok"], 0.8)
        .lineStyle(1, 0x000000, 0.8)
        .drawRoundedRect(startX, startY, woundedPct * (this.w - 2), h - 2, 2);
        // remaining health
        startX = woundedPct * (this.w - 2) + 1;
        let remainingLength = this.w - woundedPct * (this.w - 2) - 2;
        bar
        .beginFill(colors[data.attribute]["damaged"], 0.8)
        .lineStyle(1, 0x000000, 0.8)
        .drawRoundedRect(startX, startY, remainingLength, h - 2, 2);
      }
    } else {
      // render normally
      const pct = Math.clamp(val, 0, data.max) / data.max;
      let color = number === 0 ? [1 - pct / 2, pct, 0] : [0.5 * pct, 0.7 * pct, 0.5 + pct / 2];
      bar
      .beginFill(PIXI.utils.rgb2hex(color), 0.8)
      .lineStyle(1, 0x000000, 0.8)
      .drawRoundedRect(1, 1, pct * (this.w - 2), h - 2, 2);
    }

    // Set position
    let posY = number === 0 ? this.h - h : 0;
    bar.position.set(0, posY);
  };

  // Load character templates so that dynamic skills lists work correctly
  await foundry.applications.handlebars.loadTemplates(["systems/starwarsffg/templates/actors/ffg-character-sheet.html", "systems/starwarsffg/templates/actors/ffg-minion-sheet.html"]);

  SettingsHelpers.initLevelSettings();

  const uitheme = game.settings.get("starwarsffg", "ui-uitheme");

  switch (uitheme) {
    case "mandar": {
      $('link[href*="styles/starwarsffg.css"]').prop("disabled", true);
      $("head").append('<link href="systems/starwarsffg/styles/mandar.css" rel="stylesheet" type="text/css" media="all">');
      break;
    }
    default: {
      $('link[href*="styles/starwarsffg.css"]').prop("disabled", false);
    }
  }

  /**
   * Register default XP spend notification
   */
  game.settings.register("starwarsffg", "notifyOnXpSpend", {
    name: game.i18n.localize("SWFFG.Settings.Purchase.Notify.Name"),
    hint: game.i18n.localize("SWFFG.Settings.Purchase.Notify.Hint"),
    scope: "world",
    config: false,
    default: true,
    type: Boolean,
  });

  /**
   * Register the option to use generic slots for combat
   */
  game.settings.register("starwarsffg", "useGenericSlots", {
    name: game.i18n.localize("SWFFG.Settings.UseGenericSlots.Name"),
    hint: game.i18n.localize("SWFFG.Settings.UseGenericSlots.Hint"),
    scope: "world",
    config: false,
    default: true,
    type: Boolean,
    onChange: (rule) => window.location.reload()
  });

  if (game.settings.get("starwarsffg", "useGenericSlots")) {
    CONFIG.ui.combat = CombatTrackerFFG;
    CONFIG.Combat.documentClass = CombatFFG;
    CONFIG.Combatant.documentClass = CombatantFFG;
    // override the token placeable object so we can control turn indicators
    CONFIG.Token.objectClass = TokenFFG;
  }

  /**
   * Register action to take when a user removes a combatant from combat
   */
  game.settings.register("starwarsffg", "removeCombatantAction", {
    name: game.i18n.localize("SWFFG.Settings.RemoveCombatantAction.Name"),
    hint: game.i18n.localize("SWFFG.Settings.RemoveCombatantAction.Hint"),
    scope: "world",
    config: false,
    default: "combatant_only",
    type: String,
    choices: {
      combatant_only: "Combatant Only",
      last_slot: "Last Slot",
      prompt: "Prompt",
    },
  });

  /**
   * Register the max value for characteristics and skills
   */
  game.settings.register("starwarsffg", "maxAttribute", {
    name: game.i18n.localize("SWFFG.Settings.maxAttribute.Name"),
    hint: game.i18n.localize("SWFFG.Settings.maxAttribute.Hint"),
    scope: "world",
    config: false,
    default: 7,
    type: Number,
  });
  game.settings.register("starwarsffg", "maxSkill", {
    name: game.i18n.localize("SWFFG.Settings.maxSkill.Name"),
    hint: game.i18n.localize("SWFFG.Settings.maxSkill.Hint"),
    scope: "world",
    config: false,
    default: 6,
    type: Number,
  });

  /**
   * Register compendiums for sources for purchasing
   */
  game.settings.register("starwarsffg", "specializationCompendiums", {
    name: game.i18n.localize("SWFFG.Settings.Purchase.Specialization.Name"),
    hint: game.i18n.localize("SWFFG.Settings.Purchase.Specialization.Hint"),
    scope: "world",
    config: false,
    default: "world.oggdudespecializations",
    type: String,
  });
  game.settings.register("starwarsffg", "signatureAbilityCompendiums", {
    name: game.i18n.localize("SWFFG.Settings.Purchase.SignatureAbility.Name"),
    hint: game.i18n.localize("SWFFG.Settings.Purchase.SignatureAbility.Hint"),
    scope: "world",
    config: false,
    default: "world.oggdudesignatureabilities",
    type: String,
  });
  game.settings.register("starwarsffg", "forcePowerCompendiums", {
    name: game.i18n.localize("SWFFG.Settings.Purchase.ForcePower.Name"),
    hint: game.i18n.localize("SWFFG.Settings.Purchase.ForcePower.Hint"),
    scope: "world",
    config: false,
    default: "world.oggdudeforcepowers",
    type: String,
  });
  game.settings.register("starwarsffg", "talentCompendiums", {
    name: game.i18n.localize("SWFFG.Settings.Purchase.Talent.Name"),
    hint: game.i18n.localize("SWFFG.Settings.Purchase.Talent.Hint"),
    scope: "world",
    config: false,
    default: "",
    type: String,
  });
  game.settings.register("starwarsffg", "useDefense", {
    name: game.i18n.localize("SWFFG.Settings.UseDefense.Name"),
    hint: game.i18n.localize("SWFFG.Settings.UseDefense.Hint"),
    scope: "client",
    config: false,
    default: true,
    type: Boolean,
  });
   /**
   * Register roll simulation mode
   */
  game.settings.register("starwarsffg", "displaySimulation", {
    name: game.i18n.localize("SWFFG.Settings.Simulate.Name"),
    hint: game.i18n.localize("SWFFG.Settings.Simulate.Hint"),
    scope: "world",
    config: false,
    default: "GM",
    type: String,
    choices: {
      GM: "GM Only",
      All: "All Players",
      None: "None",
    },
  });
  game.settings.register("starwarsffg", "rollSimulation", {
    name: game.i18n.localize("SWFFG.Settings.SimulateCount.Name"),
    hint: game.i18n.localize("SWFFG.Settings.SimulateCount.Hint"),
    scope: "world",
    config: false,
    default: 10000,
    type: Number,
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
    config: false,
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
      type: Object,
    });

    game.settings.register("starwarsffg", "arraySkillList", {
      name: "Skill List",
      scope: "world",
      default: defaultSkillList,
      config: false,
      type: Object,
      onChange: SettingsHelpers.debouncedReload,
    });

    let skillList = await parseSkillList();
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
        config: false,
        default: "starwars",
        type: String,
        onChange: SettingsHelpers.debouncedReload,
        choices: skillChoices,
      });

      if (game.settings.get("starwarsffg", "skilltheme") !== "starwars") {
        const altSkills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === game.settings.get("starwarsffg", "skilltheme")).skills));

        let skills = {};
        Object.keys(altSkills).forEach((skillKey) => {
          if (altSkills?.[skillKey]?.value) {
            skills[skillKey] = { ...altSkills[skillKey] };
          } else {
            skills[skillKey] = { value: skillKey, ...altSkills[skillKey] };
          }
        });

        const sorted = Object.keys(skills).sort(function (a, b) {
          const x = game.i18n.localize(skills[a].label);
          const y = game.i18n.localize(skills[b].label);

          return x < y ? -1 : x > y ? 1 : 0;
        });

        let ordered = {};
        sorted.forEach((skill) => {
          ordered[skill] = skills[skill];
        });

        CONFIG.FFG.skills = ordered;
      }
    } catch (err) {
      console.error(err);
    }

    Hooks.on("createActor", (actor) => {
      if (actor.type !== "vehicle" && actor.type !== "homestead") {
        if (CONFIG.FFG?.alternateskilllists?.length) {
          let skilllist = game.settings.get("starwarsffg", "skilltheme");
          try {
            let skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === skilllist)));
            CONFIG.logger.log(`Applying skill theme ${skilllist} to actor`);

            if (!actor?.flags?.starwarsffg?.hasOwnProperty('ffgimportid') && JSON.stringify(Object.keys(skills.skills).sort()) !== JSON.stringify(Object.keys(actor.system.skills).sort())) {
              // only apply the skills if it wasn't an imported actor and the skills loaded are not the same
              actor.update({
                system: {
                  skills: skills.skills,
                },
              });
            }
          } catch (err) {
            CONFIG.logger.warn(err);
          }
        }
      }
    });

    Hooks.on("updateToken", async (tokenDocument, options, diffData, tokenId) => {
      if (Object.keys(options).includes('hidden')) {
        updateCombatTracker();
      }
    });

    Hooks.on("preCreateCombatant", async (combatant, context, options, combatantId) => {
      await game.combat.handleCombatantAddition(combatant, context, options, combatantId);
    });
    CONFIG.FFG.preCombatDelete = Hooks.on("preDeleteCombatant", registerHandleCombatantRemoval);
  }

  await gameSkillsList();

  FFG.configureDice();
  FFG.configureVehicleRange();

  // define custom status effects
    const allSkillChanges = {
      boost: [],
      setback: [],
      upgrade: [],
      success: [],
    };
    for (const skill of Object.keys(CONFIG.FFG.skills)) {
      allSkillChanges['boost'].push({
        key: `system.skills.${skill}.boost`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: "1",
      });
      allSkillChanges['setback'].push({
        key: `system.skills.${skill}.setback`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: "1",
      });
      allSkillChanges['upgrade'].push({
        key: `system.skills.${skill}.upgrades`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: "1",
      });
      allSkillChanges['success'].push({
        key: `system.skills.${skill}.success`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: "1",
      });
    }

    // set up our own statuses
    CONFIG.statusEffects = [];
    CONFIG.statusEffects.push({
      id: "starwarsffg-defeated",
      img: "systems/starwarsffg/images/status/defeated.svg",
      name: "SWFFG.Status.Defeated",
      changes: [],
    });

    // one-time statuses
    CONFIG.statusEffects.push({
      id: "starwarsffg-boost-once",
      img: `systems/starwarsffg/images/dice/${CONFIG.FFG.theme}/blue.png`,
      name: "SWFFG.Status.Boost.Next",
      changes: allSkillChanges['boost'],
      system: {
        duration: "once",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-setback-once",
      img: `systems/starwarsffg/images/dice/${CONFIG.FFG.theme}/black.png`,
      name: "SWFFG.Status.Setback.Next",
      changes: allSkillChanges['setback'],
      system: {
        duration: "once",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-upgrade-once",
      img: `systems/starwarsffg/images/dice/${CONFIG.FFG.theme}/yellow.png`,
      name: "SWFFG.Status.Upgrade.Next",
      changes: allSkillChanges['upgrade'],
      system: {
        duration: "once",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-success-once",
      img: `systems/starwarsffg/images/dice/${CONFIG.FFG.theme}/success.png`,
      name: "SWFFG.Status.Success.Next",
      changes: allSkillChanges['success'],
      system: {
        duration: "once",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-heavy-cover",
      img: "icons/equipment/shield/buckler-wooden-boss-lightning.webp",
      name: "SWFFG.Status.Cover.Heavy",
      changes: [
        {
          key: "system.stats.defence.melee",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "2",
        },
        {
          key: "system.stats.defence.ranged",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "2",
        },
      ],
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-disoriented",
      img: "systems/starwarsffg/images/status/disoriented.svg",
      name: "SWFFG.Status.Disoriented",
      changes: allSkillChanges['setback'],
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-immobilized",
      img: "systems/starwarsffg/images/status/immobilized.svg",
      name: "SWFFG.Status.Immobilized",
      changes: [],
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-staggered",
      img: "systems/starwarsffg/images/status/staggered.svg",
      name: "SWFFG.Status.Staggered",
      changes: [],
    });
    // combat-length statuses
    CONFIG.statusEffects.push({
      id: "starwarsffg-boost-combat",
      img: `systems/starwarsffg/images/status/blue.png`,
      name: "SWFFG.Status.Boost.Combat",
      changes: allSkillChanges['boost'],
      system: {
        duration: "combat",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-setback-combat",
      img: `systems/starwarsffg/images/status/black.png`,
      name: "SWFFG.Status.Setback.Combat",
      changes: allSkillChanges['setback'],
      system: {
        duration: "combat",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-upgrade-combat",
      img: `systems/starwarsffg/images/status/yellow.png`,
      name: "SWFFG.Status.Upgrade.Combat",
      changes: allSkillChanges['upgrade'],
      system: {
        duration: "combat",
      }
    });
    CONFIG.statusEffects.push({
      id: "starwarsffg-success-combat",
      img: `systems/starwarsffg/images/status/success.png`,
      name: "SWFFG.Status.Success.Combat",
      changes: allSkillChanges['success'],
      system: {
        duration: "combat",
      }
    });

    // custom statuses defined by the user
    try {
      const addedStatuses = $.parseJSON(game.settings.get("starwarsffg", "additionalStatuses"));
      for (const status of addedStatuses) {
        CONFIG.statusEffects.push(status);
      }

    } catch (e) {
      ui.notifications.warn("Failed to load custom statuses, likely bad JSON");
    }

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("ffg", ActorSheetFFG, { label: "Actor Sheet v1" });
  foundry.documents.collections.Actors.registerSheet("ffg", ActorSheetFFGV2, { makeDefault: true, label: "Actor Sheet v2" });
  foundry.documents.collections.Actors.registerSheet("ffg", AdversarySheetFFG, { types: ["character"], label: "Adversary Sheet v1" });
  foundry.documents.collections.Actors.registerSheet("ffg", AdversarySheetFFGV2, { types: ["character"], label: "Adversary Sheet v2" });
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("ffg", ItemSheetFFG, { label: "Item Sheet v1" });
  foundry.documents.collections.Items.registerSheet("ffg", ItemSheetFFGV2, { makeDefault: true, label: "Item Sheet v2" });

  // Add utilities to the global scope, this can be useful for macro makers
  window.DicePoolFFG = DicePoolFFG;

  // add back in the select helper (under a new name, so we don't get warnings)
  Handlebars.registerHelper({
    selectFfg: function (selected, options) {
      const escapedValue = RegExp.escape(Handlebars.escapeExpression(selected));
      const rgx = new RegExp(' value=[\"\']' + escapedValue + '[\"\']');
      const html = options.fn(this);
      return html.replace(rgx, "$& selected");
    }
  });

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
    if (Array.isArray(obj1) || obj1 instanceof Collection) {
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
    //return PopoutEditor.renderDiceImages(text);
    CONFIG.logger.warn("This function is no longer needed and should not be called. Please notify the devs if you see this message.");
    return text;
  });

  Handlebars.registerHelper("object", function ({ hash }) {
    return hash;
  });
  Handlebars.registerHelper("array", function () {
    return Array.from(arguments).slice(0, arguments.length - 1);
  });

  Handlebars.registerHelper("defaultImage", function(img) {
    return ["icons/svg/mystery-man.svg", "icons/svg/item-bag.svg"].includes(img);
  });

  Handlebars.registerHelper('each_when', function(list, propName, value, options) {
    let result = '';
    for(let i = 0; i < list.length; ++i)
        if(list[i][propName] == value)
            result += options.fn({item: list[i]});

    return result.length > 0 ? result : options.inverse();
  });


  await TemplateHelpers.preload();
});

Hooks.on("renderChatInput", (app, html, data) => {
  if (app.id === "chat") {
    // add in the chat dice roller
    const rollButtonId = "ffgChatRoll";
    if (!document.querySelector(`#${rollButtonId}`)) {

      const rollButton = document.createElement("button");
      rollButton.id = rollButtonId;
      rollButton.type = "button";
      rollButton.classList.add("ui-control", "icon", "fa-light", "fa-dice-d20");

      const rollPrivacyElement = document.querySelector("#roll-privacy");
      rollPrivacyElement.appendChild(rollButton);

      rollButton.onclick = async function () {
        const dicePool = new DicePoolFFG();
        let user = {
          data: game.user.system,
        };
        await DiceHelpers.displayRollDialog(user, dicePool, game.i18n.localize("SWFFG.RollingDefaultTitle"), "");
      }
    }
  }
});

Hooks.on("renderCompendiumDirectory", (app, html, data) => {
  if (game.user.isGM) {
    let div;
    // Native DOM (V13+)
    div = document.createElement("div");
    div.className = "og-character-import";
    div.innerHTML = `<hr><h4>Importers</h4>
    <button class="og-character" style="width:100%;margin-bottom:4px;">OggDude Dataset Importer</button>
    <button class="swa-character" style="width:100%;">Adversaries Dataset Importer</button>`;
    html.querySelector(".directory-footer")?.appendChild(div);
    // add event handlers with addEventListener()
    div.querySelector(".og-character")?.addEventListener("click", (event) => {
      event.preventDefault();
      new DataImporter().render(true);
    });
    div.querySelector(".swa-character")?.addEventListener("click", (event) => {
      event.preventDefault();
      new SWAImporter().render(true);
    });
  }
});

// Update chat messages with dice images
Hooks.on("renderChatMessage", async (app, html, messageData) => {
  const content = html.find(".message-content");
  content[0].innerHTML = await PopoutEditor.renderDiceImages(content[0].innerHTML);

  html.on("click", ".ffg-pool-to-player", () => {
    const poolData = messageData.message.flags.starwarsffg;

    const dicePool = new DicePoolFFG(poolData.dicePool);

    DiceHelpers.displayRollDialog(poolData.roll.data, dicePool, poolData.description, poolData.roll.skillName, poolData.roll.item, poolData.roll.flavor, poolData.roll.sound);
  });

  // collapse / expand item details
  html.find(".starwarsffg.item-card .summary").on("click", async (event) => {
    event.preventDefault();
    const li = $(event.currentTarget);
    const details = li.parent().children(".collapsible-content");
    const collapseButton = li.children(".collapse-toggle");
    // Toggle summary
    if (li.hasClass("expanded")) {
      details.slideUp(200, () => details.hide());
    } else {
      details.show();
      details.slideDown(200);
    }
    li.toggleClass("expanded");
    collapseButton.toggleClass("fa-chevron-down");
    collapseButton.toggleClass("fa-chevron-left");
  });

  // item card tooltips
  html.find(".starwarsffg.item-card .item-pill, .starwarsffg .specials .hover-tooltip").on("mouseover", (event) => {
    itemPillHover(event);
  });
});

// Handle crew registration
Hooks.on("dropActorSheetData", (...args) => {
    register_crew(...args);
});

function isCurrentVersionNullOrBlank(currentVersion) {
  return currentVersion === "null" || currentVersion === '' || currentVersion === null;
}

// Handle migration duties
Hooks.once("ready", async () => {
  SettingsHelpers.readyLevelSetting();

  // NOTE: the "currentVersion" will be updated in handleUpdate, preventing the code below from running in the future
  // this is intended to encourage migrating code to this file to clean up the main file
  await handleUpdate();

  const currentVersion = game.settings.get("starwarsffg", "systemMigrationVersion");

  const version = game.system.version;
  const isAlpha = game.system.version.includes("alpha");

  if (isAlpha && game.user.isGM) {
    let d = new Dialog({
      title: "Warning",
      content: "<p>This is an alpha release of the system.  It is not recommended for regular gameplay. <b>There will be bugs.</b> <br><br>Check Discord or the GitHub repo for the latest stable version.</p>",
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: "I understand",
          callback: () => console.log("Chose One") // leaving in case I get feedback to update a game setting to not show this on every load
        }
      },
      default: "one",
    });
    d.render(true);
  }

  if ((isAlpha || isCurrentVersionNullOrBlank(currentVersion) || parseFloat(currentVersion) < parseFloat(game.system.version)) && game.user.isGM) {
    CONFIG.logger.log(`Migrating to from ${currentVersion} to ${game.system.version}`);

    // Calculating wound and strain .value from .real_value is no longer necessary due to the Token._drawBar() override in swffg-main.js
    // This is a temporary migration check to transfer existing actors .real_value back into the correct .value location.
    game.actors.forEach((actor) => {
      if (actor.type === "character" || actor.type === "minion") {
        if (actor.system.stats.wounds.real_value != null) {
          actor.system.stats.wounds.value = actor.system.stats.wounds.real_value;
          game.actors.get(actor.id).update({ ["system.stats.wounds.real_value"]: null });
          CONFIG.logger.log("Migrated stats.wounds.value from stats.wounds.real_value");
          CONFIG.logger.log(actor.system.stats.wounds);
        }
        if (actor.system.stats.strain.real_value != null) {
          actor.system.stats.strain.value = actor.system.stats.strain.real_value;
          game.actors.get(actor.id).update({ ["system.stats.strain.real_value"]: null });
          CONFIG.logger.log("Migrated stats.strain.value from stats.strain.real_value");
          CONFIG.logger.log(actor.system.stats.strain);
        }

        // migrate all character to using current skill list if not default.
        let skilllist = game.settings.get("starwarsffg", "skilltheme");

        if (CONFIG.FFG?.alternateskilllists?.length) {
          try {
            let skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === skilllist)));
            CONFIG.logger.log(`Applying skill theme ${skilllist} to actor ${actor.name}`);

            Object.keys(actor.system.skills).forEach((skill) => {
              if (!skills.skills[skill] && !actor.system.skills?.[skill]?.nontheme) {
                skills.skills[`-=${skill}`] = null;
              } else {
                skills.skills[skill] = {
                  ...skills.skills[skill],
                  ...actor.system.skills[skill],
                };
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
      }
    });

    if (isAlpha || isCurrentVersionNullOrBlank(currentVersion) || parseFloat(currentVersion) < 1.1) {
      // Migrate alternate skill lists from file if found
      try {
        let skillList = [];

        let data = await foundry.applications.apps.FilePicker.browse("data", `worlds/${game.world.id}`, { bucket: null, extensions: [".json", ".JSON"], wildcard: false });
        if (data.files.includes(`worlds/${game.world.id}/skills.json`)) {
          // if the skills.json file is found AND the skillsList in setting is the default skill list then read the data from the file.
          // This will make sure that the data from the JSON file overwrites the data in the setting.
          if ((await game.settings.get("starwarsffg", "arraySkillList")) === defaultSkillList) {
            const fileData = await fetch(`/worlds/${game.world.id}/skills.json`).then((response) => response.json());
            await game.settings.set("starwarsffg", "arraySkillList", JSON.stringify(fileData));
            skillList = fileData;
          }
        } else {
          skillList = await parseSkillList();
        }

        CONFIG.FFG.alternateskilllists = skillList;
        if (game.settings.get("starwarsffg", "skilltheme") !== "starwars") {
          const altSkills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === game.settings.get("starwarsffg", "skilltheme")).skills));

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
    // migrate embedded items
    if (isAlpha || isCurrentVersionNullOrBlank(currentVersion) || parseFloat(currentVersion) < 1.8) {
      ui.notifications.info(`Migrating Star Wars FFG System Deep Embedded Items`);
      CONFIG.logger.debug('Migrating Star Wars FFG System Deep Embedded Items');

      // items owned by actors
      game.actors.forEach((actor) => {
        let update_data = [];
        actor.items.forEach((item) => {
          let updated_item = item.toObject(true);
          if (["weapon", "armour", "shipweapon"].includes(item.type)) {
            // iterate over attachments and modifiers on the item
            updated_item.system.itemmodifier.map((modifier) => {
              if (modifier !== null && modifier?.hasOwnProperty('data')) {
                modifier.system = modifier.data;
                delete modifier.data;
              }
            });

            updated_item.system.itemattachment.map((attachment) => {
              if (attachment !== null && attachment.hasOwnProperty('data')) {
                attachment.system = attachment.data;
                delete attachment.data;
              }
            });
            // push the updated items to the list of items to update
            update_data.push(updated_item);
          }
        });
        if (!foundry.utils.isEmpty(update_data)) {
          // persist the changes for items owned by this actor to the DB
          actor.update({items: update_data});
        }
      });
      // move on to items in the world
      game.items.forEach((item) => {
        let updated = false;
        let updated_item = item.toObject(true);
        if (["weapon", "armour", "shipweapon"].includes(item.type)) {
          // iterate over attachments and modifiers on the item
          updated_item.system.itemmodifier.map((modifier) => {
            if (modifier?.hasOwnProperty('data')) {
              updated = true;
              modifier.system = modifier.data;
              delete modifier.data;
            }
          });

          updated_item.system.itemattachment.map((attachment) => {
            if (attachment.hasOwnProperty('data')) {
              updated = true;
              attachment.system = attachment.data;
              delete attachment.data;
            }
          });
        }
        if (updated && !foundry.utils.isEmpty(updated_item)) {
          // persist the changes to the DB
          item.update(updated_item);
        }
      });
      CONFIG.logger.debug('Migration of Star Wars FFG System Deep Embedded Items completed!');
      ui.notifications.info(`Migration of Star Wars FFG System Deep Embedded Items completed!`);
    }

    // migrate compendiums and flags
    if (isAlpha || isCurrentVersionNullOrBlank(currentVersion) || parseFloat(currentVersion) < 1.61) {
      ui.notifications.info(`Migrating Starwars FFG System for version ${game.system.version}. Please be patient and do not close your game or shut down your server.`, { permanent: true });

      try {

        // Update old pack to latest data model
          // TODO: uncomment
        //for (let pack of game.packs) {
        //  await pack.migrate();
        //}

        // Copy old flags to new system scope
        FlagMigrationHelpers.migrateFlags()

        ui.notifications.info(`Starwars FFG System Migration to version ${game.system.version} completed!`, { permanent: true });
      } catch (err) {
        CONFIG.logger.error(`Error during system migration`, err);
      }
    }
    if (isAlpha || isCurrentVersionNullOrBlank(currentVersion) || parseFloat(currentVersion) < 1.805) {
      // update skill sets
      ui.notifications.info('Updating skill groupings, please be patient...');
      try {
        const skillTheme = game.settings.get("starwarsffg", "skilltheme");
        if (skillTheme === 'starwars') {
          const skills = CONFIG.FFG.alternateskilllists.find((list) => list.id === skillTheme).skills;
          const actors = game.actors.filter(i => i.type === 'character' || i.type === 'minion');
          for (const actor of actors) {
            for (const skillName of Object.keys(actor.system.skills)) {
              let skillData = actor.system.skills[skillName];
              if (skillData.type !== skills[skillName].type) {
                skillData.type = skills[skillName].type;
                await actor.update({[`system.skills.${skillName}.type`]: skillData.type});
              }
            }
          }
        }
      } catch (error) {
        CONFIG.logger.warn(error);
      }
      ui.notifications.info('Done updating skill groupings!');
    }
    game.settings.set("starwarsffg", "systemMigrationVersion", version);
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
  Hooks.on("hotbarDrop", async (bar, data, slot) => await createFFGMacro(bar, data, slot));
  Hooks.on("createMacro", async function (...args) {
    args[0] = await updateMacro(args[0]);
    return args;
  });

  Hooks.on("closeItemSheetFFG", (item) => {
    Hooks.call(`closeAssociatedTalent_${item.object._id}`, item);
  });

  Hooks.on("createItem", async (item, options, userId) => {
    if (userId != game.user.id) return
    // add talents from species to character
    if (item.isEmbedded && item.parent.documentName === "Actor") {
      const actor = item.actor
      if (item.type === "species" && actor.type === "character") {
        const toAdd = [];
        // talents
        for(const talentId of Object.keys(item.system.talents)) {
          const talentUuid = item.system.talents[talentId].source;
          const talent = await fromUuid(talentUuid);
          if (talent) {
            toAdd.push(talent);
          }
        }
        // abilities
        for(const abilityId of Object.keys(item.system.abilities)) {
          const abilityData = item.system.abilities[abilityId];
          const abilityItem = await new Item(
            {
              name: abilityData.name,
              type: "ability",
              system: {
                description: abilityData.system.description,
              }
            },
            {
              temporary: true,
            },
          );
          toAdd.push(abilityItem);
        }
        if (toAdd.length > 0) {
          const created = await actor.createEmbeddedDocuments("Item", toAdd);
          created.forEach(created_item => {
            // mark the items as coming from a species
            created_item.update({flags: {starwarsffg: {fromSpecies: true}}});
          });
        }
      }
    }
  });
  // data for _onDropItemCreate has system.encumbrance.adjusted = 0, despite it being proper in the item itself
  Hooks.on("deleteItem", (item, options, userId) => {
    if (userId != game.user.id) return
    // remove talents added by species
    if (item.isEmbedded && item.parent.documentName === "Actor") {
      const actor = item.actor
      if (item.type === "species" && actor.type === "character") {
        const toDelete = [];
        for(const talentId of Object.keys(item.system.talents)) {
          const speciesTalent = item.system.talents[talentId];
          const actorTalent = actor.items.find(i => i.name === speciesTalent.name && i.type === "talent");
          if (actorTalent) {
            toDelete.push(actorTalent.id);
          }
        }
        if (toDelete.length > 0) {
          actor.deleteEmbeddedDocuments("Item", toDelete);
        }
      }
    }
  });

  // Display Destiny Pool
  let destinyPool = { light: game.settings.get("starwarsffg", "dPoolLight"), dark: game.settings.get("starwarsffg", "dPoolDark") };

  // future functionality to allow multiple menu items to be passed to destiny pool
  const defaultDestinyMenu = [
    {
      name: game.i18n.localize("SWFFG.GroupManager"),
      icon: '<i class="fas fa-users"></i>',
      callback: () => {
        new GroupManager().render(true);
      },
      minimumRole: CONST.USER_ROLES.GAMEMASTER,
    },
    {
      name: game.i18n.localize("SWFFG.RequestDestinyRoll"),
      icon: '<i class="fas fa-dice-d20"></i>',
      callback: (li) => {
        const messageText = `<button class="ffg-destiny-roll">${game.i18n.localize("SWFFG.DestinyPoolRoll")}</button>`;

        new Map([...game.settings.settings].filter(([k, v]) => v.key.includes("destinyrollers"))).forEach((i) => {
          game.settings.set(i.namespace, i.key, undefined);
        });

        CONFIG.FFG.DestinyGM = game.user.id;

        ChatMessage.create({
          user: game.user.id,
          content: messageText,
        });
      },
      minimumRole: CONST.USER_ROLES.GAMEMASTER,
    },
  ];
  const dTracker = new DestinyTracker(undefined, { menu: defaultDestinyMenu });

  dTracker.render(true);

  await registerCrewRoles();
  registerTokenControls();

  if (game.settings.get("starwarsffg", "useGenericSlots")) {

    game.socket.on("system.starwarsffg", async (...args) => {
      const event_type = args[0].event;
      if (game.user.id === game.users.activeGM?.id) {
        if (event_type === "combat") {
          CONFIG.logger.debug("Processing combat event from player");
          const data = args[0]?.data;
          CONFIG.logger.debug(`Received data: ${data.combatId}, ${data.round}, ${data.slot}, ${data.combatantId}`);
          const combat = game.combats.get(data.combatId);
          await combat.claimSlot(data.round, data.slot, data.combatantId);
        }
      } else if (event_type === "trackerRender") {
        CONFIG.logger.debug("Received combat tracker rerender request");
        const incomingCombatID = args[0].combatId;
        const incomingCombat = game.combats.get(incomingCombatID);
        incomingCombat.debounceRender();
        incomingCombat.setupTurns();
      }
    });


  }

  Hooks.on("refreshToken", (token) => {
    /*
    Used to render minion count
    */
    if (token?.actor?.type === "minion") {
      drawMinionCount(token);
    }
    if (["character", "nemesis", "rival"].includes(token?.actor?.type)) {
      drawAdversaryCount(token);
    }
    return token;
  });
  // set up support for Status Icon Counters
  const counterApi = game.modules.get("statuscounter")?.active;
  if (counterApi) {
    Hooks.on("updateActiveEffect", function(effect, changes) {
        const counterValue = foundry.utils.getProperty(changes, "flags.statuscounter.counter.value");
        if (counterValue) {
          for (const change of effect.changes) {
            change['value'] = counterValue;
          }
        }
        effect.update({changes: effect.changes});
    });
  }

  const turnMarkerConfigured = game.settings.get("starwarsffg", "configuredTurnMarker");
  const combatTrackerConfig = game.settings.get("core", "combatTrackerConfig");
  if (combatTrackerConfig.turnMarker.enabled && !turnMarkerConfigured) {
    await game.settings.set("starwarsffg", "configuredTurnMarker", true);
    combatTrackerConfig.turnMarker.enabled = false;
    await game.settings.set("core", "combatTrackerConfig", combatTrackerConfig);
  }
});

Hooks.once("diceSoNiceReady", (dice3d) => {
  let dicetheme = game.settings.get("starwarsffg", "dicetheme");
  if (!dicetheme || dicetheme == "starwars") {
    dice3d.addSystem({ id: "swffg", name: "Star Wars FFG" }, true);

    //swffg dice
    dice3d.addDicePreset(
      {
        type: "da",
        labels: ["", "s", "s", "s\ns", "a", "a", "s\na", "a\na"],
        font: "SWRPG-Symbol-Regular",
        colorset: "green",
        system: "swffg",
      },
      "d8"
    );

    dice3d.addDicePreset(
      {
        type: "di",
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
        labels: ["", "s", "s", "s\ns", "a", "a", "s\na", "a\na"],
        font: "Genesys",
        colorset: "green",
        system: "genesys",
      },
      "d8"
    );

    dice3d.addDicePreset(
      {
        type: "di",
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

Hooks.on("pauseGame", () => {
  if (game.data.paused) {
    const pausedImage = game.settings.get("starwarsffg", "ui-pausedImage");
    if (pausedImage) {
      $("#pause img").css("content", `url(${pausedImage})`);
    }
  }
});

async function registerCrewRoles() {
  const defaultArrayCrewRoles = [
    {
      "role_name":  game.i18n.localize("SWFFG.Crew.Roles.Gunner.Name"),
      "role_skill":  game.i18n.localize("SWFFG.SkillsNameGunnery"),
      "use_weapons": true,
      "use_handling": false
    }
  ];
  game.settings.registerMenu("starwarsffg", "arrayCrewRoles", {
    name: game.i18n.localize("SWFFG.Crew.Settings.Name"),
    label: game.i18n.localize("SWFFG.Crew.Settings.Label"),
    hint: game.i18n.localize("SWFFG.Crew.Settings.Hint"),
    icon: "fas fa-file-import",
    type: CrewSettings,
    restricted: true,
  });

  game.settings.register("starwarsffg", "arrayCrewRoles", {
    module: "starwarsffg",
    name: "arrayCrewRoles",
    scope: "world",
    default: defaultArrayCrewRoles,
    config: false,
    type: Object,
  });
  const initiativeCrewRole = {
      "role_name":  game.i18n.localize("SWFFG.Crew.Roles.Initiative.Name"),
      "role_skill": undefined,
      "use_weapons": false,
      "use_handling": false
    };
  game.settings.register("starwarsffg", "initiativeCrewRole", {
    module: "starwarsffg",
    name: "initiativeCrewRole",
    scope: "world",
    default: initiativeCrewRole,
    config: false,
    type: Object,
  });
}

/**
 * Check if all built-in compendiums are empty or not
 * @returns {Promise<boolean>}
 */
async function compendiumsEmpty() {
  const compendiums = game.packs.contents.filter(i => i.collection.includes("starwars"));
  for (const compendium of compendiums) {
    if ((await compendium.getDocuments()).length !== 0) {
      return false;
    }
  }

  return compendiums.length > 0;
}

/**
 * Give a custom, Star Wars FFG tooltip when qualities, attachments, upgrades, etc are hovered (after sending to chat)
 * @param event
 */
export function itemPillHover(event) {
  event.preventDefault();
  const li = $(event.currentTarget);
  const itemName = li.data("item-embed-name");
  const itemImage = li.data("item-embed-img");
  const itemType = li.data("item-type");
  const itemRanks = li.data("item-ranks");
  let desc = li.data("desc");
  let descRanks = "";
  if (itemType === "itemattachment") {
    const rarity = li.data("rarity");
    const price = li.data("price");
    if (price) {
      desc = `<span class="statt" title="Price"><i class="fa-solid fa-dollar-sign"></i>${price}</span>${desc}`
    }
    if (rarity) {
      desc = `<span class="stat stat-right" title="Rarity"><i class="fa-solid fa-magnifying-glass"></i>${rarity}</span>${desc}`
    }

    // if the item has embedded mods, pull the data and add it to the description
    let modNames = li.data("mod-names");
    let modDescs = li.data("mod-descs");
    let modActives = li.data("mod-actives");
    if (modNames) {
      modNames = modNames.split("~");
      modDescs = modDescs.split("~");
      modActives = modActives.split("~");
      CONFIG.logger.debug(modNames);
      CONFIG.logger.debug(modDescs);
      CONFIG.logger.debug(modActives);
      let newDesc = `<hr><b>Mods</b>:<br>`;
      for (let i = 0; i < modNames.length - 1; i++) {
        if (modActives[i] === "true") {
          modNames[i] = `<i class="fa-solid fa-user-check" title="Installed"></i>&nbsp;${modNames[i]}`;
        } else {
          modNames[i] = `<i class="fa-duotone fa-solid fa-user-xmark" title="Not Installed"></i>&nbsp;${modNames[i]}`;
        }
        newDesc += `<u>${modNames[i]}</u>:&nbsp;${modDescs[i]}<br>`;
      }
      desc += newDesc;
    }
  }
  if (itemRanks > 0) {
    descRanks = `${itemRanks} ranks`;
  } else {
    if (!["specialization", "signatureAbility", "itemattachment"].includes(itemType)) {
      descRanks = "Not ranked";
    }
  }
  let embeddedContent = `
    <section class="chat-msg-tooltip content">
      <section class="header">
        <div class="top">
          <img class="tooltip-img" src="${itemImage}"/>
          <div class="name name-stacked">
            <span class="title">${itemName}</span>
          </div>
        </div>
      </section>
      <section class="description">
        ${desc}
      </section>
      <section class="ranks">
        ${descRanks}
      </section>
    </section>
  `;
  if (itemType !== undefined) {
    li.attr("data-tooltip", embeddedContent);
  }
}
