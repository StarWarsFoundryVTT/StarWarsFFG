import {
  activeEffectChangesUpdate,
  activeEffectCreateData,
} from "../compatibility/active-effects.js";

function disablePushOnItem(options){
  // don't show push/animation if that's an effect from item
  if(options.parent?.parentCollection === "items")
  {
    options.animate = false;
  }
}

/**
 * Extend the basic ActiveEffect
 * @extends {ActiveEffect}
 */
export class ActiveEffectFFG extends foundry.documents.ActiveEffect {
  /**
   * Normalize all system-created effects before Foundry constructs documents.
   * @override
   */
  static async createDocuments(data = [], context = {}) {
    return super.createDocuments(data.map(effect => activeEffectCreateData(effect)), context);
  }

  /** @override */
  async update(data = {}, operation = {}) {
    if (Array.isArray(data.changes) || Array.isArray(data.system?.changes)) {
      const changes = data.system?.changes ?? data.changes;
      const normalized = activeEffectChangesUpdate(changes);
      data = {...data};
      delete data.changes;
      if (data.system?.changes) {
        data.system = {...data.system};
        delete data.system.changes;
        if (!Object.keys(data.system).length) delete data.system;
      }
      Object.assign(data, normalized);
    }
    return super.update(data, operation);
  }

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
}
