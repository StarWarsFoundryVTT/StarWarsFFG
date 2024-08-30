export class AbilityDie extends foundry.dice.terms.DiceTerm {
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
  async evaluate({ minimize = false, maximize = false } = {}) {
    if (this._evaluated) {
      throw new Error(`This ${this.constructor.name} has already been evaluated and is immutable`);
    }

    // Roll the initial number of dice
    for (let n = 1; n <= this.number; n++) {
      await this.roll({ minimize, maximize });
    }

    // Apply modifiers
    await this._evaluateModifiers();

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
  async roll(options) {
    const roll = await super.roll(options);
    roll.ffg = CONFIG.FFG.ABILITY_RESULTS[roll.result];
    return roll;
  }

  /* -------------------------------------------- */
  /** @override */
  getResultLabel(result) {
    const die = CONFIG.FFG.ABILITY_RESULTS[result.result];
    return `<img src='${die.image}' title='${game.i18n.localize(die.label)}' alt=''/>`;
  }
}
