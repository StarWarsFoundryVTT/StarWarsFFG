import {
  activeEffectChangeType,
  getActiveEffectChanges,
  getActiveEffectDuration,
} from "../compatibility/active-effects.js";

export default class EffectHelpers {

  // Map effects from EmbeddedCollection
  static transformEffects(originalEffect, _iterator, _effects) {
    let effect = structuredClone(originalEffect);

    // Copy properties we need from the prototype
    effect.id = originalEffect.id;
    effect.parentName = originalEffect.parent.name;
    effect.active = originalEffect.active;

    // Convert duration to string
    const duration = getActiveEffectDuration(originalEffect);
    if (duration.combat) {
      effect.duration = game.i18n.localize("SWFFG.Effect.Duration.CurrentCombat");
    } else if (duration.units === "seconds") {
      effect.duration = `${duration.value} ${game.i18n.localize("SWFFG.Effect.Duration.Seconds")}`;
    } else if (duration.units === "rounds") {
      effect.duration = `${duration.value} ${game.i18n.localize("SWFFG.Effect.Duration.Rounds")}`;
    } else if (duration.units === "turns") {
      effect.duration = `${duration.value} ${game.i18n.localize("SWFFG.Effect.Duration.Turns")}`;
    } else {
      effect.duration = game.i18n.localize("SWFFG.Effect.Duration.Permanent");
    }

    // Update each change from this effect
    effect.changes = getActiveEffectChanges(originalEffect).map(change => structuredClone(change));
    effect.changes.forEach((change) => {
      // Convert mode to string
      change.mode = activeEffectChangeType(change).toUpperCase();

      // LStrip 'system.' for shorter keys
      if (change.key.startsWith("system.")) {
        change.key = change.key.substring(7);
      }
    });

    return effect;
  }
}
