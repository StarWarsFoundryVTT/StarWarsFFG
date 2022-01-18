/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
import PopoutEditor from "../popout-editor.js";
import DiceHelpers from "../helpers/dice-helpers.js";
import ActorOptions from "./actor-ffg-options.js";
import ImportHelpers from "../importer/import-helpers.js";
import ModifierHelpers from "../helpers/modifiers.js";
import ActorHelpers from "../helpers/actor-helpers.js";
import ItemHelpers from "../helpers/item-helpers.js";
import EmbeddedItemHelpers from "../helpers/embeddeditem-helpers.js";

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
    return mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "actor"],
      template: "systems/starwarsffg/templates/actors/ffg-character-sheet.html",
      width: 710,
      height: 650,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics" }],
      scrollY: [".tableWithHeader", ".tab", ".skillsGrid", ".skillsTablesGrid"],
    });
  }

  /** @override */
  get template() {
    const path = "systems/starwarsffg/templates/actors";
    return `${path}/ffg-${this.actor.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const data = super.getData();
    data.classType = this.constructor.name;

    // Compatibility for Foundry 0.8.x with backwards compatibility (hopefully) for 0.7.x
    const actorData = this.actor.data.toObject(false);
    data.actor = actorData;
    data.data = actorData.data;
    data.rollData = this.actor.getRollData.bind(this.actor);

    data.token = this.token?.data;
    data.items = this.actor.items.map((item) => item.data);

    if (options?.action === "update" && this.object.compendium) {
      data.item = mergeObject(data.actor, options.data);
    }

    data.dtypes = ["String", "Number", "Boolean"];
    for (let attr of Object.values(data.data.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }
    data.FFG = CONFIG.FFG;

    let autoSoakCalculation = true;

    if (typeof this.actor.data?.flags?.config?.enableAutoSoakCalculation === "undefined") {
      autoSoakCalculation = game.settings.get("starwarsffg", "enableSoakCalc");
    } else {
      autoSoakCalculation = this.actor.data?.flags?.starwarsffg?.config?.enableAutoSoakCalculation;
    }

    data.settings = {
      enableSoakCalculation: autoSoakCalculation,
      enableCriticalInjuries: this.actor.data?.flags?.starwarsffg?.config?.enableCriticalInjuries,
    };

    // Establish sheet width and height using either saved persistent values or default values defined in swffg-config.js
    this.position.width = this.sheetWidth || CONFIG.FFG.sheets.defaultWidth[this.actor.data.type];
    this.position.height = this.sheetHeight || CONFIG.FFG.sheets.defaultHeight[this.actor.data.type];

    switch (this.actor.data.type) {
      case "character":
        if (data.limited) {
          this.position.height = 165;
        }
        // we need to update all specialization talents with the latest talent information
        if (!this.actor.data.flags.starwarsffg?.loaded) {
          this._updateSpecialization(data);
        }

        if (data.data.stats.credits.value > 999) {
          data.data.stats.credits.value = data.data.stats.credits.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
        break;
      default:
    }

    if (this.actor.data.type !== "vehicle") {
      // Filter out skills that are not custom (manually added) or part of the current system skill list
      Object.keys(data.data.skills)
      .filter(s => !data.data.skills[s].custom && !CONFIG.FFG.skills[s])
      .forEach(s => delete data.data.skills[s]);

      data.data.skilllist = this._createSkillColumns(data);
    }

    if (this.actor.data?.flags?.config?.enableObligation === false && this.actor.data?.flags?.config?.enableDuty === false && this.actor.data?.flags?.config?.enableMorality === false && this.actor.data?.flags?.config?.enableConflict === false) {
      data.hideObligationDutyMoralityConflictTab = true;
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
    new TabsV2(tabs, {
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
          if (actor.type === "character") {
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
        if (item.type === "criticaldamage" && actor.data.type !== "vehicle") {
          ui.notifications.warn("Critical Damage can only be added to 'vehicle' actor types.");
          return false;
        }
        if (item.type === "criticalinjury" && actor.data.type !== "character") {
          ui.notifications.warn("Critical Injuries can only be added to 'character' actor types.");
          return false;
        }

        // Prevent adding of character data type items to vehicles
        if (["career", "forcepower", "talent", "signatureability", "specialization", "species"].includes(item.type.toString()) && actor.type === "vehicle") {
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

    new ContextMenu(html, ".skillsGrid .skill", [
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
    ]);

    new ContextMenu(html, "div.skillsHeader", [
      {
        name: game.i18n.localize("SWFFG.SkillAddContextItem"),
        icon: '<i class="fas fa-plus-circle"></i>',
        callback: (li) => {
          this._onCreateSkill(li);
        },
      },
    ]);

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
        const forcedice = this.actor.data.data.stats.forcePool.max - this.actor.data.data.stats.forcePool.value;
        if (forcedice > 0) {
          let sheet = this.getData();
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

    if (this.actor.data.type === "character") {
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
        default: game.settings.get("starwarsffg", "medItemName"),
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
      this.sheetoptions.register("talentSorting", {
        name: game.i18n.localize("SWFFG.EnableSortTalentsByActivation"),
        hint: game.i18n.localize("SWFFG.EnableSortTalentsByActivationHint"),
        type: "Array",
        default: 0,
        options: [game.i18n.localize("SWFFG.UseGlobalSetting"), game.i18n.localize("SWFFG.OptionValueYes"), game.i18n.localize("SWFFG.OptionValueNo")],
      });
    }

    if (this.actor.data.type === "minion") {
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

    if (this.actor.data.type === "vehicle") {
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
      let prevUses = (this.object.data?.data?.stats?.medical?.uses === undefined) ? 0 : this.object.data.data.stats.medical.uses;
      let updateData = {};
      let newUses = 0;
      if (item[0].className === "fas fa-plus-circle medical") {
        newUses = prevUses + 1;
        newUses = (newUses > 5) ? 5 : newUses;
      } else {
        newUses = prevUses - 1;
        newUses = (newUses < 0) ? 0 : newUses;
      }

      setProperty(updateData, `data.stats.medical.uses`, newUses);
      this.object.update(updateData);

    });

    html.find(".resetMedical").click(async (ev) => {
      let updateData = {};
      setProperty(updateData, `data.stats.medical.uses`, 0);
      this.object.update(updateData);
    });

    // Toggle item equipped
    html.find(".items .item a.toggle-equipped").click((ev) => {
      const li = $(ev.currentTarget);
      const item = this.actor.items.get(li.data("itemId"));
      if (item) {
        item.update({ ["data.equippable.equipped"]: !item.data.data.equippable.equipped });
      }
    });

    // Toggle item details
    html.find(".items .item, .header-description-block .item, .injuries .item").click(async (ev) => {
      if (!$(ev.target).hasClass("fa-trash") && !$(ev.target).hasClass("fas") && !$(ev.target).hasClass("rollable")) {
        const li = $(ev.currentTarget);
        let itemId = li.data("itemId");
        let item = this.actor.items.get(itemId);

        if (!item) {
          item = game.items.get(itemId);
        }
        if (!item) {
          item = await ImportHelpers.findCompendiumEntityById("Item", itemId);
        }
        if (item?.sheet) {
          if (item?.type == "species" || item?.type == "career" || item?.type == "specialization") item.sheet.render(true);
          else this._itemDisplayDetails(item, ev);
        }

        html.find("li.item-pill").on("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const li = event.currentTarget;

          let itemId = li.dataset.itemId;
          let modifierType = li.dataset.modifierType;
          let modifierId = li.dataset.modifierId;

          await EmbeddedItemHelpers.displayOwnedItemItemModifiersAsJournal(itemId, modifierType, modifierId, this.actor.id, this.actor.compendium);
        });
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
          if (item?.type == "forcepower") {
            this._forcePowerDisplayDetails(desc, ev);
          }
        }
      }
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

    html.find(".item-info").click((ev) => {
      ev.stopPropagation();
      const li = $(ev.currentTarget).parents(".item");
      const itemId = li.data("itemId");

      const item = this.actor.data.data.talentList.find((talent) => {
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
          classes: ["dialog", "starwarsffg"],
          template: "systems/starwarsffg/templates/actors/dialogs/ffg-talent-selector.html",
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
      item.update({ ["data.quantity.value"]: item.data.data.quantity.value + 1 });
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
      let count = item.data.data.quantity.value - 1 > 0 ? item.data.data.quantity.value - 1 : 0;
      item.update({ ["data.quantity.value"]: count });
    });

    // Roll Skill
    html
      .find(".roll-button")
      .children()
      .on("click", async (event) => {
        let upgradeType = null;
        if (event.ctrlKey && !event.shiftKey) {
          upgradeType = "ability";
        } else if (!event.ctrlKey && event.shiftKey) {
          upgradeType = "difficulty";
        }
        await DiceHelpers.rollSkill(this, event, upgradeType);
      });

    // Roll from [ROLL][/ROLL] tag.
    html.find(".rollSkillDirect").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      let data = event.currentTarget.dataset;
      if (data) {
        let sheet = this.getData();
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
      this.object.update({ "data.obligationlist": { ["-=" + id]: null } });
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
      this.object.update({ "data.dutylist": { ["-=" + id]: null } });
    });
  }

  /**
   * Display details of an item.
   * @private
   */
  _itemDisplayDetails(item, event) {
    event.preventDefault();
    let li = $(event.currentTarget),
      itemDetails = item.getItemDetails();

    // Toggle summary
    if (li.hasClass("expanded")) {
      let details = li.children(".item-details");
      details.slideUp(200, () => details.remove());
    } else {
      let div = $(`<div class="item-details">${PopoutEditor.renderDiceImages(itemDetails.description, this.actor.data)}</div>`);
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
            let sheet = this.getData();
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
  _forcePowerDisplayDetails(desc, event) {
    event.preventDefault();
    let li = $(event.currentTarget);

    // Toggle summary
    if (li.hasClass("expanded")) {
      let details = li.children(".item-details");
      details.slideUp(200, () => details.remove());
    } else {
      let div = $(`<div class="item-details">${PopoutEditor.renderDiceImages(desc, this.actor.data)}</div>`);
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
    }

    const itemDetails = item?.getItemDetails();
    const template = "systems/starwarsffg/templates/chat/item-card.html";
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
    const template = "systems/starwarsffg/templates/chat/force-power-card.html";
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
              setProperty(updateData, `data.skills.${ability}.characteristic`, newCharacteristic);

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
        classes: ["dialog", "starwarsffg"],
        template: "systems/starwarsffg/templates/actors/dialogs/ffg-skill-characteristic-selector.html",
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
                max: 6,
                rank: 0,
                type: group,
                custom: true,
                nontheme: true,
              };

              if (name.trim().length > 0) {
                CONFIG.logger.debug(`Creating new skill ${name} (${characteristic})`);
                let updateData = {};
                setProperty(updateData, `data.skills.${name}`, newSkill);

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
        classes: ["dialog", "starwarsffg"],
        template: "systems/starwarsffg/templates/actors/dialogs/ffg-skill-new.html",
      }
    ).render(true);
  }

  /**
   * Remove skill from skill list
   * @param  {object} a - Event object
   */
  _onRemoveSkill(a) {
    const ability = $(a).data("ability");
    this.object.update({ "data.skills": { ["-=" + ability]: null } });
  }

  /**
   * Set skill as a skill available in the initiative dialog
   * @param  {object} a - Event object
   */
  _onInitiativeSkill(a) {
    const skill = $(a).data("ability");
    let updateData = {};

    let useSkillForInitiative = false;
    if (!this.object.data.data.skills[skill]?.useForInitiative) {
      useSkillForInitiative = true;
    }

    setProperty(updateData, `data.skills.${skill}.useForInitiative`, useSkillForInitiative);
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
  _updateObject(event, formData) {
    const actorUpdate = ActorHelpers.updateActor.bind(this);
    // Save persistent sheet height and width for future use.
    this.sheetWidth = this.position.width;
    this.sheetHeight = this.position.height;

    actorUpdate(event, formData);
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
    if (["weapon", "armour", "gear"].includes(item.data.type)) {
      const dragData = {
        type: "Transfer",
        actorId: this.actor.id,
        data: item.data,
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
          this.actor.createEmbeddedDocuments("Item", [duplicate(data.data)]); // Create a new Item
          const actor = game.actors.get(data.actorId);
          await actor.items.get(data.data._id)?.delete(); // Delete originating item from other actor
        } catch (err) {
          CONFIG.logger.error(`Error transfering item between actors.`, err);
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
    if (this.actor.data.flags.starwarsffg === undefined) {
        this.actor.data.flags.starwarsffg = {};
    }
    this.actor.data.flags.starwarsffg.loaded = true;

    const specializations = this.actor.data.items.filter((item) => {
      return item.type === "specialization";
    });

    specializations.forEach(async (spec) => {
      const specializationTalents = spec.data.talents;
      for (let talent in specializationTalents) {
        let gameItem;
        if (specializationTalents[talent].pack && specializationTalents[talent].pack.length > 0) {
          const pack = await game.packs.get(specializationTalents[talent]?.pack);
          if (pack) {
            await pack.getIndex();
            let entry = await pack.index.find((e) => e.id === specializationTalents[talent].itemId);
            if (!entry) {
              entry = await pack.index.find((e) => e.name === specializationTalents[talent].name);
            }
            gameItem = await pack.getDocument(entry.id);
          }
        } else {
          gameItem = await game.items.get(specializationTalents[talent].itemId);
        }

        if (gameItem) {
          this._updateSpecializationTalentReference(specializationTalents[talent], gameItem.data);
        }
      }

      const globalTalentList = [];
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

      data.actor.data.talentList = mergeObject(data.actor.data.talentList, globalTalentList);
    });
  }

  /**
   * Update a specialization talent based on talent reference
   * @param  {Object} specializationTalentItem
   * @param  {Object} talentItem
   */
  _updateSpecializationTalentReference(specializationTalentItem, talentItem) {
    CONFIG.logger.debug(`Starwars FFG - Updating Specializations Talent`);
    specializationTalentItem.name = talentItem.name;
    specializationTalentItem.description = talentItem.data.description;
    specializationTalentItem.activation = talentItem.data.activation.value;
    specializationTalentItem.activationLabel = talentItem.data.activation.label;
    specializationTalentItem.isRanked = talentItem.data.ranks.ranked;
    specializationTalentItem.isForceTalent = talentItem.data.isForceTalent;
    specializationTalentItem.isConflictTalent = talentItem.data.isConflictTalent;
    specializationTalentItem.attributes = talentItem.data.attributes;
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
      if (game.settings.get("starwarsffg", "skillSorting")) {
        sortFunction = (a, b) => {
          if (data.data.skills[a].label > data.data.skills[b].label) return 1;
          if (data.data.skills[a].label < data.data.skills[b].label) return -1;
          return 0;
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
}
