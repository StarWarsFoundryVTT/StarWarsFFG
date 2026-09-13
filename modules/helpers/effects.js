export default class EffectHelpers {

  // Lookup mode name from int
  static get MODES() {
    return { 0: "CUSTOM", 1: "MULTIPLY", 2: "ADD", 3: "DOWNGRADE", 4: "UPGRADE", 5: "OVERRIDE" };
  }

  /** Create a native V14 Active Effect change type. */
  static changeType(type = "add") {
    return { type };
  }

  // Map effects from EmbeddedCollection
  static transformEffects(originalEffect, _iterator, _effects) {
    const source = originalEffect.toObject();
    // Make enumerable display fields instead of writing through v14's legacy shims.
    const effect = { ...source, changes: source.system?.changes ?? source.changes ?? [] };

    // Copy properties we need from the prototype
    effect.id = originalEffect.id;
    effect.parentName = originalEffect.parent?.name;
    effect.active = originalEffect.active;

    // Keep Foundry's timed/expiry labels, but describe unlimited effects explicitly.
    effect.duration = originalEffect.isTemporary
      ? originalEffect.duration.label
      : game.i18n.localize("SWFFG.Effect.Duration.Permanent");

    // Update each change from this effect
    effect.changes = effect.changes.map((change) => {
      // Convert mode to string
      return {
        ...change,
        mode: change.type?.toUpperCase() ?? EffectHelpers.MODES[change.mode],
        key: change.key?.startsWith("system.") ? change.key.substring(7) : change.key,
      };
    });

    return effect;
  }
}
