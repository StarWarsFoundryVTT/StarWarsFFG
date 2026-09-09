export default class EffectHelpers {

  // Lookup mode name from int
  static get MODES() {
    return { 0: "CUSTOM", 1: "MULTIPLY", 2: "ADD", 3: "DOWNGRADE", 4: "UPGRADE", 5: "OVERRIDE" };
  }

  /** Use string change types in v14, while retaining the v13 document format. */
  static changeType(type = "add") {
    return CONST.ACTIVE_EFFECT_CHANGE_TYPES
      ? { type }
      : { mode: CONST.ACTIVE_EFFECT_MODES[type.toUpperCase()] };
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

    // Convert duration to string
    if (game.release.generation >= 14) {
      effect.duration = originalEffect.duration.label;
    } else if (effect.duration.combat) {
      effect.duration = game.i18n.localize("SWFFG.Effect.Duration.CurrentCombat");
    } else if (effect.duration.seconds) {
      effect.duration = `${effect.duration.seconds} ${game.i18n.localize("SWFFG.Effect.Duration.Seconds")}`;
    } else if (effect.duration.rounds) {
      effect.duration = `${effect.duration.rounds} ${game.i18n.localize("SWFFG.Effect.Duration.Rounds")}`;
    } else if (effect.duration.turns) {
      effect.duration = `${effect.duration.turns} ${game.i18n.localize("SWFFG.Effect.Duration.Turns")}`;
    } else {
      effect.duration = game.i18n.localize("SWFFG.Effect.Duration.Permanent");
    }

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
