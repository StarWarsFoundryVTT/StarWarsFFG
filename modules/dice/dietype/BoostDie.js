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
    roll.ffg = CONFIG.FFG.BOOST_RESULTS[roll.result];
    return roll;
  }

  /* -------------------------------------------- */
  /** @override */
  static getResultLabel(result) {
    return CONFIG.FFG.BOOST_RESULTS[result].label;
  }
}
