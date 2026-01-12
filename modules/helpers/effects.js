export default class EffectHelper {

  // Lookup mode name from int
  static MODES = Object.fromEntries(
    Object.entries(CONST.ACTIVE_EFFECT_MODES).map(
      ([key, value]) => [value, key])
    );

  // Map effects from EmbeddedCollection
  static transformEffects(effect, _iterator, _effects) {
    // Convert duration to string
    if (effect.duration.combat) {
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
      change.mode = EffectHelper.MODES[change.mode];

      // LStrip 'system.' for shorter keys
      if (change.key.startsWith("system.")) {
        change.key = change.key.substring(7);
      }
    });

    return effect;
  }
}