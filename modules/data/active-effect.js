const fields = foundry.data.fields;

/**
 * Core's Active Effect data, plus how long a status lasts: "once" (until the next check) or
 * "combat" (until its actor leaves the combat). Anything else lasts until it is removed.
 */
export class ActiveEffectData extends foundry.data.ActiveEffectTypeDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      duration: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
    };
  }
}
