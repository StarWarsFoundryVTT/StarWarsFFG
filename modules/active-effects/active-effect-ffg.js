
import ModifierHelpers from "../helpers/modifiers.js";

/**
 * Item types that only grant what they carry while they are equipped. Ship weapons and ship
 * attachments have an equipped state as well, but no way to set it, so they are left out.
 */
const equipGatedTypes = ["armour", "weapon"];

function disablePushOnItem(options){
  // don't show push/animation if that's an effect from item
  if(options.parent.parentCollection === "items")
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
    disablePushOnItem(options);
    await super._onCreate(changed, options, userId);
  }

  /** @override */
  async _onUpdate(changed, options, userId) {
    disablePushOnItem(options);
    await super._onUpdate(changed, options, userId);
  }

  /** @override */
  async _onDelete(options, userId) {
    disablePushOnItem(options);
    await super._onDelete(options, userId);
  }

  /**
   * Weapons and armor only grant what they carry while they are equipped. Encumbrance is the
   * exception - carrying something is what makes it encumbering in the first place
   * @override
   */
  static applyChange(targetDoc, change, options) {
    const item = change.effect?.parent;
    if (
      equipGatedTypes.includes(item?.type) &&
      !item.system?.equippable?.equipped &&
      change.key !== ModifierHelpers.getModKeyPath("Stat", "Encumbrance")
    ) {
      return {};
    }
    // a ranked talent grants its mods once per rank (#2385)
    const rankedTalent = item?.type === "talent" && item.system?.ranks?.ranked;
    if (rankedTalent && change.type === "add" && /^-?\d+$/.test(change.value)) {
      const ranks = parseInt(item.system.ranks.current, 10) || 1;
      change = {...change, value: String(change.value * ranks)};
    }
    return super.applyChange(targetDoc, change, options);
  }
}
