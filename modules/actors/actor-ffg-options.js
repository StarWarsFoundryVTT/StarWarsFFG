import ActorHelpers from "../helpers/actor-helpers.js";

const { DialogV2 } = foundry.applications.api;

async function renderOptionsContent(options) {
  const content = document.createElement("div");
  content.innerHTML = await foundry.applications.handlebars.renderTemplate(
    "systems/starwarsffg/templates/dialogs/ffg-sheet-options.html",
    {options},
  );
  return content;
}

export default class ActorOptions {
  constructor(data) {
    this.data = data;
    this.options = {};
    this.suspended = {};
  }

  async handler() {
    const title = `${game.i18n.localize("SWFFG.CharacterSheet")} ${game.i18n.localize("SWFFG.Options")}: ${this.data.actor.name}`;
    await DialogV2.wait({
      window: {title},
      classes: ["starwarsffg"],
      content: await renderOptionsContent(this.options),
      buttons: [{
        action: "accept",
        icon: "fas fa-check",
        label: game.i18n.localize("SWFFG.ButtonAccept"),
        default: true,
        callback: async (_event, _button, dialog) => {
          const controls = $(dialog.element).find("input, select");
          const updateObject = {};

          for (const control of controls) {
            const value = control.dataset.dtype === "Boolean" ? control.checked : control.value;
            updateObject[`flags.starwarsffg.${control.name}`] = value;
            this.options[control.id].value = value;
          }

          const editMode = updateObject["flags.starwarsffg.config.enableEditMode"];
          if (editMode && Object.keys(this.suspended).length === 0) {
            this.suspended = await ActorHelpers.beginEditMode(this.data.object);
            updateObject["flags.starwarsffg.config.editModeActor"] = game.user.id;
          } else if (!editMode) {
            if (Object.keys(this.suspended).length > 0) {
              await ActorHelpers.endEditMode(this.data.object, this.suspended);
              this.suspended = {};
            }
            updateObject["flags.starwarsffg.config.editModeActor"] = "";
          }

          await this.data.object.update(updateObject);
          this.data.object.sheet.render(true);
        },
      }, {
        action: "cancel",
        icon: "fas fa-times",
        label: game.i18n.localize("SWFFG.Cancel"),
        type: "button",
      }],
    });
  }

  async register(optionName, options) {
    if (!this.options[optionName]) this.options[optionName] = {...options};
    if (typeof this.data.object.flags?.starwarsffg?.config === "undefined") {
      await this.data.object.setFlag("starwarsffg", "config", {});
    }
    this.options[optionName].value = this.data.object.flags?.starwarsffg?.config[optionName]
      ?? this.options[optionName].default;
  }

  registerMany(optionsArray) {
    optionsArray.forEach(option => this.register(option.name, option.options));
  }

  unregister(optionName) {
    delete this.options[optionName];
  }

  clear() {
    this.options = {};
  }
}
