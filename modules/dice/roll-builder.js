export default class RollBuilderFFG extends FormApplication {
  constructor(rollData, rollDicePool, rollDescription, rollSkillName, rollItem) {
    super();
    this.roll = {
      data: rollData,
      skillName: rollSkillName,
      item: rollItem,
    };
    this.dicePool = rollDicePool;
    this.description = rollDescription;
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "roll-builder",
      classes: ["starwarsffg", "roll-builder-dialog"],
      template: "systems/starwarsffg/templates/dice/roll-options-ffg.html",
    });
  }

  /** @override */
  get title() {
    return this.description || game.i18n.localize("SWFFG.RollingDefaultTitle");
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    this._initializeInputs(html);
    this._activateInputs(html);

    html.find(".btn").click((event) => {
      const roll = new game.ffg.RollFFG(this.dicePool.renderDiceExpression(), this.roll.item, this.dicePool);
      roll.toMessage({
        user: game.user._id,
        speaker: this.roll.data,
        flavor: `${game.i18n.localize("SWFFG.Rolling")} ${this.roll.skillName}...`,
      });

      return roll;
    });
  }

  _updatePreview(html) {
    const poolDiv = html.find(".dice-pool-dialog .dice-pool")[0];
    poolDiv.innerHTML = "";
    this.dicePool.renderPreview(poolDiv);
  }

  _initializeInputs(html) {
    html.find(".pool-value input").each((key, value) => {
      const name = $(value).attr("name");
      value.value = this.dicePool[name];
    });

    html.find(".pool-additional input").each((key, value) => {
      const name = $(value).attr("name");
      value.value = this.dicePool[name];
      $(value).attr("allowNegative", true);
    });

    this._updatePreview(html);
  }

  _activateInputs(html) {
    html.find(".upgrade-buttons button").on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const id = $(event.currentTarget).attr("id");

      switch (id.toLowerCase()) {
        case "upgrade-ability": {
          this.dicePool.upgrade(1);
          break;
        }
        case "downgrade-ability": {
          this.dicePool.upgrade(-1);
          break;
        }
        case "upgrade-difficulty": {
          this.dicePool.upgradeDifficulty(1);
          break;
        }
        case "downgrade-difficulty": {
          this.dicePool.upgradeDifficulty(-1);
          break;
        }
      }
      this._initializeInputs(html);
    });

    html.find(".pool-container, .pool-additional").on("click", (event) => {
      let input;

      if ($(event.currentTarget).hasClass(".pool-container")) {
        input = $(event.currentTarget).find(".pool-value input")[0];
      } else {
        input = $(event.currentTarget).find("input")[0];
      }

      input.value++;
      this.dicePool[input.name] = parseInt(input.value);
      this._updatePreview(html);
    });

    html.find(".pool-container, .pool-additional").on("contextmenu", (event) => {
      let input;

      if ($(event.currentTarget).hasClass(".pool-container")) {
        input = $(event.currentTarget).find(".pool-value input")[0];
      } else {
        input = $(event.currentTarget).find("input")[0];
      }

      const allowNegative = $(input).attr("allowNegative");

      if (input.value > 0 || allowNegative) {
        input.value--;
        this.dicePool[input.name] = parseInt(input.value);
        this._updatePreview(html);
      }
    });
  }

  _updateObject() {}
}
