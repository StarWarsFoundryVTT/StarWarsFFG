const fields = foundry.data.fields;

/**
 * Fields for the data model
 */
export function numberStat({ initial = 0, label, abrev, adjusted = true } = {}) {
  const schema = {
    value: new fields.NumberField({ required: true, nullable: false, initial: initial }),
  };
  if (label !== undefined) {
    schema.type = new fields.StringField({ required: true, initial: "Number" });
    schema.label = new fields.StringField({ required: true, initial: label });
  }
  if (abrev !== undefined) {
    schema.abrev = new fields.StringField({ required: true, initial: abrev });
  }
  if (adjusted) {
    schema.adjusted = new fields.NumberField({ required: true, nullable: false, initial: initial });
  }
  return new fields.SchemaField(schema);
}

/**
 * The same shape for a stat whose value is a string, such as a weapon's range band.
 */
export function stringStat({ initial = "", label, adjusted = false } = {}) {
  const schema = {
    value: new fields.StringField({ required: true, blank: true, initial: initial }),
  };
  if (label !== undefined) {
    schema.type = new fields.StringField({ required: true, initial: "String" });
    schema.label = new fields.StringField({ required: true, initial: label });
  }
  if (adjusted) {
    schema.adjusted = new fields.StringField({ required: true, blank: true, initial: initial });
  }
  return new fields.SchemaField(schema);
}

/**
 * A free-form map keyed by randomID - modifiers, species abilities, a career's specializations.
 * Entries are mutated in place and removed with the `-=key` form, which ObjectField supports.
 */
export function keyedMap(initial = () => ({})) {
  return new fields.ObjectField({ required: true, initial: initial });
}

/**
 * The numbered slots a specialization, force power or signature ability is built from. Seeded
 * rather than left empty because the sheets render the slots with `{{#each}}`.
 */
export function slotMap(prefix, count, value = () => ({})) {
  return keyedMap(() => Object.fromEntries(Array.from({ length: count }, (_, i) => [`${prefix}${i}`, value()])));
}

/**
 * Whole item-shaped objects stored on their parent - attachments, and the modifiers on them.
 */
export function embeddedItems() {
  return new fields.ArrayField(new fields.ObjectField(), { required: true, initial: [] });
}
