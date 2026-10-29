export default class EffectHelpers {

  // Map effects from EmbeddedCollection
  static transformEffects(originalEffect, _iterator, _effects) {
    // v14 keeps changes under system.changes, which structuredClone does not reach through the document
    const effect = {
      id: originalEffect.id,
      name: originalEffect.name,
      parentName: originalEffect.parent.name,
      active: originalEffect.active,
      changes: foundry.utils.deepClone(originalEffect.system.changes ?? []),
    };

    // Convert duration to string
    const duration = originalEffect.duration;
    const durationUnitLabels = {
      seconds: "SWFFG.Effect.Duration.Seconds",
      rounds: "SWFFG.Effect.Duration.Rounds",
      turns: "SWFFG.Effect.Duration.Turns",
    };
    if (originalEffect.start?.combat) {
      effect.duration = game.i18n.localize("SWFFG.Effect.Duration.CurrentCombat");
    } else if (typeof duration.value === "number" && duration.value > 0) {
      const unitLabel = durationUnitLabels[duration.units] ? game.i18n.localize(durationUnitLabels[duration.units]) : duration.units;
      effect.duration = `${duration.value} ${unitLabel}`;
    } else {
      effect.duration = game.i18n.localize("SWFFG.Effect.Duration.Permanent");
    }

    // Update each change from this effect
    effect.changes.forEach((change) => {
      // Display the change type (e.g. "add") where the numeric mode used to be shown
      change.mode = change.type?.toUpperCase();

      // LStrip 'system.' for shorter keys
      if (change.key.startsWith("system.")) {
        change.key = change.key.substring(7);
      }
    });

    return effect;
  }
}
