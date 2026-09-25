import type { Page } from '@playwright/test';
import * as api from './api';
import { nodeKeyFor, type Ctx } from './world';
import { gearSources, sheetStat } from './pages/actor-sheet';

/**
 * Reads the four places a modifier is supposed to show up.
 *
 * They don't traverse nesting the same way, so they can disagree - which is the bug
 * #2191 describes. Reading all four at once says which one is wrong.
 */

export interface Reading {
  /** `actor.system.stats.*` */
  actorStat: number | null;
  /** `item.system.<stat>.adjusted` */
  itemAdjusted: number | null;
  /** Pool the system would build for a roll with this item. */
  poolDice: PoolSummary | null;
  /** Whether the modifier appears in the rendered chat card. */
  chatCard: boolean | null;
}

export interface PoolSummary {
  ability: number; proficiency: number; boost: number;
  // `remsetback` is its own slot, not a subtraction: the roll cancels setback dice with it only
  // at `renderDiceExpression`, and only when ApplyRemoveSetbackMods is on (dice/pool.js:240).
  setback: number; remsetback: number;
  difficulty: number; challenge: number; force: number;
}

/**
 * Where each modifier key lands. Spelled out rather than read from
 * `ModifierHelpers.getModKeyPath`, so the probe doesn't depend on the code it's testing.
 */
const ACTOR_PATH: Record<string, string> = {
  // character stats
  'Soak': 'system.stats.soak.value',
  'Defence-Ranged': 'system.stats.defence.ranged',
  'Defence-Melee': 'system.stats.defence.melee',
  'Encumbrance': 'system.stats.encumbrance.value',
  'EncumbranceMax': 'system.stats.encumbrance.max',
  'Wounds': 'system.stats.wounds.max',
  'Strain': 'system.stats.strain.max',
  'ForcePool': 'system.stats.forcePool.max',
  // characteristics
  'Brawn': 'system.characteristics.Brawn.value',
  'Agility': 'system.characteristics.Agility.value',
  'Intellect': 'system.characteristics.Intellect.value',
  'Cunning': 'system.characteristics.Cunning.value',
  'Willpower': 'system.characteristics.Willpower.value',
  'Presence': 'system.characteristics.Presence.value',
  // vehicles
  'Armor': 'system.stats.armour.value',
  'Armour': 'system.stats.armour.value',
  'Speed': 'system.stats.speed.max',
  'Handling': 'system.stats.handling.value',
  'Hulltrauma': 'system.stats.hullTrauma.max',
  'Systemstrain': 'system.stats.systemStrain.max',
  'CustomizationHardPoints': 'system.stats.customizationHardPoints.value',
  'VehicleEncumbrance': 'system.stats.encumbrance.value',
};

/**
 * Where a skill modifier lands.
 */
const SKILL_MOD_PATH: Record<string, string> = {
  'Advantage': 'advantage',
  'Success': 'success',
  'Threat': 'threat',
  'Failure': 'failure',
  'Triumph': 'triumph',
  'Despair': 'despair',
  'Boost': 'boost',
  'Setback': 'setback',
  'Remove Setback': 'remsetback',
  'Upgrade': 'upgrades',
  'Rank': 'rank',
  'Force': 'force',
};

const ITEM_PATH: Record<string, string> = {
  'Soak': 'system.soak.adjusted',
  // an item has one defence, whichever of the actor's two it ends up raising
  'Defence': 'system.defence.adjusted',
  'Defence-Ranged': 'system.defence.adjusted',
  'Defence-Melee': 'system.defence.adjusted',
  'Encumbrance': 'system.encumbrance.adjusted',
  'Damage': 'system.damage.adjusted',
  'Crit': 'system.crit.adjusted',
  'HP': 'system.hardpoints.adjusted',
  'Range': 'system.range.adjusted',
};

export class Consumers {
  constructor(private readonly page: Page) {}

  /**
   * Compare a world-created item against its imported twin.
   *
   * Returns only unexpected differences
   */
  async compareOrigins(
    created: Ctx,
    imported: Ctx,
    { includeExpected = false } = {},
  ): Promise<string[]> {
    if (!created.item || !imported.item) throw new Error('Both contexts need an item.');

    const [a, b] = await Promise.all([
      api.flatten(this.page, created.item),
      api.flatten(this.page, imported.item),
    ]);

    const diffs: string[] = [];
    for (const path of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
      if (JSON.stringify(a[path]) === JSON.stringify(b[path])) continue;
      const why = expectedDifference(path);
      if (why && !includeExpected) continue;
      const tag = why ? ` [expected: ${why}]` : '';
      diffs.push(`${path}: created=${JSON.stringify(a[path])} imported=${JSON.stringify(b[path])}${tag}`);
    }
    return diffs;
  }

