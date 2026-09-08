
function disablePushOnItem(effect, options){
  // don't show push/animation if that's an effect from item
  if(effect.parent?.documentName === "Item")
  {
    options.animate = false;
  }
}

/**
 * Extend the basic ActiveEffect
 * @extends {ActiveEffect}
 */
export class ActiveEffectFFG extends ActiveEffect {
  /** @override */
  async _onCreate(changed, options, userId) {
    disablePushOnItem(this, options);
    await super._onCreate(changed, options, userId);
  }

  /** @override */
  async _onUpdate(changed, options, userId) {
    disablePushOnItem(this, options);
    await super._onUpdate(changed, options, userId);
  }

  /** @override */
  async _onDelete(options, userId) {
    disablePushOnItem(this, options);
    await super._onDelete(options, userId);
  }
}
