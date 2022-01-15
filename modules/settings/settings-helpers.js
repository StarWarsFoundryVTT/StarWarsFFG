import DataImporter from "../importer/data-importer.js";
import SWAImporter from "../importer/swa-importer.js";
import UISettings from "./ui-settings.js";

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

    // Register dice theme setting
    game.settings.register("starwarsffg", "dicetheme", {
      name: game.i18n.localize("SWFFG.SettingsDiceTheme"),
      hint: game.i18n.localize("SWFFG.SettingsDiceThemeHint"),
      scope: "world",
      config: true,
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
      config: true,
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
      config: true,
      default: true,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Enable auto Soak calculation
    game.settings.register("starwarsffg", "privateTriggers", {
      name: game.i18n.localize("SWFFG.EnablePrivateTriggers"),
      hint: game.i18n.localize("SWFFG.EnablePrivateTriggersHint"),
      scope: "world",
      config: true,
      default: true,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Register grouping talents so people can let them be ordered by purchase history
    game.settings.register("starwarsffg", "talentSorting", {
      name: game.i18n.localize("SWFFG.EnableSortTalentsByActivationGlobal"),
      hint: game.i18n.localize("SWFFG.EnableSortTalentsByActivationHint"),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Register skill sorting by localised value setting
    game.settings.register("starwarsffg", "skillSorting", {
      name: game.i18n.localize("SWFFG.SettingsSkillSorting"),
      hint: game.i18n.localize("SWFFG.SettingsSkillSortingHint"),
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
      onChange: this.debouncedReload,
    });

    // Register setting for group manager Player Character List display mode
    game.settings.register("starwarsffg", "pcListMode", {
      name: game.i18n.localize("SWFFG.SettingsPCListMode"),
      hint: game.i18n.localize("SWFFG.SettingsPCListModeHint"),
      scope: "world",
      config: true,
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

    // OggDude Importer Control Menu
    game.settings.registerMenu("starwarsffg", "odImporter", {
      name: game.i18n.localize("SWFFG.SettingsOggDudeImporter"),
      hint: game.i18n.localize("SWFFG.SettingsOggDudeImporterHint"),
      label: game.i18n.localize("SWFFG.SettingsOggDudeImporterLabel"),
      icon: "fas fa-file-import",
      type: DataImporter,
      restricted: true,
    });
    game.settings.register("starwarsffg", "odImporter", {
      name: "Item Importer",
      scope: "world",
      default: {},
      config: false,
      type: Object,
    });

    // SWA Importer Control Menu
    game.settings.registerMenu("starwarsffg", "swaImporter", {
      name: game.i18n.localize("SWFFG.SettingsSWAdversariesImporter"),
      hint: game.i18n.localize("SWFFG.SettingsSWAdversariesImporterHint"),
      label: game.i18n.localize("SWFFG.SettingsSWAdversariesImporterLabel"),
      icon: "fas fa-file-import",
      type: SWAImporter,
      restricted: true,
    });
    game.settings.register("starwarsffg", "swaImporter", {
      name: "Adversaries Importer",
      scope: "world",
      default: {},
      config: false,
      type: Object,
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

    game.settings.registerMenu("starwarsffg", "uiSettings", {
      name: game.i18n.localize("SWFFG.UISettings"),
      hint: game.i18n.localize("SWFFG.UISettingsHint"),
      label: game.i18n.localize("SWFFG.UISettingsLabel"),
      icon: "fas fa-file-import",
      type: UISettings,
      restricted: true,
    });

    game.settings.register("starwarsffg", "uiSettings", {
      name: "UI Settings",
      scope: "world",
      default: {},
      config: false,
      type: Object,
    });

    // Register settings for UI Themes
    game.settings.register("starwarsffg", "ui-uitheme", {
      module: "starwarsffg",
      name: game.i18n.localize("SWFFG.SettingsUITheme"),
      hint: game.i18n.localize("SWFFG.SettingsUIThemeHint"),
      scope: "world",
      config: false,
      default: "default",
      type: String,
      onChange: this.debouncedReload,
      choices: {
        default: "Default",
        mandar: "Mandar",
      },
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
      config: true,
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
      config: true,
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
      config: true,
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
      config: true,
      default: false,
      type: Boolean,
      onChange: this.debouncedReload,
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
      playlists[playlist.id] = `${index}-${playlist.data.name}`;
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

    // Name default healing item
    game.settings.register("starwarsffg", "medItemName", {
      name: game.i18n.localize("SWFFG.MedicalItemName"),
      hint: game.i18n.localize("SWFFG.MedicalItemNameHint"),
      scope: "world",
      config: true,
      default: game.i18n.localize("SWFFG.DefaultMedicalItemName"),
      type: String,
      onChange: this.debouncedReload,
    });
  }

  static debouncedReload = debounce(() => window.location.reload(), 100);
}
