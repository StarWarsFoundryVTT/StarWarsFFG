export default class CrewSettings extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "data-importer",
      classes: ["starwarsffg", "data-import"],
      title: `${game.i18n.localize("SWFFG.UISettingsLabel")}`,
      height: 650,
      template: "systems/starwarsffg/templates/dialogs/crew-settings.html",
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
      if (!setting.key.includes("arrayCrewRoles") || (!canConfigure && setting.scope !== "client")) continue;

      // Update setting data
      const s = duplicate(setting);
      s.name = game.i18n.localize(s.name);
      s.hint = game.i18n.localize(s.hint);
      s.value = game.settings.get(s.module, s.key);
      s.type = setting.type instanceof Function ? setting.type.name : "String";
      s.isCheckbox = setting.type === Boolean;
      s.isSelect = s.choices !== undefined;
      s.isRange = setting.type === Number && s.range;
      s.isFilePicker = setting.valueType === "FilePicker";

      // Classify setting
      const name = s.module;
      if (name === game.system.id && s.key.includes("arrayCrewRoles")) data.system.settings.push(s);
    }

    data.skills = CONFIG.FFG.skills;

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
    html.find('button[name="reset"]').click(this._onResetDefaults.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle button click to reset default settings
   * @param event {Event}   The initial button click event
   * @private
   */
  _onResetDefaults(event) {
    event.preventDefault();
    const defaults = game.settings.settings.get("starwarsffg.arrayCrewRoles").default;
    game.settings.set("starwarsffg", "arrayCrewRoles", defaults);
    this.close();
  }


  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const existing_settings = game.settings.get("starwarsffg", "arrayCrewRoles");
    let new_settings = [];
    // convert the arrays into the format expected
    for (let i = 0; i < formData['role_name'].length; i++) {
      new_settings.push({
        'role_name': formData['role_name'][i],
        'role_skill': formData['role_skill'][i],
        'use_handling': formData['use_handling'][i],
        'use_weapons': formData['use_weapons'][i],
      })
    }
    // update the settings if they don't match the old ones
    if (existing_settings !== new_settings) {
      game.settings.set("starwarsffg", "arrayCrewRoles", new_settings);
    }
  }
}
