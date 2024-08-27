/**
 * Dice pool utility specializing in the FFG special dice
 */
export class DicePoolFFG {
  constructor(obj) {
    if (obj === undefined) {
      obj = {};
    }
    if (typeof obj === "string") {
      obj = JSON.parse(obj);
    }
    this.proficiency = obj.proficiency || 0;
    this.ability = obj.ability || 0;
    this.challenge = obj.challenge || 0;
    this.difficulty = obj.difficulty || 0;
    this.boost = obj.boost || 0;
    this.setback = obj.setback || 0;
    this.remsetback = obj.remsetback || 0;
    this.force = obj.force || 0;

    this.advantage = obj.advantage || 0;
    this.success = obj.success || 0;
    this.threat = obj.threat || 0;
    this.failure = obj.failure || 0;
    this.light = obj.light || 0;
    this.dark = obj.dark || 0;
    this.triumph = obj.triumph || 0;
    this.despair = obj.despair || 0;

    this.upgrades = obj.upgrades || 0;

    this.source = {};

    if (obj?.source?.skill?.length) {
      this.source.skill = obj.source.skill
        .filter((item) => parseInt(item.value, 10) > 0)
        .map((rank) => {
          if (rank.name === "purchased") {
            return `Purchased: ${rank.value} rank(s)`;
          }
          if (rank.modtype === "Skill Rank") {
            return `${rank.name} (${rank.type}): ${rank.value} rank(s)`;
          }
          return `${modtype} from ${rank.name} (${rank.type}): ${rank.value}`;
        });
    }
    if (obj?.source?.boost?.length) {
      this.source.boost = obj.source.boost
        .filter((item) => parseInt(item.value, 10) > 0)
        .map((rank) => {
          if (rank.modtype === "Skill Boost") {
            return `${rank.name} (${rank.type}): +${rank.value} boost dice`;
          }
          return `${modtype} from ${rank.name} (${rank.type}): +${rank.value} boost dice`;
        });
    }
    if (obj?.source?.remsetback?.length) {
      this.source.remsetback = obj.source.remsetback
        .filter((item) => parseInt(item.value, 10) > 0)
        .map((rank) => {
          if (rank.modtype === "Skill Remove Setback") {
            return `${rank.name} (${rank.type}): -${rank.value} setback dice`;
          }
          return `${modtype} from ${rank.name} (${rank.type}): -${rank.value} setback dice`;
        });
    }
    if (obj?.source?.setback?.length) {
      this.source.setback = obj.source.setback
        .filter((item) => parseInt(item.value, 10) > 0)
        .map((rank) => {
          if (rank.modtype === "Skill Setback") {
            return `${rank.name} (${rank.type}): +${rank.value} setback dice`;
          }
          return `${modtype} from ${rank.name} (${rank.type}): +${rank.value} setback dice`;
        });
    }
    if (obj?.source?.upgrades?.length) {
      this.source.upgrades = obj.source.upgrades
        .filter((item) => parseInt(item.value, 10) > 0)
        .map((rank) => {
          if (rank.modtype === "Skill Add Upgrade") {
            return `${rank.name} (${rank.type}): ${rank.value} upgrade(s)`;
          }
          return `${modtype} from ${rank.name} (${rank.type}): ${rank.value}`;
        });
    }
    if (obj?.source?.success?.length) {
      this.source.success = obj.source.success
        .filter((item) => parseInt(item.value, 10) > 0)
        .map((rank) => {
          if (rank.modtype === "Skill Add Success") {
            return `${rank.name} (${rank.type}): ${rank.value} Success`;
          }
          return `${modtype} from ${rank.name} (${rank.type}): ${rank.value}`;
        });
    }
    if (obj?.source?.advantage?.length) {
      this.source.advantage = obj.source.advantage
        .filter((item) => parseInt(item.value, 10) > 0)
        .map((rank) => {
          if (rank.modtype === "Skill Add Advantage") {
            return `${rank.name} (${rank.type}): ${rank.value} Advantage`;
          }
          return `${modtype} from ${rank.name} (${rank.type}): ${rank.value}`;
        });
    }
    if (obj?.source?.light?.length) {
      this.source.light = obj.source.light
        .filter((item) => parseInt(item.value, 10) > 0)
        .map((rank) => {
          if (rank.modtype === "Skill Add Light") {
            return `${rank.name} (${rank.type}): ${rank.value} Light`;
          }
          return `${modtype} from ${rank.name} (${rank.type}): ${rank.value}`;
        });
    }
    if (obj?.source?.failure?.length) {
      this.source.failure = obj.source.failure
        .filter((item) => parseInt(item.value, 10) > 0)
        .map((rank) => {
          if (rank.modtype === "Skill Add Failure") {
            return `${rank.name} (${rank.type}): ${rank.value} Failure`;
          }
          return `${modtype} from ${rank.name} (${rank.type}): ${rank.value}`;
        });
    }
    if (obj?.source?.threat?.length) {
      this.source.threat = obj.source.threat
        .filter((item) => parseInt(item.value, 10) > 0)
        .map((rank) => {
          if (rank.modtype === "Skill Add Threat") {
            return `${rank.name} (${rank.type}): ${rank.value} Threat`;
          }
          return `${modtype} from ${rank.name} (${rank.type}): ${rank.value}`;
        });
    }
    if (obj?.source?.dark?.length) {
      this.source.dark = obj.source.dark
        .filter((item) => parseInt(item.value, 10) > 0)
        .map((rank) => {
          if (rank.modtype === "Skill Add Dark") {
            return `${rank.name} (${rank.type}): ${rank.value} Dark`;
          }
          return `${modtype} from ${rank.name} (${rank.type}): ${rank.value}`;
        });
    }
  }

