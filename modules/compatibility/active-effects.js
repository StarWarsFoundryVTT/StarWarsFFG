const MODE_TO_TYPE = Object.freeze({
  0: "custom.0",
  1: "multiply",
  2: "add",
  3: "downgrade",
  4: "upgrade",
  5: "override",
});

function clone(value) {
  if (value === undefined) return value;
  return globalThis.structuredClone ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));
}

/** Normalize legacy numeric changes while migrating persisted worlds to V14. */
export function activeEffectChangeType(change = {}) {
  if (typeof change.type === "string") return change.type;
  const legacy = change.mode ?? change.type;
  if (legacy === undefined) return "add";
  const mode = Number(legacy);
  if (!Number.isInteger(mode)) throw new TypeError("Invalid Active Effect change mode");
  return MODE_TO_TYPE[mode] ?? `custom.${mode}`;
}

/** Read serializable V14 effect changes without prepared-data parent cycles. */
export function getActiveEffectChanges(effect) {
  const changes = effect?._source?.system?.changes
    ?? effect?.system?.changes
    ?? effect?._source?.changes
    ?? effect?.changes;
  return Array.isArray(changes) ? changes.map(copyChange) : [];
}

/** Mutable prepared changes, only for the Actor data-preparation cycle. */
export function getPreparedActiveEffectChanges(effect) {
  return effect?.system?.changes ?? [];
}

function copyChange(change) {
  if (!change || typeof change !== "object" || Array.isArray(change)) {
    throw new TypeError("Active Effect change must be an object");
  }
  const definition = {...change};
  delete definition.effect;
  return clone(definition);
}

export function normalizeActiveEffectChange(change) {
  const normalized = copyChange(change);
  normalized.type = activeEffectChangeType(normalized);
  delete normalized.mode;
  return normalized;
}

/** Build a V14 Active Effect creation payload. Legacy input is accepted for world migration. */
export function activeEffectCreateData(data) {
  const changes = data?.system?.changes ?? data?.changes ?? [];
  if (!Array.isArray(changes)) throw new TypeError("Active Effect changes must be an array");
  const rest = {...data};
  delete rest.changes;
  if (rest.system) {
    rest.system = {...rest.system};
    delete rest.system.changes;
  }
  const result = clone(rest);
  result.system = {...(result.system ?? {}), changes: changes.map(normalizeActiveEffectChange)};
  return result;
}

export function activeEffectChangesUpdate(changes) {
  return {"system.changes": activeEffectCreateData({changes}).system.changes};
}

export function getActiveEffectDuration(effect) {
  const duration = effect?.duration ?? {};
  return {
    value: typeof duration.value === "number" ? duration.value : null,
    units: duration.units ?? null,
    combat: effect?.start?.combat ?? null,
  };
}

export const ACTIVE_EFFECT_CHANGE_TYPES = Object.freeze({
  CUSTOM: "custom",
  MULTIPLY: "multiply",
  ADD: "add",
  DOWNGRADE: "downgrade",
  UPGRADE: "upgrade",
  OVERRIDE: "override",
});

/** Normalize legacy, nested, and flattened updates to the V14 persistence path. */
export function activeEffectUpdateData(data) {
  const changes = data["system.changes"] ?? data.system?.changes ?? data.changes;
  if (changes === undefined) return data;
  const result = {...data};
  delete result.changes;
  delete result["system.changes"];
  if (result.system) {
    result.system = {...result.system};
    delete result.system.changes;
    if (!Object.keys(result.system).length) delete result.system;
  }
  return {...result, ...activeEffectChangesUpdate(changes)};
}
