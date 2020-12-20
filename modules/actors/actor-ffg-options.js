export default class ActorOptions {
  constructor(data, html) {
    this.data = data;
    this.options = {};
    this.init(html);
  }

  init(html) {
    const options = $(`#actor-${this.data.object.id} .ffg-sheet-options`);
    if (options.length === 0) {
      const button = $(`<a class="ffg-sheet-options"><i class="fas fa-wrench"></i>${game.i18n.localize("SWFFG.SheetOptions")}</a>`);
      button.insertBefore(`#actor-${this.data.object.id} header a:first`);
      button.on("click", this.handler.bind(this));
    }
  }

  handler(event) {
    const title = `${game.i18n.localize("SWFFG.CharacterSheet")} ${game.i18n.localize("SWFFG.Options")}: ${this.data.actor.name}`;

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
            callback: (html) => {
              const controls = html.find("input");

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

              this.data.object.update(updateObject);
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

  register(optionName, options) {
    if (!this.options[optionName]) {
      this.options[optionName] = { ...options };
    }
    if (typeof this.data.object.data.flags.config == "undefined") {
      this.data.object.data.flags["config"] = {};
    }

    if (typeof this.data.object.data.flags.config[optionName] !== "undefined") {
      this.options[optionName].value = this.data.object.data.flags.config[optionName];
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
