export class DiceTermFFG extends DiceTerm {
  constructor(termData) {
    super(termData);
  }

  static fromMatch(match) {
    let [number, denomination, modifiers, flavor] = match.slice(1);

    // Get the denomination of DiceTerm
    denomination = denomination.toLowerCase();
    const cls = denomination in CONFIG.Dice.terms ? CONFIG.Dice.terms[denomination] : CONFIG.Dice.types[0];
    if ( !foundry.utils.isSubclass(cls, DiceTerm) ) {
      throw new Error(`DiceTerm denomination ${denomination} not registered to CONFIG.Dice.terms as a valid DiceTerm class`);
    }

    // Get the term arguments
    number = Number.isNumeric(number) ? parseInt(number) : 1;
    const faces = Number.isNumeric(denomination) ? parseInt(denomination) : null;

    // Match modifiers
    modifiers = Array.from((modifiers || "").matchAll(DiceTerm.MODIFIER_REGEXP)).map(m => m[0]);

    // Construct a term of the appropriate denomination
    return new cls({number, faces, modifiers, options: {flavor}});
  }
}