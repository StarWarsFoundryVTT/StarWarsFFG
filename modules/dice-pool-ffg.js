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
  10: { label: `<img src='systems/starwarsffg/images/dice/starwars/redtt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 2, triumph: 0, despair: 0, light: 0, dark: 0 },
  11: { label: `<img src='systems/starwarsffg/images/dice/starwars/redtt.png'/>`, success: 0, failure: 0, advantage: 0, threat: 2, triumph: 0, despair: 0, light: 0, dark: 0 },
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
  evaluate({ minimize = false, maximize = false } = {}) {
    if (this._evaluated) {
      throw new Error(`This ${this.constructor.name} has already been evaluated and is immutable`);
    }

    // Roll the initial number of dice
    for (let n = 1; n <= this.number; n++) {
      this.roll({ minimize, maximize });
    }

    // Apply modifiers
    this._evaluateModifiers();

    // Combine all FFG results.
    this.ffg = { success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 };
    this.results.forEach((result) => {
      this.ffg.success += parseInt(result.ffg.success);
      this.ffg.failure += parseInt(result.ffg.failure);
      this.ffg.advantage += parseInt(result.ffg.advantage);
      this.ffg.threat += parseInt(result.ffg.threat);
      this.ffg.triumph += parseInt(result.ffg.triumph);
      this.ffg.despair += parseInt(result.ffg.despair);
      this.ffg.light += parseInt(result.ffg.light);
      this.ffg.dark += parseInt(result.ffg.dark);
    });

    // Return the evaluated term
    this._evaluated = true;
    this._isFFG = true;
    return this;
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
  evaluate({ minimize = false, maximize = false } = {}) {
    if (this._evaluated) {
      throw new Error(`This ${this.constructor.name} has already been evaluated and is immutable`);
    }

    // Roll the initial number of dice
    for (let n = 1; n <= this.number; n++) {
      this.roll({ minimize, maximize });
    }

    // Apply modifiers
    this._evaluateModifiers();

    // Combine all FFG results.
    this.ffg = { success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 };
    this.results.forEach((result) => {
      this.ffg.success += parseInt(result.ffg.success);
      this.ffg.failure += parseInt(result.ffg.failure);
      this.ffg.advantage += parseInt(result.ffg.advantage);
      this.ffg.threat += parseInt(result.ffg.threat);
      this.ffg.triumph += parseInt(result.ffg.triumph);
      this.ffg.despair += parseInt(result.ffg.despair);
      this.ffg.light += parseInt(result.ffg.light);
      this.ffg.dark += parseInt(result.ffg.dark);
    });

    // Return the evaluated term
    this._evaluated = true;
    this._isFFG = true;
    return this;
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
  evaluate({ minimize = false, maximize = false } = {}) {
    if (this._evaluated) {
      throw new Error(`This ${this.constructor.name} has already been evaluated and is immutable`);
    }

    // Roll the initial number of dice
    for (let n = 1; n <= this.number; n++) {
      this.roll({ minimize, maximize });
    }

    // Apply modifiers
    this._evaluateModifiers();

    // Combine all FFG results.
    this.ffg = { success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 };
    this.results.forEach((result) => {
      this.ffg.success += parseInt(result.ffg.success);
      this.ffg.failure += parseInt(result.ffg.failure);
      this.ffg.advantage += parseInt(result.ffg.advantage);
      this.ffg.threat += parseInt(result.ffg.threat);
      this.ffg.triumph += parseInt(result.ffg.triumph);
      this.ffg.despair += parseInt(result.ffg.despair);
      this.ffg.light += parseInt(result.ffg.light);
      this.ffg.dark += parseInt(result.ffg.dark);
    });

    // Return the evaluated term
    this._evaluated = true;
    this._isFFG = true;
    return this;
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
  evaluate({ minimize = false, maximize = false } = {}) {
    if (this._evaluated) {
      throw new Error(`This ${this.constructor.name} has already been evaluated and is immutable`);
    }

    // Roll the initial number of dice
    for (let n = 1; n <= this.number; n++) {
      this.roll({ minimize, maximize });
    }

    // Apply modifiers
    this._evaluateModifiers();

    // Combine all FFG results.
    this.ffg = { success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 };
    this.results.forEach((result) => {
      this.ffg.success += parseInt(result.ffg.success);
      this.ffg.failure += parseInt(result.ffg.failure);
      this.ffg.advantage += parseInt(result.ffg.advantage);
      this.ffg.threat += parseInt(result.ffg.threat);
      this.ffg.triumph += parseInt(result.ffg.triumph);
      this.ffg.despair += parseInt(result.ffg.despair);
      this.ffg.light += parseInt(result.ffg.light);
      this.ffg.dark += parseInt(result.ffg.dark);
    });

    // Return the evaluated term
    this._evaluated = true;
    this._isFFG = true;
    return this;
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
  evaluate({ minimize = false, maximize = false } = {}) {
    if (this._evaluated) {
      throw new Error(`This ${this.constructor.name} has already been evaluated and is immutable`);
    }

    // Roll the initial number of dice
    for (let n = 1; n <= this.number; n++) {
      this.roll({ minimize, maximize });
    }

    // Apply modifiers
    this._evaluateModifiers();

    // Combine all FFG results.
    this.ffg = { success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 };
    this.results.forEach((result) => {
      this.ffg.success += parseInt(result.ffg.success);
      this.ffg.failure += parseInt(result.ffg.failure);
      this.ffg.advantage += parseInt(result.ffg.advantage);
      this.ffg.threat += parseInt(result.ffg.threat);
      this.ffg.triumph += parseInt(result.ffg.triumph);
      this.ffg.despair += parseInt(result.ffg.despair);
      this.ffg.light += parseInt(result.ffg.light);
      this.ffg.dark += parseInt(result.ffg.dark);
    });

    // Return the evaluated term
    this._evaluated = true;
    this._isFFG = true;
    return this;
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
  evaluate({ minimize = false, maximize = false } = {}) {
    if (this._evaluated) {
      throw new Error(`This ${this.constructor.name} has already been evaluated and is immutable`);
    }

    // Roll the initial number of dice
    for (let n = 1; n <= this.number; n++) {
      this.roll({ minimize, maximize });
    }

    // Apply modifiers
    this._evaluateModifiers();

    // Combine all FFG results.
    this.ffg = { success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 };
    this.results.forEach((result) => {
      this.ffg.success += parseInt(result.ffg.success);
      this.ffg.failure += parseInt(result.ffg.failure);
      this.ffg.advantage += parseInt(result.ffg.advantage);
      this.ffg.threat += parseInt(result.ffg.threat);
      this.ffg.triumph += parseInt(result.ffg.triumph);
      this.ffg.despair += parseInt(result.ffg.despair);
      this.ffg.light += parseInt(result.ffg.light);
      this.ffg.dark += parseInt(result.ffg.dark);
    });

    // Return the evaluated term
    this._evaluated = true;
    this._isFFG = true;
    return this;
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
  evaluate({ minimize = false, maximize = false } = {}) {
    if (this._evaluated) {
      throw new Error(`This ${this.constructor.name} has already been evaluated and is immutable`);
    }

    // Roll the initial number of dice
    for (let n = 1; n <= this.number; n++) {
      this.roll({ minimize, maximize });
    }

    // Apply modifiers
    this._evaluateModifiers();

    // Combine all FFG results.
    this.ffg = { success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 };
    this.results.forEach((result) => {
      this.ffg.success += parseInt(result.ffg.success);
      this.ffg.failure += parseInt(result.ffg.failure);
      this.ffg.advantage += parseInt(result.ffg.advantage);
      this.ffg.threat += parseInt(result.ffg.threat);
      this.ffg.triumph += parseInt(result.ffg.triumph);
      this.ffg.despair += parseInt(result.ffg.despair);
      this.ffg.light += parseInt(result.ffg.light);
      this.ffg.dark += parseInt(result.ffg.dark);
    });

    // Return the evaluated term
    this._evaluated = true;
    this._isFFG = true;
    return this;
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
 * New extension of the core DicePool class for evaluating rolls with the FFG DiceTerms
 */
export class RollFFG extends Roll {
  constructor(...args) {
    super(...args);
    this.ffg = { success: 0, failure: 0, advantage: 0, threat: 0, triumph: 0, despair: 0, light: 0, dark: 0 };
    this.hasFFG = false;
    this.hasStandard = false;
  }

  static CHAT_TEMPLATE = "systems/starwarsffg/templates/dice/roll-ffg.html";

  static TOOLTIP_TEMPLATE = "systems/starwarsffg/templates/dice/tooltip-ffg.html";

  /* -------------------------------------------- */

  /* -------------------------------------------- */
  /** @override */
  evaluate({ minimize = false, maximize = false } = {}) {
    if (this._rolled) throw new Error("This Roll object has already been rolled.");

    // Step 1 - evaluate any inner Rolls and recompile the formula
    let hasInner = false;
    this.terms = this.terms.map((t) => {
      if (t instanceof RollFFG) {
        hasInner = true;
        t.evaluate({ minimize, maximize });
        this._dice = this._dice.concat(t.dice);
        return `${t.total}`;
      }
      return t;
    });

    // Step 2 - if inner rolls occurred, re-compile the formula and re-identify terms
    if (hasInner) {
      const formula = this.constructor.cleanFormula(this.terms);
      this.terms = this._identifyTerms(formula);
    }

    // Step 3 - evaluate any remaining terms and return any non-FFG dice to the total.
    this.results = this.terms.map((term) => {
      if (!game.ffg.diceterms.includes(term.constructor)) {
        if (term.evaluate) {
          this.hasStandard = true;
          return term.evaluate({ minimize, maximize }).total;
        } else return term;
      } else {
        if (term.evaluate) term.evaluate({ minimize, maximize });
        this.hasFFG = true;
        return 0;
      }
    });

    // Step 4 - safely evaluate the final total
    const total = this._safeEval(this.results.join(" "));
    if (!Number.isNumeric(total)) {
      throw new Error(game.i18n.format("DICE.ErrorNonNumeric", { formula: this.formula }));
    }

    // Step 5 - Retrieve all FFG results and combine into a single total.
    if (this.hasFFG) {
      this.terms.forEach((term) => {
        if (game.ffg.diceterms.includes(term.constructor)) {
          this.ffg.success += parseInt(term.ffg.success);
          this.ffg.failure += parseInt(term.ffg.failure);
          this.ffg.advantage += parseInt(term.ffg.advantage);
          this.ffg.threat += parseInt(term.ffg.threat);
          this.ffg.triumph += parseInt(term.ffg.triumph);
          this.ffg.despair += parseInt(term.ffg.despair);
          this.ffg.light += parseInt(term.ffg.light);
          this.ffg.dark += parseInt(term.ffg.dark);
        }
      });

      // Step 6 - Calculate actual results by cancelling out success with failure, advantage with threat etc.
      if (this.ffg.success < this.ffg.failure) {
        this.ffg.failure -= parseInt(this.ffg.success);
        this.ffg.success = 0;
      } else {
        this.ffg.success -= parseInt(this.ffg.failure);
        this.ffg.failure = 0;
      }
      if (this.ffg.advantage < this.ffg.threat) {
        this.ffg.threat -= parseInt(this.ffg.advantage);
        this.ffg.advantage = 0;
      } else {
        this.ffg.advantage -= parseInt(this.ffg.threat);
        this.ffg.threat = 0;
      }
    }

    // Store final outputs
    this._total = total;
    this._rolled = true;
    return this;
  }

  /* -------------------------------------------- */
  /** @override */
  roll() {
    return this.evaluate();
  }

  /* -------------------------------------------- */
  /** @override */
  getTooltip() {
    const parts = this.dice.map((d) => {
      const cls = d.constructor;
      let isFFG = "notFFG";
      if (game.ffg.diceterms.includes(d.constructor)) isFFG = "isFFG";
      return {
        formula: d.formula,
        total: d.total,
        faces: d.faces,
        flavor: d.options.flavor,
        isFFG: game.ffg.diceterms.includes(d.constructor),
        notFFG: !game.ffg.diceterms.includes(d.constructor),
        rolls: d.results.map((r) => {
          return {
            result: cls.getResultLabel(r.result),
            classes: [cls.name.toLowerCase(), isFFG, "d" + d.faces, r.rerolled ? "rerolled" : null, r.exploded ? "exploded" : null, r.discarded ? "discarded" : null, r.result === 1 ? "min" : null, r.result === d.faces ? "max" : null].filter((c) => c).join(" "),
          };
        }),
      };
    });
    return renderTemplate(this.constructor.TOOLTIP_TEMPLATE, { parts });
  }

  /* -------------------------------------------- */
  /** @override */
  async render(chatOptions = {}) {
    chatOptions = mergeObject(
      {
        user: game.user._id,
        flavor: null,
        template: this.constructor.CHAT_TEMPLATE,
        blind: false,
      },
      chatOptions
    );
    const isPrivate = chatOptions.isPrivate;

    // Execute the roll, if needed
    if (!this._rolled) this.roll();

    // Define chat data
    const chatData = {
      formula: isPrivate ? "???" : this._formula,
      flavor: isPrivate ? null : chatOptions.flavor,
      user: chatOptions.user,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
      ffg: isPrivate ? {} : this.ffg,
      ffgDice: this.dice.map((d) => {
        const cls = d.constructor;
        return {
          isFFG: game.ffg.diceterms.includes(d.constructor),
          rolls: d.results.map((r) => {
            return {
              result: cls.getResultLabel(r.result),
            };
          }),
        };
      }),
      hasFFG: this.hasFFG,
      hasStandard: this.hasStandard,
      diceresults: CONFIG.FFG.diceresults,
    };

    // Render the roll display template
    return renderTemplate(chatOptions.template, chatData);
  }

  /* -------------------------------------------- */
  /** @override */
  toMessage(messageData = {}, { rollMode = null, create = true } = {}) {
    // Perform the roll, if it has not yet been rolled
    if (!this._rolled) this.evaluate();

    // Prepare chat data
    messageData = mergeObject(
      {
        user: game.user._id,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        content: this.total,
        sound: CONFIG.sounds.dice,
      },
      messageData
    );
    messageData.roll = this;

    // Prepare message options
    const messageOptions = { rollMode };

    // Either create the message or just return the chat data
    return create ? CONFIG.ChatMessage.entityClass.create(messageData, messageOptions) : messageData;
  }

  /** @override */
  toJSON() {
    const json = super.toJSON();
    json.ffg = this.ffg;
    json.hasFFG = this.hasFFG;
    json.hasStandard = this.hasStandard;
    return json;
  }

  /** @override */
  static fromData(data) {
    const roll = super.fromData(data);
    roll.ffg = data.ffg;
    roll.hasFFG = data.hasFFG;
    roll.hasStandard = data.hasStandard;
    return roll;
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
