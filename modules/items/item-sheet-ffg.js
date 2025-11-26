import PopoutEditor from "../popout-editor.js";
import Helpers from "../helpers/common.js";
import ModifierHelpers from "../helpers/modifiers.js";
import ItemHelpers from "../helpers/item-helpers.js";
import ImportHelpers from "../importer/import-helpers.js";
import DiceHelpers from "../helpers/dice-helpers.js";
import item from "../helpers/embeddeditem-helpers.js";
import EmbeddedItemHelpers from "../helpers/embeddeditem-helpers.js";
import ActorHelpers, {xpLogSpend} from "../helpers/actor-helpers.js";
import ItemOptions from "./item-ffg-options.js";
import {forcePowerEditor, itemEditor, talentEditor} from "./item-editor.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */

export class ItemSheetFFG extends foundry.appv1.sheets.ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item"],
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      scrollY: [".sheet-body", ".tab"],
      action: null,
      data: null,
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
    // this code was mostly written by Phind
    // removing a key from a dict in Foundry requires submitting it with a new key of `-=key` and a value of null
    // without explicitly replacing values, we end up duplicating entries instead of removing the one
    // so instead, we go and manually remove any mods which have been deleted

    // find any deleted attributes
    const deleted_keys = EmbeddedItemHelpers.findKeysIncludingStringRecursively(
        data,
        '-=attr',
    );
    // remove matching attributes from the existing object
    deleted_keys.forEach(function (cur_key) {
      EmbeddedItemHelpers.removeKeyFromObject(
        data,
        cur_key,
      );
      EmbeddedItemHelpers.removeKeyFromObject(
        data,
        cur_key,
      );
    });
    // this is the end of the de-duplicating -=key stuff

    data.data = data.item.system;


    if (options?.action === "update" && this.object.compendium) {
      delete options.data._id;
      data.item = foundry.utils.mergeObject(data.item, options.data);
    } else if (options?.action === "ffgUpdate") {
      delete options?.data?.system?.description;
      if (options?.data?.data) {
        data.data = foundry.utils.mergeObject(data.data, options.data.data);
        // we are going to merge options.data into data.item and can't set data.item.data this way
        delete options.data.data;
      } else {
        data.data = foundry.utils.mergeObject(data.data, options.data);
      }
      data.item = foundry.utils.mergeObject(data.item, options.data); // some fields are read out of item, some are read out of data
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

    if (data?.data?.description) {
      data.data.enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(data.data.description);
    }

    if (data?.data?.longDesc !== undefined) {
      data.data.enrichedLongDesc = await foundry.applications.ux.TextEditor.enrichHTML(data.data.longDesc);
      data.data.hasLongDesc = true;
    } else {
      data.data.hasLongDesc = false;
    }

    data.isTemp = false;
    if (this.object.flags?.starwarsffg?.ffgIsOwned || this.object.flags?.starwarsffg?.ffgIsTemp) {
      data.isTemp = true;
    }
    data.isOwned = this.object.flags?.starwarsffg?.ffgIsOwned;
    data.modTypeSelected = "all";

    switch (this.object.type) {
      case "weapon":
        this.position.width = 550;
        this.position.height = 750;
        data.data.enrichedSpecial = await PopoutEditor.renderDiceImages(data?.data?.special?.value, this.actor ? this.actor : {});
        data.modTypeSelected = "weapon";
        break;
      case "shipweapon":
        this.position.width = 550;
        this.position.height = 750;
        data.data.enrichedSpecial = await PopoutEditor.renderDiceImages(data?.data?.special?.value, this.actor ? this.actor : {});
        data.modTypeSelected = "vehicle";
        break;
      case "itemattachment":
        this.position.width = 500;
        this.position.height = 450;
        data.modTypeSelected = this.object.system.type;
        break;
      case "itemmodifier":
        this.position.width = 450;
        this.position.height = 350;
        data.modTypeSelected = this.object.system.type;
        break;
      case "armour":
        this.position.width = 385;
        this.position.height = 750;
        data.modTypeSelected = "armor";
        break;
      case "gear":
        this.position.width = 385;
        this.position.height = 750;
        break;
      case "shipattachment":
        this.position.width = 385;
        this.position.height = 615;
        data.modTypeSelected = "vehicle";
        break;
      case "ability":
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
        for (let x = 0; x < 16; x++) {
          data.data.upgrades[`upgrade${x}`].enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(data.data.upgrades[`upgrade${x}`].description);
        }
        break;
      case "specialization":
        this.position.width = 850;
        this.position.height = 1005;
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
        }
        for (let x = 0; x < 20; x++) {
          data.data.talents[`talent${x}`].enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(data.data.talents[`talent${x}`].description);
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
        if (Object.keys(this.object.system.specializations).length === 0) {
          // handlebars sucks
          data.data.specializations = false;
        } else {
          for (const specializationId of Object.keys(data.data.specializations)) {
            if (!fromUuidSync(data.data.specializations[specializationId].source)) {
              // this item no longer exists, tag it as broken
              data.data.specializations[specializationId].broken = true;
            }
          }
        }
        if (Object.keys(this.object.system.signatureabilities).length === 0) {
          // handlebars sucks
          data.data.signatureabilities = false;
        } else {
          for (const signatureAbilityId of Object.keys(data.data.signatureabilities)) {
            if (!fromUuidSync(data.data.signatureabilities[signatureAbilityId].source)) {
              // this item no longer exists, tag it as broken
              data.data.signatureabilities[signatureAbilityId].broken = true;
            }
          }
        }
        break;
      case "signatureability": {
        this.position.width = 720;
        this.position.height = 545;
        data.data.isReadOnly = false;
        if (!this.options.editable) {
          data.data.isEditing = false;
          data.data.isReadOnly = true;
        }
        for (let x = 0; x < 8; x++) {
          data.data.upgrades[`upgrade${x}`].enrichedDescription = await foundry.applications.ux.TextEditor.enrichHTML(data.data.upgrades[`upgrade${x}`].description);
        }
        break;
      }
      default:
    }

    data.FFG = CONFIG.FFG;

    // prepare skills for career skill usage
    if (this?.actor?.system?.skills) {
      data.careerSkills = foundry.utils.mergeObject(
        {
          "(none)": {
            value: "(none)",
            label: "SWFFG.CareerSkills.None",
          }
        },
        foundry.utils.deepClone(this.actor.system.skills)
      );
    } else {
      data.careerSkills = foundry.utils.mergeObject(
        {
          "(none)": {
            value: "(none)",
            label: "SWFFG.CareerSkills.None",
          }
        },
        foundry.utils.deepClone(CONFIG.FFG.skills)
      );
    }

    data.renderedDesc = PopoutEditor.renderDiceImages(data.description, this.actor ? this.actor : {});
    if (!data.renderedDesc) {
      data.data.renderedDesc = PopoutEditor.renderDiceImages(data?.item?.system?.description, this.actor ? this.actor : {});
    }

    // get summarized data for qualities (e.g. weapons)
    data = this._getSummarizedQualities(data);

    data.modifierTypes = CONFIG.FFG.allowableModifierTypes;
    data.modifierChoices = CONFIG.FFG.allowableModifierChoices;
    // allow modifiers to impact actor-specific custom skills, if present

    if (this?.actor?.system?.skills) {
      const updatedChoices = foundry.utils.deepClone(data.modifierChoices);
      for (const modifierChoice of Object.keys(CONFIG.FFG.allowableModifierChoices).filter(i => i.indexOf("Skill") >= 0)) {
        updatedChoices[modifierChoice] = this?.actor?.system?.skills;
      }
      data.modifierChoices = updatedChoices;
    }

    return data;
  }

  /**
   * Summarizes the qualities of an item (drawing from both the direct qualities and those added by attachments)
   * The goal is to provide a unified view (e.g. "Accurate 3" instead of "Accurate 1" and "Accurate 2 - from attachment")
   * This data is intended for user viewing only; it should not be submitted back or otherwise used to update anything
   * @param data (from getData)
   * @returns {*}
   * @private
   */
  _getSummarizedQualities(data) {
    CONFIG.logger.debug("Summarizing qualities");
    // enrich attachment data
    data.data.doNotSubmit = {
      qualities: [],
    };

    if (Object.keys(data.data).includes("itemmodifier")) {
      for (const mod of data.data.itemmodifier) {
        const modName = mod.name;
        const rank = mod.system.rank;
        const description = mod.system.description;
        const modId = mod._id;
        let modIndex = data.data.doNotSubmit.qualities.findIndex(i => i.name === modName);
        if (modIndex < 0) {
          modIndex = data.data.doNotSubmit.qualities.length;
          data.data.doNotSubmit.qualities.push({
            name: modName,
            img: mod.img,
            description: description,
            itemIndex: modIndex,
            totalRanks: 0,
            modId: modId,
            includeControls: true,
            summarizedRanks: {
              mods: 0,
            }
          });
        }
        data.data.doNotSubmit.qualities[modIndex].totalRanks += rank;
        data.data.doNotSubmit.qualities[modIndex].summarizedRanks.mods += rank;
      }
    }
    CONFIG.logger.debug(data.data.doNotSubmit.qualities);

    CONFIG.logger.debug("Pulling qualities from attachments");
    if (Object.keys(data.data).includes("itemattachment")) {
      for (const attachment of data.data.itemattachment) {
        const source = attachment.name;
        if (Object.keys(attachment.system).includes("itemmodifier")) {
          for (const mod of attachment.system.itemmodifier) {
            if (!mod.system.active) {
              // this modifier isn't active, skip processing
              continue;
            }
            const modName = mod.name;
            const rank = mod.system.rank;
            const description = mod.system.description;
            let modIndex = data.data.doNotSubmit.qualities.findIndex(i => i.name === modName);
            if (modIndex < 0) {
              modIndex = data.data.doNotSubmit.qualities.length;
              data.data.doNotSubmit.qualities.push({
                name: modName,
                description: description,
                itemIndex: modIndex,
                totalRanks: 0,
                includeControls: false,
                summarizedRanks: {
                  [source]: 0,
                }
              });
            }
            // validate this source is present in the data
            if (!Object.keys(data.data.doNotSubmit.qualities[modIndex].summarizedRanks).includes(source)) {
              data.data.doNotSubmit.qualities[modIndex].summarizedRanks[source] = 0;
            }
            // update the ranks
            data.data.doNotSubmit.qualities[modIndex].totalRanks += rank;
            data.data.doNotSubmit.qualities[modIndex].summarizedRanks[source] += rank;
          }
        }
      }
    }
    CONFIG.logger.debug(data.data.doNotSubmit.qualities);
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".ffg-purchase").click(async (ev) => {
      if(this.actor && !this.actor?.verifyEditModeIsNotEnabled()) return;
      await this._handleItemBuy(ev)
    });

    html.find(".source-control").click(async (ev) => {
      await this._handleSourceControl(ev);
    });

    html.find(".tag-control").click(async (ev) => {
      await this._handleTagControl(ev);
    });

    // register sheet options
    if (["gear", "weapon", "armour"].includes(this.object.type)) {
      this.sheetoptions = new ItemOptions(this, html);
      this.sheetoptions.register("enablePrice", {
        name: game.i18n.localize("SWFFG.SheetOptions2.EnablePrice.Name"),
        hint: game.i18n.localize("SWFFG.SheetOptions2.EnablePrice.Hint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("enableRarity", {
        name: game.i18n.localize("SWFFG.SheetOptions2.enableRarity.Name"),
        hint: game.i18n.localize("SWFFG.SheetOptions2.enableRarity.Hint"),
        type: "Boolean",
        default: true,
      });
      if (this.object.type === "weapon") {
        this.sheetoptions.register("enableAmmo", {
          name: game.i18n.localize("SWFFG.SheetOptions2.enableAmmo.Name"),
          hint: game.i18n.localize("SWFFG.SheetOptions2.enableAmmo.Hint"),
          type: "Boolean",
          default: false,
        });
      }
    }

    // TODO: This is not needed in Foundry 0.6.0
    // Activate tabs
    let tabs = html.find(".tabs");
    let initial = this._sheetTab;
    new foundry.applications.ux.Tabs(tabs, {
      initial: initial,
      callback: (clicked) => (this._sheetTab = clicked.data("tab")),
    });

    html.find(".items .item, .header-description-block .item, .injuries .item").click(async (ev) => {
      const li = $(ev.currentTarget);
      let itemId = li.data("itemId");
      const itemType = li.data("itemType");
      let item;
      let itemDetails;
      if (itemType === "ability") {
        item = this.item.system.abilities[itemId];
        itemDetails = {
          name: item.name,
          description: item.system.description,
        };
      } else if (itemType === "talent") {
        item = await fromUuid(this.item.system.talents[itemId].source);
        if (item) {
          itemDetails = {
            name: item.name,
            description: item.system.description,
          };
        }
      }
      if (item) {
        await this._itemDisplayDetails(item, ev, itemDetails);
      }
    });

    // Toggle attachment and mod details (not actually force powers, but we are reusing it!)
      html.find(".expand-desc").click(async (ev) => {
        ev.stopPropagation();
        if (!$(ev.target).hasClass("fa-trash") && !$(ev.target).hasClass("fas") && !$(ev.target).hasClass("rollable")) {
          CONFIG.logger.debug("Caught attachment or mod description click");
          // expand or shrink the description
          const li = $(ev.currentTarget);
          let desc = li.data("desc");
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
            desc+= newDesc;
          }

          await this._itemDisplayDesc(desc, ev);
        } else {
          if (!$(ev.target).hasClass("fa-trash")) {
            // edit the item
            CONFIG.logger.debug("Caught mod or attachment edit request");
            // pull the item which the edit is on
            const li = $(ev.currentTarget);
            const clickedId = li.data('item-id');
            const clickedType = li.data('item-type');
            const parentObject = await fromUuid(this.object.uuid);
            // locate the clicked object on the parent
            let clickedObject = parentObject.system[clickedType].find(i => i._id === clickedId);
            if (!clickedObject) {
              // this is most likely a unique mod - we have to look it up by name :|
              clickedObject = parentObject.system[clickedType].find(i => i.name === li.data('upgrade-name'));
            }
            CONFIG.logger.debug(clickedObject);
            const typeChoices = {};
            for (const key of Object.keys(CONFIG.FFG.itemmodifier_types)) {
              const entry = CONFIG.FFG.itemmodifier_types[key];
              typeChoices[entry.value] = game.i18n.localize(entry.label);
            }
            const data = {
              sourceObject: this.object,
              clickedObject: clickedObject,
              typeChoices: typeChoices,
            }
            new itemEditor(data).render(true);
          }
        }
      });

    html.find(".item-delete").click(async (ev) => {
      const li = $(ev.currentTarget);
      let itemId = li.data("itemId");
      const itemType = li.data("itemType");
      if (itemType === "ability") {
        const item = this.item.system.abilities[itemId];
        await this._deleteAbility(item, event);
      } else if (itemType === "talent") {
        const item = this.item.system.talents[itemId];
        await this._deleteTalent(item, event);
      }
    });

    if (this.object.type === "talent") {
      if (!Hooks?.events[`closeAssociatedTalent_${this.object._id}`]?.length && (typeof this._submitting === "undefined" || this._priorState <= 0)) {
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

    if (["signatureability"].includes(this.object.type)) {
      html.find(".talent-action").on("click", this._onClickTalentControl.bind(this));
      html.find(".talent-actions .fa-cog").on("click", ModifierHelpers.popoutModiferWindow.bind(this));
      html.find(".talent-modifiers .fa-cog").on("click", this._onClickUpgradeEdit.bind(this));
    }

    if (["forcepower"].includes(this.object.type)) {
      html.find(".talent-action").on("click", this._onClickTalentControl.bind(this));
      html.find(".talent-actions .fa-cog").on("click", ModifierHelpers.popoutModiferWindow.bind(this));
      html.find(".talent-modifiers .fa-cog").on("click", this._onClickUpgradeEdit.bind(this));
    }

    if (this.object.type === "specialization") {
      html.find(".talent-action").on("click", this._onClickTalentControl.bind(this));
      html.find(".talent-actions .fa-cog").on("click", ModifierHelpers.popoutModiferWindow.bind(this));
      html.find(".talent-modifiers .fa-cog").on("click", this._onClickUpgradeEdit.bind(this));
      try {
        const dragDrop = new foundry.applications.ux.DragDrop({
          dragSelector: ".item",
          dropSelector: ".specialization-talent",
          permissions: { dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this) },
          callbacks: { drop: this._onDropTalentToSpecialization.bind(this) },
        });

        dragDrop.bind($(`form.editable.item-sheet-${this.object.type}`)[0]);
      } catch (err) {
        CONFIG.logger.debug(err);
      }
    } else if (this.object.type === "career") {
      try {
        const dragDrop = new foundry.applications.ux.DragDrop({
          dragSelector: ".item",
          dropSelector: ".tab.career",
          permissions: { dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this) },
          callbacks: { drop: this._onDragItemCareer.bind(this) },
        });

        dragDrop.bind($(`form.editable.item-sheet-${this.object.type}`)[0]);
      } catch (err) {
        CONFIG.logger.debug(err);
      }
      // handle click events for specialization and signature ability on careers
      html.find(".item-delete").on("click", async (event) => {
        event.stopPropagation();
        const itemId = $(event.target).data("specialization-id");
        const itemType = $(event.target).data("item-type");
        if (itemType === "specialization") {
          const updateData = this.object.system.specializations;
          delete updateData[itemId];
          updateData[`-=${itemId}`] = null;
          this.object.update({system: {specializations: updateData}})
        } else if (itemType === "signatureability") {
          const updateData = this.object.system.signatureabilities;
          delete updateData[itemId];
          updateData[`-=${itemId}`] = null;
          this.object.update({system: {signatureabilities: updateData}})
        }
      });
      // handle click events for specialization and signature ability on careers
      html.find(".item-pill2").on("click", async (event) => {
        event.stopPropagation();
        const itemId = $(event.target).data("specialization-id");
        const itemType = $(event.target).data("item-type");
        let item = game.items.get(itemId);
        if (!item) {
          // it was removed or came from a compendium, try that instead
          if (itemType === "specialization") {
            item = await fromUuid(this.object.system.specializations[itemId].source);
          } else if (itemType === "signatureability") {
            item = await fromUuid(this.object.system.signatureabilities[itemId].source);
          }
        }
        new Item(item).sheet.render(true);
      });
    } else if (this.object.type === "species") {
      try {
        const dragDrop = new foundry.applications.ux.DragDrop({
          dragSelector: ".item",
          dropSelector: ".tab.talents",
          permissions: { dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this) },
          callbacks: { drop: this.onDropItemToSpecies.bind(this) },
        });

        dragDrop.bind($(`form.editable.item-sheet-${this.object.type}`)[0]);

        // handle click events for talents on species
        html.find(".item-delete").on("click", async (event) => {
          event.stopPropagation();
          const itemId = $(event.target).data("talent-id");
          const itemType = $(event.target).data("item-type");
          if (itemType === "talent") {
            const updateData = this.object.system.talents;
            delete updateData[itemId];
            updateData[`-=${itemId}`] = null;
            await this.object.update({system: {talents: updateData}})
          }
        });
         // handle click events for specialization and signature ability on careers
        html.find(".item-pill2").on("click", async (event) => {
          event.stopPropagation();
          const itemId = $(event.target).data("talent-id");
          const itemType = $(event.target).data("item-type");
          let item = await fromUuid(this.object.system.talents[itemId].source);
          new Item(item).sheet.render(true);
        });
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

    if (["weapon", "armour", "itemattachment", "shipweapon"].includes(this.object.type)) {
      const itemToItemAssociation = new foundry.applications.ux.DragDrop({
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
      const parent = $(li).parent()[0];
      const itemType = parent.dataset.itemName;
      const itemIndex = parent.dataset.itemIndex;

      const items = this.object.system[itemType];
      items.splice(itemIndex, 1);

      let formData = {};
      foundry.utils.setProperty(formData, `data.${itemType}`, items);

      this.object.update(formData);
    });

    html.find(".item-delete").on("click", async (event) => {
      CONFIG.logger.debug("Caught mod or attachment delete request");
      event.preventDefault();
      event.stopPropagation();

      const li = event.currentTarget;
      const parent = $(li).parent().parent()[0];
      const itemType = parent.dataset.itemType;
      const itemIndex = parent.dataset.itemIndex;

      // locate all effects from this item
      const existingEffects = this.object.getEmbeddedCollection("ActiveEffect");

      const toDeleteEffects = [];
      const removedItem = this.object.system[itemType][itemIndex];
      CONFIG.logger.debug(`caught removing of ${removedItem.name}`);
      CONFIG.logger.debug("starting effects");
      CONFIG.logger.debug(existingEffects);
      // check for attachment
      if (itemType === "itemattachment") {
        // iterate over embedded modifiers
        CONFIG.logger.debug(`inspecting removed attachment modifiers`);
        if (Object.keys(removedItem.system).includes("itemmodifier")) {
          for (const modifier of removedItem.system.itemmodifier) {
            CONFIG.logger.debug(`now on ${modifier.name}`);
            if (Object.keys(modifier.system).includes("attributes")) {
              for (const modAttrName of Object.keys(modifier.system.attributes)) {
                CONFIG.logger.debug(`located attr ${modAttrName} on ${modifier.name}`);
                const match = existingEffects.find(i => i.name === modAttrName);
                if (match) {
                  CONFIG.logger.debug(`found matching active effect: ${match.id}`);
                  toDeleteEffects.push(match.id);
                }
              }
            }
          }
        }
      }

      // iterate over direct modifiers
      if (Object.keys(removedItem.system).includes("attributes")) {
        for (const modAttrName of Object.keys(removedItem.system.attributes)) {
          CONFIG.logger.debug(`located attr ${modAttrName} on ${removedItem.name}`);
          const match = existingEffects.find(i => i.name === modAttrName);
          if (match) {
            CONFIG.logger.debug(`found matching active effect: ${match.id}`);
            toDeleteEffects.push(match.id);
          }
        }
      }

      CONFIG.logger.debug("final delete list:");
      CONFIG.logger.debug(toDeleteEffects);
      await this.object.deleteEmbeddedDocuments("ActiveEffect", toDeleteEffects);

      const items = this.object.system[itemType];
      items.splice(itemIndex, 1);

      let formData = {};
      foundry.utils.setProperty(formData, `data.${itemType}`, items);

      this.object.update(formData);
    });

    html.find(".item-pill .rank").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = $(event.currentTarget).parent()[0];
      const itemType = li.dataset.itemName;
      const itemIndex = li.dataset.itemIndex;

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
                          foundry.utils.setProperty(this.object.system[itemType][arrayItem], name, parseInt(input.val(), 10));
                        }
                      });

                      foundry.utils.setProperty(formData, `data.${itemType}`, this.object.system[itemType]);
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

      if ($(li).hasClass("adjusted")) {
        // loads modifiers added by other things, e.g. attachments
        return await EmbeddedItemHelpers.loadItemModifierSheet(this.object.id, itemType, itemIndex, this.object?.actor?.id);
      }

      if ($(li).hasClass("fa-edit")) {
        const parent = $(li).parent()[0];
        itemType = parent.dataset.itemName;
        itemIndex = parent.dataset.itemIndex;
      }

      const item = this.object.system[itemType][itemIndex];

      let temp = {
        ...item,
        flags: {
          starwarsffg: {
            ffgTempId: this.object.id,
            ffgTempItemType: itemType,
            ffgTempItemIndex: itemIndex,
            ffgIsTemp: true,
            ffgParent: this.object.flags,
            ffgParentApp: this.appId, // TODO: check if this is needed
          }
        },
        ownership: {
          default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
        },
      };
      if (this.object.isEmbedded) {
        let ownerObject = await fromUuid(this.object.uuid);

        temp = {
          ...item,
          flags: {
            starwarsffg: {
              ffgTempId: this.object.id,
              ffgTempItemType: itemType,
              ffgTempItemIndex: itemIndex,
              ffgIsTemp: true,
              ffgUuid: this.object.uuid, // TODO: check if this is needed (needed when item on actor)
              ffgIsOwned: this.object.isEmbedded, // TODO: check if this is needed (needed when item on actor)
            }
          },
          ownership: {
            default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
          }
        };
      }

      delete temp.id;
      delete temp._id;
      temp.ownership = {
        default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
      }
      let tempItem = await new Item(temp, { temporary: true });

      tempItem.sheet.render(true);
    });

    html.find(".additional .modifier-active").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = event.currentTarget;
      const parent = $(li).parent()[0];
      let itemType = parent.dataset.itemName;
      let itemIndex = parent.dataset.itemIndex;

      // "item" here is the item which the user toggled the modifier for
      const item = this.object.system[itemType][itemIndex];
      item.system.active = !item.system.active;

      if (this.object.flags.starwarsffg.ffgTempId && this.object.flags.starwarsffg.ffgTempId !== this.object._id) {
        // this is a temporary sheet for an embedded item

        item.flags = {
          starwarsffg: {
            ffgTempId: this.object.id,                // here, this represents the ID of the item this is on
            ffgTempItemType: itemType,                // modified item type
            ffgTempItemIndex: itemIndex,              // modified item index
            ffgParent: this.object.flags,             // flags from the parent
            ffgIsTemp: true,                          // this is a temporary item
          }
        };

        await EmbeddedItemHelpers.updateRealObject(item, {system: { active: item.system.active}});

      } else {
        let formData = {};
        foundry.utils.setProperty(formData, `data.${itemType}`, this.object.system[itemType]);
        this.object.update(formData);
      }

      this.object.sheet.render(true);
    });

    html.find(".additional .add-new-item").on("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const li = event.currentTarget;
      let itemType = li.dataset.acceptableType;
      let parentModType = (["weapon", "armour", "vehicle", "all"]).includes(this.object?.system?.type) ? this.object.system?.type : "all"

      let temp = {
        img: "icons/svg/mystery-man.svg",
        name: "Item Mod",
        type: itemType,
        flags: {
          starwarsffg: {
            ffgTempId: this.object.id,                  // here, this represents the ID of the item this was added to
            ffgTempItemType: itemType,                  // added item type
            ffgTempItemIndex: -1,                       // index of the added item within the parent
            ffgParent: this.object.flags.starwarsffg,   // flags from the parent
            ffgIsTemp: true,                            // this is a temporary item
            ffgUuid: this.object.uuid,                  // UUID for the parent (if available) TODO: check if this is needed
            ffgParentApp: this.appId,                   // not sure what this is x.x
            ffgIsOwned: this.object.isEmbedded,         // if this is within an actor TODO: check if this is needed
          }
        },
        system: {
          attributes: {},
          description: "",
          type: parentModType
        },
      };

      let tempItem = await new Item(temp, { temporary: true });
      CONFIG.logger.debug("Adding mod with the following data", tempItem);

      this.object.system[itemType].push(tempItem.toJSON());
      await this.object.update(
        {
          system: {
            [itemType]: this.object.system[itemType],
          }
        }
      );
      this.object.sheet.render(true);
    });
  }

  async _buyHandleClick(cost, desired_item_type) {
    const owned = this.object.flags?.starwarsffg?.ffgIsOwned;
    const type = this.object.type;
    if (type !== desired_item_type || !owned) {
      // you can't buy talents for any old item!
      // you can only buy talents for owned items!
      CONFIG.logger.warn(`Refused to buy talent for non-${desired_item_type} or unowned item`);
      throw new Error(`Refused to buy talent for non-${desired_item_type} or unowned item`);
    }
    const ownerFlag = this.object.flags?.starwarsffg?.ffgUuid;
    if (!ownerFlag) {
      // bad flag data, move along, citizen
      CONFIG.logger.warn("Refused to buy for item with no owner flag set");
      throw new Error("Refused to buy for item with no owner flag set");
    }
    const ownerId = ownerFlag.split('.')[1];
    if (!ownerId) {
      CONFIG.logger.warn("Refused to buy for item with no owner ID");
      throw new Error("Refused to buy for item with no owner ID");
    }
    const owner = game.actors.get(ownerId);
    if (!owner) {
      CONFIG.logger.warn("Refused to buy for item with no found owner actor");
      throw new Error("Refused to buy for item with no found owner actor");
    }
    const availableXPToLog = foundry.utils.deepClone(owner.system.experience.available);
    const AEState = await ActorHelpers.beginEditMode(owner, true);
    const availableXP = owner.system.experience.available;
    const totalXP = owner.system.experience.total;
    if (cost > availableXP) {
      ui.notifications.warn(game.i18n.localize("SWFFG.Actors.Sheets.Purchase.NotEnoughXP"));
      throw new Error("Not enough XP");
    }
    return {
      owner: owner,
      cost: cost,
      availableXP: availableXP,
      availableXPToLog: availableXPToLog,
      totalXP: totalXP,
      AEState: AEState,
    }
  }

  async _buyTalent(li) {
    let owner;
    let cost;
    let availableXP;
    let totalXP;
    try {
      const basic_data = await this._buyHandleClick(li, "specialization");
      owner = basic_data.owner;
      cost = basic_data.cost;
      availableXP = basic_data.availableXP;
      totalXP = basic_data.totalXP;
    } catch (e) {
      return;
    }
    const baseName = $(li).data("base-item-name");
    const talent = $(".talent-name", li).data("name");
    const dialog = new Dialog(
      {
        title: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.Talent.ConfirmTitle"),
        content: game.i18n.format("SWFFG.Actors.Sheets.Purchase.Talent.ConfirmText", {cost: cost, talent: talent}),
        buttons: {
          done: {
            icon: '<i class="fa-regular fa-circle-up"></i>',
            label: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.ConfirmPurchase"),
            callback: async (that) => {
              // update the form because the fields are read when an update is performed
              const talentId = $(li).attr("id");
              const input = $(`[name="data.talents.${talentId}.islearned"]`, this.element)[0];
              input.checked = true;
              await this.object.sheet.submit();
              owner.update({system: {experience: {available: availableXP - cost}}});
              await xpLogSpend(owner, `specialization ${baseName} talent ${talent}`, cost, availableXP - cost, totalXP);
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

  async _handleSourceControl(event) {
    event.preventDefault();
    event.stopPropagation();
    const action = $(event.currentTarget).data("action");
    const sourceIndex = $(event.currentTarget).data("index");
    if (action === "add") {
      const addSource = new Dialog({
        title: game.i18n.localize("SWFFG.Meta.Sources.AddSource.Title"),
        content: `
          <p>${game.i18n.localize("SWFFG.Meta.Sources.AddSource.Book")} :</p>
          <input type="text" id="book" name="book" value="Force and Destiny Core Rulebook">
          <p>${game.i18n.localize("SWFFG.Meta.Sources.AddSource.Page")}:</p>
          <input type="number" id="page" name="page" value="0">
        `,
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("SWFFG.Meta.Sources.AddSource.Submit"),
            callback: async (obj, event) => {
              const jObj = $(obj);
              const bookName = jObj.find("#book").val();
              const pageNum = jObj.find("#page").val();
              await this.object.update({"system.metadata.sources": [`${bookName} pg. ${pageNum}`]});
            }
          },
          cancel: {
            icon: '<i class="fas fa-x"></i>',
            label: game.i18n.localize("SWFFG.Meta.Sources.AddSource.Cancel"),
          },
        },
        default: "submit",
      });
      addSource.render(true);
    } else if (action === "remove") {
      const sources = foundry.utils.deepClone(this.item.system.metadata.sources);
      sources.splice(sourceIndex, 1);
      await this.object.update({"system.metadata.sources": sources});
    }
    this.render(true);
  }

  async _handleTagControl(event) {
    event.preventDefault();
    event.stopPropagation();
    const action = $(event.currentTarget).data("action");
    const tagIndex = $(event.currentTarget).data("index");
    if (action === "add") {
      const addTag = new Dialog({
        title: game.i18n.localize("SWFFG.Meta.Tags.AddTag.Title"),
        content: `
          <p>${game.i18n.localize("SWFFG.Meta.Tags.AddTag.Tag")} :</p>
          <input type="text" id="tag" name="tag" value="">
        `,
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("SWFFG.Meta.Tags.AddTag.Submit"),
            callback: async (obj, event) => {
              const jObj = $(obj);
              const tag = jObj.find("#tag").val();
              const updatedTags = this.item.system.metadata.tags || [];
              updatedTags.push(tag);
              await this.object.update({"system.metadata.tags": updatedTags});
            }
          },
          cancel: {
            icon: '<i class="fas fa-x"></i>',
            label: game.i18n.localize("SWFFG.Meta.Tags.AddTag.Cancel"),
          },
        },
        default: "submit",
      });
      addTag.render(true);
    } else if (action === "remove") {
      const tags = foundry.utils.deepClone(this.item.system.metadata.tags);
      tags.splice(tagIndex, 1);
      await this.object.update({"system.metadata.tags": tags});
    }
    this.render(true);
  }

  async _handleItemBuy(event) {
    event.preventDefault();
    event.stopPropagation();
    const action = $(event.target).data("buy-action");
    if (action === "forcepower-upgrade") {
      await this._buyForcePowerUpgrade(event);
    } else if (action === "signatureability-upgrade") {
      await this._buySignatureAbilityUpgrade(event);
    } else if (action === "specialization-upgrade") {
      await this._buySpecializationUpgrade(event);
    }
  }

  async _buyForcePowerUpgrade(event) {
    const element = $(event.target);
    const cost = element.data("cost");
    const baseName = element.data("base-item-name");
    const upgradeName = element.data("upgrade-name");
    const upgradeId = element.data("upgrade-id");
    let owner;
    let availableXP;
    let totalXP;
    let AEState;
    let availableXPToLog;
    const dialog = new Dialog(
      {
        title: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.FP.ConfirmTitle"),
        content: game.i18n.format("SWFFG.Actors.Sheets.Purchase.FP.ConfirmText", {cost: cost, upgrade: upgradeName}),
        buttons: {
          done: {
            icon: '<i class="fa-regular fa-circle-up"></i>',
            label: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.ConfirmPurchase"),
            callback: async (that) => {
              try {
                // this fixes the actual math bugs but the log shows incorrect values. need to fix that.
                const basic_data = await this._buyHandleClick(cost, "forcepower");
                owner = basic_data.owner;
                availableXP = basic_data.availableXP;
                totalXP = basic_data.totalXP;
                AEState = basic_data.AEState;
                availableXPToLog = basic_data.availableXPToLog;
              } catch (e) {
                return;
              }
              // update the form because the fields are read when an update is performed
              const input = $(`[name="data.upgrades.${upgradeId}.islearned"]`, this.element)[0];
              input.checked = true;
              await this.object.sheet.submit({preventClose: true});
              owner.update({system: {experience: {available: availableXP - cost}}});
              await xpLogSpend(owner, `force power ${baseName} upgrade ${upgradeName}`, cost, availableXPToLog - cost, totalXP);
              await ActorHelpers.endEditMode(owner, AEState, true);
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

  async _buySignatureAbilityUpgrade(event) {
    const element = $(event.target);
    const cost = element.data("cost");
    const baseName = element.data("base-item-name");
    const upgradeName = element.data("upgrade-name");
    const upgradeId = element.data("upgrade-id");
    let owner;
    let availableXP;
    let totalXP;
    let AEState;
    let availableXPToLog;
    const dialog = new Dialog(
      {
        title: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.SA.ConfirmTitle"),
        content: game.i18n.format("SWFFG.Actors.Sheets.Purchase.SA.ConfirmText", {cost: cost, upgrade: upgradeName}),
        buttons: {
          done: {
            icon: '<i class="fa-regular fa-circle-up"></i>',
            label: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.ConfirmPurchase"),
            callback: async (that) => {

              try {
                // this fixes the actual math bugs but the log shows incorrect values. need to fix that.
                const basic_data = await this._buyHandleClick(cost, "signatureability");
                owner = basic_data.owner;
                availableXP = basic_data.availableXP;
                totalXP = basic_data.totalXP;
                AEState = basic_data.AEState;
                availableXPToLog = basic_data.availableXPToLog;
              } catch (e) {
                return;
              }

              // update the form because the fields are read when an update is performed
              const input = $(`[name="data.upgrades.${upgradeId}.islearned"]`, this.element)[0];
              input.checked = true;
              await this.object.sheet.submit({preventClose: true});
              owner.update({system: {experience: {available: availableXP - cost}}});
              await xpLogSpend(owner, `signature ability ${baseName} upgrade ${upgradeName}`, cost, availableXPToLog - cost, totalXP);
              await ActorHelpers.endEditMode(owner, AEState, true);
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

  async _buySpecializationUpgrade(event) {
    const element = $(event.target);
    const cost = element.data("cost");
    const baseName = element.data("base-item-name");
    const upgradeName = element.data("upgrade-name");
    const upgradeId = element.data("upgrade-id");
    let owner;
    let availableXP;
    let totalXP;
    let AEState;
    let availableXPToLog;
    const dialog = new Dialog(
      {
        title: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.Specialization.ConfirmTitle"),
        content: game.i18n.format("SWFFG.Actors.Sheets.Purchase.Specialization.ConfirmText", {cost: cost, upgrade: upgradeName}),
        buttons: {
          done: {
            icon: '<i class="fa-regular fa-circle-up"></i>',
            label: game.i18n.localize("SWFFG.Actors.Sheets.Purchase.ConfirmPurchase"),
            callback: async (that) => {

              try {
                // this fixes the actual math bugs but the log shows incorrect values. need to fix that.
                const basic_data = await this._buyHandleClick(cost, "specialization");
                owner = basic_data.owner;
                availableXP = basic_data.availableXP;
                totalXP = basic_data.totalXP;
                AEState = basic_data.AEState;
                availableXPToLog = basic_data.availableXPToLog;
              } catch (e) {
                return;
              }
              owner.update({system: {experience: {available: availableXP - cost}}});
              await xpLogSpend(owner, `specialization ${baseName} upgrade ${upgradeName}`, cost, availableXPToLog - cost, totalXP);
              await ActorHelpers.endEditMode(owner, AEState, true);
              // update the form because the fields are read when an update is performed
              const input = $(`[name="data.talents.${upgradeId}.islearned"]`, this.element)[0];
              input.checked = true;
              await this.object.sheet.submit({preventClose: true});
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

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    if(this.actor && !this.actor?.verifyEditModeIsNotEnabled()) return;

    const itemUpdate = ItemHelpers.itemUpdate.bind(this);
    itemUpdate(event, formData);
  }

  /**
   * Shows the popout editor for editing an upgrade on a force power, specialization, or signature ability
   * @param event
   * @returns {Promise<void>}
   * @private
   */
  async _onClickUpgradeEdit(event) {
    if(this.actor && !this.actor?.verifyEditModeIsNotEnabled()) return;

    // pull the item which the edit is on
    const li = $(event.currentTarget);
    const clickedId = li.closest('.talent-block').attr('id');
    const modifierTypes = CONFIG.FFG.allowableModifierTypes;
    const modifierChoices = CONFIG.FFG.allowableModifierChoices;

    if (this.object.type === "forcepower") {
      const clickedType = 'upgrades';
      const parentObject = await fromUuid(this.object.uuid);
      // locate the clicked object on the parent
      let clickedObject = parentObject.system[clickedType][clickedId];
      const data = {
        sourceObject: this.object,
        clickedObject: clickedObject,
        upgradeId: clickedId,
        modifierTypes: modifierTypes,
        modifierChoices: modifierChoices,
      }
      new forcePowerEditor(data).render(true);
    } else if (this.object.type === "specialization") {
      const clickedType = 'talents';
      const parentObject = await fromUuid(this.object.uuid);
      // locate the clicked object on the parent
      let clickedObject = parentObject.system[clickedType][clickedId];
      const data = {
        sourceObject: this.object,
        clickedObject: clickedObject,
        talentId: clickedId,
        modifierTypes: modifierTypes,
        modifierChoices: modifierChoices,
      }
      new talentEditor(data).render(true);
    } else if (this.object.type === "signatureability") {
      const clickedType = 'upgrades';
      const parentObject = await fromUuid(this.object.uuid);
      // locate the clicked object on the parent
      let clickedObject = parentObject.system[clickedType][clickedId];
      const data = {
        sourceObject: this.object,
        clickedObject: clickedObject,
        upgradeId: clickedId,
        modifierTypes: modifierTypes,
        modifierChoices: modifierChoices,
      }
      new forcePowerEditor(data).render(true);
    }
  }

  /**
   * Used to allow connecting, combining, or split upgrades within a force power, specialization, and signature ability
   * @param event
   * @returns {Promise<*>}
   * @private
   */
  async _onClickTalentControl(event) {
    event.preventDefault();
    if(this.actor && !this.actor?.verifyEditModeIsNotEnabled()) return;

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
      $(".talent-uplink-connections").toggleClass("talent-disable-edit");
      await this._onSubmit(event);
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

    if (action === "img") {
      const fp = new foundry.applications.apps.FilePicker({
        type: "image",
        callback: async (path) => {
          await this.object.update({img: path});
          },
          top: this.position.top + 40,
          left: this.position.left + 10,
        });
        return fp.browse();
    }

    if (action === "uplink") {
      if ($(".talent-disable-edit").length === 0) {
        const linkid = a.dataset.key;
        const inputElement = $(`input[name='data.uplink_nodes.${linkid}']`);
        const currentValue = inputElement.val() === "true";
        inputElement.val(!currentValue);
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

    const windowHeight = parseInt($(parent).height(), 10) + 100 < 400 ? 400 : parseInt($(parent).height(), 10) + 100;
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
    // as of v10, "id" is not passed in - instead, "uuid" is. Let's use the Foundry API to get the item Document from the uuid.
    let itemObject = await fromUuid(data.uuid);

    if (!itemObject) return;

    if (itemObject.type === "talent") {
      itemObject = await ItemHelpers.uniqueAttrs(itemObject, specialization);
      // we need to remove if this is the last instance of the talent in the specialization
      const previousItemId = $(li).find(`input[name='data.talents.${talentId}.itemId']`).val();
      const isPreviousItemFromPack = $(li).find(`input[name='data.talents.${talentId}.pack']`).val() === "" ? false : true;
      if (!isPreviousItemFromPack) {
        CONFIG.logger.debug("Non-compendium pack talent update");

        const talentList = [];
        for (let talent in specialization.system.talents) {
          if (talent.itemId === itemObject.id) {
            talentList.push(talent);
          }
        }

        // check if this is the last talent of the specializtion
        if (talentList.length === 1) {
          let tree = itemObject.system.trees;

          const index = tree.findIndex((tal) => {
            return tal === specialization.id;
          });

          // remove the specialization reference from the talent
          tree.splice(index, 1);

          let formData;
          foundry.utils.setProperty(formData, `data.trees`, tree);
          itemObject.update(formData);

          //itemObject.update({ [`data.trees`]: tree });
        }
      }

      $(li).find(`input[name='data.talents.${talentId}.name']`).val(itemObject.name);
      $(li).find(`input[name='data.talents.${talentId}.activation']`).val(itemObject.system.activation.value);
      $(li).find(`input[name='data.talents.${talentId}.activationLabel']`).val(itemObject.system.activation.label);
      $(li).find(`input[name='data.talents.${talentId}.isRanked']`).val(itemObject.system.ranked);
      $(li).find(`input[name='data.talents.${talentId}.isForceTalent']`).val(itemObject.system.isForceTalent);
      $(li).find(`input[name='data.talents.${talentId}.isConflictTalent']`).val(itemObject.system.isConflictTalent);
      $(li).find(`input[name='data.talents.${talentId}.itemId']`).val(itemObject.id);
      $(li).find(`input[name='data.talents.${talentId}.pack']`).val(itemObject.pack);

      const fields = $(li).find(`input[name='data.talents.${talentId}.name']`).parent();
      Object.keys(itemObject.system.attributes).forEach((attr) => {
        const a = itemObject.system.attributes[attr];
        $(fields).append(`<input class="talent-hidden" type="text" name="data.talents.${talentId}.attributes.${attr}.key" value="${attr}" />`);
        $(fields).append(`<input class="talent-hidden" type="text" name="data.talents.${talentId}.attributes.${attr}.value" value="${a.value}" />`);
        $(fields).append(`<input class="talent-hidden" type="text" name="data.talents.${talentId}.attributes.${attr}.modtype" value="${a.modtype}" />`);
        $(fields).append(`<input class="talent-hidden" type="text" name="data.talents.${talentId}.attributes.${attr}.mod" value="${a.mod}" />`);
      });

      // check to see if the talent already has a reference to the specialization
      if (!itemObject.system.trees.includes(specialization.id)) {
        // the talent doesn't already have the reference, add it
        let tree = itemObject.system.trees;
        tree.push(specialization.id);

        if (!data.pack) {
          let formData = {};
          foundry.utils.setProperty(formData, `data.trees`, tree);
          //itemObject.update(formData);
          //itemObject.update({ [`data.trees`]: tree });
        }
      }

      const updateData = {
        system: {
          talents: {
            [talentId]: {
              // these are cloned to avoid local-only clobbers to the dropped object
              description: foundry.utils.deepClone(itemObject.system.description),
              attributes: foundry.utils.deepClone(itemObject.system.attributes),
              isRanked: itemObject.system.ranks.ranked,
              isForceTalent: itemObject.system.isForceTalent,
              isConflictTalent: itemObject.system.isConflictTalent,
            },
          },
        },
      };

      // build a list of existing active effects and attributes so we can delete them
      const existingAttrs = specialization.system.talents[talentId].attributes || {};
      const existingEffects = specialization.getEmbeddedCollection("ActiveEffect");
      const toDelete = [];
      for (const attr of Object.keys(existingAttrs)) {
        updateData.system.talents[talentId].attributes[`-=${attr}`] = null;
        const matchingEffect = existingEffects.find(ae => ae.name === attr);
        if (matchingEffect) {
          toDelete.push(matchingEffect.id);
        }
      }

      await this._onSubmit(event);
      await specialization.update(updateData);
      // actually delete any already-existing AEs on the same talent slot
      await specialization.deleteEmbeddedDocuments("ActiveEffect", toDelete);

      await this._transferActiveEffects(itemObject);

      this.render(true);
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

    // as of v10, "id" is not passed in - instead, "uuid" is. Let's use the Foundry API to get the item Document from the uuid.
    let itemObject = foundry.utils.duplicate(await fromUuid(data.uuid));

    if (!itemObject) return;

    itemObject.id = foundry.utils.randomID(); // why do we do this?!

    // for a rank-only update, we simply update the rank of an existing attr, not transfer AEs
    let rankOnlyUpdate = false;

    if ((itemObject.type === "itemattachment" || itemObject.type === "itemmodifier") && ((obj.type === "shipweapon" && itemObject.system.type === "weapon") || obj.type === itemObject.system.type || itemObject.system.type === "all" || obj.type === "itemattachment")) {
      let items = obj?.system[itemObject.type];
      if (!items) {
        items = [];
      }

      const foundItem = items.find((i) => {
        return i?.name === itemObject.name || (i?.flags?.starwarsffg?.ffgimportid?.length ? i?.flags.starwarsffg.ffgimportid === itemObject.flags.starwarsffg.ffgimportid : false);
      });

      switch (itemObject.type) {
        case "itemmodifier": {
          if (parseInt(itemObject.system.rank, 10) === 0) {
            itemObject.system.rank = 1;
          }

          if (foundItem && this.object.type !== "itemattachment") {
            rankOnlyUpdate = true;
            foundItem.system.rank = (parseInt(foundItem.system.rank) + parseInt(itemObject.system.rank)).toString();
          } else {
            items.push(itemObject);
          }
          break;
        }
        case "itemattachment": {
          if (this.object.system.hardpoints.adjusted - itemObject.system.hardpoints.value >= 0) {
            itemObject = await ItemHelpers.uniqueAttrs(itemObject, this.object);
            items.push(itemObject);
          } else {
            ui.notifications.warn(`Item does not have enough available hardpoints (${this.object.system.hardpoints.adjusted} left)`);
          }
          break;
        }
        default: {
          return;
        }
      }

      let formData = {};
      foundry.utils.setProperty(formData, `data.${itemObject.type}`, items);

      await obj.update(formData);
      // TODO: this happens even if there isn't enough HP (meaning the item gets rejected)
      if (rankOnlyUpdate) {
        await ItemHelpers.syncAEStatus(this.object, this.object.effects);
      } else {
        await this._transferActiveEffects(itemObject);
      }
    }
  }

  /**
   * Transfer active effects from one item to another when they are dragged-and-dropped
   * For example, putting a quality onto a weapon should transfer the AEs to the weapon
   * @param droppedItem - the fromUuid item dropped onto this object
   * @returns {Promise<void>}
   * @private
   */
  async _transferActiveEffects(droppedItem) {
    const droppedType = droppedItem.type;
    const myType = this.object.type;
    const toCreate = [];

    // note that abilities currently don't have a UI to add activeeffects, but we'll try to transfer them anyway
    if (
      (droppedType === "itemattachment" && ["armour", "weapon", "shipweapon"].includes(myType)) ||
      (droppedType === "itemmodifier" && ["armour", "weapon", "shipweapon", "itemattachment"].includes(myType)) ||
      (droppedType === "ability" && myType === "species") || (droppedType === "talent" && myType === "species") ||
      (droppedType === "talent" && myType === "specialization")
    ) {
      CONFIG.logger.debug(`Processing transferring AEs for drag-and-drop of ${droppedType} -> ${myType}`);
      for (const activeEffect of droppedItem.effects) {
        // it appears that Foundry will use the source data over anything else if it's present, so update the source
        //  data to match our updated information (if it exists)
        try {
          activeEffect._source.name = activeEffect.name;
        } catch {
          CONFIG.logger.debug("No source data found for AE (this is sometimes expected)");
        }
        toCreate.push(activeEffect);
      }
      CONFIG.logger.debug(toCreate);
      await this.object.createEmbeddedDocuments("ActiveEffect", toCreate);
      await ItemHelpers.syncAEStatus(this.object, toCreate);
    } else {
      CONFIG.logger.debug(`Rejected transferring AEs for drag-and-drop of ${droppedType} -> ${myType}`);
    }
  }

  /**
   * Handles dragging specializations and signature abilities to the career sheet.
   * This is used for purchasing (in order to determine which specializations are career specializations)
   * @param event
   * @returns {Promise<boolean>}
   * @private
   */
  async _onDragItemCareer(event) {
    let data;

    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }

    // as of v10, "id" is not passed in - instead, "uuid" is. Let's use the Foundry API to get the item Document from the uuid.
    const itemObject = await fromUuid(data.uuid);

    if (!itemObject) return;

    if (itemObject.type === "specialization") {
      await this.object.update({system: {specializations: {[itemObject.id]: {name: itemObject.name, source: itemObject.uuid, id: itemObject.id}}}});
    } else if (itemObject.type === "signatureability") {
      await this.object.update({system: {signatureabilities: {[itemObject.id]: {name: itemObject.name, source: itemObject.uuid, id: itemObject.id}}}});
    }
  }

  /**
   * Handles dragging talents to the species sheet.
   * @param event
   * @returns {Promise<boolean>}
   */
  async onDropItemToSpecies(event) {
    let data;

    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }

    // as of v10, "id" is not passed in - instead, "uuid" is. Let's use the Foundry API to get the item Document from the uuid.
    const itemObject = await fromUuid(data.uuid);

    if (!itemObject) return;

    if (itemObject.type === "talent") {
      await this.object.update({system: {talents: {[itemObject.id]: {name: itemObject.name, source: itemObject.uuid, id: itemObject.id}}}});
    } else if (itemObject.type === "ability") {
      await this.object.update({system: {abilities: {[itemObject.id]: {name: itemObject.name, system: {description: itemObject.system.description}}}}});
    }
    await this._transferActiveEffects(itemObject);
  }

  async _onDragItemStart(event) {}

  /**
   * Remove an talent from a species item
   * @param item - the item data for the talent to be removed
   * @param event - the event data from the onclick event
   * @returns {Promise<void>}
   * @private
   */
  async _deleteTalent(item, event) {
    event.preventDefault();
    event.stopPropagation();
    const li = $(event.currentTarget);
    const deleteId = li.data("item-id");
    delete this.item.system.talents[deleteId];
    await this.item.update({
      system: {
        talents: {
          [`-=${deleteId}`]: null
        },
      },
    });
    await this.render();
  }

  /**
   * Remove an ability from a species item
   * @param item - the item data for the ability to be removed
   * @param event - the event data from the onclick event
   * @returns {Promise<void>}
   * @private
   */
  async _deleteAbility(item, event) {
    event.preventDefault();
    event.stopPropagation();
    const li = $(event.currentTarget);
    const deleteId = li.data("item-id");
    delete this.item.system.abilities[deleteId];
    await this.item.update({
      system: {
        abilities: {
          [`-=${deleteId}`]: null
        },
      },
    });
    await this.render();
  }

   /**
   * Display details of an ability embedded in a species.
   * @private
   */
  async _itemDisplayDetails(item, event, itemDetails) {
    event.preventDefault();
    let li = $(event.currentTarget);

    // Toggle summary
    if (li.hasClass("expanded")) {
      let details = li.children(".item-details");
      details.slideUp(200, () => details.remove());
    } else {
      let div = $(`<div class="item-details">${await PopoutEditor.renderDiceImages(itemDetails.description, this.item)}</div>`);
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
   * Currently copy-pasted from _forcePowerDisplayDetails; used to render an inline description of a clicked item
   * @param desc
   * @param event
   * @returns {Promise<void>}
   * @private
   */
  async _itemDisplayDesc(desc, event) {
    event.preventDefault();
    let li = $(event.currentTarget);

    // Toggle summary
    if (li.hasClass("expanded")) {
      let details = li.children(".item-details");
      details.slideUp(200, () => details.remove());
    } else {
      let div = $(`<div class="item-details">${await foundry.applications.ux.TextEditor.enrichHTML(desc)}</div>`);
      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
  }
}