  /**
   * Upgrade the dice pool, converting any remaining ability dice into proficiency
   * dice or adding an ability die if none remain.
   * @param times the number of times to perform this operation, defaults to 1
   */
  upgrade(times) {
    if (times === undefined) {
      times = 1;
    }

    let downgrade = false;
    if (times < 0) {
      downgrade = true;
      times = Math.abs(times);
    }

    for (let i = 0; i < times; i++) {
      if (downgrade) {
        if (this.proficiency > 0) {
          this.proficiency--;
          this.ability++;
        }
      } else {
        if (this.ability > 0) {
          this.ability--;
          this.proficiency++;
        } else {
          this.ability++;
        }
      }
    }
  }
  /**
   * Upgrade the dice pool's difficulty, converting any remaining difficulty dice
   * into challenge dice or adding an difficulty die if none remain.
   * @param times the number of times to perform this operation, defaults to 1
   */
  upgradeDifficulty(times) {
    if (times === undefined) {
      times = 1;
    }
    let downgrade = false;
    if (times < 0) {
      downgrade = true;
      times = Math.abs(times);
    }

    for (let i = 0; i < times; i++) {
      if (downgrade) {
        if (this.challenge > 0) {
          this.challenge--;
          this.difficulty++;
        }
      } else {
        if (this.difficulty > 0) {
          this.difficulty--;
          this.challenge++;
        } else {
          this.difficulty++;
        }
      }
    }
  }

  /**
   * Transform the dice pool into a rollable expression
   * @returns {string} a dice expression that can be used to roll the dice pool
   */
  renderDiceExpression() { // modif de f vers m pour force
    let dicePool = [this.proficiency + "dp", this.ability + "da", this.challenge + "dc", this.difficulty + "di", this.boost + "db", this.setback + "ds", this.force + "dm"];
    let finalPool = dicePool.filter((d) => {
      const test = d.split(/([0-9]+)/);
      return test[1] > 0;
    });
    return finalPool.join("+");
  }

  /**
   * Create a preview of the dice pool using images
   * @param container {HTMLElement} where to place the preview. A container will be generated if this is undefined
   * @returns {HTMLElement}
   */
  renderPreview(container) {
    if (container === undefined) {
      container = document.createElement("div");
      container.classList.add("dice-pool");
    }

    const totalDice = +this.proficiency + +this.ability + +this.challenge + +this.difficulty + +this.boost + +this.setback + +this.force;

    let height = 36;
    let width = 36;
    if (totalDice > 8) {
      height = 24;
      width = 24;
    }
    if (totalDice > 24) {
      height = 12;
      width = 12;
    }

    this._addIcons(container, CONFIG.FFG.PROFICIENCY_ICON, this.proficiency, height, width);
    this._addIcons(container, CONFIG.FFG.ABILITY_ICON, this.ability, height, width);
    this._addIcons(container, CONFIG.FFG.CHALLENGE_ICON, this.challenge, height, width);
    this._addIcons(container, CONFIG.FFG.DIFFICULTY_ICON, this.difficulty, height, width);
    this._addIcons(container, CONFIG.FFG.BOOST_ICON, this.boost, height, width);
    this._addIcons(container, CONFIG.FFG.SETBACK_ICON, this.setback, height, width);
    this._addIcons(container, CONFIG.FFG.REMOVESETBACK_ICON, this.remsetback, height, width);
    this._addIcons(container, CONFIG.FFG.FORCE_ICON, this.force, height, width);
    this._addIcons(container, CONFIG.FFG.SUCCESS_ICON, this.success, height, width);
    this._addIcons(container, CONFIG.FFG.ADVANTAGE_ICON, this.advantage, height, width);
    this._addIcons(container, CONFIG.FFG.TRIUMPH_ICON, this.triumph, height, width);
    this._addIcons(container, CONFIG.FFG.LIGHT_ICON, this.light, height, width);
    this._addIcons(container, CONFIG.FFG.FAILURE_ICON, this.failure, height, width);
    this._addIcons(container, CONFIG.FFG.THREAT_ICON, this.threat, height, width);
    this._addIcons(container, CONFIG.FFG.DESPAIR_ICON, this.despair, height, width);
    this._addIcons(container, CONFIG.FFG.DARK_ICON, this.dark, height, width);

    this._addSourceToolTip(container);

    return container;
  }

