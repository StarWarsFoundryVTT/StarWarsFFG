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
}
