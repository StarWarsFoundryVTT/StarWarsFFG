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
    const effect = originalEffect.toObject();

    // Copy properties we need from the prototype
    effect.id = originalEffect.id;
    effect.parentName = originalEffect.parent.name;
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
    effect.changes.forEach((change, index) => {
      // Convert mode to string
      change.mode = change.type?.toUpperCase() ?? EffectHelpers.MODES[change.mode];

      // LStrip 'system.' for shorter keys
      if (change.key.startsWith("system.")) {
        change.key = change.key.substring(7);
      }
    });

    return effect;
  }
}
