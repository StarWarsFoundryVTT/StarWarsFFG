export default class UISettings extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "data-importer",
      classes: ["genesysk2", "data-import"],
      title: `${game.i18n.localize("SWFFG.UISettingsLabel")}`,
      template: "systems/genesysk2/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(options) {
    const gs = game.settings;
    const canConfigure = game.user.can("SETTINGS_MODIFY");

    const data = {
      system: { title: game.system.title, menus: [], settings: [] },
    };

    // Classify all settings
    for (let setting of gs.settings.values()) {
      // Exclude settings the user cannot change
      if (!setting.key.includes("ui-") || (!canConfigure && setting.scope !== "client")) continue;

      // Update setting data
      const s = duplicate(setting);
      s.name = game.i18n.localize(s.name);
      s.hint = game.i18n.localize(s.hint);
      s.value = game.settings.get(s.namespace, s.key);
      s.type = setting.type instanceof Function ? setting.type.name : "String";
      s.isCheckbox = setting.type === Boolean;
      s.isSelect = s.choices !== undefined;
      s.isRange = setting.type === Number && s.range;
      s.isFilePicker = setting.valueType === "FilePicker";

      // Classify setting
      if (s.namespace === game.system.id && s.key.includes("ui-")) data.system.settings.push(s);
    }

    // Return data
    return {
      user: game.user,
      canConfigure: canConfigure,
      systemTitle: game.system.title,
      data: data,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".submenu button").click(this._onClickSubmenu.bind(this));
    html.find('button[name="reset"]').click(this._onResetDefaults.bind(this));
    html.find("button.filepicker").click(this._onFilePicker.bind(this));
  }

  /**
   * Handle activating the button to configure User Role permissions
   * @param event {Event}   The initial button click event
   * @private
   */
  _onClickSubmenu(event) {
    event.preventDefault();
    const menu = game.settings.menus.get(event.currentTarget.dataset.key);
    if (!menu) return ui.notifications.error("No submenu found for the provided key");
    const app = new menu.type();
    return app.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle button click to reset default settings
   * @param event {Event}   The initial button click event
   * @private
   */
  _onResetDefaults(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const form = button.form;
    for (let [k, v] of game.settings.settings.entries()) {
      if (v.config) {
        let input = form[k];
        if (input.type === "checkbox") input.checked = v.default;
        else if (input) input.value = v.default;
      }
    }
  }

  /* -------------------------------------------- */

  _onFilePicker(event) {
    event.preventDefault();

    const fp = new FilePicker({
      type: "image",
      callback: (path) => {
        $(event.currentTarget).prev().val(path);
        //this._onSubmit(event);
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    for (let [k, v] of Object.entries(flattenObject(formData))) {
      let s = game.settings.settings.get(k);
      let current = game.settings.get(s.namespace, s.key);
      if (v !== current) {
        await game.settings.set(s.namespace, s.key, v);
      }
    }
  }
}
