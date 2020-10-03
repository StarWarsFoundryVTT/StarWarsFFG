/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
import Helpers from "../helpers/common.js";
import DiceHelpers from "../helpers/dice-helpers.js";
import ActorOptions from "./actor-ffg-options.js";
import ImportHelpers from "../importer/import-helpers.js";
import ModifierHelpers from "../helpers/modifiers.js";
import ActorHelpers from "../helpers/actor-helpers.js";

export class AdversarySheetFFG extends ActorSheet {
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
      classes: ["starwarsffg", "sheet", "actor", "adversary"],
      template: "systems/starwarsffg/templates/actors/ffg-adversary-sheet.html",
      width: 710,
      height: 650,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics" }],
      scrollY: [".tableWithHeader", ".tab"],
    });
  }

  // /** @override */
  // get template() {
  //   const path = "systems/starwarsffg/templates/actors";
  //   return `${path}/ffg-${this.actor.data.type}-sheet.html`;
  // }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];
    for (let attr of Object.values(data.data.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }
    data.FFG = CONFIG.FFG;
    data.settings = {
      enableSoakCalculation: this.actor.data.flags.enableAutoSoakCalculation || game.settings.get("starwarsffg", "enableSoakCalc"),
    };

    switch (this.actor.data.type) {
      case "character":
        this.position.width = 595;
        this.position.height = 783;
        if (data.limited) {
          this.position.height = 165;
        }

        // we need to update all specialization talents with the latest talent information
        if (!this.actor.data.flags.loaded) {
          this._updateSpecialization(data);
        }

        break;
      case "minion":
        this.position.width = 595;
        this.position.height = 644;
        break;
      case "vehicle":
        this.position.width = 595;
        this.position.height = 824;
      default:
    }
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // TODO: This is not needed in Foundry 0.6.0
    // Activate tabs
    let tabs = html.find(".tabs");
    let initial = this._sheetTab;
    new TabsV2(tabs, {
      initial: initial,
      callback: (clicked) => (this._sheetTab = clicked.data("tab")),
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    Hooks.on("preCreateOwnedItem", (actor, item, options, userid) => {
      if (item.type === "species" || item.type === "career") {
        if (actor.data.type === "character") {
          // we only allow one species and one career, find any other species and remove them.
          const itemToDelete = actor.items.filter((i) => i.type === item.type);
          itemToDelete.forEach((i) => {
            this.actor.deleteOwnedItem(i._id);
          });
        } else {
          return false;
        }
      }

      return true;
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

    if (this.actor.data.type === "character") {
      const options = new ActorOptions(this, html);
      options.register("enableAutoSoakCalculation", {
        name: game.i18n.localize("SWFFG.EnableSoakCalc"),
        hint: game.i18n.localize("SWFFG.EnableSoakCalcHint"),
        default: true,
      });
      options.register("enableForcePool", {
        name: game.i18n.localize("SWFFG.EnableForcePool"),
        hint: game.i18n.localize("SWFFG.EnableForcePoolHint"),
        default: true,
      });
    }

    // Toggle item equipped
    html.find(".items .item a.toggle-equipped").click((ev) => {
      const li = $(ev.currentTarget);
      const item = this.actor.getOwnedItem(li.data("itemId"));
      if (item) {
        item.update({ ["data.equippable.equipped"]: !item.data.data.equippable.equipped });
      }
    });

    // Toggle item details
    html.find(".items .item, .header-description-block .item, .injuries .item").click(async (ev) => {
      if (!$(ev.target).hasClass("fa-trash") && !$(ev.target).hasClass("fas") && !$(ev.target).hasClass("rollable")) {
        const li = $(ev.currentTarget);
        let itemId = li.data("itemId");
        let item = this.actor.getOwnedItem(itemId);

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
      }
    });

    // Delete Inventory Item
    html.find(".item-delete").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Edit Inventory Item
    html.find(".item-edit").click(async (ev) => {
      const li = $(ev.currentTarget).parents(".item");
      let itemId = li.data("itemId");
      let item = this.actor.getOwnedItem(itemId);
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
                  this.actor.deleteOwnedItem(id);
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

    // Setup dice pool image and hide filtered skills
    html.find(".skill").each((_, elem) => {
      DiceHelpers.addSkillDicePool(this, elem);
      const filters = this._filters.skills;
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

    dragDrop.bind($(`form.editable.${this.actor.data.type}`)[0]);

    $("input[type='text'][data-dtype='Number'][min][max]").on("change", (event) => {
      const a = event.currentTarget;
      const min = parseInt($(a).attr("min"), 10);
      const max = parseInt($(a).attr("max"), 10);
      const value = parseInt($(a).val(), 10) || min;

      if (value > max) {
        $(a).val(max);
      }
    });

    $("input[type='text'][data-dtype='Number'][pattern]").on("change", (event) => {
      const a = event.currentTarget;
      const value = $(a).val() || "2";
      const pattern = new RegExp($(a).attr("pattern"));

      if (!value.match(pattern)) {
        $(a).val("2");
      }
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
      let div = $(`<div class="item-details">${itemDetails.prettyDesc}</div>`);
      let props = $(`<div class="item-properties"></div>`);
      itemDetails.properties.forEach((p) => props.append(`<span class="tag">${p}</span>`));
      div.append(props);
      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
  }

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

  _onRemoveSkill(a) {
    const ability = $(a).data("ability");
    this.object.update({ "data.skills": { ["-=" + ability]: null } });
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
    actorUpdate(event, formData);
  }

  /**
   * Drag Event function for transferring items between owned actors
   * @param  {Object} event
   */
  _onTransferItemDragStart(event) {
    const li = event.currentTarget;

    $(event.currentTarget).attr("data-item-actorid", this.actor.id);

    const item = this.actor.getOwnedItem(li.dataset.itemId);

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
    return this.options.editable && this.actor.owner;
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
      let sameActor = data.actorId === this.actor._id;
      if (!sameActor) {
        try {
          this.actor.createEmbeddedEntity("OwnedItem", duplicate(data.data)); // Create a new Item
          const actor = game.actors.get(data.actorId);
          await actor.deleteOwnedItem(data.data._id); // Delete originating item from other actor
        } catch (err) {
          CONFIG.logger.error(`Error transfering item between actors.`, err);
        }
      }
    }
  }

  async _updateSpecialization(data) {
    CONFIG.logger.debug(`Running Actor initial load`);
    this.actor.data.flags.loaded = true;

    const specializations = this.actor.data.items.filter((item) => {
      return item.type === "specialization";
    });

    specializations.forEach(async (spec) => {
      const specializationTalents = spec.data.talents;
      for (let talent in specializationTalents) {
        let gameItem;
        if (specializationTalents[talent].pack && specializationTalents[talent].pack.length > 0) {
          const pack = await game.packs.get(specializationTalents[talent].pack);
          await pack.getIndex();
          const entry = await pack.index.find((e) => e._id === specializationTalents[talent].itemId);
          gameItem = await pack.getEntity(entry._id);
        } else {
          gameItem = game.items.get(specializationTalents[talent].itemId);
        }

        if (gameItem) {
          this._updateSpecializationTalentReference(specializationTalents[talent], gameItem.data);
        }
      }

      const globalTalentList = [];
      if (spec?.talentList && spec.talentList.length > 0) {
        spec.talentList.forEach((talent) => {
          const item = talent;
          item.firstSpecialization = spec._id;

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

      data.actor.data.talentList = globalTalentList;
    });
  }

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
}