  /** Read every consumer for one modifier key. Missing readers return null, not zero. */
  async read(ctx: Ctx, key: string): Promise<Reading> {
    return {
      actorStat: await this.actorStat(ctx, key),
      itemAdjusted: await this.itemAdjusted(ctx, key),
      poolDice: await this.poolDice(ctx),
      chatCard: await this.chatCard(ctx),
    };
  }

  /**
   * A talent / upgrade node of the built item, by its position in the spec's `talents`.
   */
  async talent(ctx: Ctx, index = 0): Promise<api.ProgressionNode | null> {
    if (!ctx?.item) throw new Error('talent() needs a build that reached an item.');
    return api.readProgressionNode(this.page, ctx.item, await nodeKeyFor(this.page, ctx, index));
  }

  /**
   * The Talents tab's list: every learned talent the actor has, from every source, aggregated.
   */
  async talentList(ctx: Ctx): Promise<{ name: string; rank: number | 'N/A'; sources: string[] }[]> {
    const list = await api.read(this.page, ctx.actor, 'talentList');
    return ((list ?? []) as any[]).map((talent) => ({
      name: String(talent?.name ?? ''),
      // Unranked talents carry the literal string, not a number, and it is worth seeing when a
      // test expected a rank and the talent turned out not to be ranked at all.
      rank: talent?.rank === 'N/A' ? 'N/A' : Number(talent?.rank ?? 0),
      sources: ((talent?.source ?? []) as any[]).map((s) => String(s?.name ?? '')),
    }));
  }

  /**
   * What the actor says is responsible for a skill's dice of one kind.
   */
  async skillSources(ctx: Ctx, skill: string, kind: string): Promise<{
    name: string; type: string; value: number; modtype: string;
  }[]> {
    const field = SKILL_MOD_PATH[kind];
    if (!field) throw new Error(`Unknown skill modifier "${kind}". Known: ${Object.keys(SKILL_MOD_PATH).join(', ')}.`);
    const raw = await api.read(this.page, ctx.actor, `system.skills.${skill}.${field}source`);
    return ((raw ?? []) as any[]).map((entry) => ({
      name: String(entry?.name ?? ''),
      type: String(entry?.type ?? ''),
      value: Number(entry?.value ?? 0),
      modtype: String(entry?.modtype ?? ''),
    }));
  }

  /**
   * What the gear list on the actor sheet shows as responsible for one of an item's values.
   *
   * Read from the sheet rather than the document, because being shown there is the whole point of
   * these sources - a row that renders them into the wrong place is the failure worth catching.
   */
  async gearSources(ctx: Ctx, key: string): Promise<string[]> {
    if (!ctx.item) throw new Error('gearSources() needs a build that reached an item.');
    const value = ITEM_PATH[key]?.split('.')[1];
    if (!value) throw new Error(`No item value mapped for "${key}". Known: ${Object.keys(ITEM_PATH).join(', ')}.`);

    await api.openSheet(this.page, ctx.actor);
    return gearSources(this.page, ctx.item.split('.').pop() ?? '', value);
  }

  /** A skill's rank, or one of the dice modifiers stacked onto it. */
  async skillModifier(ctx: Ctx, skill: string, kind: string): Promise<number | null> {
    const field = SKILL_MOD_PATH[kind];
    if (!field) throw new Error(`Unknown skill modifier "${kind}". Known: ${Object.keys(SKILL_MOD_PATH).join(', ')}.`);
    const raw = await api.read(this.page, ctx.actor, `system.skills.${skill}.${field}`);
    return raw === null ? null : Number(raw);
  }

  /**
   * An actor stat, read from the document where it exists and from the sheet where it does not.
   *
   * The document is preferred because it is never stale. A rendered sheet lags: Foundry re-renders
   * asynchronously after an item's effects change, so a one-shot DOM read can catch the previous
   * render and report a value that was correct a moment ago. Unequipping armour shows this
   * clearly - the document reports 0 while the sheet still shows 1.
   *
   * The sheet remains the fallback because some values never reach the document at all. Talent-tree
   * modifiers are computed by `getCalculatedValueFromItems` during render and stored nowhere, so
   * for those the sheet is the only surface - and `actorStat` correctly returns null rather than 0,
   * which is what makes the fallback safe.
   */
  async stat(ctx: Ctx, key: string): Promise<number | null> {
    const stored = await this.actorStat(ctx, key);
    if (stored !== null) return stored;

    await api.openSheet(this.page, ctx.actor);
    return sheetStat(this.page, ctx.actorName, key);
  }

