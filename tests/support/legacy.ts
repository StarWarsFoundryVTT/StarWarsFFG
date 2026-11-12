import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { Uuid } from './api';
import type { Consumers } from './consumers';
import type { Ctx } from './world';

/**
 * Documents as an older Foundry stored them, and what the system read from them there
 * Captured once and frozen. Useful for migration tests for existing items
 */

const DIR = path.resolve(__dirname, '../fixtures/legacy-v13');

/** What one fixture recorded, minus the documents themselves. */
export interface LegacyExpected {
  stats?: Record<string, number | null>;
  forceDice?: number;
  skills?: Record<string, Record<string, number | null>>;
  sources?: Record<string, Record<string, unknown[]>>;
  pools?: Record<string, unknown>;
  xp?: unknown;
  effects: CapturedEffect[];
}

interface CapturedEffect {
  on: string;
  name: string;
  disabled: boolean;
  statuses: string[];
  system: Record<string, unknown> | null;
  changes: { key: string; value: unknown }[];
}

export interface LegacyFixture {
  name: string;
  captured: { foundry: string; system: string };
  documents: { actor: Record<string, any>; compendiumItem?: Record<string, any> };
  expected: LegacyExpected;
}

/** Every captured fixture, by name. */
export const LEGACY_FIXTURES: string[] = fs.readdirSync(DIR)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.slice(0, -'.json'.length))
  .sort();

export function readLegacy(name: string): LegacyFixture {
  const file = path.join(DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`No legacy fixture "${name}". Known: ${LEGACY_FIXTURES.join(', ')}.`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * An effect as the system sees it, in a form both versions can be compared in.
 * Mode is left out on purpose: v14 renames it, and the readings already show whether it applied.
 */
export interface EffectSummary {
  on: string;
  name: string;
  disabled: boolean;
  statuses: string[];
  duration: unknown;
  changes: [string, string][];
}

const byPlace = (a: EffectSummary, b: EffectSummary) =>
  `${a.on}/${a.name}`.localeCompare(`${b.on}/${b.name}`);

export function capturedEffects(expected: LegacyExpected): EffectSummary[] {
  return expected.effects.map((effect) => ({
    on: effect.on,
    name: effect.name,
    disabled: effect.disabled,
    statuses: [...effect.statuses].sort(),
    duration: effect.system?.duration ?? null,
    changes: effect.changes.map((change): [string, string] => [change.key, String(change.value)]),
  })).sort(byPlace);
}

export async function readEffectSummaries(page: Page, actorUuid: Uuid): Promise<EffectSummary[]> {
  const effects: EffectSummary[] = await page.evaluate(async (uuid) => {
    const actor = await fromUuid(uuid);
    if (!actor) throw new Error(`No actor at ${uuid}`);
    // stored source, as captured - the actor rewrites force change values in memory while preparing
    const read = (effect: any, on: string) => {
      const source = effect.toObject();
      return {
        on,
        name: String(source.name ?? ''),
        disabled: Boolean(source.disabled),
        statuses: [...(source.statuses ?? [])].sort(),
        duration: source.system?.duration ?? null,
        // v14 moved changes under system
        changes: (source.system?.changes ?? source.changes ?? [])
          .map((change: any) => [String(change.key), String(change.value)]),
      };
    };
    return [
      ...[...actor.effects].map((effect: any) => read(effect, 'actor')),
      ...[...actor.items].flatMap((item: any) => [...item.effects].map((effect: any) => read(effect, item.name))),
    ];
  }, actorUuid);
  return effects.sort(byPlace);
}

/**
 * Take the same readings the capture took, shaped like its `expected`, so the two compare whole.
 */
export async function readLike(
  consumers: Consumers, ctx: Ctx, expected: LegacyExpected,
): Promise<Omit<LegacyExpected, 'effects'>> {
  const actual: Omit<LegacyExpected, 'effects'> = {};

  if (expected.stats) {
    actual.stats = {};
    for (const key of Object.keys(expected.stats)) actual.stats[key] = await consumers.actorStat(ctx, key);
  }
  if (expected.forceDice !== undefined) actual.forceDice = await consumers.forceDice(ctx);
  if (expected.skills) {
    actual.skills = {};
    for (const [skill, kinds] of Object.entries(expected.skills)) {
      actual.skills[skill] = {};
      for (const kind of Object.keys(kinds)) {
        actual.skills[skill][kind] = await consumers.skillModifier(ctx, skill, kind);
      }
    }
  }
  if (expected.sources) {
    actual.sources = {};
    for (const [skill, kinds] of Object.entries(expected.sources)) {
      actual.sources[skill] = {};
      for (const kind of Object.keys(kinds)) {
        actual.sources[skill][kind] = await consumers.skillSources(ctx, skill, kind);
      }
    }
  }
  if (expected.pools) {
    actual.pools = {};
    for (const skill of Object.keys(expected.pools)) actual.pools[skill] = await consumers.skillPool(ctx, skill);
  }
  if (expected.xp !== undefined) actual.xp = await consumers.xp(ctx);

  return actual;
}
