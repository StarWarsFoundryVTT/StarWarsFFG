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
        } else if (this.ability > 0) {
          this.ability--;
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
        } else if (this.difficulty > 0) {
          this.difficulty--;
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
  renderDiceExpression() {
    let dicePool = [this.proficiency + "dp", this.ability + "da", this.challenge + "dc", this.difficulty + "dd", this.boost + "db", this.setback + "ds", this.force + "df"];
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
    if (totalDice > 10) {
      height = 24;
      width = 24;
    }
    if (totalDice > 32) {
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

    this._addSourceToolTip(container);

    return container;
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
    const createToolTip = this.source?.skill?.length || this.source?.boost?.length || this.source?.remsetback?.length || this.source?.setback?.length;

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
      proficiency: container.querySelector('[name="proficiency"]').value,
      ability: container.querySelector('[name="ability"]').value,
      challenge: container.querySelector('[name="challenge"]').value,
      difficulty: container.querySelector('[name="difficulty"]').value,
      boost: container.querySelector('[name="boost"]').value,
      setback: container.querySelector('[name="setback"]').value,
      force: container.querySelector('[name="force"]').value,
      advantage: container.querySelector('[name="advantage"]').value,
      success: container.querySelector('[name="success"]').value,
      threat: container.querySelector('[name="threat"]').value,
      failure: container.querySelector('[name="failure"]').value,
    });
  }
}