  /** The same stat as stored on the document, for comparing against what the sheet shows. */
  async storedStat(ctx: Ctx, key: string): Promise<number | null> {
    return this.actorStat(ctx, key);
  }

  /** The recursive path, via `helpers/modifiers.js`. */
  async actorStat(ctx: Ctx, key: string): Promise<number | null> {
    const path = ACTOR_PATH[key];
    if (!path) return null;
    const raw = await api.read(this.page, ctx.actor, path);
    return raw === null ? null : Number(raw);
  }

  /** The flat path, via `item-ffg.js`'s `adjusted*` build. */
  async itemAdjusted(ctx: Ctx, key: string): Promise<number | null> {
    const path = ITEM_PATH[key];
    if (!path || !ctx.item) return null;
    const raw = await api.read(this.page, ctx.item, path);
    return raw === null ? null : Number(raw);
  }

  /**
   * The item's hardpoint budget, and what is actually fitted into it.
   */
  async hardpoints(ctx: Ctx): Promise<{
    value: number; adjusted: number; current: number;
    fitted: { name: string; hardpoints: number }[];
  } | null> {
    if (!ctx.item) return null;
    return this.page.evaluate(async (itemUuid) => {
      const item = await fromUuid(itemUuid);
      const hp = item?.system?.hardpoints;
      if (!hp) return null;
      return {
        value: Number(hp.value ?? 0),
        adjusted: Number(hp.adjusted ?? 0),
        current: Number(hp.current ?? 0),
        fitted: (item.system.itemattachment ?? []).map((a: any) => ({
          name: a.name,
          hardpoints: Number(a.system?.hardpoints?.value ?? 0),
        })),
      };
    }, ctx.item);
  }

  /**
   * An `adjusted` value that is a name rather than a count - range is a rung on a ladder
   * ("Short", "Medium"), not a number, so itemAdjusted's Number() would make it NaN.
   */
  async itemAdjustedName(ctx: Ctx, key: string): Promise<string | null> {
    const path = ITEM_PATH[key];
    if (!path || !ctx.item) return null;
    const raw = await api.read(this.page, ctx.item, path);
    return raw === null || raw === undefined ? null : String(raw);
  }

  /**
   * Every quality the item ends up with, after its own and its attachments' have been merged.
   */
  async qualities(ctx: Ctx): Promise<{ name: string; rank: number | null }[]> {
    if (!ctx.item) return [];
    const merged = await api.read(this.page, ctx.item, 'system.adjusteditemmodifier');
    return ((merged ?? []) as { name?: string; system?: { rank_current?: unknown } }[])
      .map((q) => ({
        name: String(q?.name ?? ''),
        rank: q?.system?.rank_current === null || q?.system?.rank_current === undefined
          ? null : Number(q.system.rank_current),
      }));
  }

  /**
   * The current rank of a quality on the item, after everything has been merged into it.
   */
  async qualityRank(ctx: Ctx, name: string): Promise<number | null> {
    if (!ctx.item) return null;
    const merged = await api.read(this.page, ctx.item, 'system.adjusteditemmodifier');
    const found = (merged as { name?: string; system?: { rank_current?: unknown } }[] | null)
      ?.find((q) => q?.name === name);
    if (!found) return null;
    const rank = found.system?.rank_current;
    return rank === null || rank === undefined ? null : Number(rank);
  }

  /** The dice pool the system would assemble, stopping short of rolling it. */
  async poolDice(ctx: Ctx): Promise<PoolSummary | null> {
    if (!ctx.item) return null;
    return this.page.evaluate(async (itemUuid) => {
      const item = await fromUuid(itemUuid);
      if (!item) return null;
      // window.DicePoolFFG is exported by the system on init (swffg-main.js)
      const pool = new window.DicePoolFFG({});
      const merged = await game.ffg.DiceHelpers.getModifiers(pool, item);
      const p = new window.DicePoolFFG(merged);
      return {
        ability: Number(p.ability) || 0,
        proficiency: Number(p.proficiency) || 0,
        boost: Number(p.boost) || 0,
        setback: Number(p.setback) || 0,
        remsetback: Number(p.remsetback) || 0,
        difficulty: Number(p.difficulty) || 0,
        challenge: Number(p.challenge) || 0,
        force: Number(p.force) || 0,
      };
    }, ctx.item);
  }

