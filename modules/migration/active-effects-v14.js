import {
  activeEffectCreateData,
  getActiveEffectChanges,
} from "../compatibility/active-effects.js";
import { foundryGeneration } from "../compatibility/foundry-version.js";

export const ACTIVE_EFFECT_MIGRATION_VERSION = 1;

function clone(value) {
  return globalThis.structuredClone ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function migrateDuration(source, target) {
  const duration = source.duration;
  if (!duration || typeof duration !== "object") return;
  if (typeof duration.value === "number" && duration.units) return;
  for (const units of ["seconds", "rounds", "turns"]) {
    if (typeof duration[units] !== "number") continue;
    target.duration = {value: duration[units], units};
    break;
  }
  if (duration.combat || duration.startTime !== undefined || duration.startRound !== undefined || duration.startTurn !== undefined) {
    target.start = {
      combat: duration.combat ?? null,
      time: typeof duration.startTime === "number" ? duration.startTime : null,
      round: typeof duration.startRound === "number" ? duration.startRound : null,
      turn: typeof duration.startTurn === "number" ? duration.startTurn : null,
    };
  }
}

/**
 * Normalize a raw legacy effect source into Version 14 persistence data.
 * @param {object} source
 * @returns {object}
 */
export function normalizeActiveEffectSource(source) {
  if (!source || typeof source !== "object") throw new TypeError("Active Effect source must be an object");
  const normalized = activeEffectCreateData(clone(source), 14);
  migrateDuration(source, normalized);
  return normalized;
}

/**
 * Return only the Version 14 fields the migration owns.
 * @param {object} effect
 * @returns {object}
 */
export function activeEffectMigrationUpdate(effect) {
  const source = effect?.toObject ? effect.toObject() : effect;
  const normalized = normalizeActiveEffectSource(source);
  const update = {"system.changes": normalized.system.changes};
  if (Array.isArray(source?.changes)) update["-=changes"] = null;
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
  const currentChanges = getActiveEffectChanges(effect, 14);
  if (JSON.stringify(currentChanges) !== JSON.stringify(update["system.changes"])) return true;
  const source = effect?._source ?? effect;
  if (Array.isArray(source?.changes)) return true;
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
  if (foundryGeneration() < 14 || !game.user?.isGM || game.users?.activeGM?.id !== game.user.id) return report;

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
