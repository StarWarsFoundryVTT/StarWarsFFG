import {
  activeEffectCreateData,
} from "../compatibility/active-effects.js";
import { deleteDataField } from "../compatibility/data-operators.js";

export const ACTIVE_EFFECT_MIGRATION_VERSION = 1;

function clone(value) {
  return globalThis.structuredClone ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function migrateDuration(source, target) {
  const duration = source.duration;
  if (!duration || typeof duration !== "object") return;
  target.duration = {...duration};
  if (!(typeof duration.value === "number" && duration.units)) {
    for (const units of ["seconds", "turns", "rounds"]) {
      if (typeof duration[units] !== "number") continue;
      target.duration.value = duration[units];
      target.duration.units = units;
      break;
    }
  }
  const startKeys = ["combat", "startTime", "startRound", "startTurn"];
  if (!Object.hasOwn(source, "start") && startKeys.some(key => Object.hasOwn(duration, key))) {
    target.start = {
      combat: duration.combat ?? null,
      time: typeof duration.startTime === "number" ? duration.startTime : null,
      round: typeof duration.startRound === "number" ? duration.startRound : null,
      turn: typeof duration.startTurn === "number" ? duration.startTurn : null,
    };
  }
  for (const key of ["seconds", "rounds", "turns", ...startKeys]) delete target.duration[key];
}

/**
 * Normalize a raw legacy effect source into Version 14 persistence data.
 * @param {object} source
 * @returns {object}
 */
export function normalizeActiveEffectSource(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new TypeError("Active Effect source must be an object");
  for (const object of [source, source.system]) {
    if (object && Object.hasOwn(object, "changes") && !Array.isArray(object.changes)) {
      throw new TypeError("Active Effect changes must be an array");
    }
  }
  const normalized = activeEffectCreateData(clone(source));
  migrateDuration(source, normalized);
  return normalized;
}

/**
 * Return only the Version 14 fields the migration owns.
 * @param {object} effect
 * @returns {object}
 */
export function activeEffectMigrationUpdate(effect) {
  const source = clone(effect?.toObject ? effect.toObject() : effect?._source ?? effect);
  const normalized = normalizeActiveEffectSource(source);
  const update = {"system.changes": normalized.system.changes};
  if (Array.isArray(source?.changes)) update.changes = deleteDataField();
  if (normalized.duration) update.duration = normalized.duration;
  if (normalized.start) update.start = normalized.start;
  if (Object.hasOwn(normalized, "origin")) update.origin = normalized.origin;
  return update;
}

/**
 * Compare effect-owned semantic data without compatibility shims.
 * @param {object} effect
 * @returns {boolean}
 */
export function activeEffectNeedsMigration(effect) {
  const update = activeEffectMigrationUpdate(effect);
  // structuredClone drops non-enumerable compatibility accessors on core snapshots.
  const source = clone(effect?.toObject ? effect.toObject() : effect?._source ?? effect);
  if (Object.hasOwn(source, "changes")) return true;
  if (JSON.stringify(source.system?.changes) !== JSON.stringify(update["system.changes"])) return true;
  for (const key of ["duration", "start"]) {
    if (Object.hasOwn(update, key) && JSON.stringify(source[key]) !== JSON.stringify(update[key])) return true;
  }
  return false;
}

async function migrateEffect(effect, report) {
  try {
    if (!activeEffectNeedsMigration(effect)) {
      report.skipped.push(effect.uuid);
      return;
    }
    await effect.update(activeEffectMigrationUpdate(effect), {starwarsffgMigration: true});
    report.migrated.push(effect.uuid);
  } catch (error) {
    report.failed.push({uuid: effect?.uuid ?? "unknown", reason: error.message});
  }
}

async function migrateItem(item, report) {
  for (const effect of item.effects ?? []) await migrateEffect(effect, report);
}

async function migrateActor(actor, report) {
  for (const effect of actor.effects ?? []) await migrateEffect(effect, report);
  for (const item of actor.items ?? []) await migrateItem(item, report);
}

/**
 * Persist Version 14 effect data across all system-owned storage locations.
 * @returns {Promise<{migrated: string[], skipped: string[], failed: object[], lockedPacks: string[]}>}
 */
export async function migrateActiveEffectsV14() {
  const report = {migrated: [], skipped: [], failed: [], lockedPacks: []};
  if (!game.user?.isGM || game.users?.activeGM?.id !== game.user.id) return report;

  for (const actor of game.actors ?? []) await migrateActor(actor, report);
  for (const item of game.items ?? []) await migrateItem(item, report);

  const seenSyntheticActors = new Set();
  for (const scene of game.scenes ?? []) {
    for (const token of scene.tokens ?? []) {
      if (token.actorLink || !token.actor || seenSyntheticActors.has(token.actor.uuid)) continue;
      seenSyntheticActors.add(token.actor.uuid);
      await migrateActor(token.actor, report);
    }
  }

  for (const pack of game.packs ?? []) {
    if (!["Actor", "Item"].includes(pack.documentName)) continue;
    if (pack.locked || pack.metadata?.packageType !== "world") {
      report.lockedPacks.push(pack.collection);
      continue;
    }
    try {
      for (const document of await pack.getDocuments()) {
        if (pack.documentName === "Actor") await migrateActor(document, report);
        else await migrateItem(document, report);
      }
    } catch (error) {
      report.failed.push({uuid: `Compendium.${pack.collection}`, reason: error.message});
    }
  }
  return report;
}

/** Advance the checkpoint only after every writable document was handled successfully. */
export async function ensureActiveEffectsV14() {
  if (!game.user?.isGM || game.users?.activeGM?.id !== game.user.id) return null;
  if (game.settings.get("starwarsffg", "activeEffectMigrationVersion") >= ACTIVE_EFFECT_MIGRATION_VERSION) return null;
  const report = await migrateActiveEffectsV14();
  if (!report.failed.length) {
    await game.settings.set("starwarsffg", "activeEffectMigrationVersion", ACTIVE_EFFECT_MIGRATION_VERSION);
  }
  return report;
}
