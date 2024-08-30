/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
import PopoutEditor from "../popout-editor.js";
import DiceHelpers from "../helpers/dice-helpers.js";
import ActorOptions from "./actor-ffg-options.js";
import ImportHelpers from "../importer/import-helpers.js";
import ModifierHelpers from "../helpers/modifiers.js";
import ActorHelpers, {xpLogEarn, xpLogSpend} from "../helpers/actor-helpers.js";
import ItemHelpers from "../helpers/item-helpers.js";
import EmbeddedItemHelpers from "../helpers/embeddeditem-helpers.js";
import {
  change_role,
  deregister_crew,
  build_crew_roll,
  updateRoles,
  handlePilotCheck,
  buildPilotRoll
} from "../helpers/crew.js";
import {DicePoolFFG} from "../dice/pool.js";
import {get_dice_pool} from "../helpers/dice-helpers.js";

export class ActorSheetFFG extends ActorSheet {
  constructor(...args) {
    super(...args);
    /**
     * Track the set of filters which are applied
     * @type {Set}
     */
    this._filters = {
      skills: new Set(),
    };
  }

  pools = new Map();

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "actor"],
      template: "systems/genesysk2/templates/actors/ffg-character-sheet.html",
      width: 710,
      height: 650,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics" }],
      scrollY: [".tableWithHeader", ".tab", ".skillsGrid", ".skillsTablesGrid"],
    });
  }

  /** @override */
  get template() {
    const path = "systems/genesysk2/templates/actors";
    return `${path}/ffg-${this.actor.type}-sheet.html`;
  }

  /** @override */
  async _onDropItem(event, data) {
    if (data?.type === "Item") {
      // this is the stock implementation, except that we do not pass "true" to item.toObject
      if ( !this.actor.isOwner ) return false;
      const item = await Item.implementation.fromDropData(data);
      // do not Draw values from the underlying data source rather than transformed values - we want to use adjusted values
      const itemData = item.toObject(false);

      // Handle item sorting within the same Actor
      if ( this.actor.uuid === item.parent?.uuid ) return this._onSortItem(event, itemData);

      if (this.actor.type === "character" && itemData.type === "species") {
        // add starting XP from species
        const curAvailable = parseInt(this.actor.system?.experience?.available);
        const curTotal = parseInt(this.actor.system?.experience?.total);
        const startingXP = parseInt(itemData.system?.startingXP);
        await this.actor.update(
          {
            system: {
              experience: {
                available: curAvailable + startingXP,
                total: curTotal + startingXP,
              }
            }
          }
        );
        await xpLogEarn(this.actor, startingXP, curAvailable + startingXP, curTotal + startingXP, game.i18n.format("SWFFG.GrantXPSpecies", {species: itemData.name}) );
      }

      if (this.actor.type === "character" && ["talent", "specialization", "signatureability", "forcepower"].includes(itemData.type)) {
        const cost = await this.calcPurchasePrice(itemData);
        const availableXP = this.actor.system.experience.available;
        if (cost > 0 && cost < availableXP) {
          new Dialog(
          {
            title: game.i18n.localize("SWFFG.DragDrop.Title"),
            buttons: {
              purchase: {
                icon: '<i class="fas fa-hourglass"></i>',
                label: game.i18n.localize("SWFFG.DragDrop.PurchaseItem"),
                callback: async (that) => {
                  if (cost > 0) {
                    await this.object.update({
                      system: {
                        experience: {
                          available: availableXP - cost,
                        }
                      }
                    });
                    await xpLogSpend(
                        this.actor, `${game.i18n.localize("SWFFG.DragDrop.XPLog")} ${itemData.type} ${itemData.name}`,
                        cost,
                        this.actor.system.experience.available,
                        this.actor.system.experience.total
                    );
                  }
                },
              },
              grant: {
                icon: '<i class="fas fa-recycle"></i>',
                label: game.i18n.localize("SWFFG.DragDrop.GrantItem"),
              },
            },
          },
          {
            classes: ["dialog", "starwarsffg"],
          }
        ).render(true);
        }
      }

      // Create the owned item
      return this._onDropItemCreate(itemData);
    } else {
      return super._onDropItem(event, data);
    }
  }

  async calcPurchasePrice(itemData) {
    let cost = 0;
    if (itemData.type === "specialization") {
      // check if the specialization is in career
      const career = this.actor.items.find(i => i.type === "career");
      if (career) {
        const inCareerSpecializations = Object.values(career?.system?.specializations) || [];
        let inCareer = false;
        for (const careerSpecialization of inCareerSpecializations) {
          if (careerSpecialization.name === itemData.name) {
            inCareer = true;
            break;
          }
        }
        const specializationCount = (this.actor.items.filter(i => i.type === "specialization") || []).length;
        cost = (specializationCount + 1) * 10;
        if (!inCareer) {
          cost += 10;
        }
        return cost;
      } else {
        return -1;
      }
    } else if (itemData.type === "talent") {
      return -1;
    } else if (itemData.type === "signatureability") {
      return itemData.system.base_cost;
    } else if (itemData.type === "forcepower") {
      return itemData.system.base_cost;
    }
    return -1;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    const data = await super.getData();
    data.classType = this.constructor.name;

    // Compatibility for Foundry 0.8.x with backwards compatibility (hopefully) for 0.7.x
    const actorData = this.actor.toObject(false);
    data.actor = actorData;
    data.data = actorData.system;
    data.talentList = this.actor.talentList;
    data.rollData = this.actor.getRollData.bind(this.actor);

    data.token = this.token;
    data.items = this.actor.items;

    if (options?.action === "update" && this.object.compendium) {
      data.item = foundry.utils.mergeObject(data.actor, options.data);
    }

    data.dtypes = ["String", "Number", "Boolean"];
    for (let attr of Object.values(data.data.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }
    data.FFG = CONFIG.FFG;

    let autoSoakCalculation = true;

    if (typeof this.actor.flags?.genesysk2?.config?.enableAutoSoakCalculation === "undefined") {
      autoSoakCalculation = game.settings.get("genesysk2", "enableSoakCalc");
    } else {
      autoSoakCalculation = this.actor.flags?.genesysk2?.config?.enableAutoSoakCalculation;
    }

    data.settings = {
      enableSoakCalculation: autoSoakCalculation,
      enableCriticalInjuries: this.actor.flags?.genesysk2?.config?.enableCriticalInjuries,
    };

    // Establish sheet width and height using either saved persistent values or default values defined in swffg-config.js
    this.position.width = this.sheetWidth || CONFIG.FFG.sheets.defaultWidth[this.actor.type];
    this.position.height = this.sheetHeight || CONFIG.FFG.sheets.defaultHeight[this.actor.type];

    switch (this.actor.type) {
      case "character":
      case "nemesis":
      case "rival":
        if (data.limited) {
          this.position.height = 165;
        }
        // we need to update all specialization talents with the latest talent information
        if (!this.actor.flags.genesysk2?.loaded && this.actor.type !== "rival") {
          this._updateSpecialization(data);
          await this.object._prepareCharacterData(data);
        }

        if (data.data.stats.credits.value > 999) {
          data.data.stats.credits.value = data.data.stats.credits.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
        data.data.enrichedBio = await TextEditor.enrichHTML(this.actor.system.biography);
        data.data.general.enrichedNotes = await TextEditor.enrichHTML(this.actor.system.general?.notes) || "";
        data.data.general.enrichedFeatures = await TextEditor.enrichHTML(this.actor.system.general?.features) || "";
        data.maxAttribute = game.settings.get("starwarsffg", "maxAttribute");
        break;
        // OG : modif a cause du data sur mon système : trouver à la copie ne se fait pas correctement !
      // case "minion":
        // let lstcmp = Object.entries(data.data.skills)
        // lstcmp.forEach(cmpn => { data.data.skills[cmpn [0]].groupskill = data.data.skills[cmpn[0]].careerskill})
        // break;
      case "vehicle":
        data.data.enrichedBio = await TextEditor.enrichHTML(this.actor.system.biography);
        // add the crew to the items of the vehicle
        data.crew = [];
        // look up the flag data
        const crew = this.actor.getFlag('genesysk2', 'crew');
        if (crew) {
          for (let i = 0; i < crew.length; i++) {
            // iterate over the crew members in the flag data
            const actor = game.actors.get(crew[i].actor_id);
            // pull the image from the actor to display it
            const img = actor?.img || 'icons/svg/mystery-man.svg';

            // add them to the items, so we can render them on the sheet
            let roll;
            if (crew[i].role !== "Pilot") {
              roll = build_crew_roll(this.actor.id, crew[i].actor_id, crew[i].role);
            } else {
              roll = (await buildPilotRoll(this.actor.id, crew[i].actor_id, 0)).renderPreview().innerHTML;
            }
            if (!roll) {
              roll = 'N/A';
            }
            data.crew.push({
              'type': 'shipcrew',
              'id': crew[i].actor_id,
              'name': crew[i].actor_name,
              'role': crew[i].role,
              'img': img,
              'roll': roll,
              'link': crew[i]?.link,
            })
          }
        }
      default:
    }

    if (this.actor.type !== "vehicle" && this.actor.type !== "homestead") {
      // Filter out skills that are not custom (manually added) or part of the current system skill list
      Object.keys(data.data.skills)
      .filter(s => !data.data.skills[s].custom && !CONFIG.FFG.skills[s])
      .forEach(s => delete data.data.skills[s]);

      data.data.skilllist = this._createSkillColumns(data);
    }

    if (this.actor.flags?.config?.enableObligation === false && this.actor.flags?.config?.enableDuty === false && this.actor.flags?.config?.enableMorality === false && this.actor.flags?.config?.enableConflict === false) {
      data.hideObligationDutyMoralityConflictTab = true;
    }
    if (this.actor.flags?.genesysk2?.xpLog) {
      data.xpLog = this.actor.flags.genesysk2.xpLog.join("<br>");
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    let tabs = html.find(".tabs");
    let initial = this._sheetTab;
    new Tabs(tabs, {
      initial: initial,
      callback: (clicked) => {
        this._sheetTab = clicked.data("tab");
      },
    });

    html.find(".alt-tab").click((ev) => {
      const item = $(ev.currentTarget);
      this._tabs[0].activate(item.data("tab"));
    });

    html.find(".popout-editor").on("mouseover", (event) => {
      $(event.currentTarget).find(".popout-editor-button").show();
    });
    html.find(".popout-editor").on("mouseout", (event) => {
      $(event.currentTarget).find(".popout-editor-button").hide();
    });
    html.find(".popout-editor .popout-editor-button").on("click", this._onPopoutEditor.bind(this));

    // Setup dice pool image and hide filtered skills
    html.find(".skill").each((_, elem) => {
      DiceHelpers.addSkillDicePool(this, elem);
      const filters = this._filters.skills;
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    Hooks.on("preCreateItem", (item, createData, options, userId) => {
      // Save persistent sheet height and width for future use.
      this.sheetWidth = this.position.width;
      this.sheetHeight = this.position.height;

      // Check that we are dealing with an Embedded Document
      if (item.isEmbedded && item.parent.documentName === "Actor")
      {
        const actor = item.actor
        // we only allow one species and one career, find any other species and remove them.
        if (item.type === "species" || item.type === "career") {
          if (["character", "nemesis", "rival"].includes(actor.type)) {
            const itemToDelete = actor.items.filter((i) => (i.type === item.type) && (i.id !== item.id));
            itemToDelete.forEach((i) => {
                actor.items.get(i.id).delete();
            });
          }
          else if (actor.type === "minion") {
            ui.notifications.warn(`Item type '${item.type}' cannot be added to 'minion' actor types.`);
            return false;
          }
        }

        // Critical Damage can only be added to "vehicle" actors and Critical Injury can only be added to "character" actors.
        if (item.type === "criticaldamage" && actor.type !== "vehicle") {
          ui.notifications.warn("Critical Damage can only be added to 'vehicle' actor types.");
          return false;
        }
        if (item.type === "criticalinjury" && !["character", "nemesis", "rival"].includes(actor.type)) {
          ui.notifications.warn("Critical Injuries can only be added to 'character' actor types.");
          return false;
        }

        // Prevent adding of character data type items to vehicles
        if (["career", "forcepower", "talent", "signatureability", "specialization", "species", "ability"].includes(item.type.toString()) && actor.type === "vehicle") {
          ui.notifications.warn(`Item type '${item.type}' cannot be added to 'vehicle' actor types.`);
          return false;
        }
      }
    });

    Hooks.on("preDeleteItem", (item, createData, options, userId) => {
      // Save persistent sheet height and width for future use.
      this.sheetWidth = this.position.width;
      this.sheetHeight = this.position.height;
    });

    Hooks.on("preUpdateItem", (item, createData, options, userId) => {
      // Save persistent sheet height and width for future use.
      this.sheetWidth = this.position.width;
      this.sheetHeight = this.position.height;
    });

    let contextMenuOptions = [
      {
        name: game.i18n.localize("SWFFG.SkillChangeCharacteristicContextItem"),
        icon: '<i class="fas fa-wrench"></i>',
        callback: (li) => {
          this._onChangeSkillCharacteristic(li);
        },
      },
      {
        name: game.i18n.localize("SWFFG.SkillAddAsInitiative"),
        icon: '<i class="fas fa-cog"></i>',
        callback: (li) => {
          this._onInitiativeSkill(li);
        },
      },
      {
        name: game.i18n.localize("SWFFG.SkillRemoveContextItem"),
        icon: '<i class="fas fa-times"></i>',
        callback: (li) => {
          this._onRemoveSkill(li);
        },
      },
    ];

    if (this.actor.type === "character") {
      contextMenuOptions.push(
        {
          name: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.SkillRank.ContextMenuText"),
          icon: '<i class="fas fa-dollar"></i>',
          callback: (li) => {
            this._buySkillRank(li);
          },
        },
      );
    }

    new ContextMenu(
        html,
        ".skillsGrid .skill",
        contextMenuOptions,
    );

    html.find(".skill-purchase").click(async (ev) => {
      const target = $(ev.currentTarget).parents().filter("[data-ability]");
      await this._buySkillRank(target);
    });

    new ContextMenu(html, "div.skillsHeader", [
      {
        name: game.i18n.localize("SWFFG.SkillAddContextItem"),
        icon: '<i class="fas fa-plus-circle"></i>',
        callback: (li) => {
          this._onCreateSkill(li);
        },
      },
    ]);

    html.find(".ffg-purchase").click(async (ev) => {
      await this._buyCore(ev)
    });

    // Send Item Details to chat.

    const sendToChatContextItem = {
      name: game.i18n.localize("SWFFG.SendToChat"),
      icon: '<i class="far fa-comment"></i>',
      callback: (li) => {
        let itemId = li.data("itemId");
        this._itemDetailsToChat(itemId);
      },
    };

    const rollForceToChatContextItem = {
      name: game.i18n.localize("SWFFG.SendForceRollToChat"),
      icon: '<i class="fas fa-dice-d20"></i>',
      callback: async (li) => {
        let itemId = li.data("itemId");
        let item = this.actor.items.get(itemId);
        if (!item) {
          item = game.items.get(itemId);
        }
        if (!item) {
          item = await ImportHelpers.findCompendiumEntityById("Item", itemId);
        }
        const forcedice = this.actor.system.stats.forcePool.max - this.actor.system.stats.forcePool.value;
        if (forcedice > 0) {
          let sheet = await this.getData();
          const dicePool = new DicePoolFFG({
            force: forcedice,
          });
          DiceHelpers.displayRollDialog(sheet, dicePool, `${game.i18n.localize("SWFFG.Rolling")} ${item.name}`, item.name, item);
        }
      },
    };

    new ContextMenu(html, "li.item:not(.forcepower)", [sendToChatContextItem]);
    new ContextMenu(html, "li.item.forcepower", [sendToChatContextItem, rollForceToChatContextItem]);
    new ContextMenu(html, "div.item", [sendToChatContextItem]);

    if (["nemesis", "rival"].includes(this.actor.type)) {
      this.sheetoptions = new ActorOptions(this, html);
      this.sheetoptions.register("enableAutoSoakCalculation", {
        name: game.i18n.localize("SWFFG.EnableSoakCalc"),
        hint: game.i18n.localize("SWFFG.EnableSoakCalcHint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("enableForcePool", {
        name: game.i18n.localize("SWFFG.EnableForcePool"),
        hint: game.i18n.localize("SWFFG.EnableForcePoolHint"),
        type: "Boolean",
        default: true,
      });
    }
    if (this.actor.type === "character") {
      this.sheetoptions = new ActorOptions(this, html);
      this.sheetoptions.register("enableAutoSoakCalculation", {
        name: game.i18n.localize("SWFFG.EnableSoakCalc"),
        hint: game.i18n.localize("SWFFG.EnableSoakCalcHint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("medicalItemName", {
        name: game.i18n.localize("SWFFG.MedicalItemName"),
        hint: game.i18n.localize("SWFFG.MedicalItemNameHint"),
        type: "String",
        default: game.settings.get("genesysk2", "medItemName"),
      });
      this.sheetoptions.register("enableObligation", {
        name: game.i18n.localize("SWFFG.EnableObligation"),
        hint: game.i18n.localize("SWFFG.EnableObligationHint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("enableDuty", {
        name: game.i18n.localize("SWFFG.EnableDuty"),
        hint: game.i18n.localize("SWFFG.EnableDutyHint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("enableMorality", {
        name: game.i18n.localize("SWFFG.EnableMorality"),
        hint: game.i18n.localize("SWFFG.EnableMoralityHint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("enableConflict", {
        name: game.i18n.localize("SWFFG.EnableConflict"),
        hint: game.i18n.localize("SWFFG.EnableConflictHint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("enableForcePool", {
        name: game.i18n.localize("SWFFG.EnableForcePool"),
        hint: game.i18n.localize("SWFFG.EnableForcePoolHint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("enableStrainThreshold", {
        name: game.i18n.localize("SWFFG.EnableStrainThreshold"),
        hint: game.i18n.localize("SWFFG.EnableStrainThresholdHint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("talentSorting", {
        name: game.i18n.localize("SWFFG.EnableSortTalentsByActivation"),
        hint: game.i18n.localize("SWFFG.EnableSortTalentsByActivationHint"),
        type: "Array",
        default: 0,
        options: [game.i18n.localize("SWFFG.UseGlobalSetting"), game.i18n.localize("SWFFG.OptionValueYes"), game.i18n.localize("SWFFG.OptionValueNo")],
      });
    }

    if (this.actor.type === "minion") {
      this.sheetoptions = new ActorOptions(this, html);
      this.sheetoptions.register("enableAutoSoakCalculation", {
        name: game.i18n.localize("SWFFG.EnableSoakCalc"),
        hint: game.i18n.localize("SWFFG.EnableSoakCalcHint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("enableCriticalInjuries", {
        name: game.i18n.localize("SWFFG.EnableCriticalInjuries"),
        hint: game.i18n.localize("SWFFG.EnableCriticalInjuriesHint"),
        type: "Boolean",
        default: false,
      });
      this.sheetoptions.register("talentSorting", {
        name: game.i18n.localize("SWFFG.EnableSortTalentsByActivation"),
        hint: game.i18n.localize("SWFFG.EnableSortTalentsByActivationHint"),
        type: "Array",
        default: 0,
        options: [game.i18n.localize("SWFFG.UseGlobalSetting"), game.i18n.localize("SWFFG.OptionValueYes"), game.i18n.localize("SWFFG.OptionValueNo")],
      });
    }

    if (this.actor.type === "vehicle") {
      this.sheetoptions = new ActorOptions(this, html);
      this.sheetoptions.register("enableHyperdrive", {
        name: game.i18n.localize("SWFFG.EnableHyperdrive"),
        hint: game.i18n.localize("SWFFG.EnableHyperdriveHint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("enableSensors", {
        name: game.i18n.localize("SWFFG.EnableSensors"),
        hint: game.i18n.localize("SWFFG.EnableSensorsHint"),
        type: "Boolean",
        default: true,
      });
    }

    html.find(".medical").click(async (ev) => {
      const item = await $(ev.currentTarget);
      let prevUses = (this.object.system?.stats?.medical?.uses === undefined) ? 0 : this.object.system.stats.medical.uses;
      let updateData = {};
      let newUses = 0;
      const item_name = this.object?.flags?.genesysk2?.config?.medicalItemName || game.i18n.localize("SWFFG.DefaultMedicalItemName");
      let msg_content;
      if (item[0].className === "fas fa-plus-circle medical") {
        newUses = prevUses + 1;
        newUses = (newUses > 5) ? 5 : newUses;
        msg_content = `<i>${game.i18n.localize("SWFFG.MedicalItemUse")} ${item_name} #${newUses}</i>`;
      } else {
        newUses = prevUses - 1;
        newUses = (newUses < 0) ? 0 : newUses;
        msg_content = `<i>${game.i18n.localize("SWFFG.MedicalItemUnUse")} ${item_name} #${prevUses}</i>`;
      }

      ChatMessage.create({
        speaker: { alias: this.object.name },
        content: msg_content,
      });

      foundry.utils.setProperty(updateData, `system.stats.medical.uses`, newUses);
      this.object.update(updateData);

    });

    html.find(".resetMedical").click(async (ev) => {
      if (game.settings.get("genesysk2", "HealingItemAction") === '0') {
          // prompt
          // show a prompt asking what the user wants to do
          new Dialog(
              {
                  title: game.i18n.localize("SWFFG.MedicalItemNameUseTitle"),
                  buttons: {
                      done: {
                          icon: '<i class="fas fa-hourglass"></i>',
                          label: game.i18n.localize("SWFFG.MedicalItemNameUseRest"),
                          callback: (that) => {
                              // rest
                              let updateData = {};
                              foundry.utils.setProperty(updateData, `system.stats.medical.uses`, 0);
                              foundry.utils.setProperty(updateData, `system.stats.strain.value`, 0);
                              foundry.utils.setProperty(updateData, `system.stats.wounds.value`, Math.max(0, this.object.system.stats.wounds.value - 1));
                              this.object.update(updateData);
                              ChatMessage.create({
                                speaker: { alias: this.object.name },
                                content: `<i>${game.i18n.localize("SWFFG.MedicalItemRest")}</i>`,
                              });
                          },
                      },
                      cancel: {
                          icon: '<i class="fas fa-recycle"></i>',
                          label: game.i18n.localize("SWFFG.MedicalItemNameUseReset"),
                          callback: (that) => {
                              // reset
                              let updateData = {};
                              foundry.utils.setProperty(updateData, `system.stats.medical.uses`, 0);
                              this.object.update(updateData);
                              const item_name = this.object?.flags?.genesysk2?.config?.medicalItemName || game.i18n.localize("SWFFG.DefaultMedicalItemName");
                              ChatMessage.create({
                                speaker: { alias: this.object.name },
                                content: `<i>${game.i18n.localize("SWFFG.MedicalItemResetStart")} ${item_name} ${game.i18n.localize("SWFFG.MedicalItemResetEnd")}</i>`,
                              });
                          },
                      },
                  },
              },
              {
                  classes: ["dialog", "genesysk2"],
              }
          ).render(true);
      } else if (game.settings.get("genesysk2", "HealingItemAction") === '1') {
        // rest
        let updateData = {};
        foundry.utils.setProperty(updateData, `system.stats.medical.uses`, 0);
        foundry.utils.setProperty(updateData, `system.stats.strain.value`, 0);
        foundry.utils.setProperty(updateData, `system.stats.wounds.value`, Math.max(0, this.object.system.stats.wounds.value - 1));
        this.object.update(updateData);
      } else if (game.settings.get("genesysk2", "HealingItemAction") === '2') {
        // reset
        let updateData = {};
        foundry.utils.setProperty(updateData, `system.stats.medical.uses`, 0);
        this.object.update(updateData);
      }
    });

    // Toggle item equipped
    html.find(".items .item a.toggle-equipped").click((ev) => {
      const li = $(ev.currentTarget);
      const item = this.actor.items.get(li.data("itemId"));
      if (item) {
        item.update({ ["system.equippable.equipped"]: !item.system.equippable.equipped });
      }
    });

    // Toggle item details
    html.find(".items .item, .header-description-block .item, .injuries .item").click(async (ev) => {
      if (!$(ev.target).hasClass("fa-trash") && !$(ev.target).hasClass("fas") && !$(ev.target).hasClass("rollable")) {
        const li = $(ev.currentTarget);
        if (ev?.originalEvent?.target && !$(ev?.originalEvent?.target).hasClass("item-pill")) {
          let itemId = li.data("itemId");
          let item = this.actor.items.get(itemId);

          if (!item) {
            item = game.items.get(itemId);
          }
          if (!item) {
            item = await ImportHelpers.findCompendiumEntityById("Item", itemId);
            if (!item) {
              const talentItemData = this.actor?.talentList?.find(talent => talent.itemId === itemId);
              if (talentItemData) {
                item = await ImportHelpers.findCompendiumEntityByName("Item", talentItemData.name);
              }
            }
          }
          if (item?.sheet) {
            if (item?.type == "species" || item?.type == "career" || item?.type == "specialization" || item?.type == "forcepower" || item?.type == "signatureability") item.sheet.render(true);
            else this._itemDisplayDetails(item, ev);
          }
        }
        if (ev?.originalEvent?.target && $(ev?.originalEvent?.target).hasClass("item-pill")) {
          event.preventDefault();
          event.stopPropagation();
          const li = $(ev.originalEvent.target);
          const itemType = li.attr("data-item-embed-type");
          let itemData = {};
          const newEmbed = li.attr("data-item-embed");

          if (newEmbed === "true" && itemType === "itemmodifier") {
            itemData = {
              img: li.attr('data-item-embed-img'),
              name: li.attr('data-item-embed-name'),
              type: li.attr('data-item-embed-type'),
              system: {
                description: unescape(li.attr('data-item-embed-description')),
                attributes: JSON.parse(li.attr('data-item-embed-modifiers')),
                rank: li.attr('data-item-embed-rank'),
                rank_current: li.attr('data-item-embed-rank'),
              },
              ownership: {
                default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
              }
            };
            const tempItem = await Item.create(itemData, {temporary: true});
            tempItem.sheet.render(true);
          } else {
            CONFIG.logger.debug(`Unknown item type: ${itemType}, or lacking new embed system`);
            let itemId = li.dataset.itemId;
            let modifierType = li.dataset.modifierType;
            let modifierId = li.dataset.modifierId;

            await EmbeddedItemHelpers.displayOwnedItemItemModifiersAsJournal(itemId, modifierType, modifierId, this.actor.id, this.actor.compendium);
          }
        };
      }
    });

    // Toggle Force Power details
    html.find(".force-power").click(async (ev) => {
      ev.stopPropagation();
      if (!$(ev.target).hasClass("fa-trash") && !$(ev.target).hasClass("fas") && !$(ev.target).hasClass("rollable")) {
        const li = $(ev.currentTarget);
        const itemId = li.data("itemId");
        const item = this.actor.items.get(itemId);
        const desc = li.data("desc");

        if (item?.sheet) {
          if (item?.type === "forcepower") {
            await this._forcePowerDisplayDetails(desc, ev);
          }
        }
      }
    });

    // Toggle Signature Ability details
    html.find(".signature-ability").click(async (ev) => {
      ev.stopPropagation();
      if (!$(ev.target).hasClass("fa-trash") && !$(ev.target).hasClass("fas") && !$(ev.target).hasClass("rollable")) {
        const li = $(ev.currentTarget);
        const itemId = li.data("itemId");
        const item = this.actor.items.get(itemId);
        const desc = li.data("desc");

        if (item?.sheet) {
          if (item?.type === "signatureability") {
            await this._forcePowerDisplayDetails(desc, ev);
          }
        }
      }
    });

    // Add Inventory Item
    html.find(".item-add").click((ev) => {

      let itemType = "";
      switch (ev.currentTarget.classList[1]) {
        case "armour":
          itemType = game.i18n.localize("ITEM.TypeArmour");
          break;
        case "weapon":
          itemType = game.i18n.localize("ITEM.TypeWeapon");
          break;
        case "shipattachment":
          itemType = game.i18n.localize("ITEM.TypeShipattachment");
          break;
        case "shipweapon":
          itemType = game.i18n.localize("ITEM.TypeShipweapon");
          break;

        default:
          itemType = game.i18n.localize("ITEM.TypeGear");
          break;
      }

      let itemdata = {
        name: itemType,
        type: ev.currentTarget.classList[1]
      };

      this.actor.createEmbeddedDocuments("Item", [itemdata]);
    });

    // Delete Inventory Item
    html.find(".item-delete").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.items.get(li.data("itemId"))?.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Edit Inventory Item
    html.find(".item-edit").click(async (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("itemId");
      let item = this.actor.items.get(itemId);
      if (!item) {
        item = game.items.get(itemId);

        if (!item) {
          item = await ImportHelpers.findCompendiumEntityById("Item", itemId);
        }
      }
      if (item?.sheet) {
        item.sheet.render(true);
      }
    });

    // Delete Crew
    html.find(".crew-delete").click(async (ev) => {
      const crew_member_id = $(ev.currentTarget).parents(".item").data("actor-id");
      const crew_role = $(ev.currentTarget).parents(".item").data("role-name");
      const actor = this.actor;

      deregister_crew(actor, crew_member_id, crew_role);
    });

    // Edit Crew
    html.find(".crew-edit").click(async (ev) => {
      const crew_member_id = $(ev.currentTarget).parents(".item").data("actor-id");
      const crew_member = game.actors.get(crew_member_id);
      const registeredRoles = game.settings.get('genesysk2', 'arrayCrewRoles');
      const actor = this.actor;
      const vehicleRoles = actor.getFlag('genesysk2', 'crew');

      const crewMemberRoles = vehicleRoles.filter(role => role.actor_id === crew_member_id);
      const rolesInUse = crewMemberRoles.map(role => role.role);

      const content = await renderTemplate(
        "systems/starwarsffg/templates/dialogs/ffg-crew-change.html",
        {
          actor: crew_member,
          roles: registeredRoles,
          rolesInUse: rolesInUse,
        }
      );

      new Dialog(
        {
          title: game.i18n.localize("SWFFG.Crew.Title"),
          content: content,
          buttons: {
            confirm: {
              label: 'Update Roles',
              callback: async (html) => {
                const newRoles = html.find('[name="select-many-things"]').val();
                await updateRoles(actor, crew_member_id, newRoles);
              }
            }
          }
        },
      ).render(true);
    });

    html.find(".item-info").click((ev) => {
      ev.stopPropagation();
      const li = $(ev.currentTarget).parents(".item");
      const itemId = li.data("itemId");

      const item = this.actor.talentList.find((talent) => {
        return talent.itemId === itemId;
      });

      const title = `${game.i18n.localize("SWFFG.TalentSource")} ${item.name}`;

      new Dialog(
        {
          title: title,
          content: {
            source: item.source,
          },
          buttons: {
            done: {
              icon: '<i class="fas fa-check"></i>',
              label: game.i18n.localize("SWFFG.ButtonAccept"),
              callback: (html) => {
                const talentsToRemove = $(html).find("input[type='checkbox']:checked");
                CONFIG.logger.debug(`Removing ${talentsToRemove.length} talents`);

                for (let i = 0; i < talentsToRemove.length; i += 1) {
                  const id = $(talentsToRemove[i]).val();
                  this.actor.items.get(id)?.delete();
                }
              },
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: game.i18n.localize("SWFFG.Cancel"),
            },
          },
        },
        {
          classes: ["dialog", "genesysk2"],
          template: "systems/genesysk2/templates/actors/dialogs/ffg-talent-selector.html",
        }
      ).render(true);
    });

    // Edit Gear Quantities

    html.find(".item-quantity .quantity.increase").click(async (ev) => {
      ev.stopPropagation();
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("itemId");
      let item = this.actor.items.get(itemId);
      if (!item) {
        item = game.items.get(itemId);

        if (!item) {
          item = await ImportHelpers.findCompendiumEntityById("Item", itemId);
        }
      }
      item.update({ ["system.quantity.value"]: item.system.quantity.value + 1 });
    });

    html.find(".item-quantity .quantity.decrease").click(async (ev) => {
      ev.stopPropagation();
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("itemId");
      let item = this.actor.items.get(itemId);
      if (!item) {
        item = game.items.get(itemId);

        if (!item) {
          item = await ImportHelpers.findCompendiumEntityById("Item", itemId);
        }
      }
      let count = item.system.quantity.value - 1 > 0 ? item.system.quantity.value - 1 : 0;
      item.update({ ["system.quantity.value"]: count });
    });

    // Roll Skill
    html
      .find(".roll-button")
      .on("click", async (event) => {
        event.stopPropagation();
        let upgradeType = null;
        if (event.ctrlKey && !event.shiftKey) {
          upgradeType = "ability";
        } else if (!event.ctrlKey && event.shiftKey) {
          upgradeType = "difficulty";
        }
        await DiceHelpers.rollSkill(this, event, upgradeType);
      });

    // Roll crew
    html.find(".roll-button-crew").children().on("click", async (event) => {
      const roles = $(event.currentTarget).parents(".item").data("itemId").split('-');
      const crew_id = roles[1];
      const crew_role = roles[2];
      const ship = this.actor;

      if (crew_role === 'Pilot') {
        await handlePilotCheck(ship, crew_id);
        return;
      }

      // look up the sheet for passing to the roller
      const crew_member = game.actors.get(crew_id);
      if (crew_member === undefined) {
        ui.notifications.warn(game.i18n.localize("SWFFG.Crew.Actor.Removed"));
        deregister_crew(ship, crew_id, crew_role);
        return;
      }
      const crewSheet = game.actors.get(crew_id)?.sheet;
      const starting_pool = {'difficulty': 2};

      const registeredRoles = await game.settings.get('genesysk2', 'arrayCrewRoles');
      // look up the defined metadata for the assigned role
      const role_info = registeredRoles.filter(i => i.role_name === crew_role);
      // validate the role still exists in our settings
      if (role_info.length === 0) {
        ui.notifications.warn(game.i18n.localize("SWFFG.Crew.Role.Removed"));
        return;
      }
      // validate that it's a valid role
      if (role_info[0].role_skill === undefined) {
        ui.notifications.warn(game.i18n.localize("SWFFG.Crew.Role.Invalid"));
        return;
      }
      // check if the pool uses handling
      if (role_info[0].use_handling) {
        const handling = ship?.system?.stats?.handling?.value;
        // add modifiers from the vehicle handling
        if (handling > 0) {
          starting_pool['boost'] = handling;
        } else if (handling < 0) {
          starting_pool['setback'] = handling * -1;
        }
      }
      // create chat card data
      const card_data = {
        "crew": {
          "name": ship.name,
          "img": ship.img,
          "crew_card": true,
          "role": role_info[0].role_name,
        }
      };
      // create the starting pool
      let pool = new DicePoolFFG(starting_pool);
      if (role_info[0].use_weapons) {
        // build the dialog to select which weapon to use
        const weapons = {};
        const raw_weapons = this.actor.items.filter(i => i.type === 'shipweapon');

        for (let i = 0; i < raw_weapons.length; i++) {
          weapons['weapon ' + i] = {
            icon: `<img src="${raw_weapons[i].img}" style="max-width: 24px; max-height: 24px">`,
            label: raw_weapons[i].name,
            callback: async (html) => {
              const skill = raw_weapons[i].system.skill.value;
              let pool = new DicePoolFFG({'difficulty': 2});
              pool = get_dice_pool(crew_id, skill, pool);
              pool = await DiceHelpers.getModifiers(pool, raw_weapons[i]);
              await DiceHelpers.displayRollDialog(
                crewSheet,
                pool,
                `${game.i18n.localize("SWFFG.Rolling")} ${skill}`,
                skill,
                foundry.utils.mergeObject(raw_weapons[i], card_data)
              );
            }
          }
        }

        // actually show the dialog
        await new Dialog(
          {
            title: game.i18n.localize("SWFFG.Crew.Roles.Gunner.Title"),
            content: `<p>${game.i18n.localize("SWFFG.Crew.Roles.Gunner.Description")}</p>`,
            buttons: weapons,
          },
        ).render(true);
      } else {
        // update the pool with actor information
        pool = get_dice_pool(crew_id, role_info[0].role_skill, pool);
        // open the roll dialog (skill name is already localized)
        await DiceHelpers.displayRollDialog(
          crewSheet,
          pool,
          `${game.i18n.localize("SWFFG.Rolling")} ${role_info[0].role_skill}`,
          `${role_info[0].role_skill}`,
          card_data
        );
      }
    });

    // roll vehicle weapon by crew member
    html.find(".roll-button-weapon").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const ship = this.actor;
      const weaponId = $(event.currentTarget).data("item-id");
      const weapon = ship.items.get(weaponId);
      // validate the weapon still exists
      if (!weapon) {
        ui.notifications.warn(game.i18n.localize("SWFFG.Crew.Weapon.Removed"));
        return;
      }
      const weaponSkill = weapon.system.skill.value;
      const crew = await ship.getFlag("starwarsffg", "crew");
      const skillRoles = game.settings.get("starwarsffg", "arrayCrewRoles").filter(role => role.role_skill === weaponSkill);
      // validate the vehicle has a crew and there is a role that matches the weapon skill
      if (!crew || crew.length === 0) {
        CONFIG.logger.warn("Could not find crew for vehicle or could not find relevant skill; presenting default roller");
        return await DiceHelpers.rollSkill(this, event, null);
      }
      const crewGunners = crew.filter(member => skillRoles.some(role => role.role_name === member.role));
      if (crewGunners.length === 0) {
        CONFIG.logger.warn("Could not find crew for this skill type; presenting default roller");
        return await DiceHelpers.rollSkill(this, event, null);
      } else if (crewGunners.length > 1) {
        // create a dialog to ask the user which crew member should use the weapon
        // build the dialog to select which gunner to use
        const crewMembers = {};
        for (let i = 0; i < crewGunners.length; i++) {
          const actor = game.actors.get(crewGunners[i].actor_id);
          const img = actor?.img ? actor.img : "icons/svg/mystery-man.svg";
          crewMembers['crew ' + i] = {
            icon: `<img src="${img}" style="max-width: 24px; max-height: 24px">`,
            label: crewGunners[i].actor_name,
            callback: async (html) => {
              await this.vehicleCrewGunneryRoll(weapon, weaponSkill, crewGunners[i]);
            }
          }
        }
        // actually show the dialog
        await new Dialog(
          {
            title: game.i18n.localize("SWFFG.Crew.Roles.Weapon.Title"),
            content: `<p>${game.i18n.localize("SWFFG.Crew.Roles.Weapon.Description")}</p>`,
            buttons: crewMembers,
          },
        ).render(true);
      } else {
        await this.vehicleCrewGunneryRoll(weapon, weaponSkill, crewGunners[0]);
      }
    });

    // Roll from [ROLL][/ROLL] tag.
    html.find(".rollSkillDirect").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      let data = event.currentTarget.dataset;
      if (data) {
        let sheet = await this.getData();
        let skill = sheet.data.skills[data["skill"]];
        let characteristic = sheet.data.characteristics[skill.characteristic];
        let difficulty = data["difficulty"];
        await DiceHelpers.rollSkillDirect(skill, characteristic, difficulty, sheet);
      }
    });

    // Add or Remove Attribute
    html.find(".attributes").on("click", ".attribute-control", ModifierHelpers.onClickAttributeControl.bind(this));

    // transfer items between owned actor objects
    const dragDrop = new DragDrop({
      dragSelector: ".items-list .item",
      dropSelector: ".sheet-body",
      permissions: { dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this) },
      callbacks: { dragstart: this._onTransferItemDragStart.bind(this), drop: this._onTransferItemDrop.bind(this) },
    });

    dragDrop.bind(html[0]);

    const dragDrop1 = new DragDrop({
      dragSelector: ".skill",
      dropSelector: ".macro",
      permissions: { dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this) },
      callbacks: { dragstart: this._onSkillDragStart.bind(this) },
    });

    dragDrop1.bind(html[0]);

    html.find("input[type='text'][data-dtype='Number'][min][max]").on("change", (event) => {
      const a = event.currentTarget;
      const min = parseInt($(a).attr("min"), 10);
      const max = parseInt($(a).attr("max"), 10);
      const value = parseInt($(a).val(), 10) || min;

      if (value > max) {
        $(a).val(max);
      }
    });

    html.find("input[type='text'][data-dtype='Number'][pattern]").on("change", (event) => {
      const a = event.currentTarget;
      const value = $(a).val() || "2";
      const pattern = new RegExp($(a).attr("pattern"));

      if (!value.match(pattern)) {
        $(a).val("2");
      }
    });

    html.find(".add-obligation").on("click", async (event) => {
      event.preventDefault();
      const a = event.currentTarget;
      const form = this.form;

      const nk = randomID();
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.obligationlist.${nk}.type" value="" style="display:none;"/><input class="attribute-value" type="text" name="data.obligationlist.${nk}.magnitude" value="0" data-dtype="Number" placeholder="0"/>`;
      form.appendChild(newKey);
      await this._onSubmit(event);
    });

    html.find(".remove-obligation").on("click", async (event) => {
      event.preventDefault();
      const a = event.currentTarget;
      const id = a.dataset["id"];
      this.object.update({ "system.obligationlist": { ["-=" + id]: null } });
    });

    html.find(".add-duty").on("click", async (event) => {
      event.preventDefault();
      const a = event.currentTarget;
      const form = this.form;

      const nk = randomID();
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.dutylist.${nk}.type" value="" style="display:none;"/><input class="attribute-value" type="text" name="data.dutylist.${nk}.magnitude" value="0" data-dtype="Number" placeholder="0"/>`;
      form.appendChild(newKey);
      await this._onSubmit(event);
    });

    html.find(".remove-duty").on("click", async (event) => {
      event.preventDefault();
      const a = event.currentTarget;
      const id = a.dataset["id"];
      this.object.update({ "system.dutylist": { ["-=" + id]: null } });
    });

    html.find(".force-conflict .enable-dice-pool").on("click", async (event) => {
      event.preventDefault();
      await this.actor.setFlag('genesysk2', 'config', {enableForcePool: true});
      console.log({this: this, event: event})
    });

    html.find(".force-conflict .remove-force-powers").on("click", async (event) => {
      event.preventDefault();
      const itemsToDelete = this.actor.items.filter((i) => (i.type === "forcepower"));
      itemsToDelete.forEach((i) => {
          this.actor.items.get(i.id).delete();
      });
    });
  }

  /**
   * Display the roll dialog for a crew member rolling a ship weapon
   * @param weapon - weapon item
   * @param weaponSkill - skill used by the weapon
   * @param selectedGunner - the crew member rolling the weapon (from the crew, not the actual actor)
   * @returns {Promise<void>}
   */
  async vehicleCrewGunneryRoll(weapon, weaponSkill, selectedGunner) {
    const starting_pool = {'difficulty': 2};
    const ship = this.actor;
    const crewSheet = game.actors.get(selectedGunner.actor_id)?.sheet;
    // create chat card data
    const card_data = {
      "crew": {
        "name": ship.name,
        "img": ship.img,
        "crew_card": true,
        "role": selectedGunner.role,
      }
    }
    // create the starting pool
    let pool = new DicePoolFFG(starting_pool);
    // update the pool with actor data
    pool = get_dice_pool(selectedGunner.actor_id, weaponSkill, pool);
    pool = await DiceHelpers.getModifiers(pool, weapon);
    // display the roll dialog
    await DiceHelpers.displayRollDialog(
      crewSheet,
      pool,
      `${game.i18n.localize("SWFFG.Rolling")} ${weaponSkill}`,
      weaponSkill,
      foundry.utils.mergeObject(weapon, card_data)
    );
  }

  /**
   * Display details of an item.
   * @private
   */
  async _itemDisplayDetails(item, event) {
    event.preventDefault();
    let li = $(event.currentTarget),
      itemDetails = await item.getItemDetails();

    // Toggle summary
    if (li.hasClass("expanded")) {
      let details = li.children(".item-details");
      details.slideUp(200, () => details.remove());
    } else {
      let div = $(`<div class="item-details">${await PopoutEditor.renderDiceImages(itemDetails.description, this.actor)}</div>`);
      let props = $(`<div class="item-properties"></div>`);
      itemDetails.properties.forEach((p) => props.append(`<span class="tag">${p}</span>`));
      div.append(props);
      li.append(div.hide());
      $(div)
        .find(".rollSkillDirect")
        .on("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();

          let data = event.currentTarget.dataset;
          if (data) {
            let sheet = await this.getData();
            let skill = sheet.data.skills[data["skill"]];
            let characteristic = sheet.data.characteristics[skill.characteristic];
            let difficulty = data["difficulty"];
            await DiceHelpers.rollSkillDirect(skill, characteristic, difficulty, sheet);
          }
        });

      div.slideDown(200);
    }
    li.toggleClass("expanded");
  }

  /**
   * Display details of a Force Power.
   * @private
   */
  async _forcePowerDisplayDetails(desc, event) {
    event.preventDefault();
    let li = $(event.currentTarget);

    // Toggle summary
    if (li.hasClass("expanded")) {
      let details = li.children(".item-details");
      details.slideUp(200, () => details.remove());
    } else {
      let div = $(`<div class="item-details">${await TextEditor.enrichHTML(desc)}</div>`);
      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
  }

  /**
   * Send details of an item to chat.
   * @private
   */
  async _itemDetailsToChat(itemId) {
    let item = this.actor.items.get(itemId);
    if (!item) {
      item = game.items.get(itemId);
    }
    if (!item) {
      item = await ImportHelpers.findCompendiumEntityById("Item", itemId);
      if (!item) {
        const talentItemData = this.actor?.talentList.find(talent => talent.itemId === itemId);
        if (talentItemData) {
          item = await ImportHelpers.findCompendiumEntityByName("Item", talentItemData.name);
        }
      }
    }

    const itemDetails = item?.getItemDetails();
    const template = "systems/genesysk2/templates/chat/item-card.html";
    const html = await renderTemplate(template, { itemDetails, item });

    const messageData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: html,
      speaker: {
        actor: this.actor.id,
        token: this.actor.token,
        alias: this.actor.name,
      },
    };
    ChatMessage.create(messageData);
  }

  /**
   * Send details of a force power to chat.
   * @private
   */
  async _forcePowerDetailsToChat(itemId, desc, name) {
    let item = this.actor.items.get(itemId);
    if (!item) {
      item = game.items.get(itemId);
    }
    if (!item) {
      item = await ImportHelpers.findCompendiumEntityById("Item", itemId);
    }

    const itemDetails = { "desc": desc, "name": name };
    const template = "systems/genesysk2/templates/chat/force-power-card.html";
    const html = await renderTemplate(template, { itemDetails, item });

    const messageData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: {
        actor: this.actor.id,
        token: this.actor.token,
        alias: this.actor.name,
      },
    };
    ChatMessage.create(messageData);
  }

  /**
   * Change skill characteristic
   * @param  {object} a - Event object
   */
  _onChangeSkillCharacteristic(a) {
    //const a = event.currentTarget;
    const characteristic = $(a).data("characteristic");
    const ability = $(a).data("ability");
    let label = ability;
    if (CONFIG.FFG.skills[ability]?.label) {
      label = CONFIG.FFG.skills[ability].label;
    }

    new Dialog(
      {
        title: `${game.i18n.localize("SWFFG.SkillCharacteristicDialogTitle")} ${game.i18n.localize(label)}`,
        content: {
          options: CONFIG.FFG.characteristics,
          char: characteristic,
        },
        buttons: {
          one: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("SWFFG.ButtonAccept"),
            callback: (html) => {
              let newCharacteristic = $(html).find("input[type='radio']:checked").val();

              CONFIG.logger.debug(`Updating ${ability} Characteristic from ${characteristic} to ${newCharacteristic}`);

              let updateData = {};
              setProperty(updateData, `system.skills.${ability}.characteristic`, newCharacteristic);

              this.object.update(updateData);
            },
          },
          two: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("SWFFG.Cancel"),
          },
        },
      },
      {
        classes: ["dialog", "genesysk2"],
        template: "systems/genesysk2/templates/actors/dialogs/ffg-skill-characteristic-selector.html",
      }
    ).render(true);
  }

  /**
   * Create new one-off skill for this actor
   * @param  {object} a - Event object
   */
  _onCreateSkill(a) {
    const group = $(a).parent().data("type");

    new Dialog(
      {
        title: `${game.i18n.localize("SWFFG.SkillAddDialogTitle")}`,
        content: {
          options: CONFIG.FFG.characteristics,
        },
        buttons: {
          one: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("SWFFG.ButtonAccept"),
            callback: (html) => {
              const name = $(html).find("input[name='name']").val();
              const characteristic = $(html).find("select[name='characteristic']").val();

              let newSkill = {
                careerskill: false,
                characteristic,
                groupskill: false,
                label: name,
                max: game.settings.get("starwarsffg", "maxSkill"),
                rank: 0,
                type: group,
                custom: true,
                nontheme: true,
              };

              if (name.trim().length > 0) {
                CONFIG.logger.debug(`Creating new skill ${name} (${characteristic})`);
                let updateData = {};
                setProperty(updateData, `system.skills.${name}`, newSkill);

                this.object.update(updateData);
              }
            },
          },
          two: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("SWFFG.Cancel"),
          },
        },
      },
      {
        classes: ["dialog", "genesysk2"],
        template: "systems/genesysk2/templates/actors/dialogs/ffg-skill-new.html",
      }
    ).render(true);
  }

  /**
   * Handle the right click -> buy skill rank event
   * @param a - Event object
   * @returns {Promise<void>}
   * @private
   */
  async _buySkillRank(a) {
    const skill = $(a).data("ability");
    const curRank = this.object.system.skills[skill].rank;
    const availableXP = this.object.system.experience.available;
    const totalXP = this.object.system.experience.total;
    const careerSkill = this.object.system.skills[skill].careerskill;
    const cost = careerSkill ? (curRank + 1) * 5 : (curRank + 1) * 5 + 5;

    if (cost > availableXP) {
      ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.NotEnoughXP"));
      return;
    }
    const dialog = new Dialog(
      {
        title: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.SkillRank.ConfirmTitle"),
        content: game.i18n.format("SWFFG.Actors.Sheets.Purchase.SkillRank.Text", {cost: cost, skill: skill, old: curRank, new: curRank + 1}),
        buttons: {
          done: {
            icon: '<i class="fas fa-dollar"></i>',
            label: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.ConfirmPurchase"),
            callback: async (that) => {
              // update the form because the fields are read when an update is performed
              this.object.sheet.element.find(`[name="data.skills.${skill}.rank"]`).val(curRank + 1);
              await this.object.sheet.submit({preventClose: true});
              await this.object.update({
                system: {
                  experience: {
                    available: availableXP - cost,
                  }
                }
              });
              await xpLogSpend(game.actors.get(this.object.id), `skill rank ${skill} ${curRank} --> ${curRank + 1}`, cost, availableXP - cost, totalXP);
            },
          },
          cancel: {
            icon: '<i class="fas fa-cancel"></i>',
            label: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.CancelPurchase"),
          },
        },
      },
      {
        classes: ["dialog", "starwarsffg"],
      }
    ).render(true);
  }

  /**
   * Remove skill from skill list
   * @param  {object} a - Event object
   */
  _onRemoveSkill(a) {
    const ability = $(a).data("ability");
    this.object.update({ "system.skills": { ["-=" + ability]: null } });
  }

  /**
   * Set skill as a skill available in the initiative dialog
   * @param  {object} a - Event object
   */
  _onInitiativeSkill(a) {
    const skill = $(a).data("ability");
    let updateData = {};

    let useSkillForInitiative = false;
    if (!this.object.system.skills[skill]?.useForInitiative) {
      useSkillForInitiative = true;
    }

    setProperty(updateData, `system.skills.${skill}.useForInitiative`, useSkillForInitiative);
    this.object.update(updateData);
  }

  /**
   * Listen for click events on a filter control to modify the selected filter option.
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickFilterControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const filters = this._filters.skills;
    var filter = a.id;
    $(a).prop("checked", true);
    filters.filter = filter;
    await this._onSubmit(event);
  }
  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const actorUpdate = ActorHelpers.updateActor.bind(this);
    // Save persistent sheet height and width for future use.
    this.sheetWidth = this.position.width;
    this.sheetHeight = this.position.height;

    await actorUpdate(event, formData);
  }

  /**
   * Drag Event function for creating Hotbar macros for skill rolls
   * @param  {} event
   */
  _onSkillDragStart(event) {
    const li = event.currentTarget;

    $(event.currentTarget).attr("data-item-actorid", this.actor.id);
    const skill = li.dataset.ability;
    const characteristic = li.dataset.characteristic;

    if (skill && characteristic) {
      const dragData = {
        type: "CreateMacro",
        actorId: this.actor.id,
        data: {
          skill,
          characteristic,
          type: "skill",
        },
      };
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
      return true;
    }
    return false;
  }

  /**
   * Drag Event function for transferring items between owned actors
   * @param  {Object} event
   */
  _onTransferItemDragStart(event) {
    const li = event.currentTarget;

    $(event.currentTarget).attr("data-item-actorid", this.actor.id);

    const item = this.actor.items.get(li.dataset.itemId);

    // limit transfer on personal weapons/armour/gear
    if (["weapon", "armour", "gear"].includes(item.type)) {
      const dragData = {
        type: "Transfer",
        actorId: this.actor.id,
        data: item,
      };
      if (this.actor.isToken) dragData.tokenId = this.actor.token.id;
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    } else {
      return false;
    }
  }

  _canDragStart(selector) {
    return this.options.editable && this.actor.isOwner;
  }

  _canDragDrop(selector) {
    return true;
  }

  /**
   * Drop Event function for transferring items between actors
   *
   * @param  {Object} event
   */
  async _onTransferItemDrop(event) {
    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Transfer") return;
    } catch (err) {
      return false;
    }

    if (data.data) {
      let sameActor = data.actorId === this.actor.id;
      if (!sameActor) {
        try {
          this.actor.createEmbeddedDocuments("Item", [foundry.utils.duplicate(data.data)]); // Create a new Item
          const actor = game.actors.get(data.actorId);
          await actor.items.get(data.data._id)?.delete(); // Delete originating item from other actor
        } catch (err) {
          CONFIG.logger.error(`Error transferring item between actors.`, err);
        }
      }
    }
  }

  /**
   * Update specialization talents
   * @param  {Object} data
   */
  async _updateSpecialization(data) {
    CONFIG.logger.debug(`Running Actor initial load`);
    if (this.actor.flags.genesysk2 === undefined) {
        this.actor.flags.genesysk2 = {};
    }
    this.actor.flags.genesysk2.loaded = true;

    let actor = await game.actors.get(this.actor.id); // si l'acteur n'est pas dans les acteurs mais dans les packs, erreur ! OG
    if(actor == undefined) actor = this.actor;
    const specializations = actor.items.filter((item) => {
    return item.type === "specialization";
  });

// appeler beaucoup de fois !
//    CONFIG.logger.debug(`_updateSpecialization(): data.talentList before we start:`);
//    CONFIG.logger.debug(data.talentList.slice());

    // start the talent list only with talents that did not come from a specialization
    const globalTalentList = data.talentList.filter(i => i.source.filter(s => s.type === "talent").length > 0)

    for await (const spec of specializations) {
      CONFIG.logger.debug(`_updateSpecialization(): starting work on ${spec.name}`);
      const specializationTalents = spec.system.talents;
      for (const talent in specializationTalents) {
        let gameItem;
        if (specializationTalents[talent].pack && specializationTalents[talent].pack.length > 0) {
          const pack = await game.packs.get(specializationTalents[talent]?.pack);
          if (pack) {
            await pack.getIndex();
            let entry = await pack.index.find((e) => e._id === specializationTalents[talent].itemId);
            if (!entry) {
              entry = await pack.index.find((e) => e.name === specializationTalents[talent].name);
            }
            gameItem = await pack.getDocument(entry._id);
          }
        } else {
          gameItem = await game.items.get(specializationTalents[talent].itemId);
        }

        if (gameItem) {
          this._updateSpecializationTalentReference(specializationTalents[talent], gameItem);
        }
      }

      if (spec?.talentList && spec.talentList.length > 0) {
        spec.talentList.forEach((talent) => {
          const item = talent;
          item.firstSpecialization = spec.id;

          if (item.isRanked) {
            item.rank = typeof talent.rank === "number" ? talent.rank : 1;
          } else {
            item.rank = "N/A";
          }

          let index = globalTalentList.findIndex((obj) => {
            return obj.name === item.name;
          });

          if (index < 0 || !item.isRanked) {
            globalTalentList.push(item);
          } else {
            globalTalentList[index].rank += talent.rank;
          }
        });
      }
      CONFIG.logger.debug(`_updateSpecialization(): globalTalentList after current specialization:`);
      CONFIG.logger.debug(globalTalentList.slice());
    }

    data.talentList = globalTalentList;

    CONFIG.logger.debug(`_updateSpecialization(): data.talentList after update:`);
    CONFIG.logger.debug(data.talentList.slice());
  }

  /**
   * Update a specialization talent based on talent reference
   * @param  {Object} specializationTalentItem
   * @param  {Object} talentItem
   */
  _updateSpecializationTalentReference(specializationTalentItem, talentItem) {
    CONFIG.logger.debug(`Starwars FFG - Updating Specializations Talent`);
    specializationTalentItem.name = talentItem.name;
    specializationTalentItem.description = talentItem.system.description;
    specializationTalentItem.activation = talentItem.system.activation.value;
    specializationTalentItem.activationLabel = talentItem.system.activation.label;
    specializationTalentItem.isRanked = talentItem.system.ranks.ranked;
    specializationTalentItem.isForceTalent = talentItem.system.isForceTalent;
    specializationTalentItem.isConflictTalent = talentItem.system.isConflictTalent;
    specializationTalentItem.attributes = talentItem.system.attributes;
  }

  /**
   * Open dialog for popout editor
   * @param  {Object} event
   */
  _onPopoutEditor(event) {
    event.preventDefault();
    const a = event.currentTarget.parentElement;
    const label = a.dataset.label;
    const key = a.dataset.target;

    const parent = $(a.parentElement);
    const parentPosition = $(parent).offset();

    const windowHeight = parseInt($(parent).height(), 10) + 100 < 200 ? 200 : parseInt($(parent).height(), 10) + 100;
    const windowWidth = parseInt($(parent).width(), 10) < 320 ? 320 : parseInt($(parent).width(), 10);
    const windowLeft = parseInt(parentPosition.left, 10);
    const windowTop = parseInt(parentPosition.top, 10);

    const title = a.dataset.label ? `Editor for ${this.object.name}: ${label}` : `Editor for ${this.object.name}`;

    new PopoutEditor(this.object, {
      name: key,
      title: title,
      height: windowHeight,
      width: windowWidth,
      left: windowLeft,
      top: windowTop,
    }).render(true);
  }

  /**
   * Creates two even columns of skills for display while also sorting them.
   * @param  {Object} data
   */
  _createSkillColumns(data) {
    const numberSkills = Object.values(data.data.skills).length;
    const totalRows = numberSkills + Object.values(data.data.skilltypes).length;

    let colRowCount = Math.ceil(totalRows / 2.0);

    const cols = [[], []];

    let currentColumn = 0;
    let rowsLeft = colRowCount;

    data.data.skilltypes.forEach((type) => {
      // filter and sort skills for current skill category
      let sortFunction = (a, b) => {
        if (a.toLowerCase() > b.toLowerCase()) return 1;
        if (a.toLowerCase() < b.toLowerCase()) return -1;
        return 0;
      };
      if (game.settings.get("genesysk2", "skillSorting")) {
        sortFunction = (a, b) => {
          return data.data.skills[a].label.localeCompare(data.data.skills[b].label, game.i18n.lang);
        };
      }

      const skills = Object.keys(data.data.skills)
        .filter((s) => data.data.skills[s].type === type.type)
        .sort(sortFunction);

      // if the skill list is larger that the column row count then take into account the added header row.
      if (skills.length >= colRowCount) {
        if (skills.length - colRowCount > 2) {
          colRowCount = Math.ceil((totalRows + 1) / 2.0);
          rowsLeft = colRowCount;
        } else {
          colRowCount = skills.length + 1;
          rowsLeft = colRowCount;
        }
      }

      cols[currentColumn].push({ id: "header", ...type });
      rowsLeft -= 1;
      skills.forEach((s, index) => {
        cols[currentColumn].push({ name: s, ...data.data.skills[s] });
        rowsLeft -= 1;
        if (rowsLeft <= 0 && currentColumn === 0) {
          currentColumn += 1;
          rowsLeft = colRowCount;

          if (index + 1 < skills.length) {
            cols[currentColumn].push({ id: "header", ...type });
            rowsLeft -= 1;
          }
        }
      });
    });

    return cols;
  }

  async _buyCore(event) {
    const action = $(event.target).data("buy-action");
    const template = "systems/genesysk2/templates/dialogs/ffg-confirm-purchase.html";
    let content;
    const availableXP = this.object.system.experience.available;
    const totalXP = this.object.system.experience.total;
    let itemType;
    const groups = [];
    if (action === "specialization") {
      const inCareer = this.object.items.find(i => i.type === "career").system.specializations;
      const inCareerNames = Object.values(inCareer).map(i => i.name);
      const sources = game.settings.get("genesysk2", "specializationCompendiums").split(",");
      let outCareer = [];
      for (const source of sources) {
        const pack = game.packs.get(source);
        if (!pack) {
          continue;
        }
        const items = await pack.getDocuments();
        for (const item of items) {
          if (!inCareerNames.includes(item.name)) {
            outCareer.push({
              name: item.name,
              id: item.id,
              source: item.uuid,
            });
          }
        }
      }
      outCareer = sortDataBy(outCareer, "name");
      const baseCost = (this.object.items.filter(i => i.type === "specialization").length + 1) * 10;
      const increasedCost = baseCost + 10;
      if (baseCost > availableXP) {
        ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.NotEnoughXP"));
        return;
      } else if (increasedCost > availableXP) {
        outCareer = [];
      }
      itemType =  game.i18n.localize("TYPES.Item.specialization");
      groups.push("In Career");
      groups.push("Out of Career");
      content = await renderTemplate(template, { inCareer, outCareer, baseCost, increasedCost, itemType: itemType, itemCategory: "specialization", groups: groups });
    } else if (action === "signatureability") {
      const sources = game.settings.get("genesysk2", "signatureAbilityCompendiums").split(",");
      const rawSelectableItems =  this.object.items.find(i => i.type === "career").system.signatureabilities;
      const sigAbilityNames = Object.values(rawSelectableItems).map(i => i.name);
      let selectableItems = [];
      // pull items out of the world
      for (const itemId of Object.keys(rawSelectableItems)) {
        const item = rawSelectableItems[itemId];
        let retrievedItem = game.items.get(item.id);
        if (retrievedItem) {
          selectableItems.push({
            name: retrievedItem.name,
            id: retrievedItem.id,
            source: retrievedItem.uuid,
            cost: parseInt(retrievedItem.system.base_cost),
          });
        }
      }
      // pull items out of compendiums
      for (const source of sources) {
        const pack = game.packs.get(source);
        if (!pack) {
          continue;
        }
        const items = await pack.getDocuments();
        for (const item of items) {
          if (sigAbilityNames.includes(item.name)) {
            selectableItems.push({
              name: item.name,
              id: item.id,
              source: item.uuid,
              cost: parseInt(item.system.base_cost),
            });
          }
        }
      }
      if (selectableItems.length === 0) {
        ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.SA.NotSet"));
        return;
      }
      // filter purchasable signature abilities to those where the required specialization upgrades have been purchased
      // filter specializations to those within the career
      const career = this.object.items.find(i => i.type === "career");
      if (!career) {
        ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.CareerNotSet"));
        return;
      }
      const permittedSpecializations = Object.values(career.system.specializations).map(i => i.name);
      const matchingSpecializations = this.object.items.filter(i => i.type === "specialization" && permittedSpecializations.includes(i.name));
      if (!matchingSpecializations) {
        ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.Career.Specializations.NotSet"));
        return;
      }
      // loop through signature abilities and build a map of required upgrades
      let newSelectableItems = [];
      for (const selectableItem of selectableItems) {
        const fullItem = fromUuidSync(selectableItem.source);
        // check if any specializations match the required upgrades, discarding them if they do not
        let match;
        for (const specialization of matchingSpecializations) {
          match = true;
          for (let i = 0; i < 4; i++) {
            // if the upgrade is required, and we don't have it learned, this is not a match
            if (fullItem.system.uplink_nodes[`uplink${i}`] && !specialization.system.talents[`talent${i + 16}`].islearned) {
              match = false;
              break;
            }
          }
          if (match) {
            // if any specialization matches the required upgrades, do not check further specializations
            newSelectableItems.push(selectableItem);
            break;
          }
        }
      }
      if (newSelectableItems.length === 0) {
        ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.SA.NoMatch"));
        return;
      }

      // update the list with the filtered list
      selectableItems = newSelectableItems;

      selectableItems = sortDataBy(selectableItems, "name");
      itemType = game.i18n.localize("TYPES.Item.signatureability");
      content = await renderTemplate(template, { selectableItems, itemType: itemType, itemCategory: "signatureability" });
    } else if (action === "forcepower") {
      const sources = game.settings.get("genesysk2", "forcePowerCompendiums").split(",");
      let selectableItems = [];
      const worldItems = game.items.filter(i => i.type === "forcepower");
      for (const worldItem of worldItems) {
        selectableItems.push({
          name: worldItem.name,
          id: worldItem.id,
          source: worldItem.uuid,
          cost: worldItem.system.base_cost,
          requiredForceRating: parseInt(worldItem.system.required_force_rating),
        });
        addIfNotExist(groups, parseInt(worldItem.system.required_force_rating));
      }
      for (const source of sources) {
        const pack = game.packs.get(source);
        if (!pack) {
          continue;
        }
        const items = await pack.getDocuments();
        for (const item of items) {
          selectableItems.push({
            name: item.name,
            id: item.id,
            source: item.uuid,
            cost: item.system.base_cost,
            requiredForceRating: parseInt(item.system.required_force_rating),
          });
          addIfNotExist(groups, parseInt(item.system.required_force_rating));
        }
      }
      selectableItems = sortDataBy(selectableItems, "name");
      itemType = game.i18n.localize("TYPES.Item.forcepower");
      groups.sort();
      content = await renderTemplate(template, { selectableItems, itemType: itemType, itemCategory: "forcepower", groups: groups });
    } else if (action === "talent") {
      const purchasedItems = this.object.talentList;
      const sources = game.settings.get("genesysk2", "talentCompendiums").split(",");
      let selectableItems = [];
      const worldItems = game.items.filter(i => i.type === "talent");
      let worldItemsPack = [];
      for (const worldItem of worldItems) {
        const purchasedItem = purchasedItems.find((pItem) => pItem.name === worldItem.name)
        if(!purchasedItem || purchasedItem.isRanked) {
          worldItemsPack.push({
            name: worldItem.name,
            id: worldItem.id,
            source: worldItem.uuid,
            cost: purchasedItem?.isRanked ? worldItem.system.tier * 5 + 5 * purchasedItem.rank: worldItem.system.tier * 5,
          });
        }
      }
      worldItemsPack = sortDataBy(worldItemsPack, "name");
      selectableItems.push({pack: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.Talent.WorldItemsGroup"), items: worldItemsPack});

      for (const source of sources) {
        const pack = game.packs.get(source);
        if (!pack) {
          continue;
        }
        let packItems = [];
        const items = await pack.getDocuments();
        for (const item of items) {
          const purchasedItem = purchasedItems.find((pItem) => pItem.name === item.name)
          if(!purchasedItem || purchasedItem.isRanked) {
            packItems.push({
              name: item.name,
              id: item.id,
              source: item.uuid,
              cost: purchasedItem?.isRanked ? item.system.tier * 5 + 5 * purchasedItem.rank: item.system.tier * 5,
            });
          }
        }
        packItems = sortDataBy(packItems, "name");
        selectableItems.push({pack: pack.metadata.label, items: packItems});
      }
      itemType = game.i18n.localize("TYPES.Item.talent");
      content = await renderTemplate(template, { selectableItems, itemType: itemType, itemCategory: "talent" });
    } else if (action === "characteristic") {
      const characteristic = $(event.target).data("buy-characteristic");
      await this._buyCharacteristicRank(characteristic);
      return;
    } else {
      CONFIG.logger.debug(`Refusing purchase action ${action} since it is not registered`);
      return;
    }

    const dialog = new Dialog(
    {
        title: game.i18n.format("SWFFG.Actors.Sheets.Purchase.DialogTitle", {itemType: itemType}),
        content: content,
        buttons: {
          done: {
            icon: '<i class="fas fa-dollar"></i>',
            label: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.ConfirmPurchase"),
            callback: async (that) => {
              const cost = $("#ffgPurchase option:selected", that).data("cost");
              const selected_id = $("#ffgPurchase option:selected", that).data("id");
              const selected_source = $("#ffgPurchase option:selected", that).data("source");
              if (cost > availableXP) {
                ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.NotEnoughXP"));
                return;
              }
              let purchasedItem = game.items.get(selected_id);
              if (!purchasedItem) {
                purchasedItem = await fromUuid(selected_source);
              }
              if (purchasedItem.type === "forcepower") {
                const currentForceRating = parseInt(this.actor.system.stats.forcePool.max);
                const requiredForceRating = parseInt(purchasedItem.system.required_force_rating);
                if (currentForceRating < requiredForceRating) {
                  ui.notifications.warn(game.i18n.format("SWFFG.Actors.Sheets.Purchase.FP.FRTooLow", {forceRating: currentForceRating, requiredForceRating: requiredForceRating}));
                  return;
                }
              }
              await this.object.createEmbeddedDocuments("Item", [purchasedItem]);
              await this.object.update({
                system: {
                  experience: {
                    available: availableXP - cost,
                  },
                },
              });
              await xpLogSpend(game.actors.get(this.object.id), `new ${action} ${purchasedItem.name}`, cost, availableXP - cost, totalXP);
            },
          },
          cancel: {
            icon: '<i class="fas fa-cancel"></i>',
            label: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.CancelPurchase"),
          },
        },
      },
      {
        classes: ["dialog", "starwarsffg"],
      }
    ).render(true);
  }

  _buyCharacteristicRank(characteristic) {
    const characteristicValue = this.actor.system.characteristics[characteristic].value;
    // this is the currently bought ranks in the characteristic
    const characteristicCurrentRank = this.actor.system.attributes[characteristic].value;
    // this is the value without items that modify it
    const characteristicCostValue = ModifierHelpers.getBaseValue(this.actor.items, characteristic, "Characteristic") + characteristicCurrentRank;

    if (characteristicValue >= game.settings.get("starwarsffg", "maxAttribute")) {
      ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.Characteristic.Max"));
      return;
    }
    const availableXP = this.actor.system.experience.available;
    const totalXP = this.actor.system.experience.total;
    const cost = (characteristicCostValue + 1) * 10;
    if (cost > availableXP) {
      ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.NotEnoughXP"));
      return;
    }
    const dialog = new Dialog(
      {
        title: game.i18n.format("SWFFG.Actors.Sheets.Purchase.Characteristic.ConfirmTitle", {characteristic: characteristic}),
        content: game.i18n.format("SWFFG.Actors.Sheets.Purchase.Characteristic.ConfirmText", {cost: cost, level: characteristicCostValue + 1, characteristic: characteristic}),
        buttons: {
          done: {
            icon: '<i class="fas fa-dollar"></i>',
            label: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.ConfirmPurchase"),
            callback: async (that) => {
              await this.object.update({
                system: {
                  experience: {
                    available: availableXP - cost,
                  },
                  attributes: {
                    [characteristic]: {
                      value: characteristicCurrentRank + 1,
                    },
                  },
                }
              });
              await xpLogSpend(game.actors.get(this.object.id), `characteristic ${characteristic} level ${characteristicCostValue} --> ${characteristicCostValue + 1}`, cost, availableXP - cost, totalXP);
              await this.render(true);
            },
          },
          cancel: {
            icon: '<i class="fas fa-cancel"></i>',
            label: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.CancelPurchase"),
          },
        },
      },
      {
        classes: ["dialog", "starwarsffg"],
      }
    ).render(true);
  }
}

/**
 * Sort an array of dicts by a key. Totally not AI generated. But it works :)
 * @param data
 * @param byKey
 * @returns {*}
 */
function sortDataBy(data, byKey) {
 return data.sort((a, b) => {
    if (a[byKey] < b[byKey]) {
      return -1;
    }
    if (a[byKey] > b[byKey]) {
      return 1;
    }
    return 0;
 });
}

/**
 * Add an element to an array only if it isn't already present in that array
 * @param array
 * @param element
 * @returns {*}
 */
function addIfNotExist(array, element) {
  let index = array.indexOf(element);
  // Check if the object with the specified property value exists in the array
  if (index === -1) {
    // If not found, push a new object with the desired properties
    array.push(element);
  }
  return array;
}
