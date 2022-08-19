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

// Import Dice Types
import { AbilityDie, BoostDie, ChallengeDie, DifficultyDie, ForceDie, ProficiencyDie, SetbackDie } from "./dice-pool-ffg.js";
import { createFFGMacro } from "./helpers/macros.js";
import EmbeddedItemHelpers from "./helpers/embeddeditem-helpers.js";
import DataImporter from "./importer/data-importer.js";
import PauseFFG from "./apps/pause-ffg.js";
import FlagMigrationHelpers from "./helpers/flag-migration-helpers.js";
import RollBuilderFFG from "./dice/roll-builder.js";

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

  SettingsHelpers.initLevelSettings();

  const uitheme = game.settings.get("starwarsffg", "ui-uitheme");

  switch (uitheme) {
    case "mandar": {
      $('link[href="systems/starwarsffg/styles/starwarsffg.css"]').prop("disabled", true);
      $("head").append('<link href="systems/starwarsffg/styles/mandar.css" rel="stylesheet" type="text/css" media="all">');
      break;
    }
    default: {
      $('link[href="systems/starwarsffg/styles/starwarsffg.css"]').prop("disabled", false);
    }
  }

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
    });

    let skillList = game.settings.get("starwarsffg", "arraySkillList");
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

  Handlebars.registerHelper("defaultImage", function(img) {
    return ["icons/svg/mystery-man.svg", "icons/svg/item-bag.svg"].includes(img);
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
    const li = event.currentTarget;
    let uuid = li.dataset.itemId;
    let modifierId = li.dataset.modifierId;
    let modifierType = li.dataset.modifierType;

    if (li.dataset.uuid) {
      uuid = li.dataset.uuid;
    }

    const parts = uuid.split(".");

    const [entityName, entityId, embeddedName, embeddedId] = parts;

    await EmbeddedItemHelpers.displayOwnedItemItemModifiersAsJournal(embeddedId, modifierType, modifierId, entityId);
  });
});

// Handle migration duties
Hooks.once("ready", async () => {
  SettingsHelpers.readyLevelSetting();

  const currentVersion = game.settings.get("starwarsffg", "systemMigrationVersion");

  const version = game.system.version;
  const isAlpha = game.system.version.includes("alpha");

  if ((isAlpha || currentVersion === "null" || parseFloat(currentVersion) < parseFloat(game.system.version)) && game.user.isGM) {
    CONFIG.logger.log(`Migrating to from ${currentVersion} to ${game.system.data.version}`);

    // Calculating wound and strain .value from .real_value is no longer necessary due to the Token._drawBar() override in swffg-main.js
    // This is a temporary migration check to transfer existing actors .real_value back into the correct .value location.
    game.actors.forEach((actor) => {
      if (actor.data.type === "character" || actor.data.type === "minion") {
        if (actor.data.data.stats.wounds.real_value != null) {
          actor.data.data.stats.wounds.value = actor.data.data.stats.wounds.real_value;
          game.actors.get(actor.id).update({ ["data.stats.wounds.real_value"]: null });
          CONFIG.logger.log("Migrated stats.wounds.value from stats.wounds.real_value");
          CONFIG.logger.log(actor.data.data.stats.wounds);
        }
        if (actor.data.data.stats.strain.real_value != null) {
          actor.data.data.stats.strain.value = actor.data.data.stats.strain.real_value;
          game.actors.get(actor.id).update({ ["data.stats.strain.real_value"]: null });
          CONFIG.logger.log("Migrated stats.strain.value from stats.strain.real_value");
          CONFIG.logger.log(actor.data.data.stats.strain);
        }

        // migrate all character to using current skill list if not default.
        let skilllist = game.settings.get("starwarsffg", "skilltheme");

        if (CONFIG.FFG?.alternateskilllists?.length) {
          try {
            let skills = JSON.parse(JSON.stringify(CONFIG.FFG.alternateskilllists.find((list) => list.id === skilllist)));
            CONFIG.logger.log(`Applying skill theme ${skilllist} to actor ${actor.name}`);

            Object.keys(actor.data.data.skills).forEach((skill) => {
              if (!skills.skills[skill] && !actor.data.data.skills?.[skill]?.nontheme) {
                skills.skills[`-=${skill}`] = null;
              } else {
                skills.skills[skill] = {
                  ...skills.skills[skill],
                  ...actor.data.data.skills[skill],
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

    if (currentVersion === "null" || parseFloat(currentVersion) < 1.1) {
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
          skillList = JSON.parse(game.settings.get("starwarsffg", "arraySkillList"));
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

    if (currentVersion === "null" || parseFloat(currentVersion) < 1.61) {
      ui.notifications.info(`Migrating Starwars FFG System for version ${game.system.data.version}. Please be patient and do not close your game or shut down your server.`, { permanent: true });

      try {

        // Update old pack to latest data model
        for (let pack of game.packs) {
          await pack.migrate();
        }

        // Copy old flags to new system scope
        FlagMigrationHelpers.migrateFlags()

        ui.notifications.info(`Starwars FFG System Migration to version ${game.system.data.version} completed!`, { permanent: true });
      } catch (err) {
        CONFIG.logger.error(`Error during system migration`, err);
      }
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
    Hooks.call(`closeAssociatedTalent_${item.object.data._id}`, item);
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
          game.settings.set(i.module, i.key, undefined);
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
