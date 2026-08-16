import { foundryGeneration } from "./foundry-version.js";

const MODE_TO_TYPE = Object.freeze({
  0: "custom",
  1: "multiply",
  2: "add",
  3: "downgrade",
  4: "upgrade",
  5: "override",
});

const TYPE_TO_MODE = Object.freeze(Object.fromEntries(
  Object.entries(MODE_TO_TYPE).map(([mode, type]) => [type, Number(mode)]),
));

function clone(value) {
  if (value === undefined) return value;
  return globalThis.structuredClone ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));
}

/**
 * Convert a legacy numeric mode or modern string type to the normalized string form.
 * @param {object} change
 * @returns {string}
 */
export function activeEffectChangeType(change = {}) {
  if (typeof change.type === "string") return change.type;
  const mode = Number(change.mode);
  return MODE_TO_TYPE[mode] ?? `custom.${Number.isFinite(mode) ? mode : 0}`;
}

/**
 * Convert a modern string type to the Version 13 numeric mode.
 * @param {object} change
 * @returns {number}
 */
export function activeEffectChangeMode(change = {}) {
  if (Number.isInteger(change.mode)) return change.mode;
  const type = activeEffectChangeType(change);
  if (Object.hasOwn(TYPE_TO_MODE, type)) return TYPE_TO_MODE[type];
  const customMode = /^custom\.(-?\d+)$/.exec(type);
  return customMode ? Number(customMode[1]) : 0;
}

/**
 * Read effect changes without triggering Version 14 compatibility accessors.
 * @param {object} effect
 * @param {number} [generation]
 * @returns {object[]}
 */
export function getActiveEffectChanges(effect, generation = foundryGeneration()) {
  // Prefer source data on both generations. On Version 14 the prepared entries in
  // `system.changes` carry an `effect` back-reference to their parent ActiveEffect, so cloning,
  // serializing, or submitting them raises "Maximum depth exceeded" / circular-structure errors.
  // Source data holds the same persisted change definitions without the back-reference.
  const changes = generation >= 14
    ? (effect?._source?.system?.changes ?? effect?.system?.changes)
    : (effect?._source?.changes ?? effect?.changes);
  return Array.isArray(changes) ? changes : [];
}

/**
 * Normalize an effect change for system code.
 * @param {object} change
 * @returns {object}
 */
export function normalizeActiveEffectChange(change) {
  const normalized = clone(change) ?? {};
  normalized.type = activeEffectChangeType(normalized);
  delete normalized.mode;
  return normalized;
}

/**
 * Build an Active Effect creation payload for the active Foundry generation.
 * Callers may provide normalized changes at either `changes` or `system.changes`.
 * @param {object} data
 * @param {number} [generation]
 * @returns {object}
 */
export function activeEffectCreateData(data, generation = foundryGeneration()) {
  const result = clone(data) ?? {};
  const changes = result.system?.changes ?? result.changes ?? [];
  if (generation >= 14) {
    result.system = {...(result.system ?? {}), changes: changes.map(normalizeActiveEffectChange)};
    delete result.changes;
  } else {
    result.changes = changes.map(change => {
      const legacy = clone(change) ?? {};
      legacy.mode = activeEffectChangeMode(legacy);
      delete legacy.type;
      delete legacy.phase;
      return legacy;
    });
    if (result.system) {
      delete result.system.changes;
      if (!Object.keys(result.system).length) delete result.system;
    }
  }
  return result;
}

/**
 * Build a flattened Active Effect update containing the generation-native changes path.
 * @param {object[]} changes
 * @param {number} [generation]
 * @returns {object}
 */
export function activeEffectChangesUpdate(changes, generation = foundryGeneration()) {
  const payload = activeEffectCreateData({changes}, generation);
  return generation >= 14 ? {"system.changes": payload.system.changes} : {changes: payload.changes};
}

/**
 * Read a duration in a form shared by Versions 13 and 14.
 * @param {object} effect
 * @param {number} [generation]
 * @returns {{value: number|null, units: string|null, combat: string|null}}
 */
export function getActiveEffectDuration(effect, generation = foundryGeneration()) {
  const duration = effect?.duration ?? {};
  if (generation >= 14) {
    return {
      value: typeof duration.value === "number" ? duration.value : null,
      units: duration.units ?? null,
      combat: effect?.start?.combat ?? null,
    };
  }
  for (const units of ["seconds", "rounds", "turns"]) {
    if (typeof duration[units] === "number") return {value: duration[units], units, combat: duration.combat ?? null};
  }
  return {value: null, units: null, combat: duration.combat ?? null};
}

export const ACTIVE_EFFECT_CHANGE_TYPES = Object.freeze({
  CUSTOM: "custom",
  MULTIPLY: "multiply",
  ADD: "add",
  DOWNGRADE: "downgrade",
  UPGRADE: "upgrade",
  OVERRIDE: "override",
});
