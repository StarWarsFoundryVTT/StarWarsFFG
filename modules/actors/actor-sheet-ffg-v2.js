import { ActorSheetFFG } from "./actor-sheet-ffg.js";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

/** ApplicationV2 and Handlebars host for the Star Wars FFG actor sheet. */
export class ActorSheetFFGV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["starwarsffg", "sheet", "actor", "v2", "themed", "theme-light"],
    editable: true,
    position: { width: 710, height: 650 },
    window: { resizable: true },
    form: {
      closeOnSubmit: false,
      submitOnChange: true,
      handler: ActorSheetFFGV2._onSubmitForm,
    },
  };

  static PARTS = {
    sheet: {
      template: "systems/starwarsffg/templates/actors/ffg-character-sheet.html",
      root: true,
      scrollable: [".sheet-body", ".tab"],
    },
  };

  constructor(options, ...args) {
    // Comfortable default dimensions, capped to fit smaller viewports.
    const width = Math.min(1000, Math.floor(window.innerWidth * 0.9));
    const height = Math.min(1150, Math.floor(window.innerHeight * 0.9));
    super({
      ...options,
      position: { width, height, ...options?.position },
    }, ...args);
    // The legacy context builder reads these values on every render.
    this.sheetWidth = this.position.width;
    this.sheetHeight = this.position.height;
    this._filters = { skills: new Set() };
    this._sheetTab = "characteristics";
    this._tabs = [];
    this.pools = new Map();
  }

  // V2 supplies an Item document; the FFG handler still consumes drag data.
  async _onDropItem(event, item) {
    if (!this.isEditable || !this.actor.isOwner) return false;
    const data = item?.documentName === "Item" ? item.toDragData() : item;
    return ActorSheetFFG.prototype._onDropItem.call(this, event, data);
  }

  async _onDropItemCreate(data) {
    if (!this.isEditable || !this.actor.isOwner) return [];
    return this.actor.createEmbeddedDocuments("Item", Array.isArray(data) ? data : [data]);
  }

  get object() { return this.document; }

  _onPosition(position) {
    super._onPosition(position);
    if (this.minimized) return;
    this.sheetWidth = position.width;
    this.sheetHeight = position.height;
  }

  get title() {
    if (!this.actor.isToken) return this.actor.name;
    return `[${game.i18n.localize("DOCUMENT.Token")}] ${this.actor.name}`;
  }

  _getHeaderControls() {
    const controls = super._getHeaderControls();
    controls.unshift({
      action: "ffgSheetOptions",
      icon: "fas fa-wrench",
      label: game.i18n.localize("SWFFG.SheetOptions"),
      visible: this.isEditable,
      onClick: () => this.sheetoptions?.handler(),
    });
    return controls;
  }

  get template() {
    return `systems/starwarsffg/templates/actors/ffg-${this.actor.type}-sheet.html`;
  }

  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    parts.sheet.template = this.template;
    return parts;
  }

  async _prepareContext(options) {
    return ActorSheetFFG.prototype.getData.call(this, options);
  }

  async getData(options={}) { return this._prepareContext(options); }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const actorClasses = ["character", "nemesis", "rival", "minion", "vehicle", "homestead", "editable", "locked"];
    this.element.classList.remove(...actorClasses);
    this.element.classList.add(this.actor.type, this.isEditable ? "editable" : "locked");
    // Legacy styles expect the actor type on the content inside the sheet host.
    const content = this.element.querySelector(".window-content");
    content.classList.remove(...actorClasses);
    content.classList.add(this.actor.type);
    this._activateLegacyListeners($(this.element));
  }

  _activateLegacyListeners(html) {
    return ActorSheetFFG.prototype._activateFFGListeners.call(this, html);
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
    const updateData = { ...formData.object };
    const overrides = foundry.utils.flattenObject(this.actor.overrides);
    for (const key of Object.keys(overrides)) delete updateData[key];
    return this._updateObject(event, updateData);
  }
}

const v2Lifecycle = new Set(["constructor", "activateListeners", "getData", "render", "_onSubmit"]);
for (const name of Object.getOwnPropertyNames(ActorSheetFFG.prototype)) {
  if (v2Lifecycle.has(name) || Object.hasOwn(ActorSheetFFGV2.prototype, name)) continue;
  Object.defineProperty(ActorSheetFFGV2.prototype, name, Object.getOwnPropertyDescriptor(ActorSheetFFG.prototype, name));
}
