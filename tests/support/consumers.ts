import type { Page } from '@playwright/test';
import * as api from './api';
import type { Ctx } from './world';

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
  setback: number; difficulty: number; challenge: number; force: number;
}

/**
 * Where each modifier key lands. Spelled out rather than read from
 * `ModifierHelpers.getModKeyPath`, so the probe doesn't depend on the code it's testing.
 */
const ACTOR_PATH: Record<string, string> = {
  'Soak': 'system.stats.soak.value',
  'Defence-Ranged': 'system.stats.defence.ranged',
  'Defence-Melee': 'system.stats.defence.melee',
  'Encumbrance': 'system.stats.encumbrance.value',
  'EncumbranceMax': 'system.stats.encumbrance.max',
  'Wounds': 'system.stats.wounds.max',
  'Strain': 'system.stats.strain.max',
  'ForcePool': 'system.stats.forcePool.max',
};

const ITEM_PATH: Record<string, string> = {
  'Soak': 'system.soak.adjusted',
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

  /** Read every consumer for one modifier key. Missing readers return null, not zero. */
  async read(ctx: Ctx, key: string): Promise<Reading> {
    return {
      actorStat: await this.actorStat(ctx, key),
      itemAdjusted: await this.itemAdjusted(ctx, key),
      poolDice: await this.poolDice(ctx),
      chatCard: await this.chatCard(ctx, key),
    };
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
        difficulty: Number(p.difficulty) || 0,
        challenge: Number(p.challenge) || 0,
        force: Number(p.force) || 0,
      };
    }, ctx.item);
  }

  /**
   * Whether the modifier makes it into a rendered chat card.
   * Creates, renders and deletes the message, so nothing leaks into the next test.
   */
  async chatCard(ctx: Ctx, key: string): Promise<boolean | null> {
    if (!ctx.item) return null;
    const needle = ctx.spec.modifier?.name ?? key;
    return this.page.evaluate(async ({ itemUuid, needle }) => {
      const item = await fromUuid(itemUuid);
      if (!item) return null;
      const message = await ChatMessage.create({
        content: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          item.system?.description ?? item.name ?? '',
        ),
        flavor: item.name,
      });
      if (!message) return null;
      try {
        const html = await message.renderHTML();
        return (html?.outerHTML ?? '').includes(needle);
      } finally {
        await message.delete();
      }
    }, { itemUuid: ctx.item, needle });
  }
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

  if (before.chatCard !== null && after.chatCard !== null && before.chatCard === after.chatCard) {
    problems.push(`chatCard: modifier ${after.chatCard ? 'was already' : 'is still not'} present in the card`);
  }

  return problems;
}
