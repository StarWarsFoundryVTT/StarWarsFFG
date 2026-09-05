import { expect as base } from '@playwright/test';
import { divergence, type Reading } from './consumers';

/**
 * Custom matchers. Provides custom error messages for failed matches
 */
export const expect = base.extend({
  /** All applicable readers moved by the same amount. */
  toBeCoherent(readings: { before: Reading; after: Reading }, delta: number) {
    const problems = divergence(readings.before, readings.after, delta);
    return {
      pass: problems.length === 0,
      message: () =>
        problems.length === 0
          ? `Expected the consumers to disagree about a change of ${delta}, but all agreed.`
          : [
              `Consumers disagree about a change of ${delta}:`,
              ...problems.map((p) => `  ${p}`),
              '',
              'Reader-to-code map:',
              '  actorStat    helpers/modifiers.js    recurses, gates on equippable.equipped',
              '  itemAdjusted items/item-ffg.js       flat pass, gates on system.active',
              '  poolDice     helpers/dice-helpers.js consumes adjusteditemmodifier',
              '  chatCard     dice/roll.js            consumes adjusteditemmodifier',
            ].join('\n'),
    };
  },

  /**
   * A world-created item and its imported twin carry the same values.
   * Takes the diff list from `consumers.compareOrigins`.
   */
  toMatchAcrossOrigins(diffs: string[]) {
    return {
      pass: diffs.length === 0,
      message: () =>
        diffs.length === 0
          ? 'Expected the two origins to differ, but they matched.'
          : [
              'A world-created item and its imported twin disagree:',
              ...diffs.map((d) => `  ${d}`),
              '',
              'Either the importer is dropping a field, or tests/fixtures/documents.ts has',
              'drifted from tests/fixtures/oggdude/. Check the importer first.',
              'If a difference is legitimate, add it to EXPECTED_DIFFERENCES in consumers.ts',
              'with a note on which importer behaviour causes it.',
            ].join('\n'),
    };
  },

  /** Nothing moved between two readings. */
  toBeStable(readings: { before: Reading; after: Reading }) {
    const problems = divergence(readings.before, readings.after, 0);
    return {
      pass: problems.length === 0,
      message: () =>
        problems.length === 0
          ? 'Expected a reader to drift, but none did.'
          : ['Values drifted when they should not have:', ...problems.map((p) => `  ${p}`)].join('\n'),
    };
  },
});
