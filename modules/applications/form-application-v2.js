const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * ApplicationV2 base for the system's former FormApplication tools.
 *
 * It preserves the small V1 surface those tools use while delegating window,
 * Handlebars, form, and detach behavior to Foundry's supported v14 APIs.
 */
export class FormApplicationV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["starwarsffg"],
    tag: "form",
    editable: true,
    position: { width: "auto", height: "auto" },
    window: { resizable: false },
    form: {
      closeOnSubmit: false,
      submitOnChange: false,
      handler: FormApplicationV2._onSubmitForm,
    },
  };

  static PARTS = {
    form: { template: "", root: true },
  };

  static get defaultOptions() {
    return {
      classes: ["starwarsffg"],
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false,
      editable: true,
      popOut: true,
      resizable: false,
      width: "auto",
      height: "auto",
    };
  }

  constructor(object={}, options={}) {
    const legacy = foundry.utils.mergeObject(new.target.defaultOptions, options ?? {}, { inplace: false });
    const position = { ...(legacy.position ?? {}) };
    for (const key of ["width", "height", "top", "left", "scale", "zIndex"]) {
      if (legacy[key] !== undefined) position[key] = legacy[key];
    }
    const converted = {
      ...legacy,
      // Apply after legacy options because subclasses replace the classes array.
      classes: [...new Set([...(legacy.classes ?? []).filter(c => c !== "theme-dark"), "themed", "theme-light"])],
      tag: "form",
      position,
      window: {
        ...(legacy.window ?? {}),
        title: legacy.title ?? legacy.window?.title ?? "",
        resizable: legacy.resizable ?? legacy.window?.resizable ?? false,
      },
      form: {
        ...(legacy.form ?? {}),
        closeOnSubmit: legacy.closeOnSubmit ?? false,
        submitOnChange: legacy.submitOnChange ?? false,
        handler: new.target._onSubmitForm,
      },
    };
    super(converted);
    this.object = object;
    this._legacyOptions = legacy;
    this._tabs = [];
  }

  get appId() {
    return this.id;
  }

  get isEditable() {
    return this.options.editable !== false;
  }

  get template() {
    return this.options.template;
  }

  get title() {
    return this._dynamicTitle ?? super.title;
  }

  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    parts.form.template = this.template;
    return parts;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return Object.assign(context, await this.getData(options));
  }

  getData() {
    return { object: this.object };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);
    this.activateListeners(html);
    this._activateLegacyTabs(html);
  }

  activateListeners(_html) {}

  _activateLegacyTabs(html) {
    for (const tabConfig of this.options.tabs ?? []) {
      const nav = html.find(tabConfig.navSelector);
      nav.find("[data-tab]").off("click.ffg-v2-tabs").on("click.ffg-v2-tabs", event => {
        event.preventDefault();
        const tab = event.currentTarget.dataset.tab;
        nav.find("[data-tab]").removeClass("active");
        $(event.currentTarget).addClass("active");
        html.find(`${tabConfig.contentSelector} > .tab[data-tab]`).removeClass("active");
        html.find(`${tabConfig.contentSelector} > .tab[data-tab="${tab}"]`).addClass("active");
      });
    }
  }

  _getSubmitData(updateData={}) {
    if (!this.form) return { ...updateData };
    return { ...new foundry.applications.ux.FormDataExtended(this.form).object, ...updateData };
  }

  async _onSubmit(event, { preventClose=false }={}) {
    event?.preventDefault();
    if (this.form?.reportValidity() === false) return;
    const result = await this._updateObject(event, this._getSubmitData());
    if (this.options.form.closeOnSubmit && !preventClose) await this.close();
    return result;
  }

  static async _onSubmitForm(event, _form, formData) {
    if (!this.isEditable) return;
    return this._updateObject(event, { ...formData.object });
  }

  async _updateObject(_event, _formData) {}

  render(force={}, options={}) {
    if (typeof force === "boolean") return super.render({ ...options, force });
    return super.render(force ?? {});
  }

  async close(options={}) {
    if (this._legacyOptions.submitOnClose && this.form && !this._submittingOnClose) {
      this._submittingOnClose = true;
      try {
        await this._updateObject(null, this._getSubmitData());
      } finally {
        this._submittingOnClose = false;
      }
    }
    return super.close(options);
  }
}
