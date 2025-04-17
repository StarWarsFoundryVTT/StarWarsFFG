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
    game.settings.register("starwarsffg", "systemMigrationVersion", {
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
    game.settings.register("starwarsffg", "dicetheme", {
      name: game.i18n.localize("SWFFG.SettingsDiceTheme"),
      hint: game.i18n.localize("SWFFG.SettingsDiceThemeHint"),
      scope: "world",
      config: false,
      default: "starwars",
      type: String,
      onChange: (rule) => {
        if (rule === "starwars") {
          game.settings.set("starwarsffg", "enableForceDie", true);
        }
        return this.debouncedReload();
      },
      choices: {
        starwars: "starwars",
        genesys: "genesys",
      },
    });

    // Register vehicle range bands
    game.settings.register("starwarsffg", "vehicleRangeBand", {
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
    game.settings.register("starwarsffg", "enableSoakCalc", {
      name: game.i18n.localize("SWFFG.EnableSoakCalc"),
      hint: game.i18n.localize("SWFFG.EnableSoakCalcHint"),
      scope: "world",
      config: false,
      default: true,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Enable auto Soak calculation
    game.settings.register("starwarsffg", "privateTriggers", {
      name: game.i18n.localize("SWFFG.EnablePrivateTriggers"),
      hint: game.i18n.localize("SWFFG.EnablePrivateTriggersHint"),
      scope: "world",
      config: false,
      default: true,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Register grouping talents so people can let them be ordered by purchase history
    game.settings.register("starwarsffg", "talentSorting", {
      name: game.i18n.localize("SWFFG.EnableSortTalentsByActivationGlobal"),
      hint: game.i18n.localize("SWFFG.EnableSortTalentsByActivationHint"),
      scope: "world",
      config: false,
      default: false,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Register skill sorting by localised value setting
    game.settings.register("starwarsffg", "skillSorting", {
      name: game.i18n.localize("SWFFG.SettingsSkillSorting"),
      hint: game.i18n.localize("SWFFG.SettingsSkillSortingHint"),
      scope: "world",
      config: false,
      default: false,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Register setting for group manager Player Character List display mode
    game.settings.register("starwarsffg", "pcListMode", {
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
    game.settings.register("starwarsffg", "dPoolLight", {
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
        let destinyLight = game.settings.get("starwarsffg", "dPoolLight");
        document.getElementById("destinyLight").setAttribute("data-value", destinyLight);
        document.getElementById("destinyLight").innerHTML = destinyLight + `<span>${game.i18n.localize(game.settings.get("starwarsffg", "destiny-pool-light"))}</span>`;
      },
    });
    game.settings.register("starwarsffg", "dPoolDark", {
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
        let destinyDark = game.settings.get("starwarsffg", "dPoolDark");
        document.getElementById("destinyDark").setAttribute("data-value", destinyDark);
        document.getElementById("destinyDark").innerHTML = destinyDark + `<span>${game.i18n.localize(game.settings.get("starwarsffg", "destiny-pool-dark"))}</span>`;
      },
    });

    // Enable debug messages in console
    game.settings.register("starwarsffg", "enableDebug", {
      name: game.i18n.localize("SWFFG.EnableDebug"),
      hint: game.i18n.localize("SWFFG.EnableDebugHint"),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Register settings for UI Themes
    game.settings.register("starwarsffg", "ui-uitheme", {
      module: "starwarsffg",
      name: game.i18n.localize("SWFFG.SettingsUITheme"),
      hint: game.i18n.localize("SWFFG.SettingsUIThemeHint"),
      scope: "world",
      config: false,
      default: "mandar",
      type: String,
      onChange: this.debouncedReload,
      choices: {
        default: "Default (retired; expect issues)",
        mandar: "Mandar",
      },
    });

    // Register setting for token healthy
    game.settings.register("starwarsffg", "ui-token-healthy", {
      name: game.i18n.localize("SWFFG.Settings.Tokens.Bar.Healthy.Name"),
      hint: game.i18n.localize("SWFFG.Settings.Tokens.Bar.Healthy.Hint"),
      scope: "world",
      config: false,
      default: "#63b712",
      type: String,
    });
    // Register setting for token wounded
    game.settings.register("starwarsffg", "ui-token-wounded", {
      name: game.i18n.localize("SWFFG.Settings.Tokens.Bar.Wounded.Name"),
      hint: game.i18n.localize("SWFFG.Settings.Tokens.Bar.Wounded.Hint"),
      scope: "world",
      config: false,
      default: "#c70039",
      type: String,
    });
    // Register setting for token over-wounds
    game.settings.register("starwarsffg", "ui-token-overwounded", {
      name: game.i18n.localize("SWFFG.Settings.Tokens.Bar.Overwounded.Name"),
      hint: game.i18n.localize("SWFFG.Settings.Tokens.Bar.Overwounded.Hint"),
      scope: "world",
      config: false,
      default: "#e3963e",
      type: String,
    });

    game.settings.register("starwarsffg", "ui-pausedImage", {
      module: "starwarsffg",
      name: game.i18n.localize("SWFFG.SettingsPausedImage"),
      hint: game.i18n.localize("SWFFG.SettingsPausedImageHint"),
      scope: "world",
      config: false,
      default: "",
      type: String,
      valueType: "FilePicker",
      onChange: this.debouncedReload,
    });

    game.settings.register("starwarsffg", "destiny-pool-light", {
      name: game.i18n.localize("SWFFG.SettingsDestinyLight"),
      hint: game.i18n.localize("SWFFG.SettingsDestinyLightHint"),
      scope: "world",
      config: false,
      default: "SWFFG.Lightside",
      type: String,
      onChange: (rule) => {
        if (rule === "") {
          game.settings.set("starwarsffg", "destiny-pool-light", "SWFFG.Lightside");
        }
        return this.debouncedReload();
      },
    });

    game.settings.register("starwarsffg", "destiny-pool-dark", {
      name: game.i18n.localize("SWFFG.SettingsDestinyDark"),
      hint: game.i18n.localize("SWFFG.SettingsDestinyDarkHint"),
      scope: "world",
      config: false,
      default: "SWFFG.Darkside",
      type: String,
      onChange: (rule) => {
        if (rule === "") {
          game.settings.set("starwarsffg", "destiny-pool-dark", "SWFFG.Darkside");
        }
        return this.debouncedReload();
      },
    });

    game.settings.register("starwarsffg", "enableForceDie", {
      name: game.i18n.localize("SWFFG.SettingsEnableForceDie"),
      hint: game.i18n.localize("SWFFG.SettingsEnableForceDieHint"),
      scope: "world",
      config: false,
      default: true,
      type: Boolean,
      onChange: (rule) => {
        if (game.settings.get("starwarsffg", "dicetheme") === "starwars") {
          if (!rule) {
            game.settings.set("starwarsffg", "enableForceDie", true);
          }
        }
        return this.debouncedReload();
      },
    });

    // Increase compatibility with old versions (likely to make new games kinda weird as it updates items from chat data)
    game.settings.register("starwarsffg", "oldWorldCompatability", {
      name: game.i18n.localize("SWFFG.OldWorld.CompatLabel"),
      hint: game.i18n.localize("SWFFG.OldWorld.CompatHint"),
      scope: "world",
      config: false,
      default: false,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // auto-configure the default values of tokens - once
    game.settings.register("starwarsffg", "token_configured", {
      name: game.i18n.localize("SWFFG.Settings.actor.RivalTokenPrepend.Name"),
      hint: game.i18n.localize("SWFFG.Settings.actor.RivalTokenPrepend.Hint"),
      scope: "world",
      config: false,
      default: false,
      type: Boolean,
    });

    game.settings.register("starwarsffg", "RivalTokenPrepend", {
      name: game.i18n.localize("SWFFG.Settings.actor.RivalTokenPrepend.Name"),
      hint: game.i18n.localize("SWFFG.Settings.actor.RivalTokenPrepend.Hint"),
      scope: "world",
      config: false,
      default: false,
      type: Boolean,
    });

    // Allow GM characters in Group manager
    game.settings.register("starwarsffg", "GMCharactersInGroupManager", {
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
    game.settings.register("starwarsffg", "allowUsersAddRollAudio", {
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
    game.settings.register("starwarsffg", "allowUsersAddRollAudioPlaylist", {
      name: game.i18n.localize("SWFFG.EnableRollAudioPlaylist"),
      hint: game.i18n.localize("SWFFG.EnableRollAudioPlaylistHint"),
      scope: "world",
      default: "None",
      config: true,
      type: String,
      choices: playlists,
    });

    // Automatically apply "remove setback" modifiers when rolling
    game.settings.register("starwarsffg", "ApplyRemoveSetbackMods", {
      name: game.i18n.localize(
        "SWFFG.Settings.dice.ApplyRemoveSetbackMods.Name"
      ),
      hint: game.i18n.localize(
        "SWFFG.Settings.dice.ApplyRemoveSetbackMods.Hint"
      ),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
    });

    // Name default healing item
    game.settings.register("starwarsffg", "medItemName", {
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
    game.settings.register("starwarsffg", "HealingItemAction", {
      name: game.i18n.localize("SWFFG.MedicalItemSetting"),
      scope: "world",
      default: "0",
      config: false,
      type: String,
      choices: stimpackChoices,
    });
  }

  static debouncedReload = foundry.utils.debounce(() => window.location.reload(), 100);
}
