const PROFICIENCY_ICON = "systems/starwarsffg/images/dice/starwars/yellow.png";
const ABILITY_ICON = "systems/starwarsffg/images/dice/starwars/green.png";
const CHALLENGE_ICON = "systems/starwarsffg/images/dice/starwars/red.png";
const DIFFICULTY_ICON = "systems/starwarsffg/images/dice/starwars/purple.png";
const BOOST_ICON = "systems/starwarsffg/images/dice/starwars/blue.png";
const SETBACK_ICON = "systems/starwarsffg/images/dice/starwars/black.png";
const FORCE_ICON = "systems/starwarsffg/images/dice/starwars/whiteHex.png";

const ABILITY_RESULTS = {
  1: { label: `<img src='systems/starwarsffg/images/dice/starwars/green.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  2: { label: `<img src='systems/starwarsffg/images/dice/starwars/greens.png'/>`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  3: { label: `<img src='systems/starwarsffg/images/dice/starwars/greens.png'/>`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  4: { label: `<img src='systems/starwarsffg/images/dice/starwars/greenss.png'/>`, success: 2, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  5: { label: `<img src='systems/starwarsffg/images/dice/starwars/greena.png'/>`, success: 0, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  6: { label: `<img src='systems/starwarsffg/images/dice/starwars/greena.png'/>`, success: 0, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  7: { label: `<img src='systems/starwarsffg/images/dice/starwars/greensa.png'/>`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  8: { label: `<img src='systems/starwarsffg/images/dice/starwars/greenaa.png'/>`, success: 0, failure: 0, advantage: 2, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
};

const BOOST_RESULTS = {
  1: { label: `<img src='systems/starwarsffg/images/dice/starwars/blue.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  2: { label: `<img src='systems/starwarsffg/images/dice/starwars/blue.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  3: { label: `<img src='systems/starwarsffg/images/dice/starwars/blues.png'/>`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  4: { label: `<img src='systems/starwarsffg/images/dice/starwars/bluesa.png'/>`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  5: { label: `<img src='systems/starwarsffg/images/dice/starwars/blueaa.png'/>`, success: 0, failure: 0, advantage: 2, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  6: { label: `<img src='systems/starwarsffg/images/dice/starwars/bluea.png'/>`, success: 0, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
};

const CHALLENGE_RESULTS = {
  1: { label: `<img src='systems/starwarsffg/images/dice/starwars/red.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  2: { label: `<img src='systems/starwarsffg/images/dice/starwars/redf.png'/>`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  3: { label: `<img src='systems/starwarsffg/images/dice/starwars/redf.png'/>`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  4: { label: `<img src='systems/starwarsffg/images/dice/starwars/redff.png'/>`, success: 0, failure: 2, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  5: { label: `<img src='systems/starwarsffg/images/dice/starwars/redff.png'/>`, success: 0, failure: 2, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  6: { label: `<img src='systems/starwarsffg/images/dice/starwars/redt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  7: { label: `<img src='systems/starwarsffg/images/dice/starwars/redt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  8: { label: `<img src='systems/starwarsffg/images/dice/starwars/redft.png'/>`, success: 0, failure: 1, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  9: { label: `<img src='systems/starwarsffg/images/dice/starwars/redft.png'/>`, success: 0, failure: 1, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  10: { label: `<img src='systems/starwarsffg/images/dice/starwars/redtt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  11: { label: `<img src='systems/starwarsffg/images/dice/starwars/redtt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  12: { label: `<img src='systems/starwarsffg/images/dice/starwars/redd.png'/>`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 1, light: 0, dark: 0 },
};

const DIFFICULTY_RESULTS = {
  1: { label: `<img src='systems/starwarsffg/images/dice/starwars/purple.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  2: { label: `<img src='systems/starwarsffg/images/dice/starwars/purplef.png'/>`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  3: { label: `<img src='systems/starwarsffg/images/dice/starwars/purpleff.png'/>`, success: 0, failure: 2, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  4: { label: `<img src='systems/starwarsffg/images/dice/starwars/purplet.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  5: { label: `<img src='systems/starwarsffg/images/dice/starwars/purplet.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  6: { label: `<img src='systems/starwarsffg/images/dice/starwars/purplet.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  7: { label: `<img src='systems/starwarsffg/images/dice/starwars/purplett.png'/>`, success: 0, failure: 0, advantage: 0, threat: 2, triumph: 0, despair: 0, light: 0, dark: 0 },
  8: { label: `<img src='systems/starwarsffg/images/dice/starwars/purpleft.png'/>`, success: 0, failure: 1, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
};

const FORCE_RESULTS = {
  1: { label: `<img src='systems/starwarsffg/images/dice/starwars/whiten.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
  2: { label: `<img src='systems/starwarsffg/images/dice/starwars/whiten.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
  3: { label: `<img src='systems/starwarsffg/images/dice/starwars/whiten.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
  4: { label: `<img src='systems/starwarsffg/images/dice/starwars/whiten.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
  5: { label: `<img src='systems/starwarsffg/images/dice/starwars/whiten.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
  6: { label: `<img src='systems/starwarsffg/images/dice/starwars/whiten.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 1 },
  7: { label: `<img src='systems/starwarsffg/images/dice/starwars/whitenn.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 2 },
  8: { label: `<img src='systems/starwarsffg/images/dice/starwars/whitel.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 1, dark: 0 },
  9: { label: `<img src='systems/starwarsffg/images/dice/starwars/whitel.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 1, dark: 0 },
  10: { label: `<img src='systems/starwarsffg/images/dice/starwars/whitell.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 2, dark: 0 },
  11: { label: `<img src='systems/starwarsffg/images/dice/starwars/whitell.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 2, dark: 0 },
  12: { label: `<img src='systems/starwarsffg/images/dice/starwars/whitell.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 2, dark: 0 },
};

const PROFICIENCY_RESULTS = {
  1: { label: `<img src='systems/starwarsffg/images/dice/starwars/yellow.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  2: { label: `<img src='systems/starwarsffg/images/dice/starwars/yellows.png'/>`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  3: { label: `<img src='systems/starwarsffg/images/dice/starwars/yellows.png'/>`, success: 1, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  4: { label: `<img src='systems/starwarsffg/images/dice/starwars/yellowss.png'/>`, success: 2, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  5: { label: `<img src='systems/starwarsffg/images/dice/starwars/yellowss.png'/>`, success: 2, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  6: { label: `<img src='systems/starwarsffg/images/dice/starwars/yellowa.png'/>`, success: 0, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  7: { label: `<img src='systems/starwarsffg/images/dice/starwars/yellowsa.png'/>`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  8: { label: `<img src='systems/starwarsffg/images/dice/starwars/yellowsa.png'/>`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  9: { label: `<img src='systems/starwarsffg/images/dice/starwars/yellowsa.png'/>`, success: 1, failure: 0, advantage: 1, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  10: { label: `<img src='systems/starwarsffg/images/dice/starwars/yellowaa.png'/>`, success: 0, failure: 0, advantage: 2, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  11: { label: `<img src='systems/starwarsffg/images/dice/starwars/yellowaa.png'/>`, success: 0, failure: 0, advantage: 2, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  12: { label: `<img src='systems/starwarsffg/images/dice/starwars/yellowr.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 1, despair: 0, light: 0, dark: 0 },
};

const SETBACK_RESULTS = {
  1: { label: `<img src='systems/starwarsffg/images/dice/starwars/black.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  2: { label: `<img src='systems/starwarsffg/images/dice/starwars/black.png'/>`, success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  3: { label: `<img src='systems/starwarsffg/images/dice/starwars/blackf.png'/>`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  4: { label: `<img src='systems/starwarsffg/images/dice/starwars/blackf.png'/>`, success: 0, failure: 1, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 },
  5: { label: `<img src='systems/starwarsffg/images/dice/starwars/blackt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
  6: { label: `<img src='systems/starwarsffg/images/dice/starwars/blackt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 1, triumph: 0, despair: 0, light: 0, dark: 0 },
};

/**
 * Establish each FFG dice type here as extensions of DiceTerm.
 * @extends {DiceTerm}
 */
export class AbilityDie extends DiceTerm {
  constructor(termData) {
    super(termData);
    this.faces = 8;
  }
  /* -------------------------------------------- */
  /** @override */
  static DENOMINATION = "a";

  /* -------------------------------------------- */
  /** @override */
  get formula() {
    return `${this.number}${this.constructor.DENOMINATION}${this.modifiers.join("")}`;
  }

  /* -------------------------------------------- */
  /** @override */
  roll(options) {
    const roll = super.roll(options);
    roll.ffg = ABILITY_RESULTS[roll.result];
    return roll;
  }

  /* -------------------------------------------- */
  /** @override */
  static getResultLabel(result) {
    return ABILITY_RESULTS[result].label;
  }
}

export class BoostDie extends DiceTerm {
  constructor(termData) {
    super(termData);
    this.faces = 6;
  }
  /* -------------------------------------------- */
  /** @override */
  static DENOMINATION = "b";

  /* -------------------------------------------- */
  /** @override */
  get formula() {
    return `${this.number}${this.constructor.DENOMINATION}${this.modifiers.join("")}`;
  }

  /* -------------------------------------------- */
  /** @override */
  roll(options) {
    const roll = super.roll(options);
    roll.ffg = BOOST_RESULTS[roll.result];
    return roll;
  }

  /* -------------------------------------------- */
  /** @override */
  static getResultLabel(result) {
    return BOOST_RESULTS[result].label;
  }
}

export class ChallengeDie extends DiceTerm {
  constructor(termData) {
    super(termData);
    this.faces = 12;
  }
  /* -------------------------------------------- */
  /** @override */
  static DENOMINATION = "c";

  /* -------------------------------------------- */
  /** @override */
  get formula() {
    return `${this.number}${this.constructor.DENOMINATION}${this.modifiers.join("")}`;
  }

  /* -------------------------------------------- */
  /** @override */
  roll(options) {
    const roll = super.roll(options);
    roll.ffg = CHALLENGE_RESULTS[roll.result];
    return roll;
  }

  /* -------------------------------------------- */
  /** @override */
  static getResultLabel(result) {
    return CHALLENGE_RESULTS[result].label;
  }
}

export class DifficultyDie extends DiceTerm {
  constructor(termData) {
    super(termData);
    this.faces = 8;
  }
  /* -------------------------------------------- */
  /** @override */
  static DENOMINATION = "d";

  /* -------------------------------------------- */
  /** @override */
  get formula() {
    return `${this.number}${this.constructor.DENOMINATION}${this.modifiers.join("")}`;
  }

  /* -------------------------------------------- */
  /** @override */
  roll(options) {
    const roll = super.roll(options);
    roll.ffg = DIFFICULTY_RESULTS[roll.result];
    return roll;
  }

  /* -------------------------------------------- */
  /** @override */
  static getResultLabel(result) {
    return DIFFICULTY_RESULTS[result].label;
  }
}

export class ForceDie extends DiceTerm {
  constructor(termData) {
    super(termData);
    this.faces = 12;
  }
  /* -------------------------------------------- */
  /** @override */
  static DENOMINATION = "f";

  /* -------------------------------------------- */
  /** @override */
  get formula() {
    return `${this.number}${this.constructor.DENOMINATION}${this.modifiers.join("")}`;
  }

  /* -------------------------------------------- */
  /** @override */
  roll(options) {
    const roll = super.roll(options);
    roll.ffg = FORCE_RESULTS[roll.result];
    return roll;
  }

  /* -------------------------------------------- */
  /** @override */
  static getResultLabel(result) {
    return FORCE_RESULTS[result].label;
  }
}

export class ProficiencyDie extends DiceTerm {
  constructor(termData) {
    super(termData);
    this.faces = 12;
  }
  /* -------------------------------------------- */
  /** @override */
  static DENOMINATION = "p";

  /* -------------------------------------------- */
  /** @override */
  get formula() {
    return `${this.number}${this.constructor.DENOMINATION}${this.modifiers.join("")}`;
  }

  /* -------------------------------------------- */
  /** @override */
  roll(options) {
    const roll = super.roll(options);
    roll.ffg = PROFICIENCY_RESULTS[roll.result];
    return roll;
  }

  /* -------------------------------------------- */
  /** @override */
  static getResultLabel(result) {
    return PROFICIENCY_RESULTS[result].label;
  }
}

export class SetbackDie extends DiceTerm {
  constructor(termData) {
    super(termData);
    this.faces = 6;
  }
  /* -------------------------------------------- */
  /** @override */
  static DENOMINATION = "s";

  /* -------------------------------------------- */
  /** @override */
  get formula() {
    return `${this.number}${this.constructor.DENOMINATION}${this.modifiers.join("")}`;
  }

  /* -------------------------------------------- */
  /** @override */
  roll(options) {
    const roll = super.roll(options);
    roll.ffg = SETBACK_RESULTS[roll.result];
    return roll;
  }

  /* -------------------------------------------- */
  /** @override */
  static getResultLabel(result) {
    return SETBACK_RESULTS[result].label;
  }
}

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
    this.force = obj.force || 0;
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
    for (let i = 0; i < times; i++) {
      if (this.ability > 0) {
        this.ability--;
        this.proficiency++;
      } else {
        this.ability++;
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
    for (let i = 0; i < times; i++) {
      if (this.difficulty > 0) {
        this.difficulty--;
        this.challenge++;
      } else {
        this.difficulty++;
      }
    }
  }

  /**
   * Transform the dice pool into a rollable expression
   * @returns {string} a dice expression that can be used to roll the dice pool
   */
  renderDiceExpression() {
    return ["p".repeat(this.proficiency), "a".repeat(this.ability), "c".repeat(this.challenge), "d".repeat(this.difficulty), "b".repeat(this.boost), "s".repeat(this.setback), "f".repeat(this.force)].join("");
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
    this._addIcons(container, PROFICIENCY_ICON, this.proficiency);
    this._addIcons(container, ABILITY_ICON, this.ability);
    this._addIcons(container, CHALLENGE_ICON, this.challenge);
    this._addIcons(container, DIFFICULTY_ICON, this.difficulty);
    this._addIcons(container, BOOST_ICON, this.boost);
    this._addIcons(container, SETBACK_ICON, this.setback);
    this._addIcons(container, FORCE_ICON, this.force);
    return container;
  }

  _addIcons(container, icon, times) {
    for (let i = 0; i < times; i++) {
      const img = document.createElement("img");
      img.src = icon;
      img.width = 48;
      img.height = 48;
      container.appendChild(img);
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
    });
  }
}