  /**
   * Force dice available to roll: the force pool that is not already spent.
   */
  async forceDice(ctx: Ctx): Promise<number> {
    return this.page.evaluate(async (actorUuid) => {
      const actor = await fromUuid(actorUuid);
      const pool = actor?.system?.stats?.forcePool;
      if (!pool) return 0;
      return Math.max(0, Number(pool.max ?? 0) - Number(pool.value ?? 0));
    }, ctx.actor);
  }

  /**
   * The pool a crew member rolls in one of a vehicle's roles.
   */
  async crewPool(vehicleUuid: api.Uuid, crewUuid: api.Uuid, role: string): Promise<PoolSummary> {
    const result = await this.page.evaluate(async ({ vehicleUuid, crewUuid, role }) => {
      const vehicle = await fromUuid(vehicleUuid);
      const crew = await fromUuid(crewUuid);
      if (!vehicle || !crew) return { error: 'the vehicle or the crew member is gone' };

      const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
      const { build_crew_roll } = await load('helpers/crew.js');

      const original = window.DicePoolFFG.prototype.renderPreview;
      let caught: any = null;
      window.DicePoolFFG.prototype.renderPreview = function (...args: any[]) {
        caught = this;
        return original.apply(this, args);
      };

      let drawn;
      try {
        drawn = build_crew_roll(vehicle.id, crew.id, role);
      } finally {
        window.DicePoolFFG.prototype.renderPreview = original;
      }

      if (drawn === false) return { error: `the system refused to build a roll for the ${role}` };
      if (!caught) return { error: 'the roll was built but never drawn, so there is nothing to read' };

      return {
        pool: {
          ability: Number(caught.ability) || 0,
          proficiency: Number(caught.proficiency) || 0,
          boost: Number(caught.boost) || 0,
          setback: Number(caught.setback) || 0,
          remsetback: Number(caught.remsetback) || 0,
          difficulty: Number(caught.difficulty) || 0,
          challenge: Number(caught.challenge) || 0,
          force: Number(caught.force) || 0,
        },
      };
    }, { vehicleUuid, crewUuid, role });

    if ('error' in result) throw new Error(`Building a ${role} roll: ${result.error}`);
    return result.pool as PoolSummary;
  }

  /**
   * The pool for the built-in piloting check, which picks its own skill.
   */
  async pilotPool(vehicleUuid: api.Uuid, pilotUuid: api.Uuid): Promise<PoolSummary> {
    const result = await this.page.evaluate(async ({ vehicleUuid, pilotUuid }) => {
      const vehicle = await fromUuid(vehicleUuid);
      const pilot = await fromUuid(pilotUuid);
      if (!vehicle || !pilot) return { error: 'the vehicle or the pilot is gone' };

      const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
      const { buildPilotRoll } = await load('helpers/crew.js');

      let pool;
      try {
        pool = await buildPilotRoll(vehicle.id, pilot.id);
      } catch (err: any) {
        const theme = game.settings.get('starwarsffg', 'skilltheme');
        return {
          error: `${err?.message ?? err} (the skill theme is "${theme}", and the pilot has: `
            + `${Object.keys(pilot.system?.skills ?? {}).filter((s) => s.startsWith('Piloting')).join(', ')})`,
        };
      }

      return {
        pool: {
          ability: Number(pool.ability) || 0,
          proficiency: Number(pool.proficiency) || 0,
          boost: Number(pool.boost) || 0,
          setback: Number(pool.setback) || 0,
          remsetback: Number(pool.remsetback) || 0,
          difficulty: Number(pool.difficulty) || 0,
          challenge: Number(pool.challenge) || 0,
          force: Number(pool.force) || 0,
        },
      };
    }, { vehicleUuid, pilotUuid });

    if ('error' in result) throw new Error(`Building a pilot roll: ${result.error}`);
    return result.pool as PoolSummary;
  }

