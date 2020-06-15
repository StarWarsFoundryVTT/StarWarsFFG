import PopoutEditor from "../popout-editor.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class ItemSheetFFG extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item"],
      width: 784,
      height: 484,
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
  getData() {
    const data = super.getData();

    console.debug(`Starwars FFG - Getting Item Data`);

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
        this.position.height = 650;
        break;
      case "armour":
      case "gear":
      case "shipattachment":
        this.position.width = 385;
        this.position.height = 575;
        break;
      case "talent":
        this.position.width = 405;
        this.position.height = 475;
        break;
      case "criticalinjury":
      case "criticaldamage":
        this.position.width = 275;
        this.position.height = 550;
        break;
      case "forcepower":
        this.position.width = 715;
        this.position.height = 840;
        data.data.isReadOnly = false;
        if (!this.options.editable) {
          data.data.isEditing = false;
          data.data.isReadOnly = true;
        }
        break;
      case "specialization":
        this.position.width = 715;
        this.position.height = 980;
        data.data.isReadOnly = false;
        if (!this.options.editable) {
          data.data.isEditing = false;
          data.data.isReadOnly = true;
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

    html.find(".specialization-talent .talent-body").on("click", (event) => {
      const li = event.currentTarget;
      const parent = $(li).parents(".specialization-talent")[0];
      const itemId = parent.dataset.itemid;

      const item = game.items.get(itemId);
      item.sheet.render(true);
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add or Remove Attribute
    html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));

    if (this.object.data.type === "criticalinjury" || this.object.data.type === "criticaldamage") {
      const formatDropdown = (item) => {
        if (!item.id) {
          return item.text;
        }

        // TODO: This will need to be replaced when the dependency on special-dice-roller is removed.
        const imgUrl = "/modules/special-dice-roller/public/images/sw/purple.png";

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

    html.find(".popout-editor").on("click", this._onPopoutEditor.bind(this));
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

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {
    console.debug(`Updating ${this.object.type}`);

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
    return this.object.update(formData);
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
    const a = event.currentTarget;
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
      console.log(`${vtt} | Importing Item ${ent.name} from ${collection}`);
      delete ent.data._id;
      return ent;
    });
  }

  async _onDropTalentToSpecialization(event) {
    let data;

    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }

    // Case 1 - Import from a Compendium pack
    let itemObject;
    if (data.pack) {
      itemObject = this.importItemFromCollection(data.pack, data.id);
    }

    // Case 2 - Import from World entity
    else {
      itemObject = game.items.get(data.id);
      if (!itemObject) return;
    }

    if (itemObject.data.type === "talent") {
      const specialization = this.object;
      const li = event.currentTarget;
      const talentId = $(li).attr("id");

      // we need to remove if this is the last instance of the talent in the specialization
      const previousItemId = $(li).find(`input[name='data.talents.${talentId}.itemId']`).val();
      const isPreviousItemFromPack = $(li).find(`input[name='data.talents.${talentId}.pack']`).val() === "" ? false : true;
      if (!isPreviousItemFromPack) {
        console.debug('Starwars FFG - Non-compendium pack talent update');

        const talentList = [];
        for(let talent in specialization.data.data.talents) {
          if (talent.itemId === itemObject.id) {
            talentList.push(talent);
          }
        }

        // check if this is the last talent of the specializtion
        if(talentList.length === 1) {
          let tree = itemObject.data.data.trees;

          const index = tree.findIndex(tal => {
            return tal === specialization.id;
          });

          // remove the specialization reference fromt the talent
          tree.splice(index, 1);
          itemObject.update({ [`data.trees`] : tree });
        }
      }

      $(li).find(`input[name='data.talents.${talentId}.name']`).val(itemObject.data.name);
      $(li).find(`input[name='data.talents.${talentId}.description']`).val(itemObject.data.data.description);
      $(li).find(`input[name='data.talents.${talentId}.activation']`).val(itemObject.data.data.activation.value);
      $(li).find(`input[name='data.talents.${talentId}.activationLabel']`).val(itemObject.data.data.activation.label);
      $(li).find(`input[name='data.talents.${talentId}.isRanked']`).val(itemObject.data.data.ranks.ranked);
      $(li).find(`input[name='data.talents.${talentId}.itemId']`).val(itemObject.id);
      $(li).find(`input[name='data.talents.${talentId}.pack']`).val(data.pack);

      // check to see if the talent already has a reference to the specialization
      if(!itemObject.data.data.trees.includes(specialization.id)) {
        // the talent doesn't already have the reference, add it
        let tree = itemObject.data.data.trees;
        tree.push(specialization.id);
        itemObject.update({ [`data.trees`] : tree });
      }

      await this._onSubmit(event);
    }
  }
}