  renderAdvancedPreview(container) {
    let advanceContainer = this.renderPreview(container);

    let additionalSymbols = [];
    ["advantage", "success", "threat", "failure", "light", "dark", "triumph", "despair"].forEach((symbol) => {
      let diceSymbol = "";
      switch (symbol) {
        case "advantage": {
          diceSymbol = "[AD]";
          break;
        }
        case "success": {
          diceSymbol = "[SU]";
          break;
        }
        case "threat": {
          diceSymbol = "[TH]";
          break;
        }
        case "failure": {
          diceSymbol = "[FA]";
          break;
        }
        case "light": {
          diceSymbol = "[LI]";
          break;
        }
        case "dark": {
          diceSymbol = "[DA]";
          break;
        }
        case "triumph": {
          diceSymbol = "[TR]";
          break;
        }
        case "despair": {
          diceSymbol = "[DE]";
          break;
        }
      }

      if (this[symbol] !== 0) {
        additionalSymbols.push(`${this[symbol] < 0 ? "-" : "+"} ${this[symbol]} ${diceSymbol}`);
      }
    });

    $(advanceContainer).append(`<div>${additionalSymbols.join(", ")}</div>`);

    return advanceContainer;
  }

  _addIcons(container, icon, times, height = 36, width = 36) {
    for (let i = 0; i < times; i++) {
      const img = document.createElement("img");
      img.src = icon;
      img.width = width;
      img.height = height;
      container.appendChild(img);
    }
  }

  _addSourceToolTip(container) {
    const createToolTip = this.source?.skill?.length || this.source?.boost?.length || this.source?.remsetback?.length || this.source?.setback?.length || this.source?.upgrades?.length || this.source?.success?.length || this.source?.advantage?.length || this.source?.light?.length || this.source?.failure?.length || this.source?.threat?.length || this.source?.dark?.length;

    if (createToolTip) {
      const mapDataToString = (values) => {
        const item = document.createElement("div");
        item.innerHTML = values.map((i) => `<li class="">${i}</li>`).join("");
        tooltip.append(item);
      };

      const tooltip = document.createElement("div");
      tooltip.classList.add("tooltip2");
      if (this.source?.skill?.length) {
        mapDataToString(this.source.skill);
      }
      if (this.source?.boost?.length) {
        mapDataToString(this.source.boost);
      }
      if (this.source?.remsetback?.length) {
        mapDataToString(this.source.remsetback);
      }
      if (this.source?.setback?.length) {
        mapDataToString(this.source.setback);
      }
      if (this.source?.upgrades?.length) {
        mapDataToString(this.source.upgrades);
      }
      if (this.source?.success?.length) {
        mapDataToString(this.source.success);
      }
      if (this.source?.advantage?.length) {
        mapDataToString(this.source.advantage);
      }
      if (this.source?.light?.length) {
        mapDataToString(this.source.light);
      }
      if (this.source?.failure?.length) {
        mapDataToString(this.source.failure);
      }
      if (this.source?.threat?.length) {
        mapDataToString(this.source.threat);
      }
      if (this.source?.dark?.length) {
        mapDataToString(this.source.dark);
      }

      container.classList.add("hover");
      container.append(tooltip);
    }
  }

  /**
   * Search the passed container for inputs that contain dice pool information
   * @param container the container where the inputs are located
   * @returns {DicePoolFFG}
   */
  static fromContainer(container) {
    return new DicePoolFFG({
      proficiency: container.querySelector('[name="proficiency"]')?.value ? container.querySelector('[name="proficiency"]').value : 0,
      ability: container.querySelector('[name="ability"]')?.value ? container.querySelector('[name="ability"]').value : 0,
      challenge: container.querySelector('[name="challenge"]')?.value ? container.querySelector('[name="challenge"]').value : 0,
      difficulty: container.querySelector('[name="difficulty"]')?.value ? container.querySelector('[name="difficulty"]').value : 0,
      boost: container.querySelector('[name="boost"]')?.value ? container.querySelector('[name="boost"]').value : 0,
      setback: container.querySelector('[name="setback"]')?.value ? container.querySelector('[name="setback"]').value : 0,
      force: container.querySelector('[name="force"]')?.value ? container.querySelector('[name="force"]').value : 0,
      advantage: container.querySelector('[name="advantage"]')?.value ? container.querySelector('[name="advantage"]').value : 0,
      success: container.querySelector('[name="success"]')?.value ? container.querySelector('[name="success"]').value : 0,
      threat: container.querySelector('[name="threat"]')?.value ? container.querySelector('[name="threat"]').value : 0,
      failure: container.querySelector('[name="failure"]')?.value ? container.querySelector('[name="failure"]').value : 0,
      light: container.querySelector('[name="light"]')?.value ? container.querySelector('[name="light"]').value : 0,
      dark: container.querySelector('[name="dark"]')?.value ? container.querySelector('[name="dark"]').value : 0,
      triumph: container.querySelector('[name="triumph"]')?.value ? container.querySelector('[name="triumph"]').value : 0,
      despair: container.querySelector('[name="despair"]')?.value ? container.querySelector('[name="despair"]').value : 0,
      upgrades: container.querySelector('[name="upgrades"]')?.value ? container.querySelector('[name="upgrades"]').value : 0,
    });
  }
}
