export default class ItemOptions {
  constructor(data, html) {
    this.data = data;
    this.options = {};
    this.init(html);
  }

  init(html) {
      const options = $(`.starwarsffg.sheet.item[data-appid='${this.data.appId}'] .ffg-sheet-options`);
      if (options.length === 0) {
        const button = $(`<a class="ffg-sheet-options"><i class="fas fa-wrench"></i>${game.i18n.localize("SWFFG.SheetOptions")}</a>`);
        button.insertBefore(`.starwarsffg.sheet.item[data-appid='${this.data.appId}'] header a:first`);
        button.on("click", this.handler.bind(this));
      }
  }

  handler(event) {
    const title = `${game.i18n.localize("SWFFG.ItemSheet")} ${game.i18n.localize("SWFFG.Options")}: ${this.data.item.name}`;

    new Dialog(
      {
        title,
        content: {
          options: this.options,
        },
        buttons: {
          one: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize("SWFFG.ButtonAccept"),
            callback: async (html) => {
              const controls = html.find("input, select");

              let updateObject = {};

              for (let i = 0; i < controls.length; i += 1) {
                const control = controls[i];
                let value;
                if (control.dataset["dtype"] === "Boolean") {
                  value = control.checked;
                } else {
                  value = control.value;
                }

                updateObject[control.name] = value;
                this.options[control.id].value = value;
              }

              const item = await fromUuid(this.data.item.uuid);
              if (!item) {
                return ui.notifications.warn("Unable to find item");
              }
              for (const flag of Object.keys(updateObject)) {
                await item.setFlag("starwarsffg", flag, updateObject[flag]);
              }

              this.data.object.update(updateObject);
              this.data.object.sheet.render(true);
            },
          },
          two: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("SWFFG.Cancel"),
          },
        },
      },
      {
        classes: ["dialog", "starwarsffg"],
        template: "systems/starwarsffg/templates/dialogs/ffg-sheet-options.html",
      }
    ).render(true);
  }

  async register(optionName, options) {
    if (!this.options[optionName]) {
      this.options[optionName] = { ...options };
    }
    if (typeof this.data.object.flags?.starwarsffg?.config == "undefined") {
      await this.data.object.setFlag("starwarsffg", "config", {});
    }

    if (typeof this.data.object.flags?.starwarsffg?.config[optionName] !== "undefined") {
      this.options[optionName].value = this.data.object.flags?.starwarsffg?.config[optionName];
    } else {
      this.options[optionName].value = this.options[optionName].default;
    }
  }

  registerMany(optionsArray) {
    optionsArray.forEach((option) => {
      this.register(option.name, option.options);
    });
  }

  unregister(optionName) {
    delete this.options[optionName];
  }

  clear() {
    this.options = {};
  }
}