  /**
   * The pool for rolling the built weapon: the actor's dice for its skill, with the weapon's own
   * modifiers applied on top.
   */
  async weaponPool(ctx: Ctx): Promise<PoolSummary> {
    if (!ctx.item) throw new Error('weaponPool() needs a build that reached an item.');

    const result = await this.page.evaluate(async ({ actorUuid, itemUuid }) => {
      const actor = await fromUuid(actorUuid);
      const item = await fromUuid(itemUuid);
      if (!actor || !item) return { error: 'the actor or the weapon is gone' };

      const skill = item.system?.skill?.value;
      if (!skill) return { error: `${item.name} names no skill to roll` };

      const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
      const { get_dice_pool } = await load('helpers/dice-helpers.js');
      // it converts from the label the sheet shows, not the key the item stores
      const label = game.i18n.localize(CONFIG.FFG.skills[skill]?.label ?? skill);

      const base = get_dice_pool(actor.id, label, new window.DicePoolFFG({}));
      const pool = new window.DicePoolFFG(await game.ffg.DiceHelpers.getModifiers(base, item));

      return {
        pool: {
          ability: Number(pool.ability) || 0,
          proficiency: Number(pool.proficiency) || 0,
          boost: Number(pool.boost) || 0,
          setback: Number(pool.setback) || 0,
          remsetback: Number(pool.remsetback) || 0,
          difficulty: Number(pool.difficulty) || 0,
          challenge: Number(pool.challenge) || 0,
          force: Number(pool.force) || 0,
        },
      };
    }, { actorUuid: ctx.actor, itemUuid: ctx.item });

    if ('error' in result) throw new Error(`Building a pool for ${ctx.itemName}: ${result.error}`);
    return result.pool as PoolSummary;
  }

  /**
   * The same item pool as `poolDice`, as the expression the roll is actually made from.
   */
  async poolExpression(ctx: Ctx): Promise<string | null> {
    if (!ctx.item) return null;
    return this.page.evaluate(async (itemUuid) => {
      const item = await fromUuid(itemUuid);
      if (!item) return null;
      const merged = await game.ffg.DiceHelpers.getModifiers(new window.DicePoolFFG({}), item);
      return new window.DicePoolFFG(merged).renderDiceExpression();
    }, ctx.item);
  }

  /**
   * The pool the system builds for a skill check, before any dice are thrown.
   */
  async skillPool(ctx: Ctx, skill: string): Promise<PoolSummary> {
    const result = await this.page.evaluate(async ({ actorUuid, skill }) => {
      const actor = await fromUuid(actorUuid);
      if (!actor) return { error: `No actor at ${actorUuid}` };

      const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
      const { get_dice_pool } = await load('helpers/dice-helpers.js');

      let pool;
      try {
        pool = get_dice_pool(actor.id, skill, new window.DicePoolFFG({}));
      } catch (err: any) {
        const known = Object.values(CONFIG.FFG.skills)
          .map((entry: any) => game.i18n.localize(entry.label)).join(', ');
        return { error: `no skill labelled "${skill}" (${err?.message ?? err}). It knows: ${known}` };
      }

      return {
        pool: {
          ability: Number(pool.ability) || 0,
          proficiency: Number(pool.proficiency) || 0,
          boost: Number(pool.boost) || 0,
          setback: Number(pool.setback) || 0,
          remsetback: Number(pool.remsetback) || 0,
          difficulty: Number(pool.difficulty) || 0,
          challenge: Number(pool.challenge) || 0,
          force: Number(pool.force) || 0,
        },
      };
    }, { actorUuid: ctx.actor, skill });

    if ('error' in result) throw new Error(`Building a ${skill} pool: ${result.error}`);
    return result.pool as PoolSummary;
  }

  /**
   * Whether a named modifier appears on the item's send-to-chat card.
   *
   * Drives the system's own entry point - `ActorSheetFFG._itemDetailsToChat(itemId)` - rather than
   * assembling a message. That builds the card through `getItemDetails()`, which renders qualities
   * as pills carrying `data-item-embed-name="<modifier name>"`, so the modifier's name is the
   * thing to look for.
   *
   * Only meaningful for a *named* nested modifier. Attributes written straight onto an item or an
   * attachment are not qualities and never appear as pills, so this returns null for them - which
   * the coherence check reads as "not applicable" rather than a disagreement.
   *
   * The message is deleted afterwards, so nothing leaks into the next test.
   */
  async chatCard(ctx: Ctx, needle = ctx.spec.modifier?.name): Promise<boolean | null> {
    if (!ctx.item || !needle) return null;

    return this.page.evaluate(async ({ actorUuid, itemUuid, needle }) => {
      const actor = await fromUuid(actorUuid);
      const item = await fromUuid(itemUuid);
      if (!actor || !item) return null;

      const before = new Set(game.messages.contents.map((m: any) => m.id));
      await actor.sheet._itemDetailsToChat(item.id);

      // the card is created asynchronously by the handler
      let created: any = null;
      for (let i = 0; i < 60 && !created; i++) {
        created = game.messages.contents.find((m: any) => !before.has(m.id));
        if (!created) await new Promise((r) => setTimeout(r, 25));
      }
      if (!created) return null;

      try {
        return (created.content ?? '').includes(needle);
      } finally {
        /*
         * Let the chat log finish rendering it before taking it away.
         */
        for (let i = 0; i < 40; i++) {
          const rendered = document.querySelector<HTMLElement>(
            `.message[data-message-id="${created.id}"]`);
          if (rendered && !rendered.hidden) break;
          await new Promise((r) => setTimeout(r, 25));
        }
        await created.delete();
      }
    }, { actorUuid: ctx.actor, itemUuid: ctx.item, needle });
  }

