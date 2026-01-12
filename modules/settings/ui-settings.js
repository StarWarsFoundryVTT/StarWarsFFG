class ffgSettings extends FormApplication {
  activateListeners(html) {
    super.activateListeners(html);
    html.find("button.filepicker").click(this._onFilePicker.bind(this));
  }

  getData(acceptableSettings) {
    const canConfigure = game.user.can("SETTINGS_MODIFY");
    let includeSettings = [];
    for (const setting of game.settings.settings) {
      if (acceptableSettings.includes(setting[0])) {
        const s = foundry.utils.duplicate(setting[1]);
        s.name = game.i18n.localize(s.name);
        s.hint = game.i18n.localize(s.hint);
        s.value = game.settings.get(s.namespace, s.key);
        s.type = setting.type instanceof Function ? setting.type.name : "String";
        s.isCheckbox = setting[1].type === Boolean;
        s.isSelect = s.choices !== undefined;
        s.isRange = setting[1].type === Number && s.range;
        s.isFilePicker = setting.valueType === "FilePicker";
        includeSettings.push(s);
      }
    }

    const data = {
      system: {title: game.system.title, menus: [], settings: includeSettings},
    };

    // Return data
    return {
      user: game.user,
      canConfigure: canConfigure,
      systemTitle: game.system.title,
      data: data,
    };
  }

  _onFilePicker(event) {
    event.preventDefault();

    const fp = new foundry.applications.apps.FilePicker({
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

    /** @override */
  async _updateObject(event, formData) {
    for (let [k, v] of Object.entries(foundry.utils.flattenObject(formData))) {
      let s = game.settings.settings.get(k);
      let current = game.settings.get(s.namespace, s.key);
      if (v !== current) {
        await game.settings.set(s.namespace, s.key, v);
      }
    }
  }
}

export class rulesetSettings extends ffgSettings {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ruleset-settings",
      classes: ["starwarsffg", "ruleset-settings"],
      title: `${game.i18n.localize("SWFFG.Settings.ruleset.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(options) {
    const includeSettingsNames = [
        "starwarsffg.dicetheme",
        "starwarsffg.vehicleRangeBand",
        "starwarsffg.skilltheme",
        "starwarsffg.enableForceDie",
    ];
    return super.getData(includeSettingsNames);
  }
}

export class uiSettings extends ffgSettings {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ui-settings",
      classes: ["starwarsffg", "ui-settings"],
      title: `${game.i18n.localize("SWFFG.Settings.ui.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(options) {
    const includeSettingsNames = [
      "starwarsffg.ui-uitheme",
      "starwarsffg.ui-pausedImage",
      "starwarsffg.ui-token-healthy",
      "starwarsffg.ui-token-wounded",
      "starwarsffg.ui-token-overwounded",
      "starwarsffg.ui-token-stamina-ok",
      "starwarsffg.ui-token-stamina-damaged",
      "starwarsffg.ui-token-stamina-over",
      "starwarsffg.displaySimulation",
      "starwarsffg.rollSimulation",
    ];
    return super.getData(includeSettingsNames);
  }
}

export class combatSettings extends ffgSettings {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "combat-settings",
      classes: ["starwarsffg", "combat-settings"],
      title: `${game.i18n.localize("SWFFG.Settings.combat.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(options) {
    const includeSettingsNames = [
      "starwarsffg.useGenericSlots",
      "starwarsffg.initiativeRule",
      "starwarsffg.removeCombatantAction",
      "starwarsffg.useDefense",
      "starwarsffg.additionalStatuses",
    ];
    return super.getData(includeSettingsNames);
  }
}

export class actorSettings extends ffgSettings {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "actor-settings",
      classes: ["starwarsffg", "actor-settings"],
      title: `${game.i18n.localize("SWFFG.Settings.actor.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(options) {
    const includeSettingsNames = [
      "starwarsffg.enableSoakCalc",
      "starwarsffg.talentSorting",
      "starwarsffg.showMinionCount",
      "starwarsffg.showAdversaryCount",
      "starwarsffg.adversaryItemName",
      "starwarsffg.maxAttribute",
      "starwarsffg.maxSkill",
      "starwarsffg.medItemName",
      "starwarsffg.HealingItemAction",
      "starwarsffg.RivalTokenPrepend",
    ];
    return super.getData(includeSettingsNames);
  }
}

export class xpSpendingSettings extends ffgSettings {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "xpSpending",
      classes: ["starwarsffg", "xpSpending"],
      title: `${game.i18n.localize("SWFFG.Settings.xpSpending.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(options) {
    const includeSettingsNames = [
      "starwarsffg.specializationCompendiums",
      "starwarsffg.signatureAbilityCompendiums",
      "starwarsffg.forcePowerCompendiums",
      "starwarsffg.talentCompendiums",
      "starwarsffg.backgroundCompendiums",
      "starwarsffg.obligationCompendiums",
      "starwarsffg.speciesCompendiums",
      "starwarsffg.careerCompendiums",
      "starwarsffg.motivationCompendiums",
      "starwarsffg.itemCompendiums",
      "starwarsffg.notifyOnXpSpend",
    ];
    return super.getData(includeSettingsNames);
  }
}

export class localizationSettings extends ffgSettings {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "localization",
      classes: ["starwarsffg", "localization"],
      title: `${game.i18n.localize("SWFFG.Settings.localization.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(options) {
    const includeSettingsNames = [
      "starwarsffg.skillSorting",
      "starwarsffg.destiny-pool-light",
      "starwarsffg.destiny-pool-dark",
    ];
    return super.getData(includeSettingsNames);
  }
}

export class groupManagerSettings extends ffgSettings {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "group-manager",
      classes: ["starwarsffg", "group-manager"],
      title: `${game.i18n.localize("SWFFG.Settings.groupManager.Title")}`,
      template: "systems/starwarsffg/templates/dialogs/ffg-ui-settings.html",
    });
  }

  getData(options) {
    const includeSettingsNames = [
      "starwarsffg.pcListMode",
      "starwarsffg.privateTriggers",
      "starwarsffg.GMCharactersInGroupManager"
    ];
    return super.getData(includeSettingsNames);
  }
}
