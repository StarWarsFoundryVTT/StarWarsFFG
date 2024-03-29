/**
 * A systems implementation of the Star Wars RPG by Fantasy Flight Games.
 * Author: Esrin
 * Software License: GNU GPLv3
 */

// Import Modules
import { FFG } from "./swffg-config.js";
import { ActorFFG } from "./actors/actor-ffg.js";
import CombatantFFG, {CombatFFG, CombatTrackerFFG, updateCombatTracker} from "./combat-ffg.js";
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

import CharacterImporter from "./importer/character-importer.js";
import NPCImporter from "./importer/npc-importer.js";
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
import { createFFGMacro } from "./helpers/macros.js";
import EmbeddedItemHelpers from "./helpers/embeddeditem-helpers.js";
import DataImporter from "./importer/data-importer.js";
import PauseFFG from "./apps/pause-ffg.js";
import FlagMigrationHelpers from "./helpers/flag-migration-helpers.js";
import RollBuilderFFG from "./dice/roll-builder.js";
import CrewSettings from "./settings/crew-settings.js";
import {register_dice_enricher, register_oggdude_tag_enricher, register_roll_tag_enricher} from "./helpers/journal.js";
import {drawAdversaryCount, drawMinionCount, registerTokenControls} from "./helpers/token.js";

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
  };

  // Define custom log prefix and logger
  CONFIG.module = "Starwars FFG";
  CONFIG.logger = Helpers.logger;

  // Define custom Entity classes. This will override the default Actor
  // to instead use our extended version.
  CONFIG.Actor.documentClass = ActorFFG;
  CONFIG.Item.documentClass = ItemFFG;
  CONFIG.Combat.documentClass = CombatFFG;
  CONFIG.Combatant.documentClass = CombatantFFG;

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

  // Override the default Token _drawBar function to allow for FFG style wound and strain values.
  Token.prototype._drawBar = function (number, bar, data) {
    let val = Number(data.value);
    // FFG style behaviour for wounds and strain.
    if (data.attribute === "stats.wounds" || data.attribute === "stats.strain" || data.attribute === "stats.hullTrauma" || data.attribute === "stats.systemStrain") {
      val = Number(data.max - data.value);
    }

    const pct = Math.clamped(val, 0, data.max) / data.max;
    let h = Math.max(canvas.dimensions.size / 12, 8);
    if (this.height >= 2) h *= 1.6; // Enlarge the bar for large tokens
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
   * Register the option to use generic slots for combat
   */
  game.settings.register("starwarsffg", "useGenericSlots", {
    name: game.i18n.localize("SWFFG.Settings.UseGenericSlots.Name"),
    hint: game.i18n.localize("SWFFG.Settings.UseGenericSlots.Hint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
    onChange: (rule) => window.location.reload()
  });

  if (game.settings.get("starwarsffg", "useGenericSlots")) {
    CONFIG.ui.combat = CombatTrackerFFG;
  }

  /**
   * Register compendiums for sources for purchasing
   */
  game.settings.register("starwarsffg", "specializationCompendiums", {
    name: game.i18n.localize("SWFFG.Settings.Purchase.Specialization.Name"),
    hint: game.i18n.localize("SWFFG.Settings.Purchase.Specialization.Hint"),
    scope: "world",
    config: true,
    default: "world.oggdudespecializations",
    type: String,
  });
  game.settings.register("starwarsffg", "signatureAbilityCompendiums", {
    name: game.i18n.localize("SWFFG.Settings.Purchase.SignatureAbility.Name"),
    hint: game.i18n.localize("SWFFG.Settings.Purchase.SignatureAbility.Hint"),
    scope: "world",
    config: true,
    default: "world.oggdudesignatureabilities",
    type: String,
  });
  game.settings.register("starwarsffg", "forcePowerCompendiums", {
    name: game.i18n.localize("SWFFG.Settings.Purchase.ForcePower.Name"),
    hint: game.i18n.localize("SWFFG.Settings.Purchase.ForcePower.Hint"),
    scope: "world",
    config: true,
    default: "world.oggdudeforcepowers",
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
        config: true,
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
    Hooks.on("preDeleteCombatant", async (combatant, options, unknownId) => {
      await game.combat.handleCombatantRemoval(combatant, options, unknownId);
    });
  }

  await gameSkillsList();

  FFG.configureDice();
  FFG.configureVehicleRange();

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
    return PopoutEditor.renderDiceImages(text);
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


  TemplateHelpers.preload();
});

Hooks.on("renderSidebarTab", (app, html, data) => {
  html.find(".chat-control-icon").click(async (event) => {
    const dicePool = new DicePoolFFG();

    let user = {
      data: game.user.system,
    };

    await DiceHelpers.displayRollDialog(user, dicePool, game.i18n.localize("SWFFG.RollingDefaultTitle"), "");
  });
});

Hooks.on("renderActorDirectory", (app, html, data) => {
  // add character import button
  const div = $(`<div class="og-character-import"></div>`);
  const divider = $("<hr><h4>OggDude Import</h4>");
  const characterImportButton = $('<button class="og-character">Character</button>');
  const npcImportButton = $('<button class="og-npc">NPC</button>');
  div.append(divider, characterImportButton, npcImportButton);

  html.find(".directory-footer").append(div);

  html.find(".og-character").click(async (event) => {
    event.preventDefault();
    new CharacterImporter().render(true);
  });
  html.find(".og-npc").click(async (event) => {
    event.preventDefault();
    new NPCImporter().render(true);
  });
});

Hooks.on("renderCompendiumDirectory", (app, html, data) => {
  if (game.user.isGM) {
    const div = $(`<div class="og-character-import"></div>`);
    const divider = $("<hr><h4>OggDude Import</h4>");
    const datasetImportButton = $('<button class="og-character">Dataset Importer</button>');
    div.append(divider, datasetImportButton);

    html.find(".directory-footer").append(div);

    html.find(".og-character").click(async (event) => {
      event.preventDefault();
      new DataImporter().render(true);
    });
  }
});

// Update chat messages with dice images
Hooks.on("renderChatMessage", (app, html, messageData) => {
  const content = html.find(".message-content");
  content[0].innerHTML = PopoutEditor.renderDiceImages(content[0].innerHTML);

  html.on("click", ".ffg-pool-to-player", () => {
    const poolData = messageData.message.flags.starwarsffg;

    const dicePool = new DicePoolFFG(poolData.dicePool);

    DiceHelpers.displayRollDialog(poolData.roll.data, dicePool, poolData.description, poolData.roll.skillName, poolData.roll.item, poolData.roll.flavor, poolData.roll.sound);
  });

  html.find(".item-display .item-pill, .item-properties .item-pill").on("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const li = $(event.currentTarget);
    const itemType = li.attr("data-item-embed-type");
    let itemData = {};
    const newEmbed = li.attr("data-item-embed");

    if (newEmbed === "true" && itemType === "itemmodifier") {
      itemData = {
        img: li.attr('data-item-embed-img'),
        name: li.attr('data-item-embed-name'),
        type: li.attr('data-item-embed-type'),
        system: {
          description: li.attr('data-item-embed-description'),
          attributes: JSON.parse(li.attr('data-item-embed-modifiers')),
          rank: li.attr('data-item-embed-rank'),
          rank_current: li.attr('data-item-embed-rank'),
        },
      };
      const tempItem = await Item.create(itemData, {temporary: true});
      tempItem.sheet.render(true);
    } else {
      CONFIG.logger.debug(`Unknown item type: ${itemType}, or lacking new embed system`);
      const li2 = event.currentTarget;
      let uuid = li2.dataset.itemId;
      let modifierId = li2.dataset.modifierId;
      let modifierType = li2.dataset.modifierType;
      if (li2.dataset.uuid) {
        uuid = li2.dataset.uuid;
      }

      const parts = uuid.split(".");

      const [entityName, entityId, embeddedName, embeddedId] = parts;

      await EmbeddedItemHelpers.displayOwnedItemItemModifiersAsJournal(embeddedId, modifierType, modifierId, entityId);
    }
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

        let data = await FilePicker.browse("data", `worlds/${game.world.id}`, { bucket: null, extensions: [".json", ".JSON"], wildcard: false });
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
  Hooks.on("hotbarDrop", (bar, data, slot) => createFFGMacro(data, slot));

  Hooks.on("closeItemSheetFFG", (item) => {
    Hooks.call(`closeAssociatedTalent_${item.object._id}`, item);
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
      if (game.user.id === game.users.find(i => i.isGM)?.id) {
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
    if (["character"].includes(token?.actor?.type)) {
      drawAdversaryCount(token);
    }
    return token;
  });
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
      "role_name":  game.i18n.localize("SWFFG.Crew.Roles.None"),
      "role_skill": undefined,
      "use_weapons": false,
      "use_handling": false
    },
    {
      "role_name":  game.i18n.localize("SWFFG.Crew.Roles.Pilot_Space"),
      "role_skill":  game.i18n.localize("SWFFG.SkillsNamePilotingSpace").replace(' ', ' '),
      "use_weapons": false,
      "use_handling": true
    },
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