  /**
   * What the character has to spend, and what it has earned.
   */
  async xp(ctx: Ctx): Promise<{ available: number; total: number; stored: number } | null> {
    return this.page.evaluate(async (actorUuid) => {
      const actor = await fromUuid(actorUuid);
      const experience = actor?.system?.experience;
      if (!experience) return null;
      return {
        available: Number(experience.available ?? 0),
        total: Number(experience.total ?? 0),
        stored: Number(actor.toObject().system?.experience?.available ?? 0),
      };
    }, ctx.actor);
  }

  /**
   * The XP ledger, newest first - which is the order `xpLogSpend` writes it in.
   */
  async xpLog(ctx: Ctx): Promise<{
    action: string; description: string; cost: number; available: number; total: number;
  }[]> {
    const entries = await api.read(this.page, ctx.actor, 'flags.starwarsffg.xpLog');
    return ((entries ?? []) as any[]).map((e) => ({
      action: String(e?.action ?? ''),
      description: String(e?.description ?? ''),
      cost: Number(e?.xp?.cost ?? 0),
      available: Number(e?.xp?.available ?? 0),
      total: Number(e?.xp?.total ?? 0),
    }));
  }
}

/**
 * Paths that legitimately differ between a world-created item and its imported twin.
 */
const EXPECTED_DIFFERENCES: { pattern: RegExp; why: string }[] = [
  // Foundry document identity. Different documents, so of course these differ.
  { pattern: /^(_id|name|sort|folder|_stats|ownership|effects)(\.|$)/, why: 'document identity' },

  // `prepareBaseObject` stamps ffgimportid; Foundry stamps core.sourceId on compendium import.
  { pattern: /^flags\./, why: 'import provenance' },

  // Importers set an image per type, or pull one out of the dataset zip.
  { pattern: /^img$/, why: 'importer sets a type-specific image' },

  // `cleanDescription` rewrites the dataset's [H3]/[B] markup and appends the BaseMods summary.
  { pattern: /^system\.(description|renderedDesc)$/, why: 'description is rebuilt from XML' },

  // Tags come from the entry's <Categories> and <Type>; sources come from <Sources>.
  { pattern: /^system\.metadata\./, why: 'metadata is derived from the dataset' },
];

function expectedDifference(path: string): string | null {
  return EXPECTED_DIFFERENCES.find((e) => e.pattern.test(path))?.why ?? null;
}

/**
 * Do the readers agree that a change of `delta` happened?
 *
 * Each reader is compared against its own baseline - they measure different things, so only
 * the movement is comparable. Readers that are null in both readings are skipped.
 */
export function divergence(before: Reading, after: Reading, delta: number): string[] {
  const problems: string[] = [];

  const num = (name: keyof Reading, b: unknown, a: unknown) => {
    if (b === null && a === null) return;
    if (b === null || a === null) {
      problems.push(`${name}: reader became ${b === null ? 'available' : 'unavailable'} between readings`);
      return;
    }
    const moved = Number(a) - Number(b);
    if (moved !== delta) {
      problems.push(`${name}: expected to move by ${delta}, moved by ${moved} (${b} -> ${a})`);
    }
  };

  num('actorStat', before.actorStat, after.actorStat);
  num('itemAdjusted', before.itemAdjusted, after.itemAdjusted);

  if (before.chatCard !== null && after.chatCard !== null) {
    if (delta === 0 && before.chatCard !== after.chatCard) {
      problems.push(
        `chatCard: modifier ${after.chatCard ? 'appeared in' : 'vanished from'} the card`);
    } else if (delta !== 0 && before.chatCard === after.chatCard) {
      problems.push(
        `chatCard: modifier ${after.chatCard ? 'was already' : 'is still not'} present in the card`);
    }
  }

  return problems;
}
