import PopoutEditor from "../popout-editor.js";
import Helpers from "../helpers/common.js";
import ModifierHelpers from "../helpers/modifiers.js";
import ItemHelpers from "../helpers/item-helpers.js";
import ImportHelpers from "../importer/import-helpers.js";
import DiceHelpers from "../helpers/dice-helpers.js";
import item from "../helpers/embeddeditem-helpers.js";
import EmbeddedItemHelpers from "../helpers/embeddeditem-helpers.js";

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
  async getData(options) {
    let data = super.getData(options);

    if (options?.action === "update" && this.object.compendium) {
      data.item = mergeObject(data.item, options.data);
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
    if (this.object.data?.flags?.ffgTempId) {
      data.isTemp = true;
    }

    switch (this.object.data.type) {
      case "weapon":
      case "shipweapon":
        this.position.width = 550;
        this.position.height = 750;
        break;
      case "itemattachment":
        this.position.width = 500;
        this.position.height = 450;
      case "armour":
      case "gear":
      case "shipattachment":
        this.position.width = 385;
        this.position.height = 515;
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

          await ImportHelpers.asyncForEach(Object.keys(specializationTalents), async (talent) => {
            let gameItem;
            if (specializationTalents?.[talent]?.pack?.length) {
              try {
                const pack = await game.packs.get(specializationTalents[talent].pack);

                // this may be a coverted specialization talent from a world to a module.
                if (!pack) {
                  gameItem = await ImportHelpers.findCompendiumEntityById("Item", specializationTalents[talent].itemId);
                } else {
                  await pack.getIndex();
                  const entry = await pack.index.find((e) => e._id === specializationTalents[talent].itemId);
                  if (entry) {
                    gameItem = await pack.getEntity(entry._id);
                  }
                }
              } catch (err) {
                CONFIG.logger.warn(`Unable to load ${specializationTalents[talent].pack}`, err);
              }
            } else {
              gameItem = await game.items.get(specializationTalents[talent].itemId);
            }

            if (gameItem) {
              this._updateSpecializationTalentReference(specializationTalents[talent], gameItem.data);
            }
          });
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
      const packName = $(parent).find(`input[name='data.talents.${parent.id}.pack']`).val();
      const talentName = $(parent).find(`input[name='data.talents.${parent.id}.name']`).val();

      let item = await Helpers.getSpecializationTalent(itemId, packName);
      if (!item) {
        if (packName) {
          // if we can't find the item by itemid, try by name
          const pack = await game.packs.get(packName);
          await pack.getIndex();
          const entity = await pack.index.find((e) => e.name === talentName);
          if (entity) {
            item = await pack.getEntity(entity._id);

            let updateData = {};
            // build dataset if needed
            if (!pack.locked) {
              setProperty(updateData, `data.talents.${parent.id}.itemId`, entity._id);
              this.object.update(updateData);
            }
          }
        }
      }
      if (!item.data.flags["clickfromparent"]) {
        item.data.flags["clickfromparent"] = [];
      }
      item.data.flags["clickfromparent"].push({ id: this.object.uuid, talent: parent.id });
      item.sheet.render(true);
    });

    if (this.object.data.type === "talent") {
      if (!Hooks?._hooks[`closeAssociatedTalent_${this.object.data._id}`]?.length && typeof this._submitting === "undefined") {
        Hooks.once(`closeAssociatedTalent_${this.object.data._id}`, (item) => {
          item.object.data.flags.clickfromparent = [];
          delete Hooks._hooks[`closeAssociatedTalent_${item.object.data._id}`];
        });
      }
    }

    // Everything below here is only needed if the sheet is editable
    if (this.object.data.flags.readonly) this.options.editable = false;
    if (!this.options.editable) return;

    // Add or Remove Attribute
    html.find(".attributes").on("click", ".attribute-control", ModifierHelpers.onClickAttributeControl.bind(this));

    if (["forcepower", "specialization", "signatureability"].includes(this.object.data.type)) {
      html.find(".talent-action").on("click", this._onClickTalentControl.bind(this));
      html.find(".talent-actions .fa-cog").on("click", ModifierHelpers.popoutModiferWindow.bind(this));
      html.find(".talent-modifiers .fa-cog").on("click", ModifierHelpers.popoutModiferWindowUpgrade.bind(this));
      html.find(".talent-name.talent-modifiers").on("click", ModifierHelpers.popoutModiferWindowSpecTalents.bind(this));
    }

    if (this.object.data.type === "specialization") {
      try {
        const dragDrop = new DragDrop({
          dragSelector: ".item",
          dropSelector: ".specialization-talent",
          permissions: { dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this) },
          callbacks: { drop: this._onDropTalentToSpecialization.bind(this) },
        });

        dragDrop.bind($(`form.editable.item-sheet-${this.object.data.type}`)[0]);
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

    if (["weapon", "armor", "itemattachment", "shipweapon"].includes(this.object.data.type)) {
      const itemToItemAssociation = new DragDrop({
        dragSelector: ".item",
        dropSelector: null,
        permissions: { dragstart: true, drop: true },
        callbacks: { drop: this._onDropItem.bind(this) },
      });
      itemToItemAssociation.bind(html[0]);

      html.find(".resource.pills.itemmodifier .block-title, .resource.pills.itemattachment .block-title").append("<i class='far fa-plus-square add-new-item'></i>");

      html.find(".resource.pills.itemmodifier").on("click", async (event) => {
        let temp = {
          img: "icons/svg/mystery-man.svg",
          name: "",
          type: "itemmodifier",
          flags: {
            ffgTempId: this.object.id,
            ffgTempItemType: "itemmodifier",
            ffgTempItemIndex: -1,
          },
          data: {
            attributes: {},
            description: "",
            rank: 1,
            type: "all",
          },
        };

        let tempItem = await Item.create(temp, { temporary: true });
        tempItem.sheet.render(true);
      });

      html.find(".resource.pills.itemattachment").on("click", async (event) => {
        let temp = {
          img: "icons/svg/mystery-man.svg",
          name: "",
          type: "itemattachment",
          flags: {
            ffgTempId: this.object.id,
            ffgTempItemType: "itemattachment",
            ffgTempItemIndex: -1,
          },
          data: {
            attributes: {},
            description: "",
            type: "all",
            itemmodifier: [],
          },
        };
        let tempItem = await Item.create(temp, { temporary: true });
        tempItem.sheet.render(true);
      });
    }

    html.find(".item-pill .item-delete, .additional .add-modifier .item-delete").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const li = event.currentTarget;
      const parent = $(li).parent()[0];
      const itemType = parent.dataset.itemName;
      const itemIndex = parent.dataset.itemIndex;

      const items = this.object.data.data[itemType];
      items.splice(itemIndex, 1);

      let formData = {};
      setProperty(formData, `data.${itemType}`, items);

      this.object.update(formData);
    });

    html.find(".item-pill .rank").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = $(event.currentTarget).parent()[0];
      const itemType = li.dataset.itemName;
      const itemIndex = li.dataset.itemIndex;

      const item = this.object.data.data[itemType][parseInt(itemIndex, 10)];
      const title = `${this.object.name} ${item.name}`;

      new Dialog(
        {
          title,
          content: {
            item,
            type: itemType,
            parenttype: this.object.data.type,
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

                      let arrayItem = this.object.data.data[itemType].findIndex((i) => i._id === id);

                      if (arrayItem > -1) {
                        setProperty(this.object.data.data[itemType][arrayItem], name, parseInt(input.val(), 10));
                      }
                    });

                    setProperty(formData, `data.${itemType}`, this.object.data.data[itemType]);
                    this.object.update(formData);

                    break;
                  }
                  case "itemattachment": {
                    console.log(itemType);
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
    });

    html.find(".item-pill, .additional .add-modifier .fa-edit").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = event.currentTarget;
      let itemType = li.dataset.itemName;
      let itemIndex = li.dataset.itemIndex;

      if ($(li).hasClass("adjusted")) {
        return await EmbeddedItemHelpers.loadItemModifierSheet(this.object._id, itemType, itemIndex, this.object?.actor?._id);
      }

      if ($(li).hasClass("fa-edit")) {
        const parent = $(li).parent()[0];
        itemType = parent.dataset.itemName;
        itemIndex = parent.dataset.itemIndex;
      }

      const item = this.object.data.data[itemType][itemIndex];

      let temp = { ...item, flags: { ffgTempId: this.object.id, ffgTempItemType: itemType, ffgTempItemIndex: itemIndex, ffgIsTemp: true, ffgParent: this.object.data.flags } };
      if (this.object.isOwned) {
        let ownerObject = await fromUuid(this.object.uuid);

        temp = {
          ...item,
          flags: {
            ffgTempId: this.object.id,
            ffgTempItemType: itemType,
            ffgTempItemIndex: itemIndex,
            ffgIsTemp: true,
            ffgUuid: this.object.uuid,
          },
        };
      }

      let tempItem = await Item.create(temp, { temporary: true });

      tempItem.data._id = temp._id;
      if (!temp._id) {
        tempItem.data._id = randomID();
      }
      tempItem.sheet.render(true);
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

      if (this.object.data.flags.ffgTempId) {
        // this is a temporary sheet for an embedded item

        item.flags = {
          ffgTempId: this.object.id,
          ffgTempItemType: itemType,
          ffgTempItemIndex: itemIndex,
          ffgParent: this.object.data.flags,
          ffgIsTemp: true,
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
        name: "",
        type: itemType,
        flags: {
          ffgTempId: this.object.id,
          ffgTempItemType: itemType,
          ffgTempItemIndex: -1,
          ffgParent: this.object.data.flags,
          ffgIsTemp: true,
          ffgUuid: this.object.uuid,
        },
        data: {
          attributes: {},
          description: "",
        },
      };

      let tempItem = await Item.create(temp, { temporary: true });
      tempItem.data._id = temp._id;
      if (!temp._id) {
        tempItem.data._id = randomID();
      }
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
      $(li).find(`input[name='data.talents.${talentId}.isConflictTalent']`).val(itemObject.data.data.isConflictTalent);
      $(li).find(`input[name='data.talents.${talentId}.itemId']`).val(data.id);
      $(li).find(`input[name='data.talents.${talentId}.pack']`).val(data.pack);

      const fields = $(li).find(`input[name='data.talents.${talentId}.name']`).parent();
      Object.keys(itemObject.data.data.attributes).forEach((attr) => {
        const a = itemObject.data.data.attributes[attr];
        $(fields).append(`<input class="talent-hidden" type="text" name="data.talents.${talentId}.attributes.${attr}.key" value="${attr}" />`);
        $(fields).append(`<input class="talent-hidden" type="text" name="data.talents.${talentId}.attributes.${attr}.value" value="${a.value}" />`);
        $(fields).append(`<input class="talent-hidden" type="text" name="data.talents.${talentId}.attributes.${attr}.modtype" value="${a.modtype}" />`);
        $(fields).append(`<input class="talent-hidden" type="text" name="data.talents.${talentId}.attributes.${attr}.mod" value="${a.mod}" />`);
      });

      // check to see if the talent already has a reference to the specialization
      if (!itemObject.data.data.trees.includes(specialization.id)) {
        // the talent doesn't already have the reference, add it
        let tree = itemObject.data.data.trees;
        tree.push(specialization.id);

        if (!data.pack) {
          let formData = {};
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
    specializationTalentItem.isConflictTalent = talentItem.data.isConflictTalent;
    specializationTalentItem.attributes = talentItem.data.attributes;
  }

  async _onDropItem(event) {
    let data;
    const obj = this.object;
    const li = event.currentTarget;

    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }

    // Case 1 - Import from a Compendium pack
    let itemObject;
    if (data.pack) {
      const compendiumObject = await this.importItemFromCollection(data.pack, data.id);
      itemObject = compendiumObject.data;
    }

    // Case 2 - Import from World entity
    else {
      itemObject = duplicate(await game.items.get(data.id));
      if (!itemObject) return;
    }
    itemObject._id = randomID();

    if ((itemObject.type === "itemattachment" || itemObject.type === "itemmodifier") && (obj.data.type === itemObject.data.type || itemObject.data.type === "all" || obj.data.type === "itemattachment")) {
      let items = obj?.data?.data?.[itemObject.type];
      if (!items) {
        items = [];
      }

      const foundItem = items.find((i) => {
        return i._id === itemObject._id || (i.flags?.ffgimportid?.length ? i.flags.ffgimportid === itemObject.flags.ffgimportid : false);
      });

      switch (itemObject.type) {
        case "itemmodifier": {
          if (parseInt(itemObject.data.rank, 10) === 0) {
            itemObject.data.rank = 1;
          }

          if (foundItem && this.object.type !== "itemattachment") {
            foundItem.data.rank += itemObject.data.rank;
          } else {
            items.push(itemObject);
          }
          break;
        }
        case "itemattachment": {
          if (this.object.data.data.hardpoints.current - itemObject.data.hardpoints.value >= 0) {
            items.push(itemObject);
          } else {
            ui.notifications.warn(`Item does not have enough available hardpoints (${this.object.data.data.hardpoints.current} left)`);
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
