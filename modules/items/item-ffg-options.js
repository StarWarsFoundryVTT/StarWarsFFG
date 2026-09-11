const { DialogV2 } = foundry.applications.api;

async function renderOptionsContent(options) {
  const content = document.createElement("div");
  content.innerHTML = await foundry.applications.handlebars.renderTemplate(
    "systems/starwarsffg/templates/dialogs/ffg-sheet-options.html",
    {options},
  );
  return content;
}

export default class ItemOptions {
  constructor(data) {
    this.data = data;
    this.options = {};
  }

  async handler() {
    const title = `${game.i18n.localize("SWFFG.ItemSheet")} ${game.i18n.localize("SWFFG.Options")}: ${this.data.item.name}`;
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
            updateObject[control.name] = value;
            this.options[control.id].value = value;
          }

          const item = await fromUuid(this.data.item.uuid);
          if (!item) return ui.notifications.warn("Unable to find item");
          for (const flag of Object.keys(updateObject)) {
            await item.setFlag("starwarsffg", flag, updateObject[flag]);
          }
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
