import PopoutEditor from "../popout-editor.js";
import Helpers from "../helpers/common.js";
import ModifierHelpers from "../helpers/modifiers.js";
import ItemHelpers from "../helpers/item-helpers.js";
import ImportHelpers from "../importer/import-helpers.js";
import DiceHelpers from "../helpers/dice-helpers.js";
import item from "../helpers/embeddeditem-helpers.js";
import EmbeddedItemHelpers from "../helpers/embeddeditem-helpers.js";
import FFGActiveEffectConfig from "./item-active-effect-config.js";
import {modActiveEffects, activeEffectMap} from "../config/ffg-activeEffects.js";
import {ItemFFG} from "./item-ffg.js";
import {UpdateEmbeddedAttachment, UpdateEmbeddedTalent} from "./item-editor.js";

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
    return `${path}/ffg-${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options) {
    let data = super.getData(options);

    data.data = data.item.system;

    if (options?.action === "update" && this.object.compendium) {
      data.item = mergeObject(data.item, options.data);
    } else if (options?.action === "ffgUpdate") {
      if (options?.data?.data) {
        data.item = mergeObject(data.item, options.data);
      } else {
        data.item.data = mergeObject(data.item.data, options.data);
      }
    }

    data.classType = this.constructor.name;
    CONFIG.logger.debug(`Getting Item Data ${this.object.name}`);

    data.dtypes = ["String", "Number", "Boolean"];
    if (data?.data?.attributes) {
      for (let attr of Object.values(data.data.attributes)) {
        if (attr?.dtype) {
          attr.isCheckbox = attr.dtype === "Boolean";
        }
      }
    }

    data.isTemp = false;
    if (this.object.flags?.starwarsffg?.ffgIsOwned || this.object.flags?.starwarsffg?.ffgIsTemp) {
      data.isTemp = true;
    }

    switch (this.object.type) {
      case "weapon":
      case "shipweapon":
        this.position.width = 550;
        this.position.height = 750;
        break;
      case "itemattachment":
        this.position.width = 500;
        this.position.height = 450;
        break;
      case "itemmodifier":
        this.position.width = 450;
        this.position.height = 350;
        break;
      case "armour":
      case "ability":
      case "gear":
      case "shipattachment":
      case "homesteadupgrade":
        this.position.width = 385;
        this.position.height = 615;
        break;
      case "talent":
        this.position.width = 405;
        this.position.height = 535;
        break;
      case "criticalinjury":
      case "criticaldamage":
        this.position.width = 320;
        this.position.height = 500;
        break;
      case "forcepower":
        this.position.width = 720;
        this.position.height = 840;
        data.isReadOnly = false;
        if (!this.options.editable) {
          data.isEditing = false;
          data.isReadOnly = true;
        }
        break;
      case "specialization":
        this.position.width = 715;
        data.isReadOnly = false;
        if (!this.options.editable) {
          data.isEditing = false;
          data.isReadOnly = true;
        }

        if (!this.item.flags?.starwarsffg?.loaded) {
          CONFIG.logger.debug(`Running Item initial load`);
          if (!Object.keys(this.item.flags).includes('starwarsffg')) {
              // the object is not properly set up yet; bail to let it finish
              return;
          }
          this.item.flags.starwarsffg.loaded = true;

          const specializationTalents = data.data.talents;
          console.log("loading spec stuff")
          console.log(specializationTalents)
        }
        break;
      case "species":
        this.position.width = 550;
        this.position.height = 650;

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
      case "career":
        this.position.width = 500;
        this.position.height = 600;
        break;
      case "signatureability": {
        this.position.width = 720;
        this.position.height = 515;
        data.data.isReadOnly = false;
        if (!this.options.editable) {
          data.data.isEditing = false;
          data.data.isReadOnly = true;
        }
        break;
      }
      case "test_mod": {
        data.mod_activeEffects = modActiveEffects;
        data.effects = this.item.system.effects;
        break;
      }
      case "test_attachment": {
        data.mod_activeEffects = modActiveEffects;
        data.base_mods = this.item.system.base_mods;
        data.added_mods = this.item.system.added_mods;
        break;
      }
      case "test_species": {
        // boilerplate species
        this.position.width = 550;
        this.position.height = 650;

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
      }
      default:
    }

    data.FFG = CONFIG.FFG;
    //data.renderedDesc = PopoutEditor.renderDiceImages(data.description, this.actor ? this.actor : {});
    data.renderedDesc = 'placeholder temporary value TODO: remove'
    data.activeEffects = this.item.getEmbeddedCollection("ActiveEffect").contents
    data.effects = this.item.getEmbeddedCollection("ActiveEffect")
    // TODO: move this into a better block
    data.mod_activeEffects = modActiveEffects;

    return data;
  }

  _onEffectControl(event) {
    event.preventDefault();
    const owner = this.item;
    const a = event.currentTarget;
    const tr = a.closest("tr");
    const effect = tr.dataset.effectId ? owner.effects.get(tr.dataset.effectId) : null;
    switch (a.dataset.action) {
        case "create":
            return owner.createEmbeddedDocuments("ActiveEffect", [{
                label: "New Effect",
                icon: "icons/svg/aura.svg",
                origin: owner.uuid,
                disabled: true,
            }]);
        case "edit":
            return effect.sheet.render(true);
        case "delete":
            return effect.delete();
    }
  }

async _onModControl(event) {
    event.preventDefault();
    const owner = this.item;
    const owner_obj = game.items.get(owner.id);
    const a = event.currentTarget;
    const tr = a.closest("tr");
    const mod_id = a.dataset.id;

    switch (a.dataset.action) {
        case "create":
            return;
        case "edit":
            return mod.sheet.render(true);
        case "delete":
            // TODO: there should be a way to update without overriding
            const update_mods = owner_obj.system.base_mods.splice(mod_id, 1);
            return await owner_obj.update({'system': {'base_mods': update_mods}});
    }
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (this.isEditable) {
        html.find(".effect-control").click(this._onEffectControl.bind(this));
        html.find(".mod-control").click(this._onModControl.bind(this));
    }

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
      const parent_obj = $(parent);
      const talent_data = this.object.system.talents[parent_obj.attr('id')];
      console.log(li)
      console.log(parent)
      console.log(talent_data)
      console.log(parent.dataset.itemid)
      console.log(parent_obj.attr('id'))

      let update_form = new UpdateEmbeddedTalent(
        {
          parent: this.object,
          object: talent_data,
          config: CONFIG.FFG,
          id: parent_obj.attr('id'),
          skill_types: ["Force Boost"],
        },
        {
          width: "500",
          height: "auto",
          resizable: true,
          title: "Editing " + talent_data.name + " on " + this.object.name,
        }
      );
      await update_form.render(true);
    });

    if (this.object.type === "talent") {
      if (!Hooks?.events[`closeAssociatedTalent_${this.object._id}`]?.length && typeof this._submitting === "undefined") {
        Hooks.once(`closeAssociatedTalent_${this.object._id}`, (item) => {
          item.object.flags.clickfromparent = [];
          Hooks.off(`closeAssociatedTalent_${item.object._id}`);
        });
      }
    }

    // Everything below here is only needed if the sheet is editable
    if (this.object.flags.readonly) this.options.editable = false;
    if (!this.options.editable) return;

    // Add or Remove Attribute
    html.find(".attributes").on("click", ".attribute-control", ModifierHelpers.onClickAttributeControl.bind(this));

    if (["forcepower", "specialization", "signatureability"].includes(this.object.type)) {
      html.find(".talent-action").on("click", this._onClickTalentControl.bind(this));
      html.find(".talent-actions .fa-cog").on("click", ModifierHelpers.popoutModiferWindow.bind(this));
      html.find(".talent-modifiers .fa-cog").on("click", ModifierHelpers.popoutModiferWindowUpgrade.bind(this));
      html.find(".talent-name.talent-modifiers").on("click", ModifierHelpers.popoutModiferWindowSpecTalents.bind(this));
    }

    if (this.object.type === "specialization") {
      try {
        const dragDrop = new DragDrop({
          dragSelector: ".item",
          dropSelector: ".specialization-talent",
          permissions: { dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this) },
          callbacks: { drop: this._onDropTalentToSpecialization.bind(this) },
        });

        dragDrop.bind($(`form.editable.item-sheet-${this.object.type}`)[0]);
      } catch (err) {
        CONFIG.logger.debug(err);
      }
    }

    // hidden here instead of css to prevent non-editable display of edit button
    html.find(".popout-editor").on("mouseover", (event) => {
      $(event.currentTarget).find(".popout-editor-button").show();
    });
    html.find(".popout-editor").on("mouseout", (event) => {
      $(event.currentTarget).find(".popout-editor-button").hide();
    });
    html.find(".popout-editor .popout-editor-button").on("click", this._onPopoutEditor.bind(this));

    // Roll from [ROLL][/ROLL] tag.
    html.find(".rollSkillDirect").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      let data = event.currentTarget.dataset;
      if (data) {
        let sheet = this.actor.data;
        let skill = sheet.data.skills[data["skill"]];
        let characteristic = sheet.data.characteristics[skill.characteristic];
        let difficulty = data["difficulty"];
        await DiceHelpers.rollSkillDirect(skill, characteristic, difficulty, sheet);
      }
    });

    // TODO: should specialization be here?
    if (["weapon", "armour", "itemattachment", "shipweapon", "shipattachment"].includes(this.object.type)) {
      const itemToItemAssociation = new DragDrop({
        dragSelector: ".item",
        dropSelector: null,
        permissions: { dragstart: true, drop: true },
        callbacks: { drop: this._onDropItem.bind(this) },
      });
      itemToItemAssociation.bind(html[0]);

      //commented out the ability to add on-the-fly qualities/attachments
      //html.find(".resource.pills.itemmodifier .block-title, .resource.pills.itemattachment .block-title").append("<i class='far fa-plus-square add-new-item'></i>");

      // html.find(".resource.pills.itemmodifier").on("click", async (event) => {

      //   const tempItem = await EmbeddedItemHelpers.createNewEmbeddedItem("itemmodifier", {attributes: {}, description: "", rank: 1}, {ffgTempId: this.object.id, ffgParentApp: this.appId} );

      //   let data = {};
      //   this.object.data.data[tempItem.type].push(tempItem);
      //   setProperty(data, `data.${tempItem.type}`, this.object.data.data[tempItem.type]);
      //   await this.object.update(data);
      //   tempItem.data.flags.ffgTempItemIndex = this.object.data.data[tempItem.type].findIndex((i) => i._id === tempItem.data._id);
      //   tempItem.sheet.render(true);
      // });

      // html.find(".resource.pills.itemattachment").on("click", async (event) => {
      //   const tempItem = await EmbeddedItemHelpers.createNewEmbeddedItem("itemattachment", {attributes: {}, description: "", itemmodifier: []}, {ffgTempId: this.object.id, ffgUuid: this.item.uuid, ffgParentApp: this.appId,});

      //   let data = {};
      //   this.object.data.data[tempItem.type].push(tempItem);
      //   setProperty(data, `data.${tempItem.type}`, this.object.data.data[tempItem.type]);
      //   await this.object.update(data);

      //   tempItem.data.flags.ffgTempItemIndex = this.object.data.data[tempItem.type].findIndex((i) => i._id === tempItem.data._id);

      //   tempItem.sheet.render(true);
      // });
    }

    html.find(".item-pill .item-delete, .additional .add-modifier .item-delete").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const li = event.currentTarget;
      const parent = $(li).parent().parent()[0]; // TODO: this may sometimes be 1 parent and sometimes 2 (due to tooltips)
      const itemType = parent.dataset.itemName;
      const itemIndex = parent.dataset.itemIndex;

      const items = this.object.system[itemType];

      // find active effects associated with this attachment, so we can remove them
      let nonce = this.object.system[itemType][itemIndex].nonce;
      let related_active_effects = [];
      this.object.getEmbeddedCollection("ActiveEffect").contents.forEach(function (active_effect) {
        if (active_effect.getFlag('starwarsffg', 'associated_item') === nonce) {
          related_active_effects.push(active_effect.id);
        }
      });

      items.splice(itemIndex, 1);

      let formData = {};
      setProperty(formData, `data.${itemType}`, items);

      this.object.update(formData);

      // now that the change is submitted, actually remove them
      this.object.deleteEmbeddedDocuments("ActiveEffect", related_active_effects);
    });

    html.find(".item-pill .rank").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = $(event.currentTarget).parent().parent()[0];
      const itemType = li.dataset.itemName;
      const itemIndex = li.dataset.itemIndex;
      if (itemType === 'itemmodifier') {
        // TODO: check if we can remove this entirely
        return;
      }

      const item = this.object.system[itemType][parseInt(itemIndex, 10)];
      if (item) {
        const title = `${this.object.name} ${item.name}`;

        new Dialog(
          {
            title,
            content: {
              item,
              type: itemType,
              parenttype: this.object.type,
            },
            buttons: {
              done: {
                icon: '<i class="fas fa-check"></i>',
                label: game.i18n.localize("SWFFG.ButtonAccept"),
                callback: (html) => {
                  switch (itemType) {
                    case "itemmodifier": {
                      const formData = {};
                      const items = $(html).find("input");

                      items.each((index) => {
                        const input = $(items[index]);
                        const name = input.attr("name");
                        const id = input[0].dataset.itemId;

                        let arrayItem = this.object.system[itemType].findIndex((i) => i._id === id);

                        if (arrayItem > -1) {
                          setProperty(this.object.system[itemType][arrayItem], name, parseInt(input.val(), 10));
                        }
                      });

                      setProperty(formData, `data.${itemType}`, this.object.system[itemType]);
                      this.object.update(formData);

                      break;
                    }
                    case "itemattachment": {
                      break;
                    }
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
            template: `systems/starwarsffg/templates/items/dialogs/ffg-edit-${itemType}.html`,
          }
        ).render(true);
      }
    });

    html.find(".item-pill, .additional .add-modifier .fa-edit").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = event.currentTarget;
      let itemType = li.dataset.itemName;
      let itemIndex = li.dataset.itemIndex;

      let update_form = new UpdateEmbeddedAttachment(
          {
            parent: this.object,
            object: this.object.system[itemType][itemIndex],
            config: CONFIG.FFG,
          },
          {
            width: "500",
            height: "auto",
            resizable: true,
            title: "Editing " + this.object.system[itemType][itemIndex].name,
          }
      );
      await update_form.render(true);
    });

    html.find(".additional .modifier-active").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = event.currentTarget;
      const parent = $(li).parent()[0];
      let itemType = parent.dataset.itemName;
      let itemIndex = parent.dataset.itemIndex;
      const item = this.object.data.data[itemType][itemIndex];
      item.data.active = !item.data.active;

      if (this.object.data.flags.starwarsffg.ffgTempId) {
        // this is a temporary sheet for an embedded item

        item.flags = {
          starwarsffg: {
            ffgTempId: this.object.id,
            ffgTempItemType: itemType,
            ffgTempItemIndex: itemIndex,
            ffgParent: this.object.data.flags.starwarsffg,
            ffgIsTemp: true
          }
        };

        await EmbeddedItemHelpers.updateRealObject({ data: item }, {});
      } else {
        let formData = {};
        setProperty(formData, `data.${itemType}`, this.object.data.data[itemType]);
        this.object.update(formData);
      }

      this.object.sheet.render(true);
    });

    html.find(".additional .add-new-item").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = event.currentTarget;
      let itemType = li.dataset.acceptableType;

      let temp = {
        img: "icons/svg/mystery-man.svg",
        name: "Item Mod",
        type: itemType,
        flags: {
          starwarsffg: {
            ffgTempId: this.object.id,
            ffgTempItemType: itemType,
            ffgTempItemIndex: -1,
            ffgParent: this.object.flags.starwarsffg,
            ffgIsTemp: true,
            ffgUuid: this.object.uuid,
            ffgParentApp: this.appId,
            ffgIsOwned: this.object.isEmbedded,
          }
        },
        system: {
          attributes: {},
          description: "",
        },
      };

      let tempItem = await Item.create(temp, { temporary: true });
      //tempItem.data._id = randomID();

      let data = {};
      this.object.system[itemType].push(tempItem);
      setProperty(data, `system.${itemType}`, this.object.system[itemType]);
      await this.object.update(data);

      await tempItem.setFlag("starwarsffg", "ffgTempItemIndex", this.object.system[itemType].findIndex((i) => i.id === tempItem._id));

      tempItem.sheet.render(true);
    });
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

    let attrs = this.object.system.upgrades;
    let itemType = "upgrades";

    if ($(a).parents(".specialization-talent").length > 0) {
      attrs = this.object.system.talents;
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

  async _onSubmit(event, {updateData=null, preventClose=false, preventRender=false}={}) {
    event.preventDefault();
    // originally species
    if (this.item.type === "species") {
      const formData = this._getSubmitData(updateData);
    }

    return await super._onSubmit(event, arguments[1]);
  }

    /***
     * Given a set of field names, group all entries of those fields
     * @param formData - raw formData. should look like this:
     *     {
     *         0-effect_effect: ["a"],
     *         1-effect_effect: ["b"],
     *         ...
     *         0-effect_name: "c",
     *         1-effect_name: "d",
     *         ...
     *     }
     * @param key_bases - top-level field names, e.g. effect_effect
     * @returns grouped form data
     *     [
     *       {
     *           effect_effect: ["a"],
     *           effect_name: "c",
     *           ...
     *       },
     *       {
     *           effect_effect: ["b"],
     *           effect_name: "d",
     *           ...
     *       },
     *       ...
     *     ]
     * @private
     */
  _extractFormGroups(formData, key_bases) {
      /*
      incoming data format:
      {
          0-effect_effect: ["a"],
          1-effect_effect: ["b"],
          ...
          0-effect_name: "c",
          1-effect_name: "d",
          ...
      }
      */
      let results = [];
      let tmp = {};
      let tmp2 = {};
      // first pass - group fields under (common) name
      for (let k = 0; k < key_bases.length; k++) {
          tmp[key_bases[k]] = Object.keys( // https://masteringjs.io/tutorials/fundamentals/filter-key
              formData
          ).filter(
              (key) => key.includes(key_bases[k])
          ).reduce(
              (cur, key) => { return Object.assign(cur, { [key]: formData[key] })}, {}
          );
      }
      /*
      data is now in the format:
      {
            effect_effect: {
                0-effect_effect: ["a"],
                1-effect_effect: ["b"],
                ...
            },
            effect_name: {
                0-effect_name: "c",
                1-effect_name: "d",
                ...
            },
            ...
      }
      */
      console.log("reduced or something")
      console.log(results)
      let current_key;  // represents the current high-level form name we're working with, e.g. 'effect_effect'

      // second pass - remove the extra information so we only have the field names and values
      for (let k = 0; k < key_bases.length; k++) {
          current_key = key_bases[k];
          tmp2[current_key] = [];
          // iterate over the values
          Object.values(tmp[current_key]).forEach(function (element) {
              // we want these to always be arrays
              if (typeof(element) !== 'object') {
                  element = [element];
              }
             tmp2[current_key].push(element);
          });
      }
      console.log(tmp2)
      /*
      data is now in the format:
      {
          effect_effect: [
            ["a"],
            ["b"],
            ...
          ],
          effect_name: [
            "c",
            "d",
          ],
          ...
      }
      */
      let working_group;
      // final pass - group by object
      for (let k = 0; k < tmp2[Object.keys(tmp2)[0]].length; k++) {
          console.log(k)
          working_group = {};
          for (let x = 0; x < key_bases.length; x++) {
              working_group[key_bases[x]] = tmp2[Object.keys(tmp2)[x]][k];
          }
          results.push(working_group);
      }
      console.log(results)

      /*
      data is now in the format:
      [
        {
            effect_effect: ["a"],
            effect_name: "c",
            ...
        },
        {
            effect_effect: ["b"],
            effect_name: "d",
            ...
        },
        ...
      ]
      */
      return results;

  }

  _canDragStart(selector) {
    return this.options.editable && this.object.isOwner;
  }

  _canDragDrop(selector) {
    return true;
  }

  importItemFromCollection(collection, entryId) {
    const pack = game.packs.get(collection);
    if (pack.documentName !== "Item") return;
    return pack.getDocument(entryId).then((ent) => {
      CONFIG.logger.debug(`Importing Item ${ent.name} from ${collection}`);
      return ent;
    });
  }

  async updateSpecializationSheetContents(li, talent_id, data) {
    // intended to functionalize the syncing of input onto a specialization sheet, so we can call it from >1 place
    let sheet = $(li);
    console.log("got data")
    console.log(data)

    console.log(sheet)

    sheet.find(`input[name='data.talents.${talent_id}.name']`).val(data.name);
    sheet.find(`input[name='data.talents.${talent_id}.description']`).val('this is a dumb updated description');
    sheet.find(`input[name='data.talents.${talent_id}.activation']`).val(data.activation);
    sheet.find(`input[name='data.talents.${talent_id}.activationLabel']`).val(data.activationLabel);
    sheet.find(`input[name='data.talents.${talent_id}.isRanked']`).val(data.isRanked);
    sheet.find(`input[name='data.talents.${talent_id}.isForceTalent']`).val(data.isForceTalent);
    sheet.find(`input[name='data.talents.${talent_id}.isConflictTalent']`).val(data.isConflictTalent);
    sheet.find(`input[name='data.talents.${talent_id}.link_id']`).val(data.link_id);
    sheet.find(`input[name='data.talents.${talent_id}.itemId']`).val('NOT A VALID ID');
    sheet.find(`input[name='data.talents.${talent_id}.pack']`).val('NOT A VALID PACK');

    let attr_fields = $(sheet.find(`input[name='data.talents.${talent_id}.name']`).parent());
    // remove all the existing fields so we can re-add ones which still exist
    console.log($(attr_fields).find('.attr').length)
    $(attr_fields).find('.attr').remove();

    Object.keys(data.attributes).forEach((attr) => {
      const a = data.attributes[attr];
      $(attr_fields).append(`<input class="talent-hidden attr" type="text" name="data.talents.${talent_id}.attributes.${attr}.key" value="${attr}" />`);
      $(attr_fields).append(`<input class="talent-hidden attr" type="text" name="data.talents.${talent_id}.attributes.${attr}.value" value="${a.value}" />`);
      $(attr_fields).append(`<input class="talent-hidden attr" type="text" name="data.talents.${talent_id}.attributes.${attr}.modtype" value="${a.modtype}" />`);
      $(attr_fields).append(`<input class="talent-hidden attr" type="text" name="data.talents.${talent_id}.attributes.${attr}.mod" value="${a.mod}" />`);
      $(attr_fields).append(`<input class="talent-hidden attr" type="text" name="data.talents.${talent_id}.attributes.${attr}.active" value="${a.active}" />`);
    });

    console.log(sheet)
    return sheet;
  }

  async _onDropTalentToSpecialization(event) {
    let data;
    const specialization = this.object;
    let li = event.currentTarget;
    const talentId = $(li).attr("id");

    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }
    // as of v10, "id" is not passed in - instead, "uuid" is. Let's use the Foundry API to get the item Document from the uuid.
    const itemObject = await fromUuid(data.uuid);

    if (!itemObject) return;

    console.log("talent on specialization")
    console.log(data)
    console.log(specialization)
    console.log(li)
    console.log(talentId)
    console.log(itemObject)
    console.log("yus")
    console.log(event)

    // TODO: get rid of everything below here

    if (itemObject.type === "talent") {
      let link_id = randomID();
      let form_data = {
        name: itemObject.name,
        description: 'this is a dumb basic description',
        activation: itemObject.system.activation.value,
        activationLabel: itemObject.system.activation.label,
        isRanked: itemObject.system.ranked,
        isForceTalent: itemObject.system.isForceTalent,
        isConflictTalent: itemObject.system.isConflictTalent,  // TODO: for whatever reason, isConflictTalent specifically is not transferred on drag-and-drop now
        link_id: link_id,
        itemId: 'NOT A VALID ID',  // TODO: remove this line
        pack: 'NOT A VALID PACK',  // TODO: remove this line
        attributes: itemObject.system.attributes,
      }
      li = this.updateSpecializationSheetContents(
          li,
          talentId,
          form_data,
      )

      await this._onSubmit(event);
      // done after the onSubmit, so we don't ruin the event
      await ItemHelpers.transferActiveEffects(itemObject, this.object, link_id);
      //await ItemHelpers.syncActiveEffects(this.object);
      await ItemHelpers.syncModifierActiveEffects(this.object);
      // TODO: remove old ActiveEffects from the spot where this talent was droppped (if there were any)
      // this will probably require actually including this ID somewhere helpful
    }
  }

  _updateSpecializationTalentReference(specializationTalentItem, talentItem) {
    CONFIG.logger.debug(`Updating Specializations Talent during sheet render`);
    specializationTalentItem.name = talentItem.name;
    specializationTalentItem.description = talentItem.system.description;
    specializationTalentItem.activation = talentItem.system.activation.value;
    specializationTalentItem.activationLabel = talentItem.system.activation.label;
    specializationTalentItem.isRanked = talentItem.system.ranks.ranked;
    specializationTalentItem.isForceTalent = talentItem.system.isForceTalent;
    specializationTalentItem.isConflictTalent = talentItem.system.isConflictTalent;
    specializationTalentItem.attributes = talentItem.system.attributes;
    console.log("no")
    console.log(talentItem.system.isConflictTalent)
  }

  async _onDropItem(event) {
    let data;
    const obj = this.object;
    const li = event.currentTarget;

    console.log("dropped")

    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }

    let dropped_object = game.items.get(data.uuid.split('.').pop());
    let dropee_object = game.items.get(obj.id);

    console.log("dropped")
    console.log(dropped_object)
    console.log("dropee")
    console.log(dropee_object)

    // todo: this is probably much too small of a scope
    if (dropped_object.type === 'itemmodifier' && ['weapon', 'shipweapon'].includes(dropee_object.type)) {
      console.log("yes")
      // todo: validate that the type is appropriate
      let link_id = randomID(); // used to tie AEs to mod
      // update attachment data
      let basic_data = {
        'img': dropped_object.img,
        'name': dropped_object.name,
        'description': dropped_object.system.renderedDesc,
        'link_id': link_id,
        'modifiers': [],
        'type': dropped_object.type,
        'system': {
          'rank': 1,
          'type': dropped_object.system.type,
        },
      };
      // find the actual modifiers on the quality
      Object.keys(dropped_object.system.attributes).forEach(function (attribute) {
        let attribute_obj = dropped_object.system.attributes[attribute];
        let temp_data = {}; // needed for setting the variable value as the key
        temp_data[attribute] = {
            'modtype': attribute_obj['modtype'],
            'value': attribute_obj['value'],
            'mod': attribute_obj['mod'],
            'active': attribute_obj['active'],
          };
        basic_data['modifiers'].push(temp_data);
      });

      if (dropee_object.system.itemmodifier.length > 0) {
        // combine with the existing modifiers
        basic_data = dropee_object.system.itemmodifier.concat([basic_data]);
      } else {
        basic_data = [basic_data];
      }

      // actually perform the update
      dropee_object.update({
        system: {
          itemmodifier: basic_data,
        },
      });
      // transfer active effects
      await ItemHelpers.transferActiveEffects(dropped_object, dropee_object, link_id);
      return;
    }

    if (dropped_object.type === 'talent' && dropee_object.type === 'specialization') {
      console.log("yes")
      await ItemHelpers.transferActiveEffects(dropped_object, dropee_object, randomID());
      return;
    }

    // todo: this is probably much too small of a scope
    if (dropped_object.type === 'itemmodifier' && dropee_object.type === 'itemattachment') {
      // todo: validate that the type is appropriate
      let link_id = randomID(); // used to tie AEs to mod
      // update attachment data
      let basic_data = {
        'img': dropped_object.img,
        'name': dropped_object.name,
        'description': dropped_object.system.renderedDesc,
        'link_id': link_id,
        'modifiers': [],
      };

      // find the actual modifiers on the mod
      Object.keys(dropped_object.system.attributes).forEach(function (attribute) {
        let attribute_obj = dropped_object.system.attributes[attribute];
        let temp_data = {}; // needed for setting the variable value as the key
        temp_data[attribute] = {
            'modtype': attribute_obj['modtype'],
            'value': attribute_obj['value'],
            'mod': attribute_obj['mod'],
            'active': attribute_obj['active'],
          };
        basic_data['modifiers'].push(temp_data);
      });

      if (dropee_object.system.itemmodifier.length > 0) {
        // combine with the existing modifiers
        basic_data = dropee_object.system.itemmodifier.concat([basic_data]);
      } else {
        basic_data = [basic_data];
      }

      // actually perform the update
      dropee_object.update({
        system: {
          itemmodifier: basic_data,
        },
      });
      // transfer active effects
      await ItemHelpers.transferActiveEffects(dropped_object, dropee_object, link_id);
      return;
    }

    if (dropped_object.type === 'itemmodifier' && dropped_object.system.type === 'all') {
      console.log("dropped mod directly")
      await ItemHelpers.createEmbeddedModifier(dropee_object, dropped_object);
    } else {
      await ItemHelpers.createEmbeddedAttachment(dropee_object, dropped_object, randomID());
    }


    //await ItemHelpers.syncActiveEffects(dropee_object);
    //await ItemHelpers.embedAttachment(dropee_object, dropped_object);

    // TODO: stop normal duplicating the item for deep embed stuff
    // TODO: handle all of the rules around adding items currently handled below
    if (dropped_object.type === 'itemattachment' || dropped_object.type === 'itemmodifier' || dropped_object.type === 'shipweapon') {
      return
    }

    // as of v10, "id" is not passed in - instead, "uuid" is. Let's use the Foundry API to get the item Document from the uuid.
    const itemObject = duplicate(await fromUuid(data.uuid));

    if (!itemObject) return;

    itemObject.id = randomID(); // why do we do this?!

    if ((itemObject.type === "itemattachment" || itemObject.type === "itemmodifier") && ((obj.type === "shipweapon" && itemObject.system.type === "weapon") || obj.type === itemObject.system.type || itemObject.system.type === "all" || obj.type === "itemattachment")) {
      let items = obj?.system[itemObject.type];
      if (!items) {
        items = [];
      }

      const foundItem = items.find((i) => {
        return i.name === itemObject.name || (i.flags?.starwarsffg?.ffgimportid?.length ? i.flags.starwarsffg.ffgimportid === itemObject.flags.starwarsffg.ffgimportid : false);
      });

      switch (itemObject.type) {
        case "itemmodifier": {
          if (parseInt(itemObject.system.rank, 10) === 0) {
            itemObject.system.rank = 1;
          }

          if (foundItem && this.object.type !== "itemattachment") {
            foundItem.system.rank += itemObject.system.rank;
          } else {
            items.push(itemObject);
          }
          break;
        }
        case "itemattachment": {
          if (this.object.system.hardpoints.current - itemObject.system.hardpoints.value >= 0) {
            items.push(itemObject);
          } else {
            ui.notifications.warn(`Item does not have enough available hardpoints (${this.object.system.hardpoints.current} left)`);
          }
          break;
        }
        default: {
          return;
        }
      }

      let formData = {};
      setProperty(formData, `data.${itemObject.type}`, items);

      obj.update(formData);
    }
  }

  async _onDragItemStart(event) {}
}
