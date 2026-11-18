export default class EffectHelpers {

  static DURATION_UNITS = {
    seconds: "SWFFG.Effect.Duration.Seconds",
    rounds: "SWFFG.Effect.Duration.Rounds",
    turns: "SWFFG.Effect.Duration.Turns",
  };

  // Map an ActiveEffect to what the effects tab displays
  static transformEffects(effect) {
    let duration;
    const { value, units } = effect.duration;
    if (effect.start?.combat) {
      duration = game.i18n.localize("SWFFG.Effect.Duration.CurrentCombat");
    } else if (value) {
      const unitKey = EffectHelpers.DURATION_UNITS[units];
      duration = `${value} ${unitKey ? game.i18n.localize(unitKey) : units}`;
    } else {
      duration = game.i18n.localize("SWFFG.Effect.Duration.Permanent");
    }

    const changes = effect.system.changes.map((change) => ({
      // LStrip 'system.' for shorter keys
      key: change.key.startsWith("system.") ? change.key.substring(7) : change.key,
      type: game.i18n.localize(ActiveEffect.implementation.CHANGE_TYPES[change.type]?.label ?? change.type),
      value: change.value,
    }));

    return {
      id: effect.id,
      name: effect.name,
      parentName: effect.parent.name,
      active: effect.active,
      duration,
      changes,
    };
  }
}
