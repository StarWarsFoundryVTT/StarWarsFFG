/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
import DiceHelpers from "../helpers/dice-helpers.js";

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

    switch (this.actor.data.type) {
      case "character":
        this.position.width = 595;
        this.position.height = 783;
        if(data.limited) {
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

    // Update Inventory Item - By clicking entire line
    html.find("table.items .item, .header-description-block .item").click((ev) => {
      if (!$(ev.target).hasClass("fa-trash") && !$(ev.target).hasClass("fa-times")) {
        const li = $(ev.currentTarget);
        const item = this.actor.getOwnedItem(li.data("itemId"));
        if (item?.sheet) {
          item.sheet.render(true);
        }
      }
    });
    // Update Talent - By clicking entire line
    html.find(".talents .item").click((ev) => {
      if (!$(ev.target).hasClass("fa-trash")) {
        const li = $(ev.currentTarget);
        const row = $(li).parents("tr")[0];

        let itemId = li.data("itemId");

        let item;
        if (!$(li).closest("tr").hasClass("specialization-talent-item")) {
          item = this.actor.getOwnedItem(itemId);
        } else {
          item = game.items.get(itemId);
        }
        if (item?.sheet) {
          item.sheet.render(true);
        }
      }
    });

    // Delete Inventory Item
    html.find(".item-delete").click((ev) => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Setup dice pool image and hide filtered skills
    html.find(".skill").each((_, elem) => {
      this._addSkillDicePool(elem);
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

    // Add or Remove Attribute
    html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));

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

    $("div.skill-characteristic").on("click", (event) => {
      const a = event.currentTarget;
      const characteristic = a.dataset.characteristic;
      const ability = $(a).parents("tr[data-ability]")[0].dataset.ability;
      new Dialog(
        {
          title: `${game.i18n.localize("SWFFG.SkillCharacteristicDialogTitle")} ${ability}`,
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

                console.debug(`Starwars FFG - Updating ${ability} Characteristic from ${characteristic} to ${newCharacteristic}`);

                this.object.update({ [`data.skills.${ability}.characteristic`]: newCharacteristic });
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
    });
  }

  /* -------------------------------------------- */

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    // Add new attribute
    if (action === "create") {
      const nk = Object.keys(attrs).length + 1;
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}" style="display:none;"/><select class="attribute-modtype" name="data.attributes.attr${nk}.modtype"><option value="Characteristic">Characteristic</option></select><input class="attribute-value" type="text" name="data.attributes.attr${nk}.value" value="0" data-dtype="Number" placeholder="0"/>`;
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if (action === "delete") {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
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
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData)?.data?.attributes || {};
    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if (/[\s\.]/.test(k)) return ui.notifications.error("Attribute keys may not contain spaces or periods");
      delete v["key"];
      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    if (this.object.data?.data?.attributes) {
      for (let k of Object.keys(this.object.data.data.attributes)) {
        if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
      }
    }

    // Re-combine formData
    formData = Object.entries(formData)
      .filter((e) => !e[0].startsWith("data.attributes"))
      .reduce(
        (obj, e) => {
          obj[e[0]] = e[1];
          return obj;
        },
        { _id: this.object._id, "data.attributes": attributes }
      );

    // Update the Actor
    this.actor.data.flags.loaded = false;
    return this.object.update(formData);
  }
  
  _addSkillDicePool(elem) {
    const data = this.getData();
    const skillName = elem.dataset["ability"];
    const skill = data.data.skills[skillName];
    const characteristic = data.data.characteristics[skill.characteristic];

    const dicePool = new DicePoolFFG({
      ability: Math.max(characteristic.value, skill.rank),
    });
    dicePool.upgrade(Math.min(characteristic.value, skill.rank));

    const rollButton = elem.querySelector(".roll-button");
    dicePool.renderPreview(rollButton);
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
          console.log(`${err.message}`);
        }
      }
    }
  }


  async _updateSpecialization(data) {
    console.debug(`Starwars FFG - Running Actor initial load`);
          this.actor.data.flags.loaded = true;

          const specializations = this.actor.data.items.filter((item) => {
            return item.type === "specialization";
          });

          specializations.forEach(async (spec) => {
            const specializationTalents = spec.data.talents;
            for (let talent in specializationTalents) {
              let gameItem;
              if(specializationTalents[talent].pack && specializationTalents[talent].pack && specializationTalents[talent].pack.length > 0) {
                const pack = await game.packs.get(specializationTalents[talent].pack);
                await pack.getIndex();
                const entry = await pack.index.find(e => e.id === specializationTalents[talent].itemId);
                gameItem = await pack.getEntity(entry.id)
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
    console.debug(`Starwars FFG - Updating Specializations Talent`);
    specializationTalentItem.name = talentItem.name;
    specializationTalentItem.description = talentItem.data.description;
    specializationTalentItem.activation = talentItem.data.activation.value;
    specializationTalentItem.activationLabel = talentItem.data.activation.label;
    specializationTalentItem.isRanked = talentItem.data.ranks.ranked;
    specializationTalentItem.isForceTalent = talentItem.data.isForceTalent;
  }
}
