import {
  rulesetSettings,
  uiSettings,
  combatSettings,
  actorSettings,
  xpSpendingSettings,
  localizationSettings,
  groupManagerSettings,
} from "./ui-settings.js";

export default class SettingsHelpers {
  // Initialize System Settings after the Init Hook
  static initLevelSettings() {
    // System Migration Version
    game.settings.register("genesysk2", "systemMigrationVersion", {
      name: "Current Version",
      scope: "world",
      default: null,
      config: false,
      type: String,
    });

    game.settings.registerMenu("starwarsffg", "rulesetSettings", {
      name: game.i18n.localize("SWFFG.Settings.ruleset.Name"),
      hint: game.i18n.localize("SWFFG.Settings.ruleset.Hint"),
      label: game.i18n.localize("SWFFG.Settings.ruleset.Label"),
      icon: "fa-solid fa-scroll",
      type: rulesetSettings,
      restricted: true,
    });

    game.settings.registerMenu("starwarsffg", "uiSettings", {
      name: game.i18n.localize("SWFFG.Settings.ui.Name"),
      hint: game.i18n.localize("SWFFG.Settings.ui.Hint"),
      label: game.i18n.localize("SWFFG.Settings.ui.Label"),
      icon: "fas fa-palette",
      type: uiSettings,
      restricted: true,
    });

    game.settings.registerMenu("starwarsffg", "combatSettings", {
      name: game.i18n.localize("SWFFG.Settings.combat.Name"),
      hint: game.i18n.localize("SWFFG.Settings.combat.Hint"),
      label: game.i18n.localize("SWFFG.Settings.combat.Label"),
      icon: "fa-solid fa-swords",
      type: combatSettings,
      restricted: true,
    });

    game.settings.registerMenu("starwarsffg", "actorSettings", {
      name: game.i18n.localize("SWFFG.Settings.actor.Name"),
      hint: game.i18n.localize("SWFFG.Settings.actor.Hint"),
      label: game.i18n.localize("SWFFG.Settings.actor.Label"),
      icon: "fas fa-user-alt",
      type: actorSettings,
      restricted: true,
    });

    game.settings.registerMenu("starwarsffg", "xpSpendingSettings", {
      name: game.i18n.localize("SWFFG.Settings.xpSpending.Name"),
      hint: game.i18n.localize("SWFFG.Settings.xpSpending.Hint"),
      label: game.i18n.localize("SWFFG.Settings.xpSpending.Label"),
      icon: "fa-solid fa-treasure-chest",
      type: xpSpendingSettings,
      restricted: true,
    });

    game.settings.registerMenu("starwarsffg", "localizationSettings", {
      name: game.i18n.localize("SWFFG.Settings.localization.Name"),
      hint: game.i18n.localize("SWFFG.Settings.localization.Hint"),
      label: game.i18n.localize("SWFFG.Settings.localization.Label"),
      icon: "fa-solid fa-font",
      type: localizationSettings,
      restricted: true,
    });

    game.settings.registerMenu("starwarsffg", "groupManagerSettings", {
      name: game.i18n.localize("SWFFG.Settings.groupManager.Name"),
      hint: game.i18n.localize("SWFFG.Settings.groupManager.Hint"),
      label: game.i18n.localize("SWFFG.Settings.groupManager.Label"),
      icon: "fa-solid fa-user-group",
      type: groupManagerSettings,
      restricted: true,
    });

    // Register dice theme setting
    game.settings.register("genesysk2", "dicetheme", {
      name: game.i18n.localize("SWFFG.SettingsDiceTheme"),
      hint: game.i18n.localize("SWFFG.SettingsDiceThemeHint"),
      scope: "world",
      config: false,
      default: "genesys",
      type: String,
      onChange: (rule) => {
        if (rule === "starwars") {
          game.settings.set("genesysk2", "enableForceDie", true);
        }
        return this.debouncedReload();
      },
      choices: {
        starwars: "starwars",
        genesys: "genesys",
      },
    });

    // Register vehicle range bands
    game.settings.register("genesysk2", "vehicleRangeBand", {
      name: game.i18n.localize("SWFFG.SettingsVehicleRange"),
      hint: game.i18n.localize("SWFFG.SettingsVehicleRangeHint"),
      scope: "world",
      config: false,
      default: "starwars",
      type: String,
      onChange: () => {
        return this.debouncedReload();
      },
      choices: {
        starwars: "starwars",
        genesys: "genesys",
      },
    });

    // Enable auto Soak calculation
    game.settings.register("genesysk2", "enableSoakCalc", {
      name: game.i18n.localize("SWFFG.EnableSoakCalc"),
      hint: game.i18n.localize("SWFFG.EnableSoakCalcHint"),
      scope: "world",
      config: false,
      default: true,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Enable auto Soak calculation
    game.settings.register("genesysk2", "privateTriggers", {
      name: game.i18n.localize("SWFFG.EnablePrivateTriggers"),
      hint: game.i18n.localize("SWFFG.EnablePrivateTriggersHint"),
      scope: "world",
      config: false,
      default: true,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Register grouping talents so people can let them be ordered by purchase history
    game.settings.register("genesysk2", "talentSorting", {
      name: game.i18n.localize("SWFFG.EnableSortTalentsByActivationGlobal"),
      hint: game.i18n.localize("SWFFG.EnableSortTalentsByActivationHint"),
      scope: "world",
      config: false,
      default: false,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Register skill sorting by localised value setting
    game.settings.register("genesysk2", "skillSorting", {
      name: game.i18n.localize("SWFFG.SettingsSkillSorting"),
      hint: game.i18n.localize("SWFFG.SettingsSkillSortingHint"),
      scope: "world",
      config: false,
      default: false,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Register setting for group manager Player Character List display mode
    game.settings.register("genesysk2", "pcListMode", {
      name: game.i18n.localize("SWFFG.SettingsPCListMode"),
      hint: game.i18n.localize("SWFFG.SettingsPCListModeHint"),
      scope: "world",
      config: false,
      default: "active",
      type: String,
      choices: {
        active: game.i18n.localize("SWFFG.SettingsPCListModeActive"),
        owned: game.i18n.localize("SWFFG.SettingsPCListModeOwned"),
      },
      onChange: (rule) => {
        const groupmanager = canvas?.groupmanager?.window;
        if (groupmanager) {
          groupmanager.render();
        }
      },
    });

    // Register placeholder settings to store Destiny Pool values for the group manager.
    game.settings.register("genesysk2", "dPoolLight", {
      name: "Destiny Pool Light",
      scope: "world",
      default: 0,
      config: false,
      type: Number,
      onChange: (rule) => {
        const groupmanager = canvas?.groupmanager?.window;
        if (groupmanager) {
          groupmanager.render();
        }
        let destinyLight = game.settings.get("genesysk2", "dPoolLight");
        document.getElementById("destinyLight").setAttribute("data-value", destinyLight);
        document.getElementById("destinyLight").innerHTML = destinyLight + `<span>${game.i18n.localize(game.settings.get("genesysk2", "destiny-pool-light"))}</span>`;
      },
    });
    game.settings.register("genesysk2", "dPoolDark", {
      name: "Destiny Pool Dark",
      scope: "world",
      default: 0,
      config: false,
      type: Number,
      onChange: (rule) => {
        const groupmanager = canvas?.groupmanager?.window;
        if (groupmanager) {
          groupmanager.render();
        }
        let destinyDark = game.settings.get("genesysk2", "dPoolDark");
        document.getElementById("destinyDark").setAttribute("data-value", destinyDark);
        document.getElementById("destinyDark").innerHTML = destinyDark + `<span>${game.i18n.localize(game.settings.get("genesysk2", "destiny-pool-dark"))}</span>`;
      },
    });

    // Enable debug messages in console
    game.settings.register("genesysk2", "enableDebug", {
      name: game.i18n.localize("SWFFG.EnableDebug"),
      hint: game.i18n.localize("SWFFG.EnableDebugHint"),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Register settings for UI Themes
    game.settings.register("genesysk2", "ui-uitheme", {
      module: "genesysk2",
      name: game.i18n.localize("SWFFG.SettingsUITheme"),
      hint: game.i18n.localize("SWFFG.SettingsUIThemeHint"),
      scope: "world",
      config: true,
      default: "mandar",
      type: String,
      onChange: this.debouncedReload,
      choices: {
        default: "Default (retired; expect issues)",
        mandar: "Mandar",
      },
    });

    game.settings.register("genesysk2", "ui-pausedImage", {
      module: "genesysk2",
      name: game.i18n.localize("SWFFG.SettingsPausedImage"),
      hint: game.i18n.localize("SWFFG.SettingsPausedImageHint"),
      scope: "world",
      config: false,
      default: "",
      type: String,
      valueType: "FilePicker",
      onChange: this.debouncedReload,
    });

    game.settings.register("genesysk2", "destiny-pool-light", {
      name: game.i18n.localize("SWFFG.SettingsDestinyLight"),
      hint: game.i18n.localize("SWFFG.SettingsDestinyLightHint"),
      scope: "world",
      config: false,
      default: "SWFFG.Lightside",
      type: String,
      onChange: (rule) => {
        if (rule === "") {
          game.settings.set("genesysk2", "destiny-pool-light", "SWFFG.Lightside");
        }
        return this.debouncedReload();
      },
    });

    game.settings.register("genesysk2", "destiny-pool-dark", {
      name: game.i18n.localize("SWFFG.SettingsDestinyDark"),
      hint: game.i18n.localize("SWFFG.SettingsDestinyDarkHint"),
      scope: "world",
      config: false,
      default: "SWFFG.Darkside",
      type: String,
      onChange: (rule) => {
        if (rule === "") {
          game.settings.set("genesysk2", "destiny-pool-dark", "SWFFG.Darkside");
        }
        return this.debouncedReload();
      },
    });

    game.settings.register("genesysk2", "enableForceDie", {
      name: game.i18n.localize("SWFFG.SettingsEnableForceDie"),
      hint: game.i18n.localize("SWFFG.SettingsEnableForceDieHint"),
      scope: "world",
      config: false,
      default: true,
      type: Boolean,
      onChange: (rule) => {
        if (game.settings.get("genesysk2", "dicetheme") === "starwars") {
          if (!rule) {
            game.settings.set("genesysk2", "enableForceDie", true);
          }
        }
        return this.debouncedReload();
      },
    });

     // auto-configure the default values of tokens - once
     game.settings.register("genesysk2", "token_configured", {
      scope: "world",
      config: false,
      default: false,
      type: Boolean,
    });

    // Increase compatibility with old versions (likely to make new games kinda weird as it updates items from chat data)
    game.settings.register("genesysk2", "oldWorldCompatability", {
      name: game.i18n.localize("SWFFG.OldWorld.CompatLabel"),
      hint: game.i18n.localize("SWFFG.OldWorld.CompatHint"),
      scope: "world",
      config: false,
      default: false,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // auto-configure the default values of tokens - once
    game.settings.register("genesysk2", "token_configured", {
      name: game.i18n.localize("SWFFG.Settings.actor.RivalTokenPrepend.Name"),
      hint: game.i18n.localize("SWFFG.Settings.actor.RivalTokenPrepend.Hint"),
      scope: "world",
      config: false,
      default: false,
      type: Boolean,
    });

    game.settings.register("genesysk2", "RivalTokenPrepend", {
      name: game.i18n.localize("SWFFG.Settings.actor.RivalTokenPrepend.Name"),
      hint: game.i18n.localize("SWFFG.Settings.actor.RivalTokenPrepend.Hint"),
      scope: "world",
      config: false,
      default: false,
      type: Boolean,
    });

    // Allow GM characters in Group manager
    game.settings.register("genesysk2", "GMCharactersInGroupManager", {
      name: game.i18n.localize("SWFFG.Settings.groupManager.GMCharactersInGroupManager.Name"),
      hint: game.i18n.localize("SWFFG.Settings.groupManager.GMCharactersInGroupManager.Hint"),
      scope: "world",
      config: false,
      default: false,
      type: Boolean,
    });
  }

  // Initialize System Settings after the Ready Hook
  static readyLevelSetting() {
    // Allow Users to Roll Audio
    game.settings.register("genesysk2", "allowUsersAddRollAudio", {
      name: game.i18n.localize("SWFFG.EnableRollAudio"),
      hint: game.i18n.localize("SWFFG.EnableRollAudioHint"),
      scope: "world",
      default: false,
      config: true,
      type: Boolean,
    });

    // generate a list of playlists
    const playlists = {};
    playlists["None"] = "";
    game.playlists.contents.forEach((playlist, index) => {
      playlists[playlist.id] = `${index}-${playlist.name}`;
    });

    // Playlist users can user for audio
    game.settings.register("genesysk2", "allowUsersAddRollAudioPlaylist", {
      name: game.i18n.localize("SWFFG.EnableRollAudioPlaylist"),
      hint: game.i18n.localize("SWFFG.EnableRollAudioPlaylistHint"),
      scope: "world",
      default: "None",
      config: true,
      type: String,
      choices: playlists,
    });

    // Name default healing item
    game.settings.register("genesysk2", "medItemName", {
      name: game.i18n.localize("SWFFG.MedicalItemName"),
      hint: game.i18n.localize("SWFFG.MedicalItemNameHint"),
      scope: "world",
      config: false,
      default: game.i18n.localize("SWFFG.DefaultMedicalItemName"),
      type: String,
      onChange: this.debouncedReload,
    });

    let stimpackChoices = [
        game.i18n.localize("SWFFG.MedicalItemNameUsePrompt"),
        game.i18n.localize("SWFFG.MedicalItemNameUseRest"),
        game.i18n.localize("SWFFG.MedicalItemNameUseReset"),
    ];
    game.settings.register("genesysk2", "HealingItemAction", {
      name: game.i18n.localize("SWFFG.MedicalItemSetting"),
      scope: "world",
      default: '0',
      config: false,
      type: String,
      choices: stimpackChoices,
    });
     // Enable PEP style dice compatible system
     game.settings.register("genesysk2", "enablePEP", {
      name: game.i18n.localize("K2G.PEPSystem"),
      hint: game.i18n.localize("K2G.PEPSystemHint"),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
      onChange: this.debouncedReload,
    });
  }

  static debouncedReload = foundry.utils.debounce(() => window.location.reload(), 100);
}
