export class PepsDie extends FateDie {
  constructor(termData) {
    super(termData);
  }
  /* -------------------------------------------- */
  /** @override */
//  static DENOMINATION = "f";

  /* -------------------------------------------- */
  /** @override */
  // get formula() {
  //   return `${this.number}${this.constructor.DENOMINATION}${this.modifiers.join("")}`;
  // }

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
    let r = roll.result
    if(this.faces==3) r = r+2; // c'est un dé Fate ! score entre -1 et 1 => decalage vers 1 à 3
    roll.ffg = CONFIG.FFG.PEPS_RESULTS[r]; // tableau est entre 1 et 3
    return roll;
  }

  /* -------------------------------------------- */
  /** @override */
  getResultLabel(result) { // demande obligatoirement un chiffre en 1 et 3
    let r = result.result + 2
    if(r > 3) r = r-3; // demande initiale, R va de 1 à 3 
    const die = CONFIG.FFG.PEPS_RESULTS[r]; // decalage
    return `<img src='${die.image}' title='${game.i18n.localize(die.label)}' alt=''/>`;
  }
}
