import { ItemSheetFFG } from "./item-sheet-ffg.js";

const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/** ApplicationV2 and Handlebars host for the Star Wars FFG item sheet. */
export class ItemSheetFFGV2 extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["starwarsffg", "sheet", "item", "v2"],
    editable: true,
    position: { width: 550, height: 650 },
    window: { resizable: true },
    form: {
      closeOnSubmit: false,
      submitOnChange: true,
      handler: ItemSheetFFGV2._onSubmitForm,
    },
  };

  static PARTS = {
    sheet: {
      template: "systems/starwarsffg/templates/items/ffg-gear-sheet.html",
      root: true,
      scrollable: [".sheet-body", ".tab"],
    },
  };

  constructor(options, ...args) {
    super(options, ...args);
    this._tabs = [];
  }

  get object() { return this.document; }

  get template() {
    return `systems/starwarsffg/templates/items/ffg-${this.item.type}-sheet.html`;
  }

  get isEditable() {
    return super.isEditable && !this.item.flags.readonly && this.options.editable !== false;
  }

  _getHeaderControls() {
    const controls = super._getHeaderControls();
    controls.unshift({
      action: "ffgSheetOptions",
      icon: "fas fa-wrench",
      label: game.i18n.localize("SWFFG.SheetOptions"),
      visible: this.isEditable && ["gear", "weapon", "armour"].includes(this.item.type),
      onClick: () => this.sheetoptions?.handler(),
    });
    return controls;
  }

  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    parts.sheet.template = this.template;
    return parts;
  }

  async _prepareContext(options) {
    return ItemSheetFFG.prototype.getData.call(this, options);
  }

  async getData(options={}) { return this._prepareContext(options); }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);
    ItemSheetFFG.prototype._activateFFGListeners.call(this, html);
    this._activateLegacyTabs(html);
  }

  _activateLegacyTabs(html) {
    const nav = html.find(".sheet-tabs");
    nav.find("[data-tab]").off("click.ffg-v2-tabs").on("click.ffg-v2-tabs", event => {
      event.preventDefault();
      const tab = event.currentTarget.dataset.tab;
      nav.find("[data-tab]").removeClass("active");
      $(event.currentTarget).addClass("active");
      html.find(".sheet-body > .tab[data-tab]").removeClass("active");
      html.find(`.sheet-body > .tab[data-tab="${tab}"]`).addClass("active");
    });
  }

  render(force={}, options={}) {
    if (typeof force === "boolean") return super.render({ ...options, force });
    return super.render(force ?? {});
  }

  async _onSubmit(event) {
    if (this.form?.reportValidity() === false) return;
    event?.preventDefault();
    const formData = new foundry.applications.ux.FormDataExtended(this.form);
    return this.constructor._onSubmitForm.call(this, event, this.form, formData);
  }

  static async _onSubmitForm(event, _form, formData) {
    if (!this.isEditable) return;
    return this._updateObject(event, { ...formData.object });
  }
}

const v2Lifecycle = new Set(["constructor", "activateListeners", "getData", "render", "_onSubmit"]);
for (const name of Object.getOwnPropertyNames(ItemSheetFFG.prototype)) {
  if (v2Lifecycle.has(name) || Object.hasOwn(ItemSheetFFGV2.prototype, name)) continue;
  Object.defineProperty(ItemSheetFFGV2.prototype, name, Object.getOwnPropertyDescriptor(ItemSheetFFG.prototype, name));
}
