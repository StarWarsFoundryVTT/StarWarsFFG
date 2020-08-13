import PopoutEditor from "../popout-editor.js";
import Helpers from "../helpers/common.js";
import ModifierHelpers from "../helpers/modifiers.js";
import ItemHelpers from "../helpers/item-helpers.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class ItemSheetFFG extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item"],
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      scrollY: [".sheet-body", ".tab"],
    });
  }

  /** @override */
  get template() {
    const path = "systems/starwarsffg/templates/items";
    return `${path}/ffg-${this.item.data.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const data = super.getData();

    CONFIG.logger.debug(`Getting Item Data`);

    data.dtypes = ["String", "Number", "Boolean"];
    if (data?.data?.attributes) {
      for (let attr of Object.values(data.data.attributes)) {
        attr.isCheckbox = attr.dtype === "Boolean";
      }
    }

    switch (this.object.data.type) {
      case "weapon":
      case "shipweapon":
        this.position.width = 450;
        break;
      case "armour":
      case "gear":
      case "shipattachment":
        this.position.width = 385;
        break;
      case "talent":
        this.position.width = 405;
        break;
      case "criticalinjury":
      case "criticaldamage":
        this.position.width = 320;
        break;
      case "forcepower":
        this.position.width = 715;
        data.data.isReadOnly = false;
        if (!this.options.editable) {
          data.data.isEditing = false;
          data.data.isReadOnly = true;
        }
        break;
      case "specialization":
        this.position.width = 715;
        data.data.isReadOnly = false;
        if (!this.options.editable) {
          data.data.isEditing = false;
          data.data.isReadOnly = true;
        }

        if (!this.item.data.flags.loaded) {
          CONFIG.logger.debug(`Running Item initial load`);
          this.item.data.flags.loaded = true;

          const specializationTalents = data.data.talents;

          for (let talent in specializationTalents) {
            let gameItem;
            if (specializationTalents[talent].pack && specializationTalents[talent].pack.length > 0) {
              const pack = game.packs.get(specializationTalents[talent].pack);
              await pack.getIndex();
              const entry = await pack.index.find((e) => e._id === specializationTalents[talent].itemId);

              if (entry) {
                gameItem = await pack.getEntity(entry._id);
              }
            } else {
              gameItem = game.items.get(specializationTalents[talent].itemId);
            }

            if (gameItem) {
              this._updateSpecializationTalentReference(specializationTalents[talent], gameItem.data);
            }
          }
        }
        break;
      case "species":
        this.position.width = 550;

        const attributesForCharacteristics = Object.keys(data.data.attributes).filter((key) => {
          return Object.keys(CONFIG.FFG.characteristics).includes(key);
        });

        const speciesCharacteristics = attributesForCharacteristics.map((key) => Object.assign(data.data.attributes[key], { key }));
        data.characteristics = Object.keys(CONFIG.FFG.characteristics).map((key) => {
          let attr = speciesCharacteristics.find((item) => item.mod === key);

          if (!attr) {
            data.data.attributes[`${key}`] = {
              modtype: "Characteristic",
              mod: key,
              value: 0,
              exclude: true,
            };
            attr = {
              key: `${key}`,
              value: 0,
            };
          } else {
            data.data.attributes[`${key}`].exclude = true;
          }

          return {
            id: attr.key,
            key,
            value: attr?.value ? parseInt(attr.value, 10) : 0,
            modtype: "Characteristic",
            mod: key,
            label: game.i18n.localize(CONFIG.FFG.characteristics[key].label),
          };
        });

        if (!data.data.attributes?.Wounds) {
          data.data.attributes.Wounds = {
            modtype: "Stat",
            mod: "Wounds",
            value: 0,
            exclude: true,
          };
        } else {
          data.data.attributes.Wounds.exclude = true;
        }
        if (!data.data.attributes?.Strain) {
          data.data.attributes.Strain = {
            modtype: "Stat",
            mod: "Strain",
            value: 0,
            exclude: true,
          };
        } else {
          data.data.attributes.Strain.exclude = true;
        }

        break;
      default:
    }

    data.FFG = CONFIG.FFG;

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

    html.find(".specialization-talent .talent-body").on("click", async (event) => {
      const li = event.currentTarget;
      const parent = $(li).parents(".specialization-talent")[0];
      const itemId = parent.dataset.itemid;

      const item = await Helpers.getSpecializationTalent(itemId);
      item.sheet.render(true);
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    html.find(".attributes").on("click", ".attribute-control", ModifierHelpers.onClickAttributeControl.bind(this));

    if (this.object.data.type === "criticalinjury" || this.object.data.type === "criticaldamage") {
      const formatDropdown = (item) => {
        if (!item.id) {
          return item.text;
        }

        const imgUrl = "/systems/starwarsffg/images/dice/starwars/purple.png";

        let images = [];
        for (let i = 0; i < item.id; i += 1) {
          images.push(`<img class="severity-img" src="${imgUrl}" />`);
        }
        let selections = `<span>${item.text}${images.join("")}</span>`;
        return $(selections);
      };

      const id = `#${this.object.data.type}-${this.object.id}`;

      $(id).select2({
        dropdownParent: $(".severity-block"),
        dropdownAutoWidth: true,
        selectionCssClass: "severity-select",
        width: "resolve",
        minimumResultsForSearch: Infinity,
        templateSelection: formatDropdown,
        templateResult: formatDropdown,
      });
    }

    if (["forcepower", "specialization"].includes(this.object.data.type)) {
      html.find(".talent-action").on("click", this._onClickTalentControl.bind(this));
      html.find(".talent-actions .fa-cog").on("click", ModifierHelpers.popoutModiferWindow.bind(this));
      html.find(".talent-modifiers .fa-cog").on("click", ModifierHelpers.popoutModiferWindowUpgrade.bind(this));
    }

    if (this.object.data.type === "specialization") {
      const dragDrop = new DragDrop({
        dragSelector: ".item",
        dropSelector: ".specialization-talent",
        permissions: { dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this) },
        callbacks: { drop: this._onDropTalentToSpecialization.bind(this) },
      });

      dragDrop.bind($(`form.editable.item-sheet-${this.object.data.type}`)[0]);
    }

    // hidden here instead of css to prevent non-editable display of edit button
    html.find(".popout-editor").on("mouseover", (event) => {
      $(event.currentTarget).find(".popout-editor-button").show();
    });
    html.find(".popout-editor").on("mouseout", (event) => {
      $(event.currentTarget).find(".popout-editor-button").hide();
    });
    html.find(".popout-editor .popout-editor-button").on("click", this._onPopoutEditor.bind(this));
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    const itemUpdate = ItemHelpers.itemUpdate.bind(this);
    itemUpdate(event, formData);
  }

  async _onClickTalentControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const key = a.dataset.key;

    let attrs = this.object.data.data.upgrades;
    let itemType = "upgrades";

    if ($(a).parents(".specialization-talent").length > 0) {
      attrs = this.object.data.data.talents;
      itemType = "talents";
    }

    const form = this.form;

    if (action === "edit") {
      const currentValue = $(`input[name='data.isEditing']`).val() == "true";
      $(`input[name='data.isEditing']`).val(!currentValue);

      $(".talent-grid").toggleClass("talent-disable-edit");
    }

    if (action === "combine") {
      const nextKey = `upgrade${parseInt(key.replace("upgrade", ""), 10) + 1}`;
      const nextNextKey = `upgrade${parseInt(key.replace("upgrade", ""), 10) + 2}`;
      const nextNextNextKey = `upgrade${parseInt(key.replace("upgrade", ""), 10) + 3}`;

      if (!attrs[key].size || attrs[key].size === "single") {
        if (attrs[nextKey].size === "double") {
          $(`input[name='data.upgrades.${key}.size']`).val("triple");
        } else if (attrs[nextKey].size === "triple") {
          $(`input[name='data.upgrades.${key}.size']`).val("full");
        } else {
          $(`input[name='data.upgrades.${key}.size']`).val("double");
        }

        $(`input[name='data.upgrades.${nextKey}.visible']`).val("false");
      } else if (attrs[key].size === "double") {
        if (attrs[nextNextKey].size === "double") {
          $(`input[name='data.upgrades.${key}.size']`).val("full");
        } else {
          $(`input[name='data.upgrades.${key}.size']`).val("triple");
        }
        $(`input[name='data.upgrades.${nextKey}.visible']`).val("false");
        $(`input[name='data.upgrades.${nextNextKey}.visible']`).val("false");
      } else {
        $(`input[name='data.upgrades.${key}.size']`).val("full");
        $(`input[name='data.upgrades.${nextKey}.visible']`).val("false");
        $(`input[name='data.upgrades.${nextNextKey}.visible']`).val("false");
        $(`input[name='data.upgrades.${nextNextNextKey}.visible']`).val("false");
      }
      await this._onSubmit(event);
    }

    if (action === "split") {
      const nextKey = `upgrade${parseInt(key.replace("upgrade", ""), 10) + 1}`;
      const nextNextKey = `upgrade${parseInt(key.replace("upgrade", ""), 10) + 2}`;
      const nextNextNextKey = `upgrade${parseInt(key.replace("upgrade", ""), 10) + 3}`;

      if (attrs[key].size === "double") {
        $(`input[name='data.upgrades.${key}.size']`).val("single");
        $(`input[name='data.upgrades.${nextKey}.visible']`).val(true);
        $(`input[name='data.upgrades.${nextKey}.size']`).val("single");
      } else if (attrs[key].size === "triple") {
        $(`input[name='data.upgrades.${key}.size']`).val("double");
        $(`input[name='data.upgrades.${nextNextKey}.visible']`).val(true);
        $(`input[name='data.upgrades.${nextNextKey}.size']`).val("single");
      } else {
        $(`input[name='data.upgrades.${key}.size']`).val("double");
        $(`input[name='data.upgrades.${nextNextKey}.visible']`).val(true);
        $(`input[name='data.upgrades.${nextNextKey}.size']`).val("double");
      }
      await this._onSubmit(event);
    }

    if (action === "link-top") {
      if ($(".talent-disable-edit").length === 0) {
        const linkid = a.dataset.linknumber;

        const currentValue = $(`input[name='data.${itemType}.${key}.links-top-${linkid}']`).val() == "true";
        $(`input[name='data.${itemType}.${key}.links-top-${linkid}']`).val(!currentValue);

        await this._onSubmit(event);
      }
    }

    if (action === "link-right") {
      if ($(".talent-disable-edit").length === 0) {
        const linkid = a.dataset.linknumber;
        const currentValue = $(`input[name='data.${itemType}.${key}.links-right']`).val() == "true";
        $(`input[name='data.${itemType}.${key}.links-right']`).val(!currentValue);

        await this._onSubmit(event);
      }
    }
  }

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

  _canDragStart(selector) {
    return this.options.editable && this.object.owner;
  }

  _canDragDrop(selector) {
    return true;
  }

  importItemFromCollection(collection, entryId) {
    const pack = game.packs.get(collection);
    if (pack.metadata.entity !== "Item") return;
    return pack.getEntity(entryId).then((ent) => {
      CONFIG.logger.debug(`Importing Item ${ent.name} from ${collection}`);
      return ent;
    });
  }

  async _onDropTalentToSpecialization(event) {
    let data;
    const specialization = this.object;
    const li = event.currentTarget;
    const talentId = $(li).attr("id");

    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }

    // Case 1 - Import from a Compendium pack
    let itemObject;
    if (data.pack) {
      itemObject = await this.importItemFromCollection(data.pack, data.id);
    }

    // Case 2 - Import from World entity
    else {
      itemObject = await game.items.get(data.id);
      if (!itemObject) return;
    }

    if (itemObject.data.type === "talent") {
      // we need to remove if this is the last instance of the talent in the specialization
      const previousItemId = $(li).find(`input[name='data.talents.${talentId}.itemId']`).val();
      const isPreviousItemFromPack = $(li).find(`input[name='data.talents.${talentId}.pack']`).val() === "" ? false : true;
      if (!isPreviousItemFromPack) {
        CONFIG.logger.debug("Non-compendium pack talent update");

        const talentList = [];
        for (let talent in specialization.data.data.talents) {
          if (talent.itemId === itemObject.id) {
            talentList.push(talent);
          }
        }

        // check if this is the last talent of the specializtion
        if (talentList.length === 1) {
          let tree = itemObject.data.data.trees;

          const index = tree.findIndex((tal) => {
            return tal === specialization.id;
          });

          // remove the specialization reference from the talent
          tree.splice(index, 1);

          let formData;
          setProperty(formData, `data.trees`, tree);
          itemObject.update(formData);

          //itemObject.update({ [`data.trees`]: tree });
        }
      }

      $(li).find(`input[name='data.talents.${talentId}.name']`).val(itemObject.data.name);
      $(li).find(`input[name='data.talents.${talentId}.description']`).val(itemObject.data.data.description);
      $(li).find(`input[name='data.talents.${talentId}.activation']`).val(itemObject.data.data.activation.value);
      $(li).find(`input[name='data.talents.${talentId}.activationLabel']`).val(itemObject.data.data.activation.label);
      $(li).find(`input[name='data.talents.${talentId}.isRanked']`).val(itemObject.data.data.ranks.ranked);
      $(li).find(`input[name='data.talents.${talentId}.isForceTalent']`).val(itemObject.data.data.isForceTalent);
      $(li).find(`input[name='data.talents.${talentId}.itemId']`).val(data.id);
      $(li).find(`input[name='data.talents.${talentId}.pack']`).val(data.pack);

      // check to see if the talent already has a reference to the specialization
      if (!itemObject.data.data.trees.includes(specialization.id)) {
        // the talent doesn't already have the reference, add it
        let tree = itemObject.data.data.trees;
        tree.push(specialization.id);

        if (!data.pack) {
          let formData;
          setProperty(formData, `data.trees`, tree);
          itemObject.update(formData);
          //itemObject.update({ [`data.trees`]: tree });
        }
      }

      await this._onSubmit(event);
    }
  }

  _updateSpecializationTalentReference(specializationTalentItem, talentItem) {
    CONFIG.logger.debug(`Updating Specializations Talent during sheet render`);
    specializationTalentItem.name = talentItem.name;
    specializationTalentItem.description = talentItem.data.description;
    specializationTalentItem.activation = talentItem.data.activation.value;
    specializationTalentItem.activationLabel = talentItem.data.activation.label;
    specializationTalentItem.isRanked = talentItem.data.ranks.ranked;
    specializationTalentItem.isForceTalent = talentItem.data.isForceTalent;
    specializationTalentItem.attributes = talentItem.data.attributes;
  }
}
