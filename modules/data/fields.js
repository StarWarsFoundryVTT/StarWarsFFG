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
 * A keyed map whose defaults are merged back underneath whatever is stored.
 *
 * template.json used to deep-merge its own block under every document, which is how a partially
 * filled map - a specialization holding only the talents its data defined, a character imported
 * with only some skills - ended up with the rest of its slots. A plain ObjectField takes the
 * stored value as it stands, so that has to happen here instead.
 */
class DefaultedObjectField extends fields.ObjectField {
  /** @override */
  _cleanType(value, options) {
    const cleaned = super._cleanType(value, options);
    return foundry.utils.mergeObject(this.getInitialValue({}), cleaned);
  }
}

export function defaultedMap(initial) {
  return new DefaultedObjectField({ required: true, initial: initial });
}

/**
 * The numbered slots a specialization, force power or signature ability is built from. Seeded
 * rather than left empty because the sheets render the slots with `{{#each}}`.
 */
export function slotMap(prefix, count, value = () => ({})) {
  return defaultedMap(() => Object.fromEntries(Array.from({ length: count }, (_, i) => [`${prefix}${i}`, value()])));
}

/**
 * Whole item-shaped objects stored on their parent - attachments, and the modifiers on them.
 */
export function embeddedItems() {
  return new fields.ArrayField(new fields.ObjectField(), { required: true, initial: [] });
}

/**
 * Tags and source books. The `meta_only` block in template.json, shared by Actors and Items.
 */
export function metadata() {
  return new fields.SchemaField({
    tags: new fields.ArrayField(new fields.StringField(), { required: true, initial: [] }),
    sources: new fields.ArrayField(new fields.StringField(), { required: true, initial: [] }),
  });
}
